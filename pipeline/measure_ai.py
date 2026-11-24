"""What does AI ticket-reading actually change? Measured, not claimed.

Runs the same 54 real bills twice: rules only (no-vendor mode, the production default) and with the two
AI judges reading masked ticket text. The AI side uses only the answers saved in data/cache/ai_cache.json
from the test run on the fictional data room: no new calls are made, so nothing is sent anywhere.
Any ticket the cache doesn't cover is counted and reported, never guessed.

    .venv/bin/python pipeline/measure_ai.py
"""
from __future__ import annotations

import copy
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ai import AI  # noqa: E402
from engine import Engine  # noqa: E402
from load import ROOT, as_of_date, load, load_config  # noqa: E402

misses: list[str] = []


def cache_only(self, model, prompt, max_tokens=8):  # replaces the network call
    misses.append(model)
    return ""


def run(cfg, ai_on: bool):
    c = copy.deepcopy(cfg)
    c["ai"]["ticket_text"] = "redacted" if ai_on else "off"
    data = load(ROOT / "data" / "raw", c)
    ai = AI(c)
    if ai_on:
        ai.enabled = True
    out = Engine(data, as_of_date(data), ai).run()
    return {i["id"]: i for i in out["invoices"]}


def main():
    AI._call = cache_only
    AI.check = lambda self: None
    os.environ.pop("GROQ_API_KEY", None)
    cfg = load_config()
    rules = run(cfg, ai_on=False)
    misses.clear()
    with_ai = run(cfg, ai_on=True)
    labels = {}
    lp = ROOT / "data" / "labels.csv"
    if lp.exists():
        import csv
        labels = {r["invoice_id"]: r["true_verdict"] for r in csv.DictReader(lp.open())}
    changed = [(k, rules[k]["verdict"], with_ai[k]["verdict"], labels.get(k)) for k in rules if rules[k]["verdict"] != with_ai[k]["verdict"]]
    review_changed = [k for k in rules if rules[k]["needsReview"] != with_ai[k]["needsReview"]]
    agree = lambda run_: sum(1 for k, v in run_.items() if labels.get(k) == v["verdict"])  # noqa: E731
    result = {
        "bills": len(rules),
        "cacheMisses": len(misses),
        "verdictsChanged": [{"invoice": k, "rules": a, "withAI": b, "review": t} for k, a, b, t in changed],
        "checkFirstRules": sum(1 for v in rules.values() if v["needsReview"]),
        "checkFirstWithAI": sum(1 for v in with_ai.values() if v["needsReview"]),
        "checkFirstChanged": len(review_changed),
        "agreeRules": agree(rules) if labels else None,
        "agreeWithAI": agree(with_ai) if labels else None,
    }
    out = ROOT / "reports" / "ai-uplift.json"
    out.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
