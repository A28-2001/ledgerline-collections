"""Checks that the pipeline behaves as designed. Uses the sample data and a fake AI, so no key is needed.

    .venv/bin/python pipeline/test_pipeline.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ai as ai_mod  # noqa: E402
from engine import Engine  # noqa: E402
from load import ROOT, as_of_date, load, load_config, norm_id  # noqa: E402
from match import Matcher, clean  # noqa: E402


def fake_call(self, model, prompt, max_tokens=8):
    """Model A reads vague money questions as billing; model B does too, except on one phrase (to test disagreement)."""
    p = prompt.lower()
    if "same company" in p or "same business" in p:
        return "yes"
    p = p.split("ticket subject:")[-1] if "ticket subject:" in p else p.split("message:")[-1]  # the ticket only
    vague = "number jump" in p or "pay more" in p
    if vague and model.startswith("qwen") and "jump" in p:
        return "other_complaint"  # judge B disagrees on this one
    if vague or "invoice" in p or "charg" in p or "billed" in p:
        return "billing_complaint"
    if "outage" in p or "log in" in p:
        return "serious_escalation"
    if "broken" in p or "error" in p or "frustrat" in p or "failing" in p:
        return "other_complaint"
    return "not_a_complaint"


def run(with_ai: bool):
    cfg = load_config(ROOT / "pipeline" / "config.sample.yaml")
    data = load(ROOT / "data" / "sample", cfg)
    os.environ.pop("AI_OFF", None)
    a = ai_mod.AI(cfg)
    a.enabled = with_ai
    a.cache = {}
    a.save = lambda: None
    ai_mod.AI._call = fake_call
    e = Engine(data, as_of_date(data), a)
    res = e.run()
    return {i["id"]: i for i in res["invoices"]}, a


RENAMED = {  # how the data room might name things differently from our sample
    "invoices.csv": {"invoice_id": "invoice_number", "customer_id": "account_id", "customer_name": "account_name",
                     "issue_date": "invoice_date", "amount": "total_usd", "status": "invoice_status", "paid_date": "paid_at",
                     "seats_billed": "quantity", "unit_price": "unit_price_usd"},
    "payments.csv": {"payment_id": "id", "invoice_id": "invoice_number", "payer_name": "remitter", "amount": "amount_usd",
                     "payment_date": "received_at", "status": "result"},
    "ar_aging.csv": {"invoice_number": "Num", "customer": "Customer", "invoice_date": "Date", "due_date": "Due Date",
                     "open_balance": "Open Balance", "days_past_due": "Past Due"},
    "tickets.csv": {"ticket_id": "id", "company": "organization", "created_at": "created", "status": "state",
                    "category": "type", "body": "description"},
    "customers.csv": {"customer_id": "account_id", "name": "account_name", "arr": "arr_usd", "account_manager": "owner",
                      "renewal_date": "renews_at"},
    "contracts.csv": {"contract_id": "id", "customer_id": "account_id", "price_per_seat": "price_per_seat_usd"},
    "contacts.csv": {"contact_id": "id", "customer_id": "account_id", "last_active": "last_login"},
}


def rehearsal_check(baseline: dict):
    """Hour 1 rehearsal: rename every column, put files in subfolders, let profile_data.py suggest the
    mapping, run the engine on it, and expect the same verdicts as the sample."""
    import copy
    import tempfile
    import pandas as pd
    import profile_data as prof
    cfg = load_config(ROOT / "pipeline" / "config.sample.yaml")
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        for f, ren in RENAMED.items():
            (tmp / "sub").mkdir(exist_ok=True)
            pd.read_csv(ROOT / "data/sample" / f, dtype=str, keep_default_na=False).rename(columns=ren).to_csv(tmp / "sub" / f, index=False)
        sug = copy.deepcopy(cfg)
        for table, spec in cfg["files"].items():
            _, kinds = prof.profile_csv(tmp / "sub" / spec["file"])
            for logical, (col, _) in prof.suggest_table(table, spec, kinds).items():
                sug["files"][table]["cols"][logical] = col
        data = load(tmp, sug)
        a = ai_mod.AI(sug)
        a.enabled = False
        res = Engine(data, as_of_date(data), a).run()
    got = {i["id"]: i["verdict"] for i in res["invoices"]}
    want = {k: v["verdict"] for k, v in baseline.items()}
    assert got == want, f"rehearsal verdicts differ on {sum(got.get(k) != v for k, v in want.items())} bills"
    print(f"Rehearsal with renamed columns and subfolders: mapping suggested, {len(got)} verdicts identical.")


def history_check(rules: dict):
    """Memory between mornings: an approved reminder comes back as a wait for its next stage, not a second email."""
    import csv
    import tempfile

    import pandas as pd
    cfg = load_config(ROOT / "pipeline" / "config.sample.yaml")
    send = next(i for i in rules.values() if i["verdict"] == "send")
    am_hold = next((i for i in rules.values() if i["verdict"] == "hold" and (i.get("hold") or {}).get("ownerRole", "").startswith("Account manager")), None)
    with tempfile.TemporaryDirectory() as tmp:
        data = load(ROOT / "data" / "sample", cfg)
        as_of = as_of_date(data)
        with open(Path(tmp) / "decisions.csv", "w", newline="") as fh:
            w = csv.writer(fh)
            w.writerow(["invoice_id", "final", "decision", "decided_at"])
            # approved this morning: a second run today must not suggest it again
            w.writerow([send["id"], "send", "approved", as_of.strftime("%Y-%m-%dT09:00:00Z")])
            # handed to an account manager 8 days ago: their 3 working days have run out
            if am_hold is not None:
                w.writerow([am_hold["id"], "hold", "approved", (as_of - pd.Timedelta(days=8)).strftime("%Y-%m-%dT09:00:00Z")])
        cfg["history_dir"] = tmp
        data = load(ROOT / "data" / "sample", cfg)
        a = ai_mod.AI(cfg)
        a.enabled = False
        eng = Engine(data, as_of, a)
        res = {i["id"]: i for i in eng.run()["invoices"]}
        # no list saved for the last working day: flagged in the morning message, not silent
        prev = (as_of.normalize() - pd.offsets.BDay(1)).normalize()
        assert eng.missed_save == prev, eng.missed_save
        with open(Path(tmp) / "decisions-prev.csv", "w", newline="") as fh:
            w = csv.writer(fh)
            w.writerow(["invoice_id", "final", "decision", "decided_at"])
            w.writerow([send["id"], "call", "approved", prev.strftime("%Y-%m-%dT09:00:00Z")])
        eng2 = Engine(load(ROOT / "data" / "sample", cfg), as_of, a)
        eng2.run()
        assert eng2.missed_save is None, eng2.missed_save
    again = res[send["id"]]
    assert again["verdict"] == "hold" and again["headline"].startswith("Too early for the next reminder"), again["headline"]
    print(f"Memory between mornings: {send['id']}, already approved, waits for its next stage instead of a second email.")
    print(f"Missed saves are said: no list for {prev:%b %d} is flagged, and saving one clears it.")
    if am_hold is not None:
        back = res[am_hold["id"]]["hold"]
        assert back["action"].startswith("Back with you"), back["action"]
        print(f"Hold clocks carry over: {am_hold['id']}, handed off 8 days ago, is back with finance.")


def main():
    assert norm_id("INV-001043") == "1043" and norm_id("1043.0") == "1043" and norm_id(" 1043 ") == "1043"
    assert clean("Northwind Logistics, Inc.") == clean("NORTHWIND LOGISTICS INC") == "northwind logistics"
    assert clean("Cedar Foods, L.L.C.") == "cedar foods"

    labels = {norm_id(l.split(",")[0]): l.split(",")[1] for l in (ROOT / "data/sample/labels.csv").read_text().splitlines()[1:]}

    rules, _ = run(with_ai=False)
    withai, a = run(with_ai=True)
    acc = lambda res: sum(res[k]["verdict"] == labels.get(norm_id(k)) for k in res) / len(res)  # noqa: E731
    print(f"rules only: {acc(rules):.1%}   with AI judges: {acc(withai):.1%}   agreement {a.agreements}/{a.judgments}")
    assert acc(withai) >= acc(rules), "AI judges should not make things worse on the sample"

    for inv in withai.values():
        assert inv["verdict"] in ("send", "hold", "paid", "call")
        assert inv["reasons"], f"{inv['id']} has no reason"
        ids = {e["id"] for e in inv["evidence"]}
        for r in inv["reasons"]:
            assert set(r["evidenceIds"]) <= ids, f"{inv['id']} cites evidence it doesn't carry"
        if inv["verdict"] == "hold":
            assert inv["hold"]["deadline"] and inv["hold"]["owner"], f"{inv['id']} hold without owner/deadline"
        if inv["verdict"] == "send":
            assert inv["draft"]["subject"] and inv["draft"]["body"]
            assert f"{inv['amount']:,.0f}" in inv["draft"]["body"].replace("$", ""), "draft must keep the amount"
        else:
            assert inv["draft"]["tone"] == "none", "only Send gets a draft"
    disputed = [i for i in withai.values() if i.get("agreement") and not i["agreement"]["agree"]]
    for i in disputed:
        assert i["needsReview"] and i["verdict"] != "send", "when judges disagree we must not chase"
    notes = {norm_id(l.split(",")[0]): l for l in (ROOT / "data/sample/labels.csv").read_text().splitlines()[1:]}
    paidly = [k for k, l in notes.items() if "unmatched bank payment" in l]
    assert paidly and all(rules[k]["verdict"] == "paid" for k in rules if norm_id(k) in paidly), "Paidly case: a paid bill would be chased"
    print(f"Paidly case: all {len(paidly)} bills paid by an unmatched bank payment are marked paid, none chased.")
    rehearsal_check(rules)
    history_check(rules)
    print(f"{len(withai)} bills, {len(disputed)} with judges disagreeing (all held for a person). All checks passed.")


if __name__ == "__main__":
    main()
