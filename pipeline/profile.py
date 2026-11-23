"""Profile every file in a folder: columns, row counts, blanks, date ranges, sample values.
Then suggest which real column fits each field in config.yaml.

    python pipeline/profile.py data/raw        # writes reports/data-profile.md
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import pandas as pd
from rapidfuzz import fuzz

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from load import load_config  # noqa: E402

SYNONYMS = {
    "id": ["id"], "customer_id": ["customer_id", "account_id", "client_id", "cust_id"],
    "customer_name": ["customer_name", "customer", "company", "account_name", "organization", "client", "name"],
    "name": ["name", "company_name", "customer_name", "account_name"],
    "invoice_id": ["invoice_id", "invoice_number", "invoice_no", "inv_id", "num", "doc_number"],
    "amount": ["amount", "total", "amount_due", "open_balance", "balance", "amount_usd", "invoice_amount"],
    "issue_date": ["issue_date", "invoice_date", "date", "created_at", "issued_at"],
    "due_date": ["due_date", "due", "due_at"], "paid_date": ["paid_date", "paid_at", "payment_date", "settled_at"],
    "status": ["status", "state"], "method": ["method", "payment_method", "type"],
    "payer": ["payer_name", "payer", "remitter", "from_name", "description", "memo", "counterparty"],
    "date": ["payment_date", "date", "received_at", "created_at"],
    "created": ["created_at", "created", "opened_at", "date"], "priority": ["priority", "severity"],
    "category": ["category", "type", "topic", "tag", "tags"], "subject": ["subject", "title"],
    "body": ["body", "description", "text", "message", "content", "first_message"],
    "seats": ["seats", "seats_billed", "quantity", "licenses", "users"], "unit_price": ["unit_price", "price_per_seat", "price", "rate"],
    "start": ["start_date", "start", "effective_date"], "end": ["end_date", "end", "expiry_date", "renewal_date"],
    "days_overdue": ["days_past_due", "days_overdue", "age", "days_late", "aging"],
    "account_manager": ["account_manager", "owner", "csm", "am", "account_owner"], "arr": ["arr", "mrr", "acv"],
    "segment": ["segment", "tier"], "plan": ["plan", "package", "product"], "renewal_date": ["renewal_date", "renews_at", "end_date"],
    "billing_email": ["billing_email", "email", "billing_contact"], "email": ["email"], "role": ["role", "title", "type"],
    "last_active": ["last_active", "last_login", "last_seen", "updated_at"],
}


def profile_csv(path: Path) -> tuple[str, list[str]]:
    df = pd.read_csv(path, dtype=str, keep_default_na=False)
    lines = [f"### {path.name}  ({len(df):,} rows, {len(df.columns)} columns)", "",
             "| Column | Blank | Distinct | Looks like | Examples / range |", "|---|---|---|---|---|"]
    for c in df.columns:
        s = df[c]
        blank = (s.str.strip() == "").mean()
        nz = s[s.str.strip() != ""]
        distinct = nz.nunique()
        kind, ex = "text", ", ".join(f"`{v[:40]}`" for v in nz.drop_duplicates().head(3))
        num = pd.to_numeric(nz.str.replace(r"[$,]", "", regex=True), errors="coerce")
        dt = pd.to_datetime(nz, errors="coerce", utc=True, format="mixed") if not num.notna().all() else pd.Series(dtype="datetime64[ns, UTC]")
        if len(nz) and num.notna().mean() > 0.95:
            kind = "number"
            ex = f"{num.min():,.2f} to {num.max():,.2f} (sum {num.sum():,.0f})"
        elif len(nz) and dt.notna().mean() > 0.95:
            kind = "date"
            ex = f"{dt.min().date()} to {dt.max().date()}"
        elif distinct <= 12 and len(nz):
            kind = "category"
            ex = ", ".join(f"`{k}` {v}" for k, v in nz.value_counts().head(12).items())
        elif len(nz) and nz.str.len().mean() > 80:
            kind = "long text"
            ex = f"avg {nz.str.len().mean():.0f} chars"
        lines.append(f"| {c} | {blank:.0%} | {distinct:,} | {kind} | {ex} |")
    return "\n".join(lines), list(df.columns)


def suggest(cfg: dict, columns: dict[str, list[str]]) -> list[str]:
    out = ["## Suggested column mapping", "",
           "Check each line, then copy it into pipeline/config.yaml. `?` means no good match: map by hand or set null.", ""]
    for table, spec in cfg["files"].items():
        cols = columns.get(spec["file"])
        if cols is None:
            out.append(f"- **{table}**: `{spec['file']}` not found")
            continue
        picks = []
        for logical, current in spec["cols"].items():
            if current in cols:
                picks.append(f"{logical}: {current} ✓")
                continue
            best, score = None, 0
            for cand in cols:
                lc = cand.lower()
                for syn in SYNONYMS.get(logical, [logical]):
                    sc = 100 if lc == syn else fuzz.ratio(lc, syn)
                    if sc > score:
                        best, score = cand, sc
            picks.append(f"{logical}: {best if score >= 75 else '?'}" + (f" ({score:.0f})" if score < 100 and score >= 75 else ""))
        out.append(f"- **{table}** (`{spec['file']}`): " + ", ".join(picks))
    return out


def main() -> None:
    folder = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "data" / "raw"
    cfg = load_config()
    parts = [f"# Data profile: {folder.name}", "",
             "Made by `pipeline/profile.py`. Facts about the files only, no conclusions.", ""]
    columns: dict[str, list[str]] = {}
    csvs = sorted(folder.rglob("*.csv"))
    mds = sorted(folder.rglob("*.md"))
    parts += [f"**{len(csvs)} CSV files, {len(mds)} Markdown files.**", ""]
    parts += suggest(cfg, {}) if not csvs else []
    body = []
    for p in csvs:
        try:
            txt, cols = profile_csv(p)
            columns[p.name] = cols
            body += [txt, ""]
        except Exception as e:  # keep going: one bad file shouldn't stop the profile
            body += [f"### {p.name}: could not read ({e})", ""]
    parts += suggest(cfg, columns) + ["", "## CSV files", ""] + body
    parts += ["## Markdown files", ""]
    for p in mds:
        t = p.read_text(errors="ignore")
        heads = [h.strip() for h in re.findall(r"^#{1,3} .+$", t, flags=re.M)]
        parts.append(f"- **{p.relative_to(folder)}**: {len(t.split()):,} words. Headings: " + "; ".join(h.lstrip('# ') for h in heads[:14]))
    out = ROOT / "reports" / f"data-profile-{folder.name}.md"
    out.parent.mkdir(exist_ok=True)
    out.write_text("\n".join(parts) + "\n")
    print(f"Wrote {out.relative_to(ROOT)} ({len(csvs)} CSVs, {len(mds)} Markdown files)")


if __name__ == "__main__":
    main()
