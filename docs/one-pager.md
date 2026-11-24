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
| **Send** | Nothing blocks a polite reminder | 19 bills · $177,051 |
| **Call** | 45+ days late, or already calling them | 9 bills · $9,384 |

Priya's morning is **11 decisions**, built to take about 5 minutes (the shadow week will time it), one customer at a time. Then her own step: 14 disputes, oldest first, each with a reply that names the issue. After the shadow week, each approved reminder opens in her own email app, written and addressed: she reads it and presses send. During the shadow week nothing goes out from the tool; she compares her calls with its suggestions (the COO's call, 24 Nov). Every other hold goes to an owner with a deadline that carries over day to day, and comes back to her if nobody acts.

## What is AI, what stays with a person, and why

- **A person decides every send.** Top-50 accounts, disputes, probably-paid bills, anything firmer than a nudge and every call always stay with a person: the COO's switch-off lines. Auto-send stays locked until a month of approvals is on record.
- **AI as the auditor:** a separate AI model (Claude, in its own session) reviewed all 54 bills without seeing the tool's answers. Its first pass disagreed on 8: 5 rule errors (fixed), 2 judgment calls the COO has since confirmed, 1 kept on purpose. 6 of those 8 now agree; the other 2 differ on purpose. I propose running it weekly once legal approves a vendor.
- **No AI on customer data in daily use until legal approves a vendor**, because the SLA policy requires a data agreement first; Amazon Bedrock (AWS is already a vendor) is with legal. In testing, before the COO's answer, Groq read masked tickets: that changed no answers, as rules catch all 14 disputes by their invoice number; Check first would hold 10 bills instead of 7.

## Proof, and where it fails

- **Agreement with that review:** 46 of 54 (85%) on the first pass; 52 of 54 (96%) after the fixes, on the same bills, so the shadow week is the real test. The last 2 differ on purpose: an open ticket, and a payment that could belong to either of two bills. A person checked the contested bills; every miss is listed in the tool, with what changed.
- **The COO's two tests read 0.** Her rule, confirmed on 24 Nov: a ticket that isn't about money doesn't stop a polite reminder once Priya has read it (2 customers today, in Check first).
- **Not claimed:** cash coming in sooner. The number to watch is overdue over 60 days ($57,685 today). Time saved, about 3–4 of 16 hours a week, is the COO's estimate, for Priya to confirm.

**Committed before March** (the COO's deadline): save each day's decisions automatically. By hand is fine for the shadow week, and a missed day is flagged the next morning, but a daily download is the step that gets skipped when Dana covers.

## With more time

Read the billing@ inbox (disputes sent by email are invisible today); payment plans with the VP Finance's approval; live read-only QuickBooks, Zendesk and Slack connections.

**Disclosure:** built and tested on made-up data before Begin; everything using Ledgerline's data came after (see the git history). Built with Claude; an AI redraft button (Groq) exists but is switched off until legal approves a vendor.
