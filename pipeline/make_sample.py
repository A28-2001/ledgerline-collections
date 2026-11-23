"""Make a fake sample data set ("Demo Co") with the same shape we expect from the data room.

Used to build and test the tool before Begin. Every name and number is made up.
It also plants known cases (already paid, billing complaint, wrong bill...) and writes
the right answer for each overdue bill to labels.csv, so we can measure the tool.

    python pipeline/make_sample.py            # writes data/sample/
"""
from __future__ import annotations

import csv
import random
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "sample"
AS_OF = date(2026, 10, 31)
REWRITE = date(2026, 3, 1)
rng = random.Random(42)

PREFIX = ["Northwind", "Bluepeak", "Cedar", "Summit", "Harbor", "Ironwood", "Lumen", "Maple", "Orchard",
          "Pinecrest", "Quarry", "Redstone", "Silverline", "Tidewater", "Upland", "Vantage", "Willow",
          "Brightway", "Clearwater", "Driftwood", "Evergreen", "Foxglove", "Granite", "Highland", "Juniper",
          "Keystone", "Lakeside", "Meridian", "Northstar", "Oakridge"]
NOUN = ["Logistics", "Dental", "Realty", "Foods", "Health", "Analytics", "Freight", "Labs", "Partners",
        "Studios", "Supply", "Clinics", "Software", "Builders", "Outfitters"]
SUFFIX = ["Inc", "LLC", "Co", "Group", "", "Inc", "LLC"]
AMS = ["Jordan Lee", "Priya Shah", "Marcus Hill", "Elena Ortiz", "Sam Carter"]
SEGMENTS = ["SMB", "Mid-market", "Enterprise"]


def d(x: date | None) -> str:
    return x.isoformat() if x else ""


def add_months(x: date, n: int) -> date:
    y, m = divmod(x.month - 1 + n, 12)
    return date(x.year + y, m + 1, 1)


AR_NAMES: dict[str, str] = {}


def ar_variant(name: str) -> str:
    """How an accounting export spells the name (one spelling per customer)."""
    if name not in AR_NAMES:
        AR_NAMES[name] = _ar_variant(name)
    return AR_NAMES[name]


def _ar_variant(name: str) -> str:
    base = name
    r = rng.random()
    if r < 0.25:
        return base.upper()
    if r < 0.45:
        for s in (" Inc", " LLC", " Co", " Group"):
            if base.endswith(s):
                return base[: -len(s)] + {" Inc": ", Inc.", " LLC": ", L.L.C.", " Co": " Company", " Group": " Grp"}[s]
        return base + ", Inc."
    if r < 0.6:
        return "The " + base
    if r < 0.72 and len(base) > 8:  # small typo
        i = rng.randrange(1, len(base) - 3)
        return base[:i] + base[i + 1] + base[i] + base[i + 2:]
    if r < 0.82:
        parts = base.split()
        if len(parts) >= 2:
            return parts[0] + " " + parts[1][:3] + "."
    return base


def payer_variant(name: str) -> str:
    """How a bank statement might spell the payer."""
    s = name.upper().replace(",", "").replace(".", "")
    return s[:18].strip() if rng.random() < 0.6 else s


def ticket_variant(name: str) -> str:
    r = rng.random()
    if r < 0.4:
        return name
    if r < 0.7:
        for s in (" Inc", " LLC", " Co", " Group"):
            if name.endswith(s):
                return name[: -len(s)]
        return name
    return name.lower()


TICKETS = {
    "billing": [
        ("Invoice looks wrong", "Hi, our latest invoice charges us for {n} seats but we only have {m}. Please fix before we pay."),
        ("Overcharged this month", "We were overcharged on invoice {inv}. The price per seat doesn't match our contract."),
        ("Double charged?", "It looks like we were billed twice for the same period. Can you check and refund?"),
        ("Dispute on invoice {inv}", "We dispute this invoice. We cancelled the add-on in June but are still being charged."),
    ],
    "billing_vague": [
        ("Question about this month", "Why did this month's number jump so much? We didn't add anyone to the team."),
        ("Can someone explain", "Our finance lead is asking why we pay more than last quarter. Nobody here changed anything."),
    ],
    "bug": [
        ("Export is broken", "The CSV export has been failing since Tuesday. This is blocking our month-end."),
        ("Dashboard not loading", "The main dashboard spins forever for half the team. Very frustrating."),
        ("Sync errors", "We keep getting sync errors and lost two days of entries."),
    ],
    "outage": [
        ("URGENT: system down for our whole team", "Nobody on our team can log in since this morning. This is costing us money every hour."),
        ("Escalation: repeated outages", "Third outage this month. Our COO wants a call. We are reviewing whether to stay."),
    ],
    "how-to": [
        ("How do I add a user?", "Where do I go to invite a new teammate?"),
        ("Change report dates", "How can I change the default date range on reports?"),
        ("SSO setup", "Do you have docs for setting up single sign-on?"),
    ],
    "feature request": [
        ("Feature idea: dark mode", "Would love a dark mode option."),
        ("Bulk edit", "It would be great to bulk edit records."),
    ],
}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    # Customers ------------------------------------------------------------
    names: list[str] = []
    while len(names) < 110:
        n = f"{rng.choice(PREFIX)} {rng.choice(NOUN)}"
        s = rng.choice(SUFFIX)
        full = f"{n} {s}".strip()
        if all(not x.startswith(n) for x in names):
            names.append(full)

    customers, contacts, contracts = [], [], []
    for i, name in enumerate(names, start=1):
        cid = f"C{i:04d}"
        seg = rng.choices(SEGMENTS, [0.6, 0.3, 0.1])[0]
        seats = {"SMB": rng.randint(5, 25), "Mid-market": rng.randint(25, 120), "Enterprise": rng.randint(120, 400)}[seg]
        price = rng.choice([39, 49, 59, 69, 79])
        annual = seg == "Enterprise" or rng.random() < 0.08
        start = add_months(date(2025, 1, 1), rng.randint(0, 9))
        slug = "".join(ch for ch in name.lower() if ch.isalnum())[:16]
        customers.append({
            "customer_id": cid, "name": name, "segment": seg, "plan": rng.choice(["Core", "Pro", "Scale"]),
            "arr": seats * price * 12, "account_manager": rng.choice(AMS),
            "renewal_date": d(add_months(start, 12)), "billing_email": f"billing@{slug}.example",
        })
        contracts.append({
            "contract_id": f"K{i:04d}", "customer_id": cid, "start_date": d(start), "end_date": d(add_months(start, 24)),
            "seats": seats, "price_per_seat": price, "status": "active", "_annual": annual,
            "_net": rng.choice([15, 30, 30, 45]),
        })
        for j in range(rng.randint(1, 3)):
            role = "billing" if j == 0 else rng.choice(["admin", "user"])
            last = AS_OF - timedelta(days=rng.choice([3, 10, 25, 60, 400]) if role == "billing" else rng.randint(1, 90))
            contacts.append({
                "contact_id": f"P{i:04d}{j}", "customer_id": cid, "name": f"Contact {i}-{j}",
                "email": f"{role}{j}@{slug}.example", "role": role, "last_active": d(last),
            })

    # Invoices -------------------------------------------------------------
    invoices, payments = [], []
    inv_no = 1000
    pay_no = 5000
    cust_by_id = {c["customer_id"]: c for c in customers}
    for k in contracts:
        cid = k["customer_id"]
        first = max(add_months(date(2025, 11, 1), 0), date.fromisoformat(k["start_date"]))
        months = []
        m = first
        while m <= date(2026, 10, 1):
            months.append(m)
            m = add_months(m, 12 if k["_annual"] else 1)
        for issue in months:
            inv_no += 1
            amount = k["seats"] * k["price_per_seat"] * (12 if k["_annual"] else 1)
            invoices.append({
                "invoice_id": f"INV-{inv_no}", "customer_id": cid, "customer_name": cust_by_id[cid]["name"],
                "issue_date": d(issue), "due_date": d(issue + timedelta(days=k["_net"])), "amount": float(amount),
                "status": "paid", "paid_date": "", "payment_method": rng.choice(["card", "card", "ach", "wire"]),
                "seats_billed": k["seats"], "unit_price": k["price_per_seat"],
            })

    # Pick which bills are still overdue on AS_OF.
    def due(inv): return date.fromisoformat(inv["due_date"])
    candidates = [i for i in invoices if due(i) < AS_OF and due(i) >= date(2026, 5, 1)]
    overdue_customers = rng.sample(sorted({i["customer_id"] for i in candidates}), 52)
    overdue: list[dict] = []
    for cid in overdue_customers:
        mine = sorted([i for i in candidates if i["customer_id"] == cid], key=due, reverse=True)
        overdue.extend(mine[: rng.choice([1, 1, 1, 2, 2, 3])])
    overdue_ids = {i["invoice_id"] for i in overdue}

    # Everything else got paid; payment speed worsens after the rewrite.
    for inv in invoices:
        if inv["invoice_id"] in overdue_ids:
            inv["status"] = "open"
            continue
        if due(inv) >= AS_OF:  # not due yet: some paid, some open
            if rng.random() < 0.5:
                inv["status"] = "open"
                continue
        lag = rng.randint(-10, 12) if due(inv) < REWRITE else rng.randint(-8, 24)
        paid = min(due(inv) + timedelta(days=lag), AS_OF - timedelta(days=1))
        inv["paid_date"] = d(paid)
        pay_no += 1
        payments.append({
            "payment_id": f"PAY-{pay_no}", "invoice_id": inv["invoice_id"],
            "payer_name": payer_variant(cust_by_id[inv["customer_id"]]["name"]), "amount": inv["amount"],
            "payment_date": d(paid), "method": inv["payment_method"], "status": "succeeded",
        })

    # Planted cases ----------------------------------------------------------
    labels: dict[str, tuple[str, str]] = {}
    tickets: list[dict] = []
    t_no = 20000

    def add_ticket(cid, cat, created, status, priority, inv=None, tmpl_key=None):
        nonlocal t_no
        t_no += 1
        subj, body = rng.choice(TICKETS[tmpl_key or cat])
        k = next(c for c in contracts if c["customer_id"] == cid)
        fmt = {"n": k["seats"] + rng.randint(3, 9), "m": k["seats"], "inv": inv or "our last invoice"}
        tickets.append({
            "ticket_id": f"T-{t_no}", "company": ticket_variant(cust_by_id[cid]["name"]),
            "created_at": f"{d(created)}T{rng.randint(8, 17):02d}:{rng.randint(0, 59):02d}:00",
            "status": status, "priority": priority, "category": "billing" if cat.startswith("billing") else cat,
            "subject": subj.format(**fmt), "body": body.format(**fmt),
        })

    by_cust: dict[str, list[dict]] = {}
    for inv in overdue:
        by_cust.setdefault(inv["customer_id"], []).append(inv)
    pool = list(by_cust)
    rng.shuffle(pool)

    def take(n):
        out = pool[:n]
        del pool[:n]
        return out

    for cid in take(8):  # unmatched payment that pays an overdue bill (customers pay the oldest first)
        inv = by_cust[cid][-1]
        pay_no += 1
        payments.append({
            "payment_id": f"PAY-{pay_no}", "invoice_id": "", "payer_name": payer_variant(inv["customer_name"]),
            "amount": inv["amount"], "payment_date": d(AS_OF - timedelta(days=rng.randint(3, 20))),
            "method": "ach", "status": "succeeded",
        })
        labels[inv["invoice_id"]] = ("paid", "unmatched bank payment for this bill")
    for cid in take(3):  # paid in billing system, still open in the accounting export
        inv = by_cust[cid][0]
        pay_no += 1
        payments.append({
            "payment_id": f"PAY-{pay_no}", "invoice_id": inv["invoice_id"], "payer_name": payer_variant(inv["customer_name"]),
            "amount": inv["amount"], "payment_date": d(AS_OF - timedelta(days=rng.randint(2, 9))),
            "method": inv["payment_method"], "status": "succeeded",
        })
        inv["_sync_gap"] = True
        labels[inv["invoice_id"]] = ("paid", "paid and linked, but still open in the accounting export")
    for cid in take(8):  # open billing complaint -> hold
        add_ticket(cid, "billing", AS_OF - timedelta(days=rng.randint(2, 20)), rng.choice(["open", "pending"]), "normal",
                   inv=by_cust[cid][0]["invoice_id"])
        for inv in by_cust[cid]:
            labels.setdefault(inv["invoice_id"], ("hold", "open billing complaint"))
    for cid in take(2):  # vague billing complaint the keyword rules may miss
        add_ticket(cid, "billing_vague", AS_OF - timedelta(days=rng.randint(2, 12)), "open", "normal",
                   tmpl_key="billing_vague")
        tickets[-1]["category"] = "general"
        for inv in by_cust[cid]:
            labels.setdefault(inv["invoice_id"], ("hold", "billing complaint in vague words"))
    for cid in take(3):  # serious open escalation -> hold
        add_ticket(cid, "outage", AS_OF - timedelta(days=rng.randint(1, 10)), "open", "urgent")
        for inv in by_cust[cid]:
            labels.setdefault(inv["invoice_id"], ("hold", "serious open escalation"))
    soft = take(7)
    for cid in soft:  # open product complaint -> send, softer tone
        add_ticket(cid, "bug", AS_OF - timedelta(days=rng.randint(2, 25)), "open", "normal")
    closed_billing = take(5)
    for cid in closed_billing:  # old, closed billing ticket -> mention only
        add_ticket(cid, "billing", AS_OF - timedelta(days=rng.randint(70, 110)), "closed", "normal",
                   inv=by_cust[cid][0]["invoice_id"])
    for cid in take(6):  # wrong bill after the rewrite: more seats billed than the contract
        inv = by_cust[cid][0]
        extra = rng.randint(4, 12)
        inv["seats_billed"] += extra
        inv["amount"] = float(inv["seats_billed"] * inv["unit_price"])
        labels.setdefault(inv["invoice_id"], ("hold", "bill does not match the contract"))
    card_fail = take(5)
    for cid in card_fail:  # failed card payment
        inv = by_cust[cid][0]
        inv["payment_method"] = "card"
        pay_no += 1
        payments.append({
            "payment_id": f"PAY-{pay_no}", "invoice_id": inv["invoice_id"], "payer_name": payer_variant(inv["customer_name"]),
            "amount": inv["amount"], "payment_date": d(due(inv)), "method": "card", "status": "failed",
        })

    # Background tickets (noise), July to October.
    for _ in range(330):
        cid = rng.choice(customers)["customer_id"]
        cat = rng.choices(["how-to", "feature request", "bug", "billing"], [0.45, 0.15, 0.3, 0.1])[0]
        created = date(2026, 7, 1) + timedelta(days=rng.randint(0, 121))
        is_od = cid in by_cust
        status = "closed" if (is_od or rng.random() < 0.85) else rng.choice(["open", "pending"])
        if is_od and created > AS_OF - timedelta(days=30):
            created = AS_OF - timedelta(days=rng.randint(31, 120))  # keep noise out of the planted cases
        add_ticket(cid, cat, max(created, date(2026, 7, 1)), status, rng.choice(["low", "normal", "normal", "high"]))
        if status != "closed" and cid in by_cust:
            tickets[-1]["status"] = "closed"

    # Remaining overdue bills: call or send, by the policy thresholds.
    for inv in overdue:
        if inv["invoice_id"] in labels:
            continue
        days = (AS_OF - due(inv)).days
        if days >= 45 or inv["amount"] >= 25000:
            labels[inv["invoice_id"]] = ("call", "long overdue or large")
        elif inv["customer_id"] in soft:
            labels[inv["invoice_id"]] = ("send", "open product complaint: softer reminder")
        elif inv["customer_id"] in card_fail and inv is by_cust[inv["customer_id"]][0]:
            labels[inv["invoice_id"]] = ("send", "failed card: update-card email")
        else:
            labels[inv["invoice_id"]] = ("send", "simply late")

    # Accounting export (AR aging) ------------------------------------------
    ar = []
    for inv in overdue:
        ar.append({
            "invoice_number": inv["invoice_id"].replace("INV-", ""), "customer": ar_variant(inv["customer_name"]),
            "invoice_date": inv["issue_date"], "due_date": inv["due_date"], "open_balance": inv["amount"],
            "days_past_due": (AS_OF - due(inv)).days,
        })
        if inv.get("_sync_gap"):
            inv["status"] = "paid"
            inv["paid_date"] = next(p["payment_date"] for p in payments if p["invoice_id"] == inv["invoice_id"])
    # One row the billing system doesn't know about.
    ar.append({"invoice_number": "9001", "customer": "Westbrook Consulting", "invoice_date": "2026-06-01",
               "due_date": "2026-07-01", "open_balance": 1800.0, "days_past_due": (AS_OF - date(2026, 7, 1)).days})
    labels["9001"] = ("call", "not in the billing system: a person checks")

    # Write files ------------------------------------------------------------
    def write(name, rows, drop=()):
        cols = [c for c in rows[0] if c not in drop and not c.startswith("_")]
        with open(OUT / name, "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
            w.writeheader()
            w.writerows(rows)

    write("customers.csv", customers)
    write("contacts.csv", contacts)
    write("contracts.csv", contracts)
    write("invoices.csv", invoices)
    write("payments.csv", payments)
    write("ar_aging.csv", ar)
    write("tickets.csv", tickets)
    with open(OUT / "labels.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["invoice_id", "true_verdict", "note"])
        for k, (v, note) in labels.items():
            w.writerow([k.replace("INV-", ""), v, note])

    (OUT / "collections_policy.md").write_text("""# Collections policy (SAMPLE, made up)

## §1 Scope
Applies to all overdue customer invoices.

## §2 Reminder schedule
First reminder at 1 day overdue, second at 15 days, final at 30 days.

## §3 Escalation
At 45 days overdue, or any bill of $25,000 or more, a person calls the customer instead of emailing.

## §4 Disputes and holds
If the customer has raised a billing dispute or a serious complaint, pause reminders. The account manager has 5 business days to respond.

## §5 Card payments
If a card payment fails, send the update-card email instead of a reminder.
""")
    (OUT / "sla_policy.md").write_text("""# Support SLA (SAMPLE, made up)

## §1 Priorities
Urgent: whole team blocked. High: major feature broken. Normal and low: everything else.

## §2 Sensitive tickets
Urgent tickets, outages and billing disputes are sensitive: finance must not contact the customer about money until the ticket is resolved.
""")
    (OUT / "org_chart.md").write_text("# Org chart (SAMPLE)\n\n- VP Finance\n  - Accounts receivable specialist: sends payment reminders\n- Head of Customer Success\n  - Account managers (5)\n")
    (OUT / "tool_stack.md").write_text("# Tool stack (SAMPLE)\n\n- Accounting: QuickBooks\n- Billing: in-house billing engine (rewritten March 2026)\n- Payments: Stripe (cards), bank (ACH, wire)\n- Support: Zendesk\n- CRM: HubSpot\n- Reminders: sent by hand from Gmail using a template\n")
    (OUT / "board_update_2026_q3.md").write_text("# Board update Q3 (SAMPLE)\n\nCash: overdue receivables are up this quarter and DSO rose. Collections is a focus for Q4.\n")

    print(f"Sample written to {OUT.relative_to(ROOT)}: {len(customers)} customers, {len(invoices)} invoices, "
          f"{len(payments)} payments, {len(ar)} AR rows, {len(tickets)} tickets, {len(labels)} labels")


if __name__ == "__main__":
    main()
