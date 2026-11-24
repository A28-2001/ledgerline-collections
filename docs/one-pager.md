# Collections check: "Should we chase this invoice today?"

**Tool:** https://ledgerline-collections.vercel.app/story · **Video:** [link] · **Repo:** [link or zip] · **Process:** FIN-1 Collections, owned by Priya Nair (AR Specialist)

## The problem

Ledgerline has **$633,245 overdue across 54 bills** (31 Oct 2026), its highest month-end in 12 months. Finance chases by hand, about 16 hours a week, and **can't open Zendesk**. **$309,000 (49%) of it is disputed** in tickets that name the exact invoice: wrong seats, a missing discount, a fee meant to be waived. Zendesk marks 11 of the 14 tickets solved, but the bills were never fixed.

## What the tool does

Every morning it asks five questions of each overdue bill and gives one answer, with its reason, the records behind it and the policy line:

| Answer | When | Today |
|---|---|---|
| **Probably paid** | An unmatched payment fits the bill; Marcus matches it | 5 bills · $78,348 |
| **Hold** | Disputed, open ticket, threat, refund owed, unclear payment, or under 7 days late | 21 bills · $368,462 |
| **Call** | 45+ days late, or already calling them | 8 calls · $9,384 |
| **Send** | Nothing blocks a polite reminder | 19 bills · $177,051 |

Priya's morning is **5 bills to check and four bulk approvals**. Her real work is then the 12 disputes past the 5-day target ($241,320), each with a reply draft. Every other hold goes to an owner with a deadline, and comes back to her if nobody acts.

## What is AI, what stays with a person, and why

- **A person decides every send.** Top-50 accounts, disputes, probably-paid bills, anything firmer than a nudge and every call always stay with a person: the COO's switch-off lines. Auto-send stays locked until a month of approvals is on record.
- **No AI on customer data until legal approves a vendor**, because the SLA policy requires a data agreement first. Rules read tags, status and invoice numbers inside Ledgerline. Amazon Bedrock (AWS is already a vendor) is with legal.
- **Measured, not claimed:** with answers saved from a test run on this fictional data, AI changed no answers, because rules catch all 14 disputes by their invoice number. It moved 9 bills in or out of Check first. AI earns its place on complaints that don't quote an invoice number; the shadow week measures that.

## Proof, and where it fails

- **Accuracy:** a separate AI model reviewed all 54 bills without seeing the tool's answers; I checked all 11 contested calls by hand. First pass **46 of 54 (85%)**; 53 of 54 after the fixes, on the same bills, so the shadow week is the real test. Every miss is listed in the tool, including one from my own hand check.
- **The COO's two tests read 0.** Under the strictest reading, 2 customers with a pending ticket that isn't about money still get a reminder: my call, for the COO to confirm. Earlier versions would have chased 3 customers with a complaint open.
- **Not claimed:** cash coming in sooner. The number to watch is overdue over 60 days ($57,685 today).

## With more time

Read the billing@ inbox (disputes sent by email are invisible today); payment plans with the VP Finance's approval; live read-only QuickBooks and Zendesk connections; store decisions on a server, so tomorrow's run remembers them without someone dropping yesterday's list into the data folder.

**Disclosure:** built and tested on made-up data before Begin; everything using Ledgerline's data came after (see the git history). Built with Claude; the demo's redraft button uses Groq.
