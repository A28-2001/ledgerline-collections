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
            or r.flags.get("complaint_hold") or r.flags.get("disputed_hold") or r.flags.get("dispute_hold") or r.flags.get("wrong_bill"))
    out.append({"label": "Shouldn't chase today", "methodA": "Sum of Hold + Probably paid verdicts", "valueA": round(a, 2),
                "methodB": "Recounted from the raw evidence flags", "valueB": round(b, 2), "ok": abs(a - b) < 0.5})
    # 4. The Paidly case: a bill with a matching or recent unmatched payment must never get a reminder
    chased = [r for r in engine._rows if (r.flags.get("paid_unmatched") or r.flags.get("paid_linked") or r.flags.get("recent_payment"))
              and getattr(r, "verdict", None) == "send" and not r.needs_review]
    out.append({"label": "Paid but chased (the Paidly case)", "methodA": "Bills with a matching or recent unmatched payment that would get a reminder",
                "valueA": len(chased), "methodB": "Allowed (Maya: chasing someone who has paid gets the tool switched off)", "valueB": 0,
                "ok": len(chased) == 0})
    # 5. Count
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
    acc, failures = accuracy(invoices, labels_path, "planted answers in the sample data" if args.data == "sample" else "hand-checked by me")
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

    notes = list(dict.fromkeys(data.notes))
    if not ai.enabled:
        why = ai.error or "no key"
        notes.append(f"AI judges were off for this run ({why}): ticket reading used rules only, and borderline names went to a person.")
    if not data.has("payments", "status"):
        notes.append("Payment status not recorded: failed card check skipped.")
    if args.data == "sample":
        notes.insert(0, "Sample data: made-up company and numbers, used to build and test the tool.")

    results = {
        "meta": {"generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"), "asOf": as_of.date().isoformat(),
                 "dataSource": "sample" if args.data == "sample" else "real", "companyName": cfg["company_name"],
                 "files": [{"name": k, "rows": v} for k, v in data.rows.items()], "aiMode": ai.mode, "notes": notes},
        "summary": {"overdueAmount": round(total, 2), "overdueCount": len(invoices), "byVerdict": by_verdict,
                    "byCause": by_cause, "shouldNotChaseAmount": round(no_chase, 2), "headline": headline},
        "invoices": invoices,
        "customers": res["customers"],
        "trend": trend(engine),
        "trendMarkers": cfg.get("trend_markers", []),
        "proof": {"matchRate": round(ms["rate"], 4),
                  "matchBreakdown": [{"method": k, "count": v} for k, v in sorted(ms["by_method"].items(), key=lambda x: -x[1])],
                  "accuracy": acc, "agreementRate": round(ai.agreements / ai.judgments, 4) if ai.judgments else None,
                  "verifiedNumbers": vn, "failures": failures[:12], "runtimeSeconds": round(time.time() - t0, 2)},
        "morningSummary": morning,
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
