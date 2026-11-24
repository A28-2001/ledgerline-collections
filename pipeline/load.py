"""Load the data files using the column mapping in config.yaml.

Every table comes back with the logical column names from config.yaml (id, amount,
due_date, ...), whatever the real files call them. A missing optional column becomes
an empty column and is reported in `notes`, so the check that needs it can be skipped.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

import pandas as pd
import yaml

ROOT = Path(__file__).resolve().parents[1]
DATE_FIELDS = {"issue_date", "due_date", "paid_date", "date", "created", "start", "end", "renewal_date", "last_active", "applied_date", "resolved"}
NUM_FIELDS = {"amount", "arr", "seats", "unit_price", "days_overdue", "period_months", "platform_fee", "contract_arr"}


def load_config(path: Path | None = None) -> dict:
    """pipeline/config.yaml, or the file named in COLLECTIONS_CONFIG (used for rehearsals)."""
    import os
    path = path or Path(os.environ.get("COLLECTIONS_CONFIG") or ROOT / "pipeline" / "config.yaml")
    return yaml.safe_load(Path(path).read_text())


def norm_id(x) -> str:
    """'INV-001043', 'inv 1043' and 1043.0 all become '1043'."""
    if x is None or (isinstance(x, float) and pd.isna(x)):
        return ""
    s = str(x).strip()
    if re.fullmatch(r"\d+\.0", s):
        s = s[:-2]
    digits = re.sub(r"\D", "", s)
    return digits.lstrip("0") or digits if digits else s.lower()


@dataclass
class Data:
    folder: Path
    cfg: dict
    tables: dict[str, pd.DataFrame] = field(default_factory=dict)
    rows: dict[str, int] = field(default_factory=dict)
    notes: list[str] = field(default_factory=list)
    docs: dict[str, str] = field(default_factory=dict)  # markdown files by name

    def has(self, table: str, col: str) -> bool:
        t = self.tables.get(table)
        return t is not None and col in t and t[col].notna().any() and (t[col].astype(str).str.strip() != "").any()


def load(folder: Path, cfg: dict) -> Data:
    data = Data(folder=folder, cfg=cfg)
    for table, spec in cfg["files"].items():
        path = folder / spec["file"]
        if not path.exists():
            matches = list(folder.rglob(spec["file"]))
            path = matches[0] if matches else path
        if not path.exists():
            data.notes.append(f"{spec['file']} not found: checks that use {table} are skipped")
            data.tables[table] = pd.DataFrame(columns=list(spec["cols"]))
            data.rows[spec["file"]] = 0
            continue
        raw = pd.read_csv(path, dtype=str, keep_default_na=False)
        data.rows[spec["file"]] = len(raw)
        out = pd.DataFrame(index=raw.index)
        for logical, real in spec["cols"].items():
            if real and real in raw.columns:
                out[logical] = raw[real].replace({"": None})
            else:
                out[logical] = None
                if real:
                    data.notes.append(f"{spec['file']}: column '{real}' not found (mapped to {logical})")
        for c in out.columns:
            if c in DATE_FIELDS:
                out[c] = pd.to_datetime(out[c], errors="coerce", utc=True).dt.tz_localize(None).dt.normalize()
            elif c in NUM_FIELDS:
                out[c] = pd.to_numeric(out[c].astype(str).str.replace(r"[$,\s]", "", regex=True), errors="coerce")
        for c in ("status", "priority", "category", "role", "method", "type"):
            if c in out:
                out[c] = out[c].astype("string").str.strip().str.lower()
        for c in ("id", "invoice_id", "customer_id"):
            if c in out:
                out[c + "_key"] = out[c].map(norm_id) if c != "customer_id" else out[c].astype("string").str.strip()
        data.tables[table] = out
    for md in sorted(folder.rglob("*.md")):
        data.docs[md.name] = md.read_text(errors="ignore")
    return data


def as_of_date(data: Data) -> pd.Timestamp:
    v = data.cfg.get("as_of", "auto")
    if v and v != "auto":
        return pd.Timestamp(v)
    cands = []
    ar = data.tables.get("ar_aging")
    if ar is not None and ar["due_date"].notna().any() and data.has("ar_aging", "days_overdue"):
        # due date + days overdue = the date the export was taken
        est = (ar["due_date"] + pd.to_timedelta(ar["days_overdue"], unit="D")).dropna()
        if len(est):
            return est.mode().iloc[0]
    for t, c in (("invoices", "issue_date"), ("payments", "date"), ("tickets", "created")):
        if data.has(t, c):
            cands.append(data.tables[t][c].max())
    return max(cands) if cands else pd.Timestamp.today().normalize()
