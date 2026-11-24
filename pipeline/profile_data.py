"""Profile every file in a folder: columns, row counts, blanks, date ranges, sample values.
Then suggest which real column fits each field in config.yaml.

    python pipeline/profile_data.py data/raw
        -> reports/data-profile-raw.md          (what's in each file + the suggested mapping)
        -> reports/config-suggested-raw.yaml    (config.yaml with the suggested columns filled in)

The suggestions check column types: an amount must be a number column and a date a date
column, so a name that merely looks similar (amount vs invoice_date) can't be picked.
Always read the suggestions before using them.
"""
from __future__ import annotations

import copy
import re
import sys
from pathlib import Path

import pandas as pd
import yaml
from rapidfuzz import fuzz

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from load import DATE_FIELDS, NUM_FIELDS, load_config  # noqa: E402

CUSTOMER_REF = ["customer_id", "account_id", "client_id", "cust_id", "company_id", "org_id", "organization_id"]
SYNONYMS = {
    "customer_id": CUSTOMER_REF,
    "customer_name": ["customer_name", "customer", "company", "company_name", "account_name", "account", "organization",
                      "organization_name", "org", "client", "client_name", "name"],
    "name": ["name", "company_name", "customer_name", "account_name", "organization_name", "legal_name"],
    "invoice_id": ["invoice_id", "invoice_number", "invoice_no", "invoice_num", "inv_id", "num", "doc_number", "invoice"],
    "amount": ["amount", "total", "amount_due", "open_balance", "balance", "invoice_amount", "amount_usd", "total_amount", "value"],
    "issue_date": ["issue_date", "invoice_date", "issued_at", "issued", "date", "created_at", "billed_at"],
    "due_date": ["due_date", "due", "due_at", "date_due"],
    "paid_date": ["paid_date", "paid_at", "paid_on", "payment_date", "settled_at", "date_paid"],
    "status": ["status", "state", "result", "outcome"],
    "method": ["method", "payment_method", "payment_type", "channel"],
    "payer": ["payer_name", "payer", "remitter", "remitter_name", "from_name", "counterparty", "description", "memo", "reference"],
    "date": ["payment_date", "date", "received_at", "received_on", "paid_at", "created_at", "value_date"],
    "created": ["created_at", "created", "opened_at", "date_opened", "submitted_at", "date"],
    "priority": ["priority", "severity", "urgency"],
    "category": ["category", "type", "topic", "tag", "tags", "reason", "issue_type"],
    "subject": ["subject", "title", "summary"],
    "body": ["body", "description", "text", "message", "content", "first_message", "details", "comment"],
    "seats": ["seats", "seats_billed", "quantity", "qty", "licenses", "users", "units"],
    "unit_price": ["unit_price", "price_per_seat", "price", "rate", "list_price"],
    "start": ["start_date", "start", "effective_date", "starts_at", "start_at"],
    "end": ["end_date", "end", "expiry_date", "expires_at", "end_at", "renewal_date"],
    "days_overdue": ["days_past_due", "days_overdue", "past_due", "days_late", "age", "aging", "age_days"],
    "account_manager": ["account_manager", "owner", "csm", "am", "account_owner", "manager"],
    "arr": ["arr", "mrr", "acv", "annual_value", "contract_value"],
    "segment": ["segment", "tier", "size"],
    "plan": ["plan", "package", "product", "edition"],
    "renewal_date": ["renewal_date", "renews_at", "renewal", "end_date"],
    "billing_email": ["billing_email", "billing_contact", "email", "invoice_email"],
    "email": ["email", "email_address"],
    "role": ["role", "title", "type", "contact_type"],
    "last_active": ["last_active", "last_login", "last_seen", "last_activity", "updated_at"],
}
ID_SYNONYMS = {"customers": CUSTOMER_REF + ["id"], "invoices": ["invoice_id", "invoice_number", "invoice_no", "num", "id"],
               "payments": ["payment_id", "transaction_id", "id"], "tickets": ["ticket_id", "case_id", "id"],
               "contracts": ["contract_id", "subscription_id", "id"], "contacts": ["contact_id", "person_id", "id"]}
UNIT_TOKENS = {"usd", "eur", "gbp", "cad", "aud", "amt"}


def tokens(name: str) -> list[str]:
    t = re.sub(r"([a-z])([A-Z])", r"\1 \2", name)
    return [w for w in re.split(r"[^a-z0-9]+", t.lower()) if w and w not in UNIT_TOKENS]


def kind_of(s: pd.Series) -> tuple[str, float]:
    nz = s[s.str.strip() != ""]
    if not len(nz):
        return "empty", 0.0
    distinct = nz.nunique() / len(nz)
    num = pd.to_numeric(nz.str.replace(r"[$,\s]", "", regex=True), errors="coerce")
    if num.notna().mean() > 0.95:
        return "number", distinct
    dt = pd.to_datetime(nz, errors="coerce", utc=True, format="mixed")
    if dt.notna().mean() > 0.95:
        return "date", distinct
    if nz.nunique() <= 12:
        return "category", distinct
    if nz.str.len().mean() > 80:
        return "long text", distinct
    return "text", distinct


def profile_csv(path: Path) -> tuple[str, dict[str, tuple[str, float]]]:
    df = pd.read_csv(path, dtype=str, keep_default_na=False)
    lines = [f"### {path.name}  ({len(df):,} rows, {len(df.columns)} columns)", "",
             "| Column | Blank | Distinct | Looks like | Examples / range |", "|---|---|---|---|---|"]
    kinds: dict[str, tuple[str, float]] = {}
    for c in df.columns:
        s = df[c]
        nz = s[s.str.strip() != ""]
        kind, dratio = kind_of(s)
        kinds[c] = (kind, dratio)
        ex = ", ".join(f"`{v[:40]}`" for v in nz.drop_duplicates().head(3))
        if kind == "number":
            num = pd.to_numeric(nz.str.replace(r"[$,\s]", "", regex=True), errors="coerce")
            ex = f"{num.min():,.2f} to {num.max():,.2f} (sum {num.sum():,.0f})"
        elif kind == "date":
            dt = pd.to_datetime(nz, errors="coerce", utc=True, format="mixed")
            ex = f"{dt.min().date()} to {dt.max().date()}"
        elif kind == "category":
            ex = ", ".join(f"`{k}` {v}" for k, v in nz.value_counts().head(12).items())
        elif kind == "long text":
            ex = f"avg {nz.str.len().mean():.0f} chars"
        lines.append(f"| {c} | {(s.str.strip() == '').mean():.0%} | {nz.nunique():,} | {kind} | {ex} |")
    return "\n".join(lines), kinds


def score(column: str, synonyms: list[str]) -> int:
    ct = tokens(column)
    cj = " ".join(ct)
    best = 0
    for syn in synonyms:
        st = tokens(syn)
        sj = " ".join(st)
        if cj == sj:
            return 100
        if st and set(st) <= set(ct):           # "status" in "invoice_status", "total" in "total_usd"
            best = max(best, 92 - 2 * (len(ct) - len(st)))
        elif ct and set(ct) <= set(st):         # "due" vs "due date"
            best = max(best, 80)
        else:
            best = max(best, int(fuzz.token_set_ratio(cj, sj) * 0.85))
    return best


def type_ok(logical: str, kind: str, dratio: float, table: str) -> bool:
    if logical in NUM_FIELDS:
        return kind == "number"
    if logical in DATE_FIELDS:
        return kind == "date"
    if logical == "id":
        return dratio >= 0.95
    if logical in ("subject", "body", "name", "customer_name", "payer"):
        return kind in ("text", "long text", "category")
    return kind != "empty"


def suggest_table(table: str, spec: dict, kinds: dict[str, tuple[str, float]]) -> dict[str, tuple[str | None, int]]:
    """Best column per field, each column used once, highest scores first."""
    options = []
    for logical, current in spec["cols"].items():
        syns = ID_SYNONYMS.get(table, ["id"]) if logical == "id" else SYNONYMS.get(logical, [logical])
        if current:
            syns = [current] + syns
        for col, (kind, dratio) in kinds.items():
            if not type_ok(logical, kind, dratio, table):
                continue
            sc = 100 if current and col == current else score(col, syns)
            if sc >= 75:
                options.append((sc, logical, col))
    chosen: dict[str, tuple[str | None, int]] = {}
    used: set[str] = set()
    for sc, logical, col in sorted(options, key=lambda x: -x[0]):
        if logical in chosen or col in used:
            continue
        chosen[logical] = (col, sc)
        used.add(col)
    return {logical: chosen.get(logical, (None, 0)) for logical in spec["cols"]}


def main() -> None:
    folder = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "data" / "raw"
    cfg = load_config()
    csvs = sorted(folder.rglob("*.csv"))
    mds = sorted(folder.rglob("*.md"))
    profiles: dict[str, tuple[str, dict]] = {}
    body = []
    for p in csvs:
        try:
            txt, kinds = profile_csv(p)
            profiles[p.name] = (txt, kinds)
            body += [txt, ""]
        except Exception as e:  # keep going: one bad file shouldn't stop the profile
            body += [f"### {p.name}: could not read ({e})", ""]

    suggested = copy.deepcopy(cfg)
    lines = ["## Suggested column mapping", "",
             "Each field shows the column picked (✓ = same as config.yaml, a number = how close the name is). "
             "`?` means nothing of the right type fits: map it by hand or leave it null. "
             f"The same mapping is written to `reports/config-suggested-{folder.name}.yaml`.", ""]
    for table, spec in cfg["files"].items():
        if spec["file"] not in profiles:
            lines.append(f"- **{table}**: `{spec['file']}` not found")
            continue
        picks = suggest_table(table, spec, profiles[spec["file"]][1])
        shown = []
        for logical, (col, sc) in picks.items():
            suggested["files"][table]["cols"][logical] = col
            if col is None:
                shown.append(f"{logical}: ?")
            elif col == spec["cols"].get(logical):
                shown.append(f"{logical}: {col} ✓")
            else:
                shown.append(f"{logical}: {col} ({sc})")
        lines.append(f"- **{table}** (`{spec['file']}`): " + ", ".join(shown))

    parts = [f"# Data profile: {folder.name}", "", "Made by `pipeline/profile_data.py`. Facts about the files only, no conclusions.", "",
             f"**{len(csvs)} CSV files, {len(mds)} Markdown files.**", ""] + lines + ["", "## CSV files", ""] + body
    parts += ["## Markdown files", ""]
    for p in mds:
        t = p.read_text(errors="ignore")
        heads = [h.strip() for h in re.findall(r"^#{1,3} .+$", t, flags=re.M)]
        parts.append(f"- **{p.relative_to(folder)}**: {len(t.split()):,} words. Headings: " + "; ".join(h.lstrip('# ') for h in heads[:14]))
    rep = ROOT / "reports"
    rep.mkdir(exist_ok=True)
    (rep / f"data-profile-{folder.name}.md").write_text("\n".join(parts) + "\n")
    (rep / f"config-suggested-{folder.name}.yaml").write_text(
        "# Suggested by pipeline/profile_data.py. Check it, then copy what's right into pipeline/config.yaml.\n"
        + yaml.safe_dump(suggested, sort_keys=False, allow_unicode=True))
    print(f"Wrote reports/data-profile-{folder.name}.md and reports/config-suggested-{folder.name}.yaml "
          f"({len(csvs)} CSVs, {len(mds)} Markdown files)")


if __name__ == "__main__":
    main()
