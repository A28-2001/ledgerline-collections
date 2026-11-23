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

BILLING_RX = re.compile(
    r"invoice|\bbill(ed|ing|s)?\b|charg(e|ed|es|ing)|overcharg|refund|\bcredit\b|pric(e|ing)|per seat|"
    r"seats? (we|but)|double|twice|dispute|discount|cancel(l)?ed the|wrong amount|pay more|paying more",
    re.I)
SERIOUS_RX = re.compile(r"outage|system down|is down|can.?t log ?in|cannot log ?in|whole team|churn|"
                        r"cancel (our|the) (account|subscription|contract)|reviewing whether to stay|"
                        r"switch(ing)? to|escalat|legal|lawyer", re.I)
NEGATIVE_RX = re.compile(r"broken|fail|error|frustrat|not working|issue|problem|bug|slow|spins|lost|blocking", re.I)
CAUSE_LABEL = {"unhappy": "Unhappy customer", "paid": "Already paid", "wrong_bill": "Bill doesn't match contract",
               "card_failed": "Card payment failed", "simply_late": "Simply late"}


def money(x: float) -> str:
    return f"${x:,.0f}" if abs(x) >= 100 else f"${x:,.2f}"


def iso(x) -> str | None:
    return None if x is None or pd.isna(x) else pd.Timestamp(x).date().isoformat()


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

    def tickets_by_customer(self, overdue_customers: set[str]) -> dict[str, list[dict]]:
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
            # Open tickets always count; closed ones only if recent enough to mention.
            t["relevant"] = m.customer_id in overdue_customers and pd.notna(created) and (is_open or created >= mention_from)
            t["recent"] = pd.notna(created) and created >= lookback
            t["label"], t["agreement"] = t["rules_label"], None
            if t["relevant"] and is_open and self.ai and self.ai.enabled:
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
        if not len(pay):
            return linked_ok, linked_failed, unmatched_by_cust
        failed = pay["status"].isin(self.v["payment_failed_status"]) if self.d.has("payments", "status") else pd.Series(False, index=pay.index)
        for r, f in zip(pay.to_dict("records"), failed):
            k = r.get("invoice_id_key") or ""
            if k:
                (linked_failed if f else linked_ok).setdefault(k, []).append(r)
            elif not f:
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
        tickets = self.tickets_by_customer(overdue_customers)
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
            if paid_ev is not None:
                eid = f"payment:{paid_ev['id']}"
                ev.append({"id": eid, "kind": "payment", "file": self.cfg["files"]["payments"]["file"], "recordId": str(paid_ev["id"]),
                           "date": iso(paid_ev.get("date")), "status": "succeeded",
                           "title": f"{money(paid_ev['amount'])} received on {iso(paid_ev.get('date'))} from \"{paid_ev.get('payer') or ''}\""})
                rs.append({"text": ("A payment linked to this bill was received, but the accounting export still shows it open."
                                    if row.flags.get("paid_linked") else
                                    "An unmatched bank payment from this customer equals this bill. It was probably paid but never matched."),
                           "evidenceIds": [eid], "policyRef": None})

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
                           "title": t.get("subject") or "(no subject)", "detail": body[:400] + ("…" if len(body) > 400 else "")})
                if t.get("agreement"):
                    row.votes = t["agreement"]["votes"]
                if not open_:
                    if label == "billing_complaint":
                        rs.append({"text": f"A billing ticket from {iso(t['created'])} is closed. Mentioned for context; it doesn't block the reminder.",
                                   "evidenceIds": [eid], "policyRef": None})
                    continue
                if label == "disagree":
                    row.flags["ticket_disputed"] = True
                    row.needs_review.append("the AI judges disagreed about what this ticket means")
                    if any(v["answer"] in ("billing_complaint", "serious_escalation") for v in t["agreement"]["votes"]):
                        row.flags["disputed_hold"] = True  # when unsure, don't chase: a person reads it first
                        rs.append({"text": "An open ticket might be a billing complaint or a serious escalation (the AI judges disagreed). We don't chase until a person reads it.",
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

            # 3. Bill vs contract
            if row.inv is not None and cid:
                k = self.contract_for(cid, row.issue)
                chk = self.bill_matches_contract(row.inv, k) if k else None
                if k:
                    keid = f"contract:{k['id']}"
                    ev.append({"id": keid, "kind": "contract", "file": self.cfg["files"]["contracts"]["file"], "recordId": str(k["id"]),
                               "date": iso(k.get("start")),
                               "title": f"Contract: {int(k['seats']) if pd.notna(k.get('seats')) else '?'} seats × "
                                        f"{money(k['unit_price']) if pd.notna(k.get('unit_price')) else '?'}"
                                        + (f", {iso(k.get('start'))} to {iso(k.get('end'))}" if pd.notna(k.get('start')) else "")})
                    if chk and not chk[0]:
                        row.flags["wrong_bill"] = True
                        rs.append({"text": f"The bill doesn't match the contract: {chk[1]}. Fix the bill before asking for money.",
                                   "evidenceIds": [keid], "policyRef": self.p["hold_ref"]})

            # 4. Failed card payment
            fails = [p for p in linked_failed.get(row.key, []) if not row.flags.get("paid_linked")]
            if fails:
                f = fails[-1]
                eid = f"payment:{f['id']}"
                ev.append({"id": eid, "kind": "payment", "file": self.cfg["files"]["payments"]["file"], "recordId": str(f["id"]),
                           "date": iso(f.get("date")), "status": "failed",
                           "title": f"Card payment of {money(f['amount'] or 0)} failed on {iso(f.get('date'))}"})
                row.flags["card_failed"] = True
                rs.append({"text": "The card payment failed. Ask them to update the card (or let the billing tool's own retry email do it).",
                           "evidenceIds": [eid], "policyRef": self.p["card_ref"]})

        return self._assemble(rows, tickets, customers, contacts)

    # ---------------------------------------------------------------- verdicts + output
    def _contact(self, cid, contacts, customers) -> tuple[str, str | None]:
        if cid and len(contacts):
            mine = contacts[contacts["customer_id"].astype(str) == str(cid)]
            bill = mine[mine["role"].fillna("").str.contains("bill|finance|accounts", regex=True)] if len(mine) else mine
            pick = bill if len(bill) else mine
            if len(pick):
                c = pick.sort_values("last_active", ascending=False).iloc[0] if "last_active" in pick else pick.iloc[0]
                stale = None
                if pd.notna(c.get("last_active")) and (self.as_of - c["last_active"]).days > self.p["stale_contact_days"]:
                    stale = f"billing contact last active {iso(c['last_active'])}: may be out of date"
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
        amt, inv, due = money(row.amount), row.display_id, iso(row.due)
        if verdict != "send":
            return {"to": to, "subject": "", "body": "", "tone": "none"}
        if tone == "card_update":
            subj = f"Your card payment for invoice {inv} didn't go through"
            body = (f"Hi {name} team,\n\nWe tried to charge your card for invoice {inv} ({amt}), but the payment didn't go through. "
                    f"Could you update the card on file? Once it's updated we'll retry automatically.\n\nThanks,\nFinance team")
        elif tone == "soft":
            subj = f"Invoice {inv}: a gentle reminder"
            body = (f"Hi {name} team,\n\nWe know your team has an open request with our support team, and they're on it. "
                    f"Separately, invoice {inv} for {amt} was due on {due}. Whenever you get a chance, could you check on it? "
                    f"If anything about the invoice looks off, just reply and we'll sort it out.\n\nThanks,\nFinance team")
        else:
            stage, _ = self._stage(row.days)
            subj = f"{stage}: invoice {inv} ({amt}) was due {due}"
            body = (f"Hi {name} team,\n\nThis is a reminder that invoice {inv} for {amt} was due on {due} "
                    f"and is now {row.days} days overdue. Could you let us know when we can expect payment? "
                    f"If it's already on its way, thank you, and please ignore this note.\n\nThanks,\nFinance team")
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
            elif f.get("complaint_hold") or f.get("disputed_hold"):
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
            else:
                verdict = "send"
                cause = "card_failed" if f.get("card_failed") else "unhappy" if f.get("soft") else "simply_late"
            tone = "card_update" if f.get("card_failed") else "soft" if f.get("soft") else "standard"
            stage, stage_ref = self._stage(row.days)
            if verdict == "send" and not row.reasons:
                row.reasons.append({"text": f"{row.days} days overdue, no open complaint, no payment found, bill matches the contract.",
                                    "evidenceIds": [e["id"] for e in row.evidence], "policyRef": stage_ref})
            if contact_note and verdict == "send":
                row.reasons.append({"text": contact_note.capitalize() + ".", "evidenceIds": [], "policyRef": None})

            headline = row.reasons[0]["text"] if row.reasons else ""
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
                    hold = {"owner": self.cfg["people"]["billing_owner"], "ownerRole": "Billing", "deadline": deadline,
                            "action": "Check the bill against the contract; reissue or confirm it. If nobody acts by the deadline, it returns to finance."}
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

    def _customer(self, cid, customers, tickets) -> dict:
        c = customers.loc[cid]
        tk = []
        for t in sorted(tickets.get(cid, []), key=lambda t: t.get("created") or self.as_of, reverse=True)[:12]:
            tk.append({"id": f"ticket:{t['id']}", "kind": "ticket", "file": self.cfg["files"]["tickets"]["file"],
                       "recordId": str(t["id"]), "date": iso(t.get("created")), "status": t.get("status") or "",
                       "title": t.get("subject") or "", "detail": (t.get("body") or "")[:300]})
        kk = []
        k = self.t["contracts"]
        for r in k[k["customer_id"].astype(str) == cid].to_dict("records") if len(k) else []:
            kk.append({"id": f"contract:{r['id']}", "kind": "contract", "file": self.cfg["files"]["contracts"]["file"],
                       "recordId": str(r["id"]), "date": iso(r.get("start")), "status": r.get("status") or "",
                       "title": f"{int(r['seats']) if pd.notna(r.get('seats')) else '?'} seats × "
                                f"{money(r['unit_price']) if pd.notna(r.get('unit_price')) else '?'}, to {iso(r.get('end'))}"})
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
