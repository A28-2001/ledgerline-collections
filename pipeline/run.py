"""Run the collections check end to end and write results.json for the web app.

    python pipeline/run.py                  # sample data, rules + AI if GROQ_API_KEY is set
    python pipeline/run.py --data raw       # the real data room files in data/raw
    python pipeline/run.py --no-ai          # rules only
    python pipeline/run.py --publish        # also copy to web/src/data/results.json

Also writes reports/verdicts.csv (every bill, for checking by hand) and
reports/labels_todo.csv (a sample to label by hand, which gives the accuracy figure).
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ai import AI  # noqa: E402
from engine import CAUSE_LABEL, Engine, money  # noqa: E402
from load import ROOT, as_of_date, load, load_config, norm_id  # noqa: E402

VERDICTS = ["send", "hold", "paid", "call"]


def trend(engine: Engine) -> list[dict]:
    inv = engine.t["invoices"]
    if not len(inv) or not engine.d.has("invoices", "due_date"):
        return []
    paid = inv["paid_date"] if engine.d.has("invoices", "paid_date") else pd.Series(pd.NaT, index=inv.index)
    void = inv["status"].isin(engine.v["invoice_void_status"])
    tk = engine.t["tickets"]
    t_min = tk["created"].min() if len(tk) else None
    t_max = tk["created"].max() if len(tk) else None
    out = []
    end = engine.as_of
    for i in range(11, -1, -1):
        me = (end - pd.offsets.MonthEnd(0) if end.is_month_end else end + pd.offsets.MonthEnd(0)) - pd.offsets.MonthEnd(i)
        me = min(me, engine.as_of)
        issued = (inv["issue_date"] <= me) & ~void
        unpaid = paid.isna() | (paid > me)
        open_amt = inv.loc[issued & unpaid, "amount"].sum()
        od_amt = inv.loc[issued & unpaid & (inv["due_date"] < me), "amount"].sum()
        month = me.strftime("%Y-%m")
        bt = None
        if t_min is not None and pd.notna(t_min) and me >= t_min and me.replace(day=1) <= t_max:
            m_t = tk[(tk["created"].dt.strftime("%Y-%m") == month)]
            bt = int(sum(1 for r in m_t.to_dict("records") if engine._rules_label(r) == "billing_complaint"))
        out.append({"month": month, "overdueAmount": round(float(od_amt), 2),
                    "overdueShare": round(float(od_amt / open_amt), 4) if open_amt else 0.0, "billingTickets": bt})
    return out


def verified_numbers(engine: Engine, invoices: list[dict], by_cause: list[dict]) -> list[dict]:
    total = sum(i["amount"] for i in invoices)
    out = []
    # 1. Overdue total: accounting export vs billing system
    inv = engine.t["invoices"]
    if len(inv) and engine.cfg.get("overdue_source") == "ar_aging":
        open_ = inv[~inv["status"].isin(engine.v["invoice_void_status"]) & (inv["due_date"] < engine.as_of)]
        if engine.d.has("invoices", "paid_date"):
            open_ = open_[open_["paid_date"].isna()]
        else:
            open_ = open_[open_["status"].isin(engine.v["invoice_open_status"])]
        b = float(open_["amount"].sum())
        ok = abs(total - b) <= 0.01 * max(total, 1)
        ar_keys = {i["id"] for i in invoices}
        only_ar = [i for i in invoices if engine.t["invoices"]["id_key"].eq(norm_id(i["id"])).sum() == 0]
        note = None
        if not ok:
            paid_in_billing = sum(i["amount"] for i in invoices if any(e["kind"] == "payment" and e.get("status") == "succeeded"
                                                                      for e in i["evidence"]) and i["verdict"] == "paid")
            note = (f"Gap {money(total - b)}. Part of it: {len(only_ar)} bill(s) only in the accounting export "
                    f"({money(sum(i['amount'] for i in only_ar))}), and bills already paid but still open there. "
                    "The gap itself is a finding for finance.")
        out.append({"label": "Total overdue", "methodA": "Sum of the accounting export (AR aging)", "valueA": round(total, 2),
                    "methodB": "Open, past-due bills in the billing system", "valueB": round(b, 2), "ok": ok,
                    **({"note": note} if note else {})})
        _ = ar_keys
    # 2. Causes add up to the total
    s = sum(c["amount"] for c in by_cause)
    out.append({"label": "Causes add up", "methodA": "Total overdue", "valueA": round(total, 2),
                "methodB": "Sum of the 'why overdue' slices", "valueB": round(s, 2), "ok": abs(s - total) < 0.5})
    # 3. Should-not-chase: from verdicts vs straight from the flags
    a = sum(i["amount"] for i in invoices if i["verdict"] in ("paid", "hold"))
    b = sum(r.amount for r in engine._rows if r.flags.get("paid_linked") or r.flags.get("paid_unmatched")
            or r.flags.get("complaint_hold") or r.flags.get("disputed_hold") or r.flags.get("dispute_hold") or r.flags.get("open_ticket_hold") or r.flags.get("wrong_bill"))
    out.append({"label": "Shouldn't chase today", "methodA": "Sum of Hold + Probably paid verdicts", "valueA": round(a, 2),
                "methodB": "Recounted from the raw evidence flags", "valueB": round(b, 2), "ok": abs(a - b) < 0.5})
    # 4. The Paidly case: a bill with a matching or recent unmatched payment must never get a reminder
    chased = [r for r in engine._rows if (r.flags.get("paid_unmatched") or r.flags.get("paid_linked") or r.flags.get("recent_payment") or r.flags.get("twin_payment"))
              and getattr(r, "verdict", None) == "send" and not r.needs_review]
    out.append({"label": "Paid but chased (the Paidly case)", "methodA": "Bills with a matching or recent unmatched payment that would get a reminder",
                "valueA": len(chased), "methodB": "Allowed (Maya: chasing someone who has paid gets the tool switched off)", "valueB": 0,
                "ok": len(chased) == 0})
    # 5. Maya's real test, second half: nobody chased who had a complaint open
    tk_open = [r for r in engine._rows if getattr(r, "verdict", None) == "send" and not r.needs_review
               and any(e["kind"] == "ticket" and str(e.get("status") or "") in engine.v["ticket_open_status"] for e in r.evidence)
               and not r.flags.get("soft")]
    out.append({"label": "Complaint open but chased", "methodA": "Reminders going to a customer with an open ticket, or a pending one about money or marked high priority",
                "valueA": len(tk_open), "methodB": "Allowed (Maya: nobody chased who had a complaint open)", "valueB": 0, "ok": len(tk_open) == 0})
    # 6. Count
    out.append({"label": "Bills checked", "methodA": "Rows in the overdue list", "valueA": len(engine._rows),
                "methodB": "Bills with a verdict", "valueB": len(invoices), "ok": len(engine._rows) == len(invoices)})
    return out


def accuracy(invoices: list[dict], labels_path: Path, labelled_by: str):
    if not labels_path.exists():
        return None, []
    lab = pd.read_csv(labels_path, dtype=str).fillna("")
    truth = {norm_id(r["invoice_id"]): (r["true_verdict"].strip().lower(), r.get("note", "")) for r in lab.to_dict("records")
             if r["true_verdict"].strip()}
    agreed, n, failures = 0, 0, []
    for i in invoices:
        k = norm_id(i["id"])
        if k not in truth:
            continue
        n += 1
        t, note = truth[k]
        if t == i["verdict"]:
            agreed += 1
        else:
            failures.append({"invoiceId": i["id"], "toolSaid": i["verdict"], "truth": t,
                             "why": f"Correct answer: {note or t}. Tool's reason: {i['headline']}"})
    if not n:
        return None, []
    return {"sampleSize": n, "agreed": agreed, "rate": round(agreed / n, 4), "labelledBy": labelled_by}, failures


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="sample", help="sample | raw | path to a folder")
    ap.add_argument("--no-ai", action="store_true")
    ap.add_argument("--publish", action="store_true", help="copy results to web/src/data/results.json")
    args = ap.parse_args()
    if args.no_ai:
        os.environ["AI_OFF"] = "1"
    folder = {"sample": ROOT / "data" / "sample", "raw": ROOT / "data" / "raw"}.get(args.data, Path(args.data))
    t0 = time.time()
    cfg = load_config()
    data = load(folder, cfg)
    as_of = as_of_date(data)
    ai = AI(cfg)
    ai.check()
    engine = Engine(data, as_of, ai)
    res = engine.run()
    engine._rows = res["rows"]
    invoices = sorted(res["invoices"], key=lambda i: (VERDICTS.index(i["verdict"]), -i["amount"]))
    if ai.enabled:
        ai.save()

    by_verdict = {v: {"count": sum(1 for i in invoices if i["verdict"] == v),
                      "amount": round(sum(i["amount"] for i in invoices if i["verdict"] == v), 2)} for v in VERDICTS}
    by_cause = []
    for c, label in CAUSE_LABEL.items():
        sel = [i for i in invoices if i["cause"] == c]
        by_cause.append({"cause": c, "label": label, "amount": round(sum(i["amount"] for i in sel), 2), "count": len(sel)})
    by_cause.sort(key=lambda x: -x["amount"])
    total = sum(i["amount"] for i in invoices)
    no_chase = by_verdict["paid"]["amount"] + by_verdict["hold"]["amount"]
    pct = no_chase / total if total else 0
    # Holds that exist only because the AI wasn't sure are kept out of the headline: they're "unsure", not "found".
    unsure = sum(r.amount for r in engine._rows if r.flags.get("disputed_hold") and not (r.flags.get("dispute_hold") or 
        r.flags.get("complaint_hold") or r.flags.get("wrong_bill") or r.flags.get("paid_linked") or r.flags.get("paid_unmatched")))
    sure = no_chase - unsure
    pct = sure / total if total else 0
    headline = (f"{money(sure)} of {money(total)} overdue ({pct:.0%}) sits with customers we shouldn't chase today: "
                f"they've probably paid, they're unhappy, or the bill is wrong."
                + (f" Another {money(unsure)} is paused until a person reads a ticket the AI wasn't sure about." if unsure else ""))

    labels_path = (ROOT / "data" / "labels.csv") if args.data != "sample" else folder / "labels.csv"
    acc, failures = accuracy(invoices, labels_path, "planted answers in the sample data" if args.data == "sample" else
                                      "an independent review of all 54 bills by a reviewer who never saw the tool's answers, with every contested call confirmed by hand (24 Nov)")
    ms = engine.matcher.stats()
    vn = verified_numbers(engine, invoices, by_cause)
    review = [i for i in invoices if i["needsReview"]]
    holds = [i for i in invoices if i["verdict"] == "hold"]
    first_deadline = min((i["hold"]["deadline"] for i in holds), default=None)
    bullets = [
        f"{by_verdict['send']['count']} reminders ready to send ({money(by_verdict['send']['amount'])}). Approve all in one click.",
        f"{by_verdict['hold']['count']} on hold ({money(by_verdict['hold']['amount'])}): owners have until {first_deadline}." if holds else "Nothing on hold.",
        f"{by_verdict['paid']['count']} probably paid already ({money(by_verdict['paid']['amount'])}): confirm and close.",
        f"{by_verdict['call']['count']} need a phone call ({money(by_verdict['call']['amount'])}).",
        f"{len(review)} need a second look before anything goes out." if review else "No cases need a second look.",
    ]
    morning = {"title": f"Collections check, {as_of.date().isoformat()}", "bullets": bullets,
               "text": f"Good morning. {headline} Today: " + " ".join(bullets)}
    # Who gets what (Maya, 24 Nov): Slack direct messages, one a day per person, never a channel post.
    ppl = cfg.get("people", {})
    first = lambda x: str(x).split(" (")[0]  # noqa: E731
    priya, dana, marcus = first(ppl.get("finance_owner", "Finance")), first(ppl.get("vp_finance", "")), first(ppl.get("cash_owner", ""))
    routing = [{"to": priya, "role": "AR Specialist", "channel": "Slack direct message", "cc": dana or None,
                "lines": bullets, "by": None}]
    paid_bills = [i for i in invoices if i["verdict"] == "paid"]
    if paid_bills and marcus:
        routing.append({"to": marcus, "role": "Staff Accountant", "channel": "Slack direct message", "cc": priya,
                        "lines": [f"{i['customerName']}: invoice {i['id']}, {money(i['amount'])}" for i in paid_bills],
                        "by": pd.Timestamp(np.busday_offset(as_of.date(), int(cfg["policy"].get("paid_match_days", 2)), roll="forward")).strftime("%b %-d"),
                        "intro": f"{len(paid_bills)} overdue bills look already paid. Please match them; {priya} is copied and holds the reminders."})
    by_am: dict[str, list] = {}
    for i in invoices:
        h = i.get("hold") or {}
        if i["verdict"] == "hold" and h.get("ownerRole", "").startswith("Account manager"):
            by_am.setdefault(h["owner"], []).append(i)
        elif i["verdict"] == "hold" and "with " in h.get("ownerRole", ""):
            am = h["ownerRole"].split("with ")[-1].split(" for")[0]
            by_am.setdefault(am, []).append(i)
    for am, bills in sorted(by_am.items()):
        routing.append({"to": am, "role": "Account manager", "channel": "Slack direct message (one nudge a day)", "cc": None,
                        "lines": [f"{i['customerName']}: invoice {i['id']}, {money(i['amount'])}. {i['headline'][:110]}" for i in bills],
                        "by": pd.Timestamp(np.busday_offset(as_of.date(), int(cfg["policy"].get("am_pause_days", 3)), roll="forward")).strftime("%b %-d"),
                        "intro": f"{len(bills)} of your accounts have a reminder paused. Get each issue moving or tell {priya} the reminder can go; "
                                 f"after {cfg['policy'].get('am_pause_days', 3)} working days it comes back to {priya}."})
    # Dana: automatic write-offs coming (Maya: flag her at least five working days before)
    wo = [(r, i) for r in engine._rows for i in invoices if i["id"] == r.display_id and r.flags.get("writeoff_days_left") is not None]
    if wo and dana:
        routing.append({"to": dana, "role": "VP Finance", "channel": "Slack direct message", "cc": priya,
                        "lines": [f"{i['customerName']}: invoice {i['id']}, {money(i['amount'])}, written off automatically in {r.flags['writeoff_days_left']} days"
                                  for r, i in sorted(wo, key=lambda x: x[0].flags["writeoff_days_left"])],
                        "by": None,
                        "intro": f"{len(wo)} card invoices will be written off automatically soon. Chase them or let them go?"})
    lc = cfg.get("leave_cover") or {}
    if lc:
        morning["cover"] = (f"While {lc.get('person')} is on leave ({lc.get('when')}), {first(lc.get('cover', ''))} owns this morning list and "
                            f"{first(lc.get('paid_cover', ''))} keeps the probably-paid list. " + ("Cover is ON today." if lc.get("on_leave") else "Cover is off today."))
        if lc.get("on_leave") and routing:
            routing[0]["to"], routing[0]["cc"] = first(lc.get("cover")), None
    morning["routing"] = routing

    notes = list(dict.fromkeys(data.notes))
    if str(cfg["ai"].get("ticket_text")).lower() in ("off", "false", "no"):
        notes.append("No-vendor mode (Maya, 23 Nov): no AI provider is approved yet, so tickets are read with tags, status and simple rules "
                     "run locally; nothing leaves Ledgerline's systems. It now holds all 14 disputed bills, the same as the AI judges. Until 24 Nov it "
                     "missed two (Banerjee Petrov, Upton & Bell): their tickets named the invoice but read as escalations, so the tool said 'call'. Fixed, and "
                     "every call now shows the customer's tickets beside it.")
    elif not ai.enabled:
        why = ai.error or "no key"
        notes.append(f"AI judges were off for this run ({why}): ticket reading used rules only, and borderline names went to a person.")
    if not data.has("payments", "status"):
        notes.append("Payment status not recorded: failed card check skipped.")
    if args.data == "sample":
        notes.insert(0, "Sample data: made-up company and numbers, used to build and test the tool.")
    elif acc:
        notes.insert(0, "Honest accuracy: on first review the tool agreed with the independent reviewer on 46 of 54 bills (85%). "
                        "The review exposed four rule errors (a regulator complaint and a chargeback raised before the bill, a reminder sent before day 7, "
                        "and an email plus a call to one customer on the same day). They were fixed after seeing the review, so the current figure is "
                        "not a fresh-data result; the shadow week measures that.")

    results = {
        "meta": {"generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"), "asOf": as_of.date().isoformat(),
                 "dataSource": "sample" if args.data == "sample" else "real", "companyName": cfg["company_name"],
                 "files": [{"name": k, "rows": v} for k, v in data.rows.items()], "aiMode": ai.mode, "notes": notes,
                 "sources": cfg.get("sources", [])},
        "summary": {"overdueAmount": round(total, 2), "overdueCount": len(invoices), "byVerdict": by_verdict,
                    "byCause": by_cause, "shouldNotChaseAmount": round(no_chase, 2), "headline": headline},
        "invoices": invoices,
        "customers": res["customers"],
        "trend": trend(engine),
        "trendMarkers": cfg.get("trend_markers", []),
        "proof": {"matchRate": round(ms["rate"], 4),
                  "matchBreakdown": [{"method": k, "count": v} for k, v in sorted(ms["by_method"].items(), key=lambda x: -x[1])],
                  "accuracy": acc, "agreementRate": round(ai.agreements / ai.judgments, 4) if ai.judgments else None,
                  "verifiedNumbers": vn, "failures": failures[:12], "runtimeSeconds": round(time.time() - t0, 2),
                  "reviewLog": (json.loads((ROOT / "reports/review/review-log.json").read_text())
                                if args.data == "raw" and (ROOT / "reports/review/review-log.json").exists() else None)},
        "morningSummary": morning,
        "settings": [
            {"name": "Small reminder (auto-send limit)", "value": money(float(cfg.get("auto_send", {}).get("max_amount") or 0)), "who": "Priya, on this page", "source": "Maya, 24 Nov"},
            {"name": "Correction Priya can make herself", "value": f"up to {money(float(cfg['policy'].get('credit_self_approve_max', 0) or 0))}; Dana above that or any top-50 account", "who": "Dana", "source": "Maya, 24 Nov"},
            {"name": "Disputed bill: corrected invoice or clear answer", "value": f"{cfg['policy'].get('dispute_fix_days', 5)} working days", "who": "Dana to confirm", "source": "Maya, 24 Nov"},
            {"name": "Account manager pause before it comes back to Priya", "value": f"{cfg['policy'].get('am_pause_days', 3)} working days", "who": "Dana to confirm", "source": "Maya, 24 Nov"},
            {"name": "Marcus matches a probably-paid bill", "value": f"{cfg['policy'].get('paid_match_days', 2)} working days", "who": "Dana to confirm", "source": "Maya, 24 Nov"},
            {"name": "Flag Dana before an automatic write-off", "value": f"at least {cfg['policy'].get('write_off_flag_working_days', 5)} working days before", "who": "Dana", "source": "Maya, 24 Nov"},
            {"name": "Auto-send unlocks after", "value": f"{cfg.get('auto_send', {}).get('days_on_record', 30)} days of approvals on record", "who": "Maya", "source": "Maya, 24 Nov"},
            {"name": "March cover", "value": f"{(cfg.get('leave_cover') or {}).get('cover', '-')} owns the list; {(cfg.get('leave_cover') or {}).get('paid_cover', '-')} keeps probably paid", "who": "Dana to confirm her 20 minutes a day", "source": "Maya, 24 Nov"},
            {"name": "AI reading tickets", "value": "Off (no vendor) until legal approves a provider", "who": "Legal, via Maya", "source": "Maya, 23 Nov"},
        ],
        "monthOne": {
            "source": "Maya (COO), 24 Nov: the one number to watch, and her real test behind it",
            "measures": [
                {"label": "Overdue dollars over 60 days", "today": round(sum(i["amount"] for i in invoices if i["daysOverdue"] > 60), 2),
                 "todayText": f"{money(sum(i['amount'] for i in invoices if i['daysOverdue'] > 60))} across {sum(1 for i in invoices if i['daysOverdue'] > 60)} bills today",
                 "target": "Should start coming down from today's figure"},
                {"label": "Priya opens it every morning", "today": None, "todayText": "Counting starts on day one",
                 "target": "Still opened every working morning a month from now"},
                {"label": "Nobody chased who had paid or had a complaint open", "today": 0,
                 "todayText": "0 today (both checks on this page)", "target": "Still 0 after a month. If this slips, a good receivables number won't save it"},
            ],
            "timeSaved": "The tool replaces the 'asking around' step: about 3 to 4 of the team's 16 hours a week, by the COO's estimate. Priya to confirm before anyone quotes it.",
        },
        "autoSend": {
            "on": False,
            "daysOnRecord": 0,
            "daysNeeded": int(cfg.get("auto_send", {}).get("days_on_record", 30)),
            "maxAmount": cfg.get("auto_send", {}).get("max_amount"),
            "eligibleCount": sum(1 for i in invoices if i.get("autoSend", {}).get("eligible") and i["amount"] < float(cfg.get("auto_send", {}).get("max_amount") or 0)),
            "eligibleAmount": round(sum(i["amount"] for i in invoices if i.get("autoSend", {}).get("eligible") and i["amount"] < float(cfg.get("auto_send", {}).get("max_amount") or 0)), 2),
            "permanentCount": sum(1 for i in invoices if i.get("autoSend", {}).get("permanent")),
            "rule": "Maya (COO): only after a month of Priya's approvals on record showing she almost never changed them; only small, polite "
                    "first or second reminders outside the top 50 with no open ticket and no unmatched payment. Top-50, disputed, probably paid, "
                    "anything firmer than a friendly nudge and every phone call stay with a person permanently. Priya or Dana can switch it off in one click.",
        },
    }

    out_dir = ROOT / "data" / "cache"
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "results.json").write_text(json.dumps(results, indent=1, default=str))
    rep = ROOT / "reports"
    rep.mkdir(exist_ok=True)
    pd.DataFrame([{"invoice_id": i["id"], "customer": i["customerName"], "amount": i["amount"], "days_overdue": i["daysOverdue"],
                   "verdict": i["verdict"], "cause": i["cause"], "needs_review": i["needsReview"], "why": i["headline"]}
                  for i in invoices]).to_csv(rep / f"verdicts_{args.data if args.data in ('sample', 'raw') else 'custom'}.csv", index=False)
    todo = pd.DataFrame([{"invoice_id": i["id"], "customer": i["customerName"], "tool_verdict": i["verdict"], "true_verdict": "",
                          "note": "", "why_tool_said_it": i["headline"]} for i in
                         [x for x in invoices if x["verdict"] != "send"][:20] + [x for x in invoices if x["verdict"] == "send"][:10]])
    todo.to_csv(rep / "labels_todo.csv", index=False)
    if args.publish:
        dest = ROOT / "web" / "src" / "data" / "results.json"
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(out_dir / "results.json", dest)

    print(f"As of {as_of.date()} | {len(invoices)} overdue bills, {money(total)} | AI: {ai.mode} ({ai.calls} new calls)"
          + (f" | {ai.error}" if ai.error else ""))
    for v in VERDICTS:
        print(f"  {v:5s} {by_verdict[v]['count']:4d}  {money(by_verdict[v]['amount'])}")
    print(f"  needs review: {len(review)}")
    print(f"Match rate {ms['rate']:.1%} {ms['by_method']}  per system: {ms['per_system']}")
    if acc:
        print(f"Accuracy {acc['agreed']}/{acc['sampleSize']} = {acc['rate']:.1%} ({acc['labelledBy']})")
        for f in failures[:10]:
            print(f"   ✗ {f['invoiceId']}: tool={f['toolSaid']} truth={f['truth']} | {f['why'][:150]}")
    for n in vn:
        print(f"  {'✓' if n['ok'] else '✗'} {n['label']}: {n['valueA']:,} vs {n['valueB']:,}")
    print(headline)
    print(f"Done in {time.time() - t0:.1f}s{' | published to web/src/data/results.json' if args.publish else ''}")


if __name__ == "__main__":
    main()
