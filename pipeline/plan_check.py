"""Hour 1 in ten minutes: test every assumption in our plan against the real files, and list surprises.

    python pipeline/plan_check.py --data raw      # writes reports/plan-vs-data-raw.md

Each assumption gets: what the data says, a status (holds / partly / contradicts / can't tell),
and what changes in the plan. Rules only (no AI), so it is fast and free.
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
os.environ["AI_OFF"] = "1"
from ai import AI  # noqa: E402
from engine import Engine, money  # noqa: E402
from load import ROOT, as_of_date, load, load_config  # noqa: E402
from run import trend  # noqa: E402

# Row counts from the data room listing shown before Begin.
EXPECTED_ROWS = {"customers.csv": 508, "contacts.csv": 967, "contracts.csv": 1757, "invoices.csv": 6062,
                 "payments.csv": 5808, "ar_aging.csv": 117, "tickets.csv": 1041}
ICON = {"holds": "✅ holds", "partly": "⚠️ partly", "contradicts": "❌ contradicts", "unknown": "❔ can't tell"}


def grep(text: str, pattern: str, n: int = 6) -> list[str]:
    lines = [ln.strip(" -*#\t") for ln in text.splitlines() if re.search(pattern, ln, re.I)]
    return [ln[:160] for ln in lines if ln][:n]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="sample")
    args = ap.parse_args()
    folder = {"sample": ROOT / "data" / "sample", "raw": ROOT / "data" / "raw"}.get(args.data, Path(args.data))
    cfg = load_config()
    data = load(folder, cfg)
    as_of = as_of_date(data)
    e = Engine(data, as_of, AI(cfg))
    res = e.run()
    e._rows = rows = res["rows"]
    inv_out = res["invoices"]
    t = data.tables
    total = sum(r.amount for r in rows)
    checks: list[tuple[str, str, str, str]] = []  # assumption, finding, status, change

    # A1 overdue rising
    tr = trend(e)
    if len(tr) >= 7:
        now, before = tr[-1]["overdueShare"], tr[-7]["overdueShare"]
        st = "holds" if now > before * 1.1 else "contradicts" if now < before * 0.9 else "partly"
        checks.append(("Overdue bills are rising",
                       f"Overdue share of open bills: {before:.0%} in {tr[-7]['month']} → {now:.0%} in {tr[-1]['month']}. "
                       f"Overdue now {money(tr[-1]['overdueAmount'])}.", st,
                       "Lead the video with the trend." if st == "holds" else "Don't claim a rising trend; frame as steady-state cost."))
    else:
        checks.append(("Overdue bills are rising", "Not enough invoice history to build a trend.", "unknown", "Use the AR export only."))

    # A2 billing rewrite
    marker = (cfg.get("trend_markers") or [{}])[0].get("month")
    inv = t["invoices"]
    if marker and len(inv) and len(t["contracts"]):
        mk = pd.Timestamp(marker + "-01")
        sample = inv.dropna(subset=["issue_date"])
        sample = sample[sample["issue_date"] >= mk - pd.DateOffset(months=6)]  # 6 months before vs everything after
        if len(sample) > 3000:
            sample = sample.sample(3000, random_state=1)
        wrong = {"before": [0, 0], "after": [0, 0]}
        for r in sample.to_dict("records"):
            k = e.contract_for(str(r["customer_id"]), r["issue_date"])
            chk = e.bill_matches_contract(r, k) if k else None
            if chk is None:
                continue
            side = "after" if r["issue_date"] >= mk else "before"
            wrong[side][0] += int(not chk[0])
            wrong[side][1] += 1
        b = wrong["before"][0] / wrong["before"][1] if wrong["before"][1] else None
        a = wrong["after"][0] / wrong["after"][1] if wrong["after"][1] else None
        pre = [p["overdueShare"] for p in tr if p["month"] < marker]
        post = [p["overdueShare"] for p in tr if p["month"] >= marker]
        txt = []
        if b is not None and a is not None:
            txt.append(f"Bills that don't match the contract: {b:.1%} in the 6 months before {marker}, {a:.1%} since "
                       f"({wrong['before'][1]:,} and {wrong['after'][1]:,} bills checked).")
        if pre and post:
            txt.append(f"Average overdue share {sum(pre)/len(pre):.0%} before, {sum(post)/len(post):.0%} after.")
        st = "unknown" if a is None or b is None else "holds" if a > b * 1.5 and a > 0.01 else "contradicts" if a <= b else "partly"
        checks.append((f"Things got worse after the billing rewrite ({marker})", " ".join(txt) or "Couldn't compare.", st,
                       "This is the headline finding: put the before/after in the video and one-pager." if st == "holds"
                       else "Keep the wrong-bill check but don't blame the rewrite."))
    else:
        checks.append(("Things got worse after the billing rewrite", "No contract or invoice data to compare.", "unknown", "Drop the claim."))

    # A3 tickets
    hold_c = [r for r in rows if r.flags.get("complaint_hold")]
    soft = [r for r in rows if r.flags.get("soft") and not r.flags.get("complaint_hold")]
    st = "holds" if hold_c else "contradicts"
    checks.append(("Some overdue customers are unhappy right now (open tickets)",
                   f"{len(hold_c)} overdue bills ({money(sum(r.amount for r in hold_c))}) have an open billing complaint or serious escalation; "
                   f"{len(soft)} more have an open product complaint.", st,
                   "Hold rule is core." if hold_c else "Complaint check matters less: make it a footnote."))

    # A4 unmatched payments
    pay = t["payments"]
    unl = pay[pay["invoice_id_key"].fillna("") == ""] if len(pay) else pay
    paid = [r for r in rows if r.flags.get("paid_unmatched") or r.flags.get("paid_linked")]
    checks.append(("Some 'overdue' bills were already paid",
                   f"{len(unl):,} payments aren't linked to a bill ({money(unl['amount'].sum() if len(unl) else 0)}). "
                   f"{len(paid)} overdue bills ({money(sum(r.amount for r in paid))}) look already paid.",
                   "holds" if paid else "contradicts" if len(unl) else "unknown",
                   "Probably-paid check stays in v1." if paid else "Move the paid check to 'more time'."))

    # A5 names
    ms = e.matcher.stats()
    per = "; ".join(f"{k}: {v[0]}/{v[1]}" for k, v in ms["per_system"].items())
    checks.append(("Names differ across systems (the matcher is needed)",
                   f"Match rate {ms['rate']:.1%}. By method: {ms['by_method']}. By system: {per}.",
                   "holds" if ms["by_method"].get("fuzzy", 0) + ms["by_method"].get("unmatched", 0) > 0 else "contradicts",
                   "Report the match rate on the Proof page."))

    # A6 reminder history
    hist = []
    for p in sorted(folder.rglob("*.csv")):
        cols = pd.read_csv(p, nrows=0).columns
        hist += [f"{p.name}:{c}" for c in cols if re.search(r"remind|dunning|last_contact|contacted|collection|chase|follow", c, re.I)]
    checks.append(("There's no record of reminders sent", "Columns that look like reminder history: " + (", ".join(hist) or "none"),
                   "contradicts" if hist else "holds",
                   "Use the history to set the reminder stage." if hist else "Stage comes from days overdue; say reminders aren't tracked today."))

    # A7 failed cards
    stv = pay["status"].value_counts().to_dict() if len(pay) and data.has("payments", "status") else {}
    failed = {k: v for k, v in stv.items() if k in cfg["values"]["payment_failed_status"]}
    checks.append(("Failed card payments are recorded", f"Payment status values: {stv or 'none'}",
                   "holds" if failed else "contradicts", "Flag failed cards; let the billing tool's retry email do the work." if failed else "Drop the card check."))

    # A8-A11 documents
    docs = data.docs
    def doc(name):  # noqa: E301
        return next((v for k, v in docs.items() if k.lower().startswith(name)), "")
    who = grep(doc("org_chart"), r"receivable|collection|remind|billing|controller|accountant|bookkeep|finance")
    emp = t.get("employees")
    checks.append(("We know who sends reminders today", " | ".join(who) or "Not found in org_chart.md",
                   "partly" if who else "unknown", "Confirm with Maya (question 1)."))
    tools = grep(doc("tool_stack"), r"quickbooks|xero|netsuite|stripe|chargebee|recurly|zendesk|intercom|freshdesk|hubspot|salesforce|"
                                   r"upflow|chaser|tesorio|bill\.com|dunning|remind|collection|invoice|billing")
    checks.append(("No collections tool is in place", " | ".join(tools) or "Not found in tool_stack.md",
                   "contradicts" if any(re.search(r"upflow|chaser|tesorio|dunning", x, re.I) for x in tools) else "holds" if tools else "unknown",
                   "Build vs buy section must name what they already pay for."))
    worry = grep(doc("board_update"), r"dso|collection|overdue|receivable|\bcash\b|bad debt|write.?off|\bar\b")
    checks.append(("Leadership cares about collections", " | ".join(worry) or "Not mentioned in the board update",
                   "holds" if worry else "contradicts", "Quote the board update in the video." if worry else "Frame around customer experience instead."))
    pol = doc("collections_policy")
    heads = re.findall(r"^#{1,3} (.+)$", pol, flags=re.M)
    nums = sorted(set(re.findall(r"\b(\d{1,3}) (?:business )?days?\b", pol)), key=int)
    checks.append(("collections_policy.md gives clear rules", ("Sections: " + "; ".join(heads[:12]) + f". Day numbers mentioned: {', '.join(nums)}")
                   if pol else "No collections_policy.md found", "holds" if heads else "unknown",
                   "Copy the real section names and day limits into config.yaml so every verdict cites them."))

    # Contacts
    no_contact = [i for i in inv_out if i["verdict"] == "send" and any("contact" in r["text"].lower() for r in i["reasons"])]
    checks.append(("Billing contacts are up to date", f"{len(no_contact)} 'send' bills have a missing or stale billing contact.",
                   "partly" if no_contact else "holds", "Show the contact warning in the draft."))

    # Surprises ----------------------------------------------------------------
    sur = []
    ar = t.get("ar_aging")
    if ar is not None and len(ar) and len(inv):
        keys = set(inv["id_key"])
        missing = ar[~ar["invoice_id_key"].isin(keys)]
        if len(missing):
            sur.append(f"{len(missing)} bills in the accounting export aren't in invoices.csv ({money(missing['amount'].sum())}).")
        merged = ar.merge(inv, left_on="invoice_id_key", right_on="id_key", suffixes=("_ar", ""))
        if data.has("invoices", "paid_date"):
            pd_ = merged[merged["paid_date"].notna()]
            if len(pd_):
                sur.append(f"{len(pd_)} bills are open in the accounting export but marked paid in invoices.csv ({money(pd_['amount_ar'].sum())}).")
        diff = merged[(merged["amount_ar"] - merged["amount"]).abs() > 1]
        if len(diff):
            sur.append(f"{len(diff)} bills have a different amount in the accounting export than in invoices.csv (partial payments or credits?).")
    for name, tb in t.items():
        if "id_key" in tb and len(tb):
            dup = tb["id_key"].duplicated(keep=False) & tb["id_key"].ne("")
            if dup.any():
                sur.append(f"{cfg['files'][name]['file']}: {int(dup.sum())} rows share an id with another row.")
        if "amount" in tb and len(tb):
            neg = (tb["amount"] <= 0).sum()
            if neg:
                sur.append(f"{cfg['files'][name]['file']}: {int(neg)} rows with zero or negative amounts (credits? refunds?).")
    if len(t["tickets"]):
        sur.append(f"Tickets cover {t['tickets']['created'].min().date()} to {t['tickets']['created'].max().date()}; "
                   "anything before that can't be checked for complaints.")
    if args.data == "raw":
        for f, n in EXPECTED_ROWS.items():
            got = data.rows.get(f)
            if got is not None and got != n:
                sur.append(f"{f}: {got:,} rows, but the data room listing said {n:,}.")
    unmatched = [r for r in rows if not r.match.ok]
    if unmatched:
        sur.append(f"{len(unmatched)} overdue bills couldn't be linked to a customer: " + ", ".join(sorted({r.name_raw for r in unmatched}))[:200])
    sur += [f"Loader note: {n}" for n in data.notes]

    # Write ----------------------------------------------------------------------
    out = [f"# Plan vs data ({folder.name})", "",
           f"As of {as_of.date()}. {len(rows)} overdue bills, {money(total)}. Rules only, no AI. Made by `pipeline/plan_check.py`.", "",
           "| # | Plan assumption | What the data says | Status | What changes |", "|---|---|---|---|---|"]
    for i, (a, f, s, c) in enumerate(checks, 1):
        out.append(f"| {i} | {a} | {f.replace('|', '/')} | {ICON[s]} | {c} |")
    out += ["", "## Surprises", ""] + ([f"- {s}" for s in sur] or ["- None found."])
    out += ["", "## Numbers for the one-pager (check before using)", "",
            f"- Overdue: {len(rows)} bills, {money(total)}",
            f"- Shouldn't chase today: {money(sum(i['amount'] for i in inv_out if i['verdict'] in ('paid', 'hold')))}",
            f"- Customer match rate: {ms['rate']:.1%}"]
    path = ROOT / "reports" / f"plan-vs-data-{folder.name}.md"
    path.parent.mkdir(exist_ok=True)
    path.write_text("\n".join(out) + "\n")
    counts = pd.Series([s for _, _, s, _ in checks]).value_counts().to_dict()
    print(f"Wrote {path.relative_to(ROOT)}: {len(checks)} assumptions {counts}, {len(sur)} surprises")


if __name__ == "__main__":
    main()
