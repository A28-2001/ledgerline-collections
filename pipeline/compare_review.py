"""Compare the tool's answers with an independent review of the same bills.

    python pipeline/compare_review.py reports/review/independent-review.csv

Writes data/labels.csv (read by run.py for the accuracy figure and the "where it's wrong" list)
and reports/review/review-54.md (every bill, side by side, disagreements first).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    review_path = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "reports/review/independent-review.csv"
    rev = pd.read_csv(review_path, dtype=str, keep_default_na=False)
    rev["should_be"] = rev["should_be"].str.strip().str.lower()
    res = json.loads((ROOT / "web/src/data/results.json").read_text())
    tool = {i["id"]: i for i in res["invoices"]}
    missing = sorted(set(tool) - set(rev["invoice_id"]))
    extra = sorted(set(rev["invoice_id"]) - set(tool))
    rows = []
    for r in rev.itertuples():
        i = tool.get(r.invoice_id)
        if not i:
            continue
        rows.append({"invoice_id": r.invoice_id, "customer": i["customerName"], "amount": i["amount"], "days": i["daysOverdue"],
                     "tool": i["verdict"], "tool_check_first": i["needsReview"], "review": r.should_be, "confidence": r.confidence,
                     "person_first": r.person_first, "review_reason": r.reason, "rule_doubt": r.rule_doubt,
                     "tool_reason": i["headline"], "agree": i["verdict"] == r.should_be})
    df = pd.DataFrame(rows).sort_values(["agree", "amount"], ascending=[True, False])
    n, ok = len(df), int(df["agree"].sum())
    # labels for run.py: the reviewer's answer is the "truth" until a person confirms it
    lab = df[["invoice_id", "review", "review_reason"]].rename(columns={"review": "true_verdict", "review_reason": "note"})
    lab.to_csv(ROOT / "data/labels.csv", index=False)

    by_amt = df.groupby("agree")["amount"].sum().to_dict()
    lines = [f"# Review of all {n} overdue bills: tool vs independent reviewer", "",
             f"The reviewer read the raw records (masked tickets, payments, contracts) and Ledgerline's policy, without seeing the tool's answers.",
             f"Agreement: **{ok} of {n} bills ({ok / n:.0%})**, ${by_amt.get(True, 0):,.0f} of ${df['amount'].sum():,.0f}.", ""]
    if missing or extra:
        lines += [f"Not reviewed: {missing}. Reviewed but not in the tool: {extra}.", ""]
    conf = pd.crosstab(df["tool"], df["review"], margins=True)
    lines += ["## Tool (rows) vs reviewer (columns)", "", "```", conf.to_string(), "```", "",
              "## Where they disagree", "", "| Invoice | Customer | $ | Days | Tool | Reviewer | Reviewer's reason | Tool's reason |", "|---|---|---|---|---|---|---|---|"]
    for r in df[~df["agree"]].itertuples():
        lines.append(f"| {r.invoice_id} | {r.customer} | {r.amount:,.0f} | {r.days} | {r.tool}{' (check first)' if r.tool_check_first else ''} | "
                     f"{r.review} ({r.confidence}) | {r.review_reason.replace('|', '/')} | {r.tool_reason.replace('|', '/')[:140]} |")
    doubts = df[df["rule_doubt"].str.strip() != ""]
    if len(doubts):
        lines += ["", "## Where the reviewer doubts a rule", ""] + [f"- **{r.invoice_id} {r.customer}**: {r.rule_doubt}" for r in doubts.itertuples()]
    lines += ["", "## All bills where they agree", "", "| Invoice | Customer | $ | Answer | Reviewer's reason |", "|---|---|---|---|---|"]
    for r in df[df["agree"]].itertuples():
        lines.append(f"| {r.invoice_id} | {r.customer} | {r.amount:,.0f} | {r.tool} | {r.review_reason.replace('|', '/')} |")
    (ROOT / "reports/review/review-54.md").write_text("\n".join(lines) + "\n")
    print(f"Agreement {ok}/{n} ({ok / n:.0%}); disagreements {n - ok}; rule doubts {len(doubts)}")
    print(conf.to_string())
    for r in df[~df["agree"]].itertuples():
        print(f"  ✗ {r.invoice_id} {r.customer[:26]:26} ${r.amount:>9,.0f} {r.days:>3}d tool={r.tool:5} review={r.review:5} ({r.confidence}) | {r.review_reason[:120]}")


if __name__ == "__main__":
    main()
