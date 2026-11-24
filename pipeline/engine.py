"""The morning run: one verdict per overdue bill, with reasons, evidence and policy citations.

Verdicts, in order of priority:
  paid  - a payment already covers this bill (finance confirms and closes it, no reminder)
  hold  - billing complaint, serious escalation, or the bill doesn't match the contract
          (owner gets a task with a deadline; if nobody acts, it returns to finance)
  call  - long overdue or large: a person calls instead of emailing
  send  - reminder email (standard, softer if there's an open non-billing complaint,
          or an update-card note if a card payment failed)
When the AI judges disagree about a ticket, we don't chase: the bill is held and
marked for a person to look at.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from load import Data
from match import Matcher
from ai import redact  # every ticket excerpt finance sees is masked (Maya, 24 Nov)

BILLING_RX = re.compile(  # about what WE charged THEM (the product itself is billing software)
    r"(over)?charged (us|me|twice)|billed (us|me|twice|annual|for)|your invoice|ledgerline invoice|our (subscription|renewal|invoice from)|"
    r"refund|credit note|dispute|discount (not|wasn)|not reflected|waived|implementation fee|wrong (amount|seat|plan|price)|"
    r"seat count|pay more|paying more|double[- ]charg|price increase",
    re.I)
SERIOUS_RX = re.compile(r"legal action|lawyer|attorney|regulator|chargeback|cancellation|cancel (our|the|my)|terminate|"
                        r"outage|system down|is down|can.?t log ?in|cannot log ?in|whole team|churn|data loss|wiped|"
                        r"cancel (our|the) (account|subscription|contract)|reviewing whether to stay|"
                        r"switch(ing)? to|escalat|legal|lawyer", re.I)
HOLDING_RX = re.compile(  # the customer says they're not paying until something is fixed
    r"hold(ing)? off pay|won.?t pay|will not pay|not (be )?pay(ing)?|paused (the )?payment|on hold until|settle once|pay once|"
    r"until (a |the )?(corrected|revised|new) (invoice|version)|cancel and reissue|corrected (invoice|version)|pending a corrected",
    re.I)
# Maya: "anything that reads like a threat" without a person checking gets the tool switched off.
THREAT_WORDS = ["suspend", "suspension", "collections agency", "collection agency", "legal action", "final notice",
                "late fee", "costs of collection", "refer the balance", "court"]
PRICING_RX = re.compile(r"seat|price|pricing|plan\b|discount|renewal|downgrad|upgrad|tier|per user|users", re.I)
INVOICE_REF_RX = re.compile(r"\binv[-\s#]?(\d{4,7})\b", re.I)
NEGATIVE_RX = re.compile(r"broken|fail|error|frustrat|not working|issue|problem|bug|slow|spins|lost|blocking", re.I)
CAUSE_LABEL = {"unhappy": "Unhappy customer", "paid": "Already paid", "wrong_bill": "Customer says the bill is wrong",
               "card_failed": "Card payment failed", "simply_late": "Simply late"}


def money(x: float) -> str:
    return f"${x:,.0f}" if abs(x) >= 100 else f"${x:,.2f}"


def iso(x) -> str | None:
    return None if x is None or pd.isna(x) else pd.Timestamp(x).date().isoformat()


def nice(x) -> str:
    """A date people read: 'Oct 20, 2026'."""
    return "" if x is None or pd.isna(x) else pd.Timestamp(x).strftime("%b %-d, %Y")


def bucket(days: int) -> str:
    return "1-30" if days <= 30 else "31-60" if days <= 60 else "61-90" if days <= 90 else "90+"


def add_business_days(d: pd.Timestamp, n: int) -> pd.Timestamp:
    return pd.Timestamp(np.busday_offset(d.date(), n, roll="forward"))


@dataclass
class Row:
    key: str
    display_id: str
    name_raw: str
    amount: float
    issue: pd.Timestamp | None
    due: pd.Timestamp | None
    days: int
    inv: dict | None  # matching row in invoices table
    match: object = None
    flags: dict = field(default_factory=dict)
    reasons: list = field(default_factory=list)
    evidence: list = field(default_factory=list)
    needs_review: list = field(default_factory=list)
    votes: list | None = None


class Engine:
    def __init__(self, data: Data, as_of: pd.Timestamp, ai):
        self.d = data
        self.cfg = data.cfg
        self.v = self.cfg["values"]
        self.p = self.cfg["policy"]
        self.as_of = as_of
        self.ai = ai
        self.matcher = Matcher(data.tables["customers"], self.cfg, ai)
        self.t = data.tables
        self.ticket_labels: dict[str, dict] = {}
        cu = self.t["customers"]
        n = int(self.p.get("top_accounts") or 0)
        if n and len(cu) and cu["arr"].notna().any():
            live = cu[cu["status"].fillna("active").str.lower().ne("churned")] if "status" in cu else cu
            self.top_accounts = set(live.sort_values("arr", ascending=False).head(n)["id"].astype(str))
        else:
            self.top_accounts = set()

    # ---------------------------------------------------------------- overdue list
    def overdue_rows(self) -> list[Row]:
        inv = self.t["invoices"]
        inv_by_key = {r["id_key"]: r for r in inv.to_dict("records")} if len(inv) else {}
        rows: list[Row] = []
        src = self.cfg.get("overdue_source", "ar_aging")
        ar = self.t.get("ar_aging")
        if src == "ar_aging" and ar is not None and len(ar):
            for r in ar.to_dict("records"):
                key = r.get("invoice_id_key") or ""
                due = r.get("due_date")
                days = int(r["days_overdue"]) if pd.notna(r.get("days_overdue")) else (
                    (self.as_of - due).days if pd.notna(due) else 0)
                if days <= 0 or not (r.get("amount") or 0) > 0:
                    continue
                rows.append(Row(key=key, display_id=str(r.get("invoice_id") or key), name_raw=str(r.get("customer_name") or ""),
                                amount=float(r["amount"]), issue=r.get("issue_date"), due=due, days=days,
                                inv=inv_by_key.get(key)))
        else:
            open_ = inv[~inv["status"].isin(self.v["invoice_void_status"])]
            if self.d.has("invoices", "paid_date"):
                open_ = open_[open_["paid_date"].isna()]
            else:
                open_ = open_[open_["status"].isin(self.v["invoice_open_status"])]
            open_ = open_[open_["due_date"] < self.as_of]
            for r in open_.to_dict("records"):
                rows.append(Row(key=r["id_key"], display_id=str(r["id"]), name_raw=str(r.get("customer_name") or ""),
                                amount=float(r["amount"]), issue=r.get("issue_date"), due=r["due_date"],
                                days=(self.as_of - r["due_date"]).days, inv=r))
        for row in rows:
            cid = row.inv.get("customer_id") if row.inv else None
            row.match = self.matcher.match(row.name_raw or (row.inv or {}).get("customer_name"), "overdue list", cid)
            if row.inv and row.name_raw and cid:
                self.matcher.match(row.name_raw, "accounting export (by name)")  # measure name matching too
        return rows

    # ---------------------------------------------------------------- tickets
    def _rules_label(self, t: dict) -> str:
        text = f"{t.get('subject') or ''} {t.get('body') or ''}"
        cat = (t.get("category") or "").lower()
        if (t.get("priority") or "") in self.v["ticket_serious_priority"] or SERIOUS_RX.search(text):
            return "serious_escalation"
        if cat in self.v["ticket_question_category"] and not NEGATIVE_RX.search(text):
            return "not_a_complaint"
        if cat in self.v["ticket_billing_category"] or BILLING_RX.search(text):
            return "billing_complaint"
        if NEGATIVE_RX.search(text) or cat in ("bug", "outage", "incident", "problem"):
            return "other_complaint"
        return "not_a_complaint"

    def tickets_by_customer(self, overdue_customers: set[str], since: dict[str, pd.Timestamp] | None = None) -> dict[str, list[dict]]:
        tk = self.t["tickets"]
        out: dict[str, list[dict]] = {}
        if not len(tk):
            return out
        lookback = self.as_of - pd.Timedelta(days=self.p["complaint_lookback_days"])
        mention_from = self.as_of - pd.Timedelta(days=self.p["complaint_lookback_days"] * 4)
        for t in tk.to_dict("records"):
            m = self.matcher.match(t.get("customer_name"), "support tickets", t.get("customer_id"))
            t["_match"] = m
            t["rules_label"] = self._rules_label(t)
            if not m.ok:
                continue
            out.setdefault(m.customer_id, []).append(t)
            created = t.get("created")
            is_open = (t.get("status") or "") not in self.v["ticket_closed_status"]
            t["is_open"] = is_open
            # Open tickets always count. Closed ones count from the day the customer's oldest overdue bill was
            # issued: at Ledgerline a "solved" ticket can still be an unresolved dispute about that bill.
            start = (since or {}).get(m.customer_id, mention_from)
            t["relevant"] = m.customer_id in overdue_customers and pd.notna(created) and (is_open or created >= min(start, mention_from))
            t["holding"] = bool(HOLDING_RX.search(f"{t.get('subject') or ''} {t.get('body') or ''}"))
            t["invoice_refs"] = {n.lstrip("0") for n in INVOICE_REF_RX.findall(f"{t.get('subject') or ''} {t.get('body') or ''}")}
            t["recent"] = pd.notna(created) and created >= lookback
            t["label"], t["agreement"] = t["rules_label"], None
            if t["relevant"] and self.ai and self.ai.enabled:
                j = self.ai.classify_ticket(t.get("subject") or "", t.get("body") or "")
                votes = [{"judge": "rules", "answer": t["rules_label"]}] + j["votes"]
                t["agreement"] = {"agree": j["agree"], "votes": votes}
                t["label"] = j["answer"] if j["agree"] else "disagree"
        return out

    # ---------------------------------------------------------------- payments
    def payment_indexes(self):
        pay = self.t["payments"]
        linked_ok: dict[str, list[dict]] = {}
        linked_failed: dict[str, list[dict]] = {}
        unmatched_by_cust: dict[str, list[dict]] = {}
        self.memo_hits: dict[str, dict] = {}
        if not len(pay):
            return linked_ok, linked_failed, unmatched_by_cust
        failed = pay["status"].isin(self.v["payment_failed_status"]) if self.d.has("payments", "status") else pd.Series(False, index=pay.index)
        for r, f in zip(pay.to_dict("records"), failed):
            k = r.get("invoice_id_key") or ""
            if k:
                (linked_failed if f else linked_ok).setdefault(k, []).append(r)
            elif not f:
                for num in re.findall(r"(?:inv(?:oice)?[\s#:-]*)?(\d{4,7})", str(r.get("memo") or ""), re.I):
                    self.memo_hits.setdefault(num.lstrip("0"), r)  # "INV-25845", "Invoice 25937", "inv25867"
                m = self.matcher.match(r.get("payer"), "bank payments")
                if m.ok:
                    unmatched_by_cust.setdefault(m.customer_id, []).append(r)
        return linked_ok, linked_failed, unmatched_by_cust

    # ---------------------------------------------------------------- contracts
    def contract_for(self, cid: str, when) -> dict | None:
        k = self.t["contracts"]
        if not len(k) or not cid:
            return None
        mine = k[k["customer_id"].astype(str) == str(cid)]
        if when is not None and pd.notna(when) and self.d.has("contracts", "start"):
            active = mine[(mine["start"] <= when) & ((mine["end"].isna()) | (mine["end"] >= when))]
            mine = active if len(active) else mine
        return mine.iloc[-1].to_dict() if len(mine) else None

    def bill_matches_contract(self, inv: dict, k: dict) -> tuple[bool, str] | None:
        tol = self.p["wrong_bill_tolerance"]
        if pd.notna(inv.get("seats")) and pd.notna(k.get("seats")) and inv["seats"] != k["seats"]:
            return False, f"billed for {int(inv['seats'])} seats, contract says {int(k['seats'])}"
        if pd.notna(inv.get("unit_price")) and pd.notna(k.get("unit_price")) and k["unit_price"]:
            if abs(inv["unit_price"] - k["unit_price"]) / k["unit_price"] > tol:
                return False, f"price per seat {money(inv['unit_price'])}, contract says {money(k['unit_price'])}"
        if (inv.get("type") or "subscription") != "subscription":
            return None  # implementation fees etc. aren't in the contract's annual value
        if pd.notna(k.get("contract_arr")) and pd.notna(inv.get("period_months")) and inv.get("amount"):
            expected = k["contract_arr"] * inv["period_months"] / 12
            if expected and abs(inv["amount"] - expected) / expected > tol:
                return False, f"bill {money(inv['amount'])} vs contract {money(expected)} for {int(inv['period_months'])} months"
            return True, "matches the contract"
        if pd.notna(k.get("seats")) and pd.notna(k.get("unit_price")) and inv.get("amount"):
            base = k["seats"] * k["unit_price"]
            if base and not any(abs(inv["amount"] - base * f) / (base * f) <= tol for f in (1, 3, 6, 12)):
                return False, f"amount {money(inv['amount'])} doesn't fit the contract ({int(k['seats'])} seats × {money(k['unit_price'])})"
            return True, "matches the contract"
        return None

    # ---------------------------------------------------------------- the run
    def run(self) -> dict:
        rows = self.overdue_rows()
        overdue_customers = {r.match.customer_id for r in rows if r.match.ok}
        since: dict[str, pd.Timestamp] = {}
        for r in rows:
            if r.match.ok and r.issue is not None and pd.notna(r.issue):
                since[r.match.customer_id] = min(since.get(r.match.customer_id, r.issue), r.issue)
        tickets = self.tickets_by_customer(overdue_customers, since)
        linked_ok, linked_failed, unmatched = self.payment_indexes()
        used_payments: set[str] = set()
        customers = self.t["customers"].set_index(self.t["customers"]["id"].astype(str), drop=False)
        self._rows_by_cust: dict[str, list[Row]] = {}
        for r in rows:
            if r.match.ok:
                self._rows_by_cust.setdefault(r.match.customer_id, []).append(r)
        contacts = self.t["contacts"]
        tol = self.p["paid_match_tolerance"]

        for row in sorted(rows, key=lambda r: (r.due if r.due is not None and pd.notna(r.due) else self.as_of)):
            cid = row.match.customer_id
            ev, rs = row.evidence, row.reasons
            if not row.match.ok:
                row.needs_review.append(row.match.note or f"customer name '{row.name_raw}' not found in the customer list")
            elif row.match.method in ("fuzzy", "ai") and row.match.score < 0.9:
                row.needs_review.append(f"customer matched by name only ({row.match.method}, score {row.match.score:.2f})")
            if row.inv is None and self.cfg.get("overdue_source") == "ar_aging" and len(self.t["invoices"]):
                row.flags["missing_in_billing"] = True
                rs.append({"text": "This bill isn't in the billing system, only in the accounting export. A person should check it before anyone chases.",
                           "evidenceIds": [], "policyRef": None})

            # 1. Already paid?
            paid_ev = None
            for p in linked_ok.get(row.key, []):
                if p.get("amount") and p["amount"] >= row.amount * (1 - tol):
                    paid_ev = p
                    row.flags["paid_linked"] = True
                    break
            memo_p = getattr(self, "memo_hits", {}).get(row.key)
            if paid_ev is None and memo_p is not None and memo_p["id"] not in used_payments and memo_p.get("amount") \
                    and abs(memo_p["amount"] - row.amount) <= row.amount * tol:
                paid_ev = memo_p
                used_payments.add(memo_p["id"])
                row.flags["paid_unmatched"] = True
                row.flags["paid_memo"] = True
            if paid_ev is None and cid:
                best = None
                for p in unmatched.get(cid, []):
                    if p["id"] in used_payments or not p.get("amount"):
                        continue
                    if abs(p["amount"] - row.amount) <= row.amount * tol and (
                            row.issue is None or pd.isna(row.issue) or p["date"] >= row.issue - pd.Timedelta(days=5)):
                        if best is None or abs((p["date"] - row.due).days) < abs((best["date"] - row.due).days):
                            best = p
                if best is not None:
                    paid_ev = best
                    used_payments.add(best["id"])
                    row.flags["paid_unmatched"] = True
                    twins = [o for o in self._rows_by_cust.get(cid, []) if o is not row and abs(o.amount - row.amount) <= row.amount * tol]
                    if twins:
                        row.needs_review.append(f"{len(twins) + 1} overdue bills have this amount; we matched the payment to the oldest. A person confirms which bill it pays")
            if paid_ev is None and cid:
                lag = self.p.get("recent_payment_days", 21)
                recent = [p for p in unmatched.get(cid, []) if p["id"] not in used_payments and pd.notna(p.get("date"))
                          and (self.as_of - p["date"]).days <= lag]
                if recent:
                    p = recent[-1]
                    eid = f"payment:{p['id']}"
                    ev.append({"id": eid, "kind": "payment", "file": self.cfg["files"]["payments"]["file"], "recordId": str(p["id"]),
                               "date": iso(p.get("date")), "status": "unmatched",
                               "title": f"{money(p['amount'] or 0)} received on {nice(p.get('date'))} from \"{p.get('payer') or ''}\", not matched yet"})
                    rs.append({"text": f"A {money(p['amount'] or 0)} payment from them arrived {nice(p.get('date'))} and isn't matched to a bill yet. "
                                       "Confirm it doesn't cover this one before anyone chases (the case that got Paidly switched off).",
                               "evidenceIds": [eid], "policyRef": "collections_policy.md: bank transfers take three to five working days to show as paid"})
                    row.needs_review.append("a recent payment from this customer isn't matched yet: confirm before chasing")
                    row.flags["recent_payment"] = True
            if paid_ev is not None:
                eid = f"payment:{paid_ev['id']}"
                ev.append({"id": eid, "kind": "payment", "file": self.cfg["files"]["payments"]["file"], "recordId": str(paid_ev["id"]),
                           "date": iso(paid_ev.get("date")), "status": "succeeded",
                           "title": f"{money(paid_ev['amount'])} received on {nice(paid_ev.get('date'))} from \"{paid_ev.get('payer') or ''}\""})
                memo = str(paid_ev.get("memo") or "").strip()
                rs.append({"text": ("A payment linked to this bill was received, but the accounting export still shows it open."
                                    if row.flags.get("paid_linked") else
                                    f"An unmatched bank payment names this invoice in its memo (\"{memo}\") and equals the bill. It's paid; it just hasn't been matched yet."
                                    if row.flags.get("paid_memo") else
                                    "An unmatched bank payment from this customer equals this bill. It was probably paid but never matched."),
                           "evidenceIds": [eid], "policyRef": "collections_policy.md: bank transfers take three to five working days to show as paid"})

            # 2. Tickets
            for t in sorted(tickets.get(cid, []), key=lambda t: t.get("created") or self.as_of, reverse=True):
                if not t.get("relevant"):
                    continue
                label, open_ = t["label"], t["is_open"]
                recent = t["created"] >= self.as_of - pd.Timedelta(days=self.p["complaint_lookback_days"])
                eid = f"ticket:{t['id']}"
                body = (t.get("body") or "")
                ev.append({"id": eid, "kind": "ticket", "file": self.cfg["files"]["tickets"]["file"], "recordId": str(t["id"]),
                           "date": iso(t.get("created")), "status": t.get("status") or "",
                           "title": redact(t.get("subject") or "(no subject)"), "detail": redact(body)[:400] + ("…" if len(body) > 400 else "")})
                if t.get("agreement"):
                    row.votes = t["agreement"]["votes"]
                names_bill = row.key and row.key in t.get("invoice_refs", set())
                after_issue = row.issue is None or pd.isna(row.issue) or t["created"] >= row.issue - pd.Timedelta(days=3)
                if names_bill and after_issue and (t.get("holding") or label in ("billing_complaint", "disagree")):
                    row.flags["dispute_hold"] = True
                    row.flags["dispute_since"] = t["created"]
                    row.flags["dispute_pricing"] = bool(PRICING_RX.search(f"{t.get('subject') or ''} {t.get('body') or ''}"))
                    state = "is still open" if open_ else f"is marked {t.get('status') or 'closed'} in Zendesk, but the bill was never corrected or reissued"
                    said = " and says they're holding payment until it's fixed" if t.get("holding") else ""
                    rs.insert(0, {"text": f"The customer disputes this exact invoice in a support ticket{said}. The ticket {state}.",
                                  "evidenceIds": [eid], "policyRef": "collections_policy.md: do not chase an invoice the customer has disputed"})
                    continue
                if not open_ and after_issue and label == "billing_complaint" and t.get("holding"):
                    row.flags["dispute_hold"] = True
                    row.flags["dispute_since"] = t["created"]
                    row.flags["dispute_pricing"] = bool(PRICING_RX.search(f"{t.get('subject') or ''} {t.get('body') or ''}"))
                    rs.insert(0, {"text": f"A billing ticket from {nice(t['created'])} says they're holding payment. Zendesk marks it {t.get('status')}, but nothing shows it was fixed.",
                                  "evidenceIds": [eid], "policyRef": "collections_policy.md: do not chase an invoice the customer has disputed"})
                    continue
                if not open_ and after_issue and label == "billing_complaint":
                    row.needs_review.append(f"a billing ticket from {nice(t['created'])} is marked {t.get('status')}: check it was really fixed")
                # No-vendor mode (Maya, until legal approves an AI provider): a ticket TAGGED billing or account change
                # since this bill was issued, that the local rules didn't read as a dispute, goes to a person.
                if not (self.ai and self.ai.enabled) and after_issue and (t.get("category") or "") in self.v["ticket_billing_category"] \
                        and not row.flags.get("dispute_hold"):
                    row.needs_review.append(f"ticket tagged {t.get('category')} on {nice(t['created'])}, after this bill was issued: a person reads it before anyone chases")
                    row.flags["tag_check"] = True
                if not open_:
                    if label == "billing_complaint":
                        rs.append({"text": f"A billing ticket from {nice(t['created'])} is closed. Mentioned for context; it doesn't block the reminder.",
                                   "evidenceIds": [eid], "policyRef": None})
                    continue
                if label == "disagree":
                    row.flags["ticket_disputed"] = True
                    row.needs_review.append("the AI wasn't sure what this ticket means")
                    if any(v["answer"] in ("billing_complaint", "serious_escalation") for v in t["agreement"]["votes"]):
                        row.flags["disputed_hold"] = True  # when unsure, don't chase: a person reads it first
                        rs.append({"text": "The AI wasn't sure whether this open ticket is about money or a serious problem (its two checks disagreed). We don't chase until a person reads it.",
                                   "evidenceIds": [eid], "policyRef": self.p["sensitive_ref"]})
                    continue
                if label == "billing_complaint":
                    row.flags["complaint_hold"] = True
                    rs.append({"text": "Open billing complaint: chasing payment now would make it worse.",
                               "evidenceIds": [eid], "policyRef": self.p["hold_ref"]})
                elif label == "serious_escalation":
                    row.flags["complaint_hold"] = True
                    rs.append({"text": "Serious open escalation with support. Money talk waits until it's resolved.",
                               "evidenceIds": [eid], "policyRef": self.p["sensitive_ref"]})
                elif label == "other_complaint" and (recent or open_):
                    row.flags["soft"] = True
                    rs.append({"text": "Open product complaint (not about money): send, but in a softer tone, and tell the account manager.",
                               "evidenceIds": [eid], "policyRef": None})

            # Maya's real test: nobody chased who had a complaint open. Zendesk tags are often wrong (a bug tagged How-to,
            # 23% untagged), so ANY open or pending ticket pauses the reminder and the account manager decides (process_maps FIN-1).
            if not (row.flags.get("dispute_hold") or row.flags.get("complaint_hold") or row.flags.get("disputed_hold")):
                still_open = [t for t in tickets.get(cid, []) if t.get("relevant") and t.get("is_open")]
                if still_open:
                    t = sorted(still_open, key=lambda t: t.get("created") or self.as_of)[0]
                    eid = f"ticket:{t['id']}"
                    if not any(e["id"] == eid for e in ev):
                        body = t.get("body") or ""
                        ev.append({"id": eid, "kind": "ticket", "file": self.cfg["files"]["tickets"]["file"], "recordId": str(t["id"]),
                                   "date": iso(t.get("created")), "status": t.get("status") or "", "title": redact(t.get("subject") or "(no subject)"),
                                   "detail": redact(body)[:400] + ("…" if len(body) > 400 else "")})
                    waited = (self.as_of - t["created"]).days if pd.notna(t.get("created")) else 0
                    row.flags["open_ticket_hold"] = True
                    rs.insert(0, {"text": f"They have a ticket {t.get('status') or 'open'} in Zendesk since {nice(t['created'])} ({waited} days). "
                                          "Chasing payment while their question is unanswered is what gets the tool switched off; the account manager decides when to resume.",
                                  "evidenceIds": [eid], "policyRef": "collections_policy.md: tell the account manager before finance contacts one of their accounts"})

            # 3. Bill vs contract
            if row.inv is not None and cid:
                k = self.contract_for(cid, row.issue)
                chk = self.bill_matches_contract(row.inv, k) if k else None
                if k:
                    kid = k.get("id") or f"{cid}:{iso(k.get('start'))}"
                    keid = f"contract:{kid}"
                    ev.append({"id": keid, "kind": "contract", "file": self.cfg["files"]["contracts"]["file"], "recordId": str(kid),
                               "date": iso(k.get("start")),
                               "title": f"Contract: {int(k['seats']) if pd.notna(k.get('seats')) else '?'} seats × "
                                        f"{money(k['unit_price']) if pd.notna(k.get('unit_price')) else '?'}"
                                        + (f", {nice(k.get('start'))} to {nice(k.get('end'))}" if pd.notna(k.get('start')) else "")})
                    if chk and not chk[0]:
                        row.flags["wrong_bill"] = True
                        rs.append({"text": f"The bill doesn't match the contract: {chk[1]}. Fix the bill before asking for money.",
                                   "evidenceIds": [keid], "policyRef": self.p["hold_ref"]})

            # 4. Failed card payment (recorded on the invoice at Ledgerline)
            inv_status = str((row.inv or {}).get("status") or "")
            if inv_status in self.v.get("invoice_failed_status", []) and not row.flags.get("paid_linked"):
                row.flags["card_failed"] = True
                eid = f"invoice:{row.display_id}"
                ev.append({"id": eid, "kind": "invoice", "file": self.cfg["files"]["invoices"]["file"], "recordId": row.display_id,
                           "date": iso(row.due), "status": "payment_failed", "title": f"Card payment for {money(row.amount)} failed"})
                if row.days <= 7:
                    rs.append({"text": "The card payment failed, but Stripe is still retrying and emailing them. No extra email yet.",
                               "evidenceIds": [eid], "policyRef": self.p["card_ref"]})
                else:
                    rs.append({"text": "The card failed and Stripe's retries are over. A person asks for a new card: nobody has followed this up yet.",
                               "evidenceIds": [eid], "policyRef": self.p["card_ref"]})
                left = self.p.get("card_writeoff_days", 0) - row.days
                if self.p.get("card_writeoff_days") and left <= 30:
                    rs.append({"text": f"This card invoice is written off automatically in {max(left, 0)} days unless someone acts.",
                               "evidenceIds": [eid], "policyRef": self.p["card_writeoff_ref"]})
                    row.needs_review.append(f"automatic write-off in {max(left, 0)} days: decide today")
            fails = [p for p in linked_failed.get(row.key, []) if not row.flags.get("paid_linked") and not row.flags.get("card_failed")]
            if fails:
                f = fails[-1]
                eid = f"payment:{f['id']}"
                ev.append({"id": eid, "kind": "payment", "file": self.cfg["files"]["payments"]["file"], "recordId": str(f["id"]),
                           "date": iso(f.get("date")), "status": "failed",
                           "title": f"Card payment of {money(f['amount'] or 0)} failed on {nice(f.get('date'))}"})
                row.flags["card_failed"] = True
                rs.append({"text": "The card payment failed. Ask them to update the card (or let the billing tool's own retry email do it).",
                           "evidenceIds": [eid], "policyRef": self.p["card_ref"]})

        return self._assemble(rows, tickets, customers, contacts)

    # ---------------------------------------------------------------- verdicts + output
    def _contact(self, cid, contacts, customers) -> tuple[str, str | None]:
        self._first = ""
        if cid and len(contacts):
            mine = contacts[contacts["customer_id"].astype(str) == str(cid)]
            bill = mine[mine["role"].fillna("").str.contains("bill|finance|accounts", case=False, regex=True)] if len(mine) else mine
            left_word = self.v.get("contact_left_status")
            if left_word and "status" in mine and len(bill):
                gone = bill[bill["status"].fillna("").str.contains(left_word, case=False)]
                active = bill[~bill.index.isin(gone.index)]
                if len(gone):
                    g = gone.iloc[0]
                    who = " ".join(str(x) for x in (g.get("first_name"), g.get("last_name")) if x and pd.notna(x)) or str(g.get("email"))
                    if len(active):
                        a = active.iloc[0]
                        self._first = str(a.get("first_name") or "") if pd.notna(a.get("first_name")) else ""
                        return str(a.get("email") or ""), f"invoice emails still go to {who}, who has left the firm: remove them from the invoice list"
                    return str(g.get("email") or ""), f"the only billing contact, {who}, has left the firm: find the new one before sending"
                bill = active
            pick = bill if len(bill) else mine
            if len(pick):
                fn = pick.iloc[0].get("first_name") if "first_name" in pick else None
                self._first = str(fn) if fn is not None and pd.notna(fn) else ""
                c = pick.sort_values("last_active", ascending=False).iloc[0] if "last_active" in pick else pick.iloc[0]
                stale = None
                if pd.notna(c.get("last_active")) and (self.as_of - c["last_active"]).days > self.p["stale_contact_days"]:
                    stale = f"billing contact last active {nice(c['last_active'])}: may be out of date"
                return str(c.get("email") or c.get("name") or ""), stale
        if cid and cid in customers.index and pd.notna(customers.loc[cid].get("billing_email")):
            return str(customers.loc[cid]["billing_email"]), None
        return "", "no billing contact found"

    def _stage(self, days: int) -> tuple[str, str]:
        stage, ref = self.p["reminders"][0]["stage"], self.p["reminders"][0]["ref"]
        for r in self.p["reminders"]:
            if days >= r["from_days"]:
                stage, ref = r["stage"], r["ref"]
        return stage, ref

    def _draft(self, row: Row, verdict: str, tone: str, to: str, name: str) -> dict:
        """Ledgerline's templates (docs/templates/collections.md), fixed: the 7-day note rewritten in plain words,
        the 21-day note kept without its payment-plan offer (plans need the VP Finance), and no 45-day "final notice"
        (it threatens suspension and an agency; those bills go to a call instead)."""
        amt, inv, due = money(row.amount), row.display_id, nice(row.due)
        hi = f"Hi {self._first}," if getattr(self, "_first", "") else f"Hi {name} team,"
        sender = str(self.cfg.get("people", {}).get("finance_owner", "Finance team")).split(" (")[0]
        sign = f"Thanks,\n{sender}\n{self.cfg.get('company_name', '')} Billing".rstrip()
        if verdict != "send":
            return {"to": to, "subject": "", "body": "", "tone": "none"}
        if tone == "card_update":
            subj = f"Card payment for invoice {inv} didn't go through"
            body = (f"{hi}\n\nThe card on file for {name} didn't go through for invoice {inv} ({amt}), and the automatic retries have now finished. "
                    f"Could you update the card, or reply and we'll send bank details instead?\n\n{sign}")
        elif tone == "soft":
            subj = f"Invoice {inv}: a quick note"
            body = (f"{hi}\n\nI know your team has an open request with our support team, and they're on it. "
                    f"Separately, invoice {inv} for {amt} was due on {due}. When you get a moment, could you check where it is? "
                    f"If anything about the invoice looks wrong, just reply and we'll put it right.\n\n{sign}")
        elif row.days >= 21:
            subj = f"Invoice {inv} is now {row.days} days overdue"
            body = (f"{hi}\n\nI'm following up on invoice {inv} for {amt}, which was due on {due} and is still unpaid.\n\n"
                    f"These sometimes get stuck in an approval queue or go to someone who's left. If that's what happened, let me know who should "
                    f"be getting our invoices and I'll update the billing contact for {name}.\n\n"
                    f"If there's a problem with the invoice itself, reply and we'll fix it. Otherwise you can pay using the link on the invoice.\n\n{sign}")
        else:
            subj = f"Invoice {inv} is overdue"
            body = (f"{hi}\n\nA quick note that invoice {inv} for {amt} was due on {due} and is still open on our side.\n\n"
                    f"If you've already paid, thank you, and please ignore this. If anything on the invoice looks wrong, like the seat count or plan, "
                    f"just reply and we'll fix it before you pay.\n\n{sign}")
        for w in THREAT_WORDS:
            assert w not in body.lower() and w not in subj.lower(), f"draft for {inv} contains '{w}'"
        return {"to": to, "subject": subj, "body": body, "tone": tone}

    def _assemble(self, rows, tickets, customers, contacts) -> dict:
        invoices_out, cust_out = [], {}
        hold_days = self.p["hold_business_days"]
        for row in rows:
            cid = row.match.customer_id
            c = customers.loc[cid] if cid and cid in customers.index else None
            name = str(c["name"]) if c is not None else row.name_raw
            to, contact_note = self._contact(cid, contacts, customers)
            f = row.flags
            big = row.amount >= self.p["call_amount"]
            long_ = row.days >= self.p["call_after_days"]
            if f.get("paid_linked") or f.get("paid_unmatched"):
                verdict, cause = "paid", "paid"
            elif f.get("dispute_hold"):
                verdict, cause = "hold", "wrong_bill"
            elif f.get("complaint_hold") or f.get("disputed_hold") or f.get("open_ticket_hold"):
                verdict, cause = "hold", "unhappy"
            elif f.get("wrong_bill"):
                verdict, cause = "hold", "wrong_bill"
            elif long_ or big or f.get("missing_in_billing") or not row.match.ok:
                verdict = "call"
                cause = "unhappy" if f.get("soft") else "card_failed" if f.get("card_failed") else "simply_late"
                why = []
                if long_:
                    why.append(f"{row.days} days overdue")
                if big:
                    why.append(f"{money(row.amount)} is a large bill")
                if why:
                    row.reasons.append({"text": " and ".join(why).capitalize() + ": a person should call rather than email.",
                                        "evidenceIds": [], "policyRef": self.p["call_ref"]})
                if not row.match.ok:
                    row.reasons.append({"text": "We couldn't confirm who this customer is, so a person handles it.",
                                        "evidenceIds": [], "policyRef": None})
                if self.p.get("escalate_after_days") and row.days >= self.p["escalate_after_days"]:
                    row.reasons.append({"text": f"Over {self.p['escalate_after_days']} days: escalate to {self.cfg['people'].get('vp_finance', 'the VP Finance')}.",
                                        "evidenceIds": [], "policyRef": self.p["escalate_ref"]})
            else:
                verdict = "send"
                cause = "card_failed" if f.get("card_failed") else "unhappy" if f.get("soft") else "simply_late"
            tone = "card_update" if f.get("card_failed") else "soft" if f.get("soft") else "standard"
            if cid in self.top_accounts and verdict in ("send", "call"):
                row.needs_review.append("one of the 50 largest accounts: a person reads or writes this one personally")
                row.reasons.append({"text": "One of the 50 largest accounts: nothing goes out until a person has read it.",
                                    "evidenceIds": [], "policyRef": self.p["top_ref"]})
            if verdict in ("send", "call") and c is not None and pd.notna(c.get("account_manager")) and str(c.get("account_manager")):
                row.reasons.append({"text": f"Tell {c['account_manager']} (account manager) before this goes out.",
                                    "evidenceIds": [], "policyRef": "collections_policy.md: tell the account manager before finance contacts one of their accounts"})
            stage, stage_ref = self._stage(row.days)
            if verdict == "send" and not [r for r in row.reasons if not r["text"].startswith("Tell ")]:
                row.reasons.insert(0, {"text": f"{row.days} days overdue, no open complaint, no payment found, bill matches the contract.",
                                       "evidenceIds": [e["id"] for e in row.evidence], "policyRef": stage_ref})
            if contact_note and verdict == "send":
                row.reasons.append({"text": contact_note.capitalize() + ".", "evidenceIds": [], "policyRef": None})

            headline = row.reasons[0]["text"] if row.reasons else ""
            if verdict == "hold":
                headline = next((r["text"] for r in row.reasons if "dispute" in r["text"] or "complaint" in r["text"].lower()
                                 or "wasn't sure" in r["text"] or "escalation" in r["text"].lower()), headline)
            if verdict == "send":
                headline = {"card_update": "Card failed: send the update-card note", "soft": "Send a softer reminder (open product complaint)"}.get(
                    tone, f"{stage}: {row.days} days overdue, nothing blocking")
            elif verdict == "call" and (long_ or big):
                headline = f"Call: {row.days} days overdue" + (f", {money(row.amount)}" if big else "")
            conf = "low" if row.needs_review else "high" if row.match.method in ("exact_id", "exact_name") else "medium"
            hold = None
            if verdict == "hold":
                deadline = iso(add_business_days(self.as_of, hold_days))
                if cause == "wrong_bill":
                    am = str(c["account_manager"]) if c is not None and pd.notna(c.get("account_manager")) else "the account manager"
                    days_fix = int(self.p.get("dispute_fix_days", 5))
                    owner = self.cfg["people"]["finance_owner"]
                    since = f.get("dispute_since")
                    open_days = int(np.busday_count(pd.Timestamp(since).date(), self.as_of.date())) if since is not None and pd.notna(since) else None
                    with_am = f.get("dispute_pricing")
                    hold = {"owner": owner.split(" (")[0], "ownerRole": "Finance (AR)" + (f", with {am} for the customer's agreement" if with_am else ""),
                            "deadline": iso(add_business_days(self.as_of, max(1, days_fix - (open_days or 0))) if (open_days or 0) < days_fix else self.as_of),
                            "action": (f"Send a corrected invoice or a clear answer to the customer" + (f", agreeing seats or price with {am} first" if with_am else "")
                                       + f". Target: {days_fix} working days from when they raised it.")}
                    if open_days is not None:
                        late = open_days - days_fix
                        row.reasons.append({"text": (f"Raised {nice(since)}: {open_days} working days without a fix, {late} past the {days_fix}-day target."
                                                     if late > 0 else f"Raised {nice(since)}: {open_days} working days so far, target {days_fix}."),
                                            "evidenceIds": [], "policyRef": "Maya (COO): corrected invoice or clear answer within 5 working days"})
                else:
                    am = str(c["account_manager"]) if c is not None and pd.notna(c.get("account_manager")) else "Account manager"
                    hold = {"owner": am, "ownerRole": "Account manager", "deadline": deadline,
                            "action": "Talk to the customer about the open issue, then release or keep the hold. If nobody acts by the deadline, it returns to finance."}
            policy_ref = next((r["policyRef"] for r in row.reasons if r.get("policyRef")), stage_ref)
            out = {
                "id": row.display_id, "customerId": cid, "customerName": name, "amount": round(row.amount, 2),
                "currency": self.cfg.get("currency", "USD"), "issueDate": iso(row.issue) or "", "dueDate": iso(row.due) or "",
                "daysOverdue": int(row.days), "agingBucket": bucket(row.days), "verdict": verdict, "cause": cause,
                "confidence": conf, "headline": headline, "reasons": row.reasons, "evidence": row.evidence,
                "policyRef": policy_ref, "needsReview": bool(row.needs_review),
                "draft": self._draft(row, verdict, tone, to, name), "reminderStage": stage if verdict == "send" else None,
            }
            if row.needs_review:
                out["reviewReason"] = "; ".join(dict.fromkeys(row.needs_review))
            if row.votes:
                out["agreement"] = {"agree": len({v["answer"] for v in row.votes[1:]}) == 1, "votes": row.votes}
            if hold:
                out["hold"] = hold
            out["autoSend"] = self._auto_send(row, verdict, tone, cid, tickets)
            invoices_out.append({k: v for k, v in out.items() if v is not None})
            row.verdict = verdict

            if cid:
                co = cust_out.setdefault(cid, self._customer(cid, customers, tickets))
                co["invoiceIds"].append(row.display_id)
        # aliases for each customer
        for system, raw, m in self.matcher.log:
            if m.customer_id in cust_out and raw:
                al = cust_out[m.customer_id]["aliases"]
                if not any(a["system"] == system and a["name"] == raw for a in al):
                    al.append({"system": system, "name": raw, "matchedBy": m.method, "score": round(float(m.score), 3)})
        self._attach_payments(cust_out)
        return {"invoices": invoices_out, "customers": cust_out, "rows": rows}

    def _auto_send(self, row: Row, verdict: str, tone: str, cid, tickets) -> dict:
        """Maya's trust ladder. Whether this bill could ever go out without Priya clicking, and if not, why not.
        Even when eligible, nothing is auto-sent until a month of approvals is on record and Priya or Dana turns it on."""
        a = self.cfg.get("auto_send", {})
        never = []
        if verdict == "call":
            never.append("every phone call stays with a person")
        if verdict in ("hold",):
            never.append("disputed or held bills stay with a person")
        if verdict == "paid" or row.flags.get("recent_payment"):
            never.append("probably-paid bills, or customers with an unmatched payment, stay with a person")
        if cid in self.top_accounts:
            never.append("top-50 accounts stay with a person")
        if never:
            return {"eligible": False, "why": never[0][0].upper() + never[0][1:], "permanent": True}
        why = []
        if tone != "standard":
            why.append("card follow-ups and softer notes stay with a person" if tone == "card_update" else "customer has an open ticket")
        if any(t.get("is_open") for t in tickets.get(cid, [])):
            why.append("customer has an open ticket")
        if row.days >= int(a.get("max_days", 45)):
            why.append("past the second reminder: anything firmer stays with a person")
        if row.needs_review:
            why.append("in Check first")
        # The size limit ("small") is a setting Priya changes herself in the app (Maya); the app applies it.
        if why:
            return {"eligible": False, "why": why[0][0].upper() + why[0][1:], "permanent": False}
        return {"eligible": True, "why": "Polite first or second reminder; outside the top 50; no open ticket; no unmatched payment", "permanent": False}

    def _customer(self, cid, customers, tickets) -> dict:
        c = customers.loc[cid]
        tk = []
        for t in sorted(tickets.get(cid, []), key=lambda t: t.get("created") or self.as_of, reverse=True)[:12]:
            tk.append({"id": f"ticket:{t['id']}", "kind": "ticket", "file": self.cfg["files"]["tickets"]["file"],
                       "recordId": str(t["id"]), "date": iso(t.get("created")), "status": t.get("status") or "",
                       "title": redact(t.get("subject") or ""), "detail": redact(t.get("body") or "")[:300]})
        kk = []
        k = self.t["contracts"]
        for r in k[k["customer_id"].astype(str) == cid].to_dict("records") if len(k) else []:
            kk.append({"id": f"contract:{r['id']}", "kind": "contract", "file": self.cfg["files"]["contracts"]["file"],
                       "recordId": str(r["id"]), "date": iso(r.get("start")), "status": r.get("status") or "",
                       "title": f"{int(r['seats']) if pd.notna(r.get('seats')) else '?'} seats × "
                                f"{money(r['unit_price']) if pd.notna(r.get('unit_price')) else '?'}, to {nice(r.get('end'))}"})
        get = lambda f: None if pd.isna(c.get(f)) else c.get(f)  # noqa: E731
        out = {"id": cid, "name": str(c["name"]), "aliases": [], "invoiceIds": [], "tickets": tk, "payments": [], "contracts": kk}
        for f_in, f_out in (("segment", "segment"), ("plan", "plan"), ("account_manager", "accountManager")):
            if get(f_in) is not None:
                out[f_out] = str(get(f_in))
        if get("arr") is not None:
            out["arr"] = float(get("arr"))
        if get("renewal_date") is not None:
            out["renewalDate"] = iso(get("renewal_date"))
        if get("billing_email") is not None:
            out["billingContact"] = str(get("billing_email"))
        return out

    def _attach_payments(self, cust_out: dict) -> None:
        pay = self.t["payments"]
        if not len(pay):
            return
        inv = self.t["invoices"]
        inv_cust = dict(zip(inv["id_key"], inv["customer_id"].astype(str))) if len(inv) else {}
        for r in pay.sort_values("date", ascending=False).to_dict("records"):
            cid = inv_cust.get(r.get("invoice_id_key") or "")
            if not cid:
                m = self.matcher.cache.get(__import__("match").clean(r.get("payer")))
                cid = m.customer_id if m else None
            if cid in cust_out and len(cust_out[cid]["payments"]) < 12:
                cust_out[cid]["payments"].append({
                    "id": f"payment:{r['id']}", "kind": "payment", "file": self.cfg["files"]["payments"]["file"],
                    "recordId": str(r["id"]), "date": iso(r.get("date")), "status": r.get("status") or "",
                    "title": f"{money(r['amount'] or 0)}" + (f" for invoice {r['invoice_id']}" if r.get("invoice_id") else " (not linked to a bill)")})
