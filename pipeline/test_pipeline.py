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
    cfg = load_config()
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
    print(f"{len(withai)} bills, {len(disputed)} with judges disagreeing (all held for a person). All checks passed.")


if __name__ == "__main__":
    main()
