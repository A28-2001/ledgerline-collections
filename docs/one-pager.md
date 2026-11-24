# Collections check: "Should we chase this invoice today?"

**Tool:** https://ledgerline-collections.vercel.app (start with "The story") · **Video:** [link] · **Repo:** [link or zip] · **Process:** FIN-1 Collections, owned by Priya Nair (AR Specialist)

## The process and the problem

Ledgerline has **$633,245 overdue across 54 bills** (as of 31 Oct 2026): 44% of open receivables, up from 30% in April. The board calls collections "the main risk to cash". Two people chase it part-time, about 16 hours a week, and **finance has no access to Zendesk**, so they ask around on Slack.

**What the data showed:** **$309,000 (49%) of the overdue money is disputed** in support tickets that name the exact invoice: wrong seat counts, a missing discount, a fee that was meant to be waived, VAT added in error. For 11 of those 14 bills, Zendesk marks the ticket solved or leaves it pending, but the bill was never fixed. Every one is still unpaid. Bills match their contracts exactly, so the errors are in what people promised, and only the tickets show them.

## What the tool does

Every morning it asks five questions of each overdue bill, in order, and gives one answer with its reason, the evidence and the policy line behind it:

| Answer | When | Today |
|---|---|---|
| **Probably paid** | An unmatched payment matches the bill. Goes to Marcus to match, Priya copied | 5 · $78,348 |
| **Hold** | Disputed, an open ticket, a chargeback or regulator threat, a refund we owe, or under 7 days late | 20 · $363,362 |
| **Call** | 45+ days (the 45-day email threatens suspension), or we're already calling them | 9 · $9,384 |
| **Send** | Nothing blocks a polite reminder. Priya approves in one click | 20 · $182,151 |

Priya works through **19 decisions instead of reading 54 bills**. Each person gets one Slack message a day: Marcus his matches, each account manager their paused accounts, Dana her write-off warnings.

## What is AI and what stays with a person, and why

- **Nothing is sent without a person.** Priya approves every message. Top-50 accounts, disputes, probably paid, anything firmer than a nudge and every call stay with a person permanently (the COO's switch-off lines).
- **Holds have owners and clocks:** Priya fixes disputes in 5 working days (Dana approves corrections over $2,500 or on top-50 accounts); account managers get 3 days on open tickets; Marcus gets 2 days on payments. If nobody acts, it comes back to Priya.
- **AI reads tickets only once legal approves a vendor.** The SLA policy forbids sending ticket content to a new vendor without a data processing agreement, so the default reads tags, status and simple rules locally. Two AI judges from different model families (redacted text) held all 14 disputes in testing; when they disagree, a person decides. I proposed Amazon Bedrock (AWS is already a vendor); the COO is taking that note to legal.
- **Auto-send is locked** until a month of Priya's approvals is on record, and then only for small (under $5,000, Priya's setting), polite first or second reminders.

## Proof, and where it fails

- **Accuracy:** an independent reviewer who never saw the tool's answers checked all 54 bills, and I confirmed every contested call by hand. First pass: **46 of 54 (85%)**. After fixing what the misses exposed: 53 of 54, on the same bills, so not a fresh-data figure. The shadow week measures that.
- **The misses, all shown in the tool:** a regulator complaint and a chargeback raised before the bill, two disputes read as "escalations" (one found by the COO), a reminder before day 7, an email plus a call on the same day, and one in my own hand check: a payment that could pay either of two same-amount bills. Each led to a rule.
- **Both of the COO's tests read 0 today:** nobody chased who had paid, nobody chased with a complaint open.
- **Not claimed:** cash coming in sooner. The COO's number to watch is overdue over 60 days ($57,685 today). Time saved (3 to 4 of the 16 hours) is her estimate, for Priya to confirm.

## Build vs buy

Buy the routine parts: Stripe already retries failed cards and emails the customer; QuickBooks reminders can't skip a customer with a complaint; Paidly was switched off after chasing a customer who had paid. Build the judgment that joins tickets, payments and bills, because nothing Ledgerline owns does that.

## With more time

Read the billing@ inbox (disputes sent by email are invisible today); payment plans with Dana's approval; live read-only QuickBooks and Zendesk connections; when a disputed bill is still unpaid, reopen the "solved" ticket so support and finance see the same thing.

## Disclosure

Before Begin I built and tested the tool on made-up data: the pipeline, the app and two design rounds. Everything using Ledgerline's data (mapping, findings, rules from the COO, the review) came after Begin; the git history shows when.
