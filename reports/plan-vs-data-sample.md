# Plan vs data (sample)

As of 2026-10-31. 90 overdue bills, $222,603. Rules only, no AI. Made by `pipeline/plan_check.py`.

| # | Plan assumption | What the data says | Status | What changes |
|---|---|---|---|---|
| 1 | Overdue bills are rising | Overdue share of open bills: 22% in 2026-04 → 73% in 2026-10. Overdue now $211,706. | ✅ holds | Lead the video with the trend. |
| 2 | Things got worse after the billing rewrite (2026-03) | Bills that don't match the contract: 0.0% in the 6 months before 2026-03, 0.8% since (395 and 760 bills checked). Average overdue share 0% before, 30% after. | ⚠️ partly | Keep the wrong-bill check but don't blame the rewrite. |
| 3 | Some overdue customers are unhappy right now (open tickets) | 17 overdue bills ($31,904) have an open billing complaint or serious escalation; 14 more have an open product complaint. | ✅ holds | Hold rule is core. |
| 4 | Some 'overdue' bills were already paid | 8 payments aren't linked to a bill ($31,908). 11 overdue bills ($41,005) look already paid. | ✅ holds | Probably-paid check stays in v1. |
| 5 | Names differ across systems (the matcher is needed) | Match rate 98.5%. By method: {'exact_id': 52, 'exact_name': 264, 'fuzzy': 12, 'unmatched': 5}. By system: overdue list: 52/53; accounting export (by name): 48/52; support tickets: 220/220; bank payments: 8/8. | ✅ holds | Report the match rate on the Proof page. |
| 6 | There's no record of reminders sent | Columns that look like reminder history: none | ✅ holds | Stage comes from days overdue; say reminders aren't tracked today. |
| 7 | Failed card payments are recorded | Payment status values: {'succeeded': 1046, 'failed': 5} | ✅ holds | Flag failed cards; let the billing tool's retry email do the work. |
| 8 | We know who sends reminders today | VP Finance / Accounts receivable specialist: sends payment reminders | ⚠️ partly | Confirm with Maya (question 1). |
| 9 | No collections tool is in place | Accounting: QuickBooks / Billing: in-house billing engine (rewritten March 2026) / Payments: Stripe (cards), bank (ACH, wire) / Support: Zendesk / CRM: HubSpot / Reminders: sent by hand from Gmail using a template | ✅ holds | Build vs buy section must name what they already pay for. |
| 10 | Leadership cares about collections | Cash: overdue receivables are up this quarter and DSO rose. Collections is a focus for Q4. | ✅ holds | Quote the board update in the video. |
| 11 | collections_policy.md gives clear rules | Sections: Collections policy (SAMPLE, made up); §1 Scope; §2 Reminder schedule; §3 Escalation; §4 Disputes and holds; §5 Card payments. Day numbers mentioned: 1, 5, 15, 30, 45 | ✅ holds | Copy the real section names and day limits into config.yaml so every verdict cites them. |
| 12 | Billing contacts are up to date | 5 'send' bills have a missing or stale billing contact. | ⚠️ partly | Show the contact warning in the draft. |

## Surprises

- 1 bills in the accounting export aren't in invoices.csv ($1,800).
- 3 bills are open in the accounting export but marked paid in invoices.csv ($9,097).
- Tickets cover 2026-07-01 to 2026-10-30; anything before that can't be checked for complaints.
- 1 overdue bills couldn't be linked to a customer: Westbrook Consulting

## Numbers for the one-pager (check before using)

- Overdue: 90 bills, $222,603
- Shouldn't chase today: $81,623
- Customer match rate: 98.5%
