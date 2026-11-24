# Collections check: "Should we chase this invoice today?"

**Tool:** https://ledgerline-collections.vercel.app/story · **Video:** [link] · **Repo:** [link or zip] · **Process:** FIN-1 Collections, owned by Priya Nair (AR Specialist)

## The problem

Ledgerline has **$633,245 overdue across 54 bills** (31 Oct 2026), its highest month-end in 12 months. Finance chases by hand, about 16 hours a week, and **can't open Zendesk**, so it asks around on Slack first. **$309,000 (49%) of the overdue money is disputed** in tickets that name the exact invoice: wrong seat counts, a missing discount, a fee meant to be waived. Zendesk marks 11 of the 14 tickets solved, but the bills were never fixed.

## What the tool does

Every morning it asks five questions of each overdue bill, in order, and gives one answer with its reason, the records behind it and the policy line:

| Answer | When | Today |
|---|---|---|
| **Probably paid** | An unmatched payment fits the bill; Marcus matches it | 5 · $78,348 |
| **Hold** | Disputed, open ticket, chargeback or regulator threat, refund owed, or under 7 days late | 20 · $363,362 |
| **Call** | 45+ days late, or already calling them | 9 · $9,384 |
| **Send** | Nothing blocks a polite reminder | 20 · $182,151 |

Priya makes **19 decisions instead of reading 54 bills**. Each hold goes to an owner with a deadline; if nobody acts, it comes back to her.

## What is AI, what stays with a person, and why

- **A person decides every send.** Priya approves each message. Top-50 accounts, disputes, probably-paid bills, anything firmer than a nudge and every call stay with a person: the COO's switch-off lines.
- **No AI on customer data until legal approves a vendor**, because the SLA policy requires a data agreement first. Until then, rules read ticket tags and status inside Ledgerline. Rules miss untagged tickets (27 of the 131 that matter), so after approval two AI models from different families read the masked text, and a person decides when they disagree. In testing they held all 14 disputes. Proposed vendor: Amazon Bedrock (AWS is already a vendor).
- **Auto-send stays locked** until a month of approvals is on record, then only for small, polite first or second reminders.

## Proof, and where it fails

- **Accuracy:** a separate AI model that never saw the tool's answers reviewed all 54 bills; I confirmed every contested call by hand. First pass: **46 of 54 (85%)**, with 7 rule errors (since fixed) and 1 difference kept on purpose. Now 53 of 54, but on the same bills, so the shadow week is the real test. Every miss is listed in the tool.
- **The COO's two tests read 0:** nobody chased who had paid or had a complaint open. Earlier versions would have chased 4 customers with a complaint open.
- **Not claimed:** cash coming in sooner. The number to watch is overdue over 60 days ($57,685 today).

## With more time

Read the billing@ inbox (disputes sent by email are invisible today); payment plans with Dana's approval; live QuickBooks and Zendesk connections; approvals stored on a server so the auto-send record builds.

**Disclosure:** built and tested on made-up data before Begin; everything using Ledgerline's data came after (see the git history). Built with Claude; the demo's redraft button uses Groq.
