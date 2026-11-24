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
from engine import CAUSE_LABEL, Engine, iso, money, nice  # noqa: E402
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


def light_lines(invoices, cfg, as_of, missed_save=None) -> list[str]:
    """The morning message, kept light: what needs Priya today, in four short lines at most."""
    as_iso = as_of.strftime("%Y-%m-%d")
    send = [i for i in invoices if i["verdict"] == "send"]
    ready = [i for i in send if not i["needsReview"]]
    mine = [i for i in invoices if i["verdict"] == "hold" and i["cause"] == "wrong_bill" and i.get("hold")
            and i["hold"]["deadline"] <= as_iso and i["hold"]["ownerRole"].startswith("Finance")]
    calls = [i for i in invoices if i["verdict"] == "call"]
    paid = [i for i in invoices if i["verdict"] == "paid"]
    marcus = str(cfg.get("people", {}).get("cash_owner", "the cash team")).split(" (")[0].split()[0]
    out = []
    if missed_save is not None:
        out.append(f"No decision list was saved for {nice(missed_save)}: some reminders may come back, so check before approving")
    if send:
        later = len(send) - len(ready)
        out.append(f"{len(send)} bills to remind" + (f": {len(ready)} ready now, {later} after a quick check" if later else ""))
    all_mine = [i for i in invoices if i["verdict"] == "hold" and i["cause"] == "wrong_bill" and i.get("hold")
                and i["hold"]["ownerRole"].startswith("Finance")]
    if all_mine:
        out.append(f"{len(all_mine)} disputes to fix, {len(mine)} past the 5-day target: a corrected bill or a clear answer")
    others = [i for i in invoices if i["verdict"] == "hold" and i not in all_mine]
    if others:
        out.append(f"{len(others)} bills on hold with an owner and a deadline")
    if calls:
        out.append(f"{len(calls)} bills to call about")
    if paid:
        out.append(f"{len(paid)} bills look paid: {marcus} is matching them")
    return out


def send_line(invoices) -> str:
    """Reminders ready now, and the ones that wait for a check first."""
    send = [i for i in invoices if i["verdict"] == "send"]
    ready = [i for i in send if not i["needsReview"]]
    later = len(send) - len(ready)
    line = f"{len(ready)} reminders ready to approve ({money(sum(i['amount'] for i in ready))})"
    return line + (f", and {later} more after a check." if later else ".")


def short(text: str, limit: int = 120) -> str:
    """The first sentence, or the text cut at a word with an ellipsis."""
    first_sentence = text.split(". ")[0].rstrip(".") + "."
    if len(first_sentence) <= limit:
        return first_sentence
    return text[:limit].rsplit(" ", 1)[0].rstrip(",;:") + "…"


def hold_line(holds, by_verdict, engine):
    """One line for the morning message: how many holds are past their target, and the next date for the rest."""
    as_of = engine.as_of.strftime("%Y-%m-%d")
    late = [i for i in holds if i["hold"]["deadline"] <= as_of]
    later = sorted(i["hold"]["deadline"] for i in holds if i["hold"]["deadline"] > as_of)
    head = f"{by_verdict['hold']['count']} on hold ({money(by_verdict['hold']['amount'])})"
    parts = []
    if late:
        parts.append(f"{len(late)} past their target date, so the owner acts today")
    if later:
        parts.append(f"the rest by {nice(later[0])} at the earliest")
    return f"{head}: " + "; ".join(parts) + "."


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
            or r.flags.get("complaint_hold") or r.flags.get("disputed_hold") or r.flags.get("dispute_hold") or r.flags.get("open_ticket_hold") or r.flags.get("grave_hold") or r.flags.get("too_early") or r.flags.get("wrong_bill") or r.flags.get("twin_payment") or r.flags.get("wait_next"))
    out.append({"label": "Shouldn't chase today", "methodA": "Sum of Hold + Probably paid verdicts", "valueA": round(a, 2),
                "methodB": "Recounted from the raw evidence flags", "valueB": round(b, 2), "ok": abs(a - b) < 0.5})
    # 4. The Paidly case: a bill with a matching or recent unmatched payment must never get a reminder
    chased = [r for r in engine._rows if (r.flags.get("paid_unmatched") or r.flags.get("paid_linked") or r.flags.get("recent_payment") or r.flags.get("twin_payment"))
              and getattr(r, "verdict", None) == "send" and not r.needs_review]
    out.append({"label": "Would chase someone who paid (the Paidly case)", "methodA": "Bills with a matching or recent unmatched payment that would get a reminder",
                "valueA": len(chased), "methodB": "Allowed (Maya: chasing someone who has paid gets the tool switched off)", "valueB": 0,
                "ok": len(chased) == 0, "unit": "count", "group": "coo",
                "note": "Earlier, a blank-memo payment was assumed to pay the older of two same-amount bills; now Marcus confirms which."})
    # 5. Maya's real test, second half: nobody chased who had a complaint open
    tk_open = [r for r in engine._rows if getattr(r, "verdict", None) in ("send", "call") and not r.needs_review
               and any(e["kind"] == "ticket" and str(e.get("status") or "") in engine.v["ticket_open_status"] for e in r.evidence)
               and not r.flags.get("soft")]
    strict = sorted({r.match.customer_id for r in engine._rows if getattr(r, "verdict", None) in ("send", "call")
                     and any(e["kind"] == "ticket" and str(e.get("status") or "").split(" (")[0] in engine.v["ticket_open_status"] for e in r.evidence)})
    strict_names = [engine.customer_name(c) for c in strict]
    out.append({"label": "Would chase someone with a complaint open", "methodA": "Reminders or calls to a customer with an open ticket, or a pending one about money or marked high priority",
                "valueA": len(tk_open), "methodB": "Allowed (Maya: nobody chased who had a complaint open)", "valueB": 0, "ok": len(tk_open) == 0,
                "unit": "count", "group": "coo",
                "strictValue": len(strict),
                "note": "Earlier versions would have chased 3; each became a rule."})
    for v in out:
        v.setdefault("unit", "money")
        v.setdefault("group", "internal" if v["label"] == "Causes add up" else "cross")
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
                             "why": f"Correct answer: {(note or t).rstrip('. ')}. Tool's reason: {i['headline']}"})
    if not n:
        return None, []
    orig_path = ROOT / "reports" / "review" / "independent-review.csv"
    agreed_orig = None
    if orig_path.exists():
        orig = {norm_id(r["invoice_id"]): str(r.get("should_be") or "").strip().lower()
                for r in pd.read_csv(orig_path, dtype=str).fillna("").to_dict("records")}
        agreed_orig = sum(1 for i in invoices if orig.get(norm_id(i["id"])) == i["verdict"])
    return {"sampleSize": n, "agreed": agreed, "rate": round(agreed / n, 4), "labelledBy": labelled_by,
            "agreedOriginal": agreed_orig}, failures


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
                                      "an independent review of all 54 bills by a separate AI model (Claude, in its own session) that never saw the tool's answers, with every contested bill checked by a person (24 Nov)")
    ms = engine.matcher.stats()
    vn = verified_numbers(engine, invoices, by_cause)
    review = [i for i in invoices if i["needsReview"]]
    holds = [i for i in invoices if i["verdict"] == "hold"]
    first_deadline = min((i["hold"]["deadline"] for i in holds), default=None)
    bullets = [
        send_line(invoices),
        hold_line(holds, by_verdict, engine) if holds else "Nothing on hold.",
        f"{by_verdict['paid']['count']} probably paid already ({money(by_verdict['paid']['amount'])}): with "
        f"{str(cfg.get('people', {}).get('cash_owner', 'the cash team')).split(' (')[0]} to match; you're copied.",
        f"{by_verdict['call']['count']} need a phone call ({money(by_verdict['call']['amount'])}).",
        f"{len(review)} of these need a second look first, in Check first." if review else "Nothing needs a second look.",
    ]
    light = light_lines(invoices, cfg, as_of, getattr(engine, "missed_save", None))
    app_url = cfg.get("app_url", "https://ledgerline-collections.vercel.app")
    morning = {"title": f"Collections check, {nice(as_of)}", "bullets": light, "link": app_url,
               "text": "Good morning. " + ("Shadow week: nothing goes out from the tool, so compare its list with your own calls. "
                                       if cfg.get("shadow_week") else "") + "Today's list is built to sort in about 5 minutes; the disputes are the day's work.",
               "detail": bullets}
    # Who gets what (Maya, 24 Nov): Slack direct messages, one a day per person, never a channel post.
    ppl = cfg.get("people", {})
    first = lambda x: str(x).split(" (")[0]  # noqa: E731
    priya, dana, marcus = first(ppl.get("finance_owner", "Finance")), first(ppl.get("vp_finance", "")), first(ppl.get("cash_owner", ""))
    routing = [{"to": priya, "role": "AR Specialist", "channel": "Slack direct message", "cc": dana or None,
                "lines": light, "by": None}]
    paid_bills = [i for i in invoices if i["verdict"] == "paid"]
    twin_bills = [i for i in invoices if (i.get("hold") or {}).get("twinOf")]
    if (paid_bills or twin_bills) and marcus:
        routing.append({"to": marcus, "role": "Staff Accountant", "channel": "Slack direct message", "cc": priya,
                        "lines": ([f"{i['customerName']}: which bill does the {money(i['amount'])} payment pay, {i['hold']['twinOf']} or {i['id']}?" for i in twin_bills]
                                  + [f"{i['customerName']}, {money(i['amount'])}" for i in paid_bills])[:3],
                        "more": max(0, len(twin_bills) + len(paid_bills) - 3),
                        "by": pd.Timestamp(np.busday_offset(as_of.date(), int(cfg["policy"].get("paid_match_days", 2)), roll="forward")).strftime("%b %-d"),
                        "intro": f"{len(paid_bills)} {'bill is' if len(paid_bills) == 1 else 'bills are'} probably paid. Please match them; no reminders go out meanwhile."
                                 + (f" One payment could pay either of two bills: tell {priya} which." if twin_bills else "")})
    by_am: dict[str, list] = {}
    for i in invoices:
        h = i.get("hold") or {}
        if i["verdict"] == "hold" and h.get("ownerRole", "").startswith("Account manager"):
            by_am.setdefault(h["owner"], []).append(i)
        elif i["verdict"] == "hold" and "with " in h.get("ownerRole", ""):
            am = h["ownerRole"].split("with ")[-1].split(" for")[0]
            by_am.setdefault(am, []).append(i)
    # Policy: tell the account manager before finance contacts one of their accounts.
    going: dict[str, list] = {}
    for i in invoices:
        am_name = (engine.account_manager(i.get("customerId")) or "")
        if am_name and i["verdict"] in ("send", "call"):
            going.setdefault(am_name, []).append(i)
    for am in sorted(set(by_am) | set(going)):
        bills, out_today = by_am.get(am, []), going.get(am, [])
        ok_needed = [i for i in bills if (i.get("hold") or {}).get("ownerRole", "").startswith("Finance")]
        bills = [i for i in bills if i not in ok_needed]
        lines = [f"Your OK on seats or price: {i['customerName']}, {money(i['amount'])} (Priya is fixing the bill)" for i in ok_needed]
        lines += [f"Paused: {i['customerName']}, {money(i['amount'])}" for i in bills]
        if not cfg.get("shadow_week"):  # in the shadow week nothing goes out, so nothing is "planned"
            lines += [f"Planned: {'reminder' if i['verdict'] == 'send' else 'call'} to {i['customerName']}, {money(i['amount'])}" for i in out_today]
        intro = []
        if ok_needed:
            intro.append(f"Priya needs your OK on {len(ok_needed)} {'dispute' if len(ok_needed) == 1 else 'disputes'} she's fixing.")
        if bills:
            intro.append(f"{len(bills)} {'account' if len(bills) == 1 else 'accounts'} paused until you move the issue on.")
        if out_today and not cfg.get("shadow_week"):
            who = len({i.get("customerId") or i["id"] for i in out_today})
            intro.append(f"{who} {'customer' if who == 1 else 'customers'} contacted today once Priya approves; reply if any should wait.")
        routing.append({"to": am, "role": "Account manager", "channel": "Slack direct message (one a day)", "cc": None,
                        "lines": lines[:3], "more": max(0, len(lines) - 3),
                        "by": pd.Timestamp(np.busday_offset(as_of.date(), int(cfg["policy"].get("am_pause_days", 3)), roll="forward")).strftime("%b %-d") if bills else None,
                        "intro": " ".join(intro)})
    # Dana: automatic write-offs coming (Maya: flag her at least five working days before)
    wo = [(r, i) for r in engine._rows for i in invoices if i["id"] == r.display_id and r.flags.get("writeoff_days_left") is not None]
    wo_ids = {i["id"] for _, i in wo}
    esc_days = int(cfg["policy"].get("escalate_after_days") or 0)
    escalate = [i for i in invoices if esc_days and i["verdict"] == "call" and i["daysOverdue"] >= esc_days and i["id"] not in wo_ids]
    if (wo or escalate) and dana:
        wo_lines = [f"{i['customerName']}: {money(i['amount'])}, written off in {r.flags['writeoff_days_left']} day{'' if r.flags['writeoff_days_left'] == 1 else 's'}"
                    for r, i in sorted(wo, key=lambda x: x[0].flags["writeoff_days_left"])]
        wo_lines += [f"{i['customerName']}: {money(i['amount'])}, {i['daysOverdue']} days late: escalate" for i in escalate]
        routing.append({"to": dana, "role": "VP Finance", "channel": "Slack direct message", "cc": priya,
                        "lines": wo_lines[:3], "more": max(0, len(wo_lines) - 3),
                        "by": None,
                        "intro": " ".join(x for x in [
                            f"{len(wo)} card invoices will be written off automatically soon: chase them or let them go?" if wo else "",
                            f"{len(escalate)} more {'bill is' if len(escalate) == 1 else 'bills are'} past {esc_days} days: yours to escalate." if escalate else ""] if x)})
    for r in routing[1:]:
        r["link"] = app_url
    lc = cfg.get("leave_cover") or {}
    if lc:
        morning["cover"] = (f"While {lc.get('person')} is on leave ({str(lc.get('when')).replace(' (', ', ').rstrip(')')}), {first(lc.get('cover', ''))} owns this morning list and "
                            f"{first(lc.get('paid_cover', ''))} keeps the probably-paid list. " + ("Cover is ON today." if lc.get("on_leave") else "Cover is off today."))
        if lc.get("on_leave") and routing:
            routing[0]["to"], routing[0]["cc"] = first(lc.get("cover")), None
    morning["routing"] = routing

    notes = list(dict.fromkeys(data.notes))
    if str(cfg["ai"].get("ticket_text")).lower() in ("off", "false", "no"):
        notes.append("No-vendor mode (Maya, 23 Nov): no AI provider is approved yet, so tickets are read with tags, status and simple rules "
                     "run locally; no ticket text leaves Ledgerline's systems. It now holds all 14 disputed bills, the same as the AI judges. Until 24 Nov it "
                     "missed two (Banerjee Petrov, Upton & Bell): their tickets named the invoice but read as escalations, so the tool said 'call'. Fixed, and "
                     "every call now shows the customer's tickets beside it.")
    elif not ai.enabled:
        why = ai.error or "no key"
        notes.append(f"AI judges were off for this run ({why}): ticket reading used rules only, and borderline names went to a person.")
    if not data.has("payments", "status") and not data.has("invoices", "status"):
        notes.append("Payment status not recorded: failed card check skipped.")
    if args.data == "sample":
        notes.insert(0, "Sample data: made-up company and numbers, used to build and test the tool.")
    elif acc:
        notes.insert(0, "Honest accuracy: on its first pass the tool agreed with the independent reviewer on 46 of 54 bills (85%). "
                        "Of the 8 differences, 5 were rule errors we fixed, 2 were judgment calls, since confirmed by Maya, and 1 we kept on purpose. A later rule change caused one more "
                        "(Studio Marsh), which the same review caught. The current figure is on the bills the rules were fixed against, "
                        "so it is not a fresh-data result; the shadow week measures that.")

    results = {
        "meta": {"generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"), "asOf": as_of.date().isoformat(),
                 "dataSource": "sample" if args.data == "sample" else "real", "companyName": cfg["company_name"],
                 "files": [{"name": k, "rows": v} for k, v in data.rows.items()], "aiMode": ai.mode, "notes": notes,
                 "sources": cfg.get("sources", []), "shadowWeek": bool(cfg.get("shadow_week", False))},
        "summary": {"overdueAmount": round(total, 2), "overdueCount": len(invoices), "byVerdict": by_verdict,
                    "tickets": getattr(engine, "ticket_stats", None),
                    "unmatchedPayments": getattr(engine, "unmatched_count", None),
                    "historyGap": iso(getattr(engine, "missed_save", None)),
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
                                if args.data == "raw" and (ROOT / "reports/review/review-log.json").exists() else None),
                  # What AI ticket-reading changes on these bills, measured by pipeline/measure_ai.py from saved answers.
                  "aiUplift": (json.loads((ROOT / "reports/ai-uplift.json").read_text())
                               if args.data == "raw" and (ROOT / "reports/ai-uplift.json").exists() else None)},
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
            ],
            "timeSaved": "Time saved: the COO estimates 3 to 4 of the team's 16 hours a week, the 'asking around' step. Priya to confirm.",
        },
        "autoSend": {
            "on": False,
            "daysOnRecord": len(getattr(engine, "record_days", set())),
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
