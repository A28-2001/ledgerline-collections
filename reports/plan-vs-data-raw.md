# Plan vs data (raw)

As of 2026-10-31. 54 overdue bills, $633,245. Rules only, no AI. Made by `pipeline/plan_check.py`.

| # | Plan assumption | What the data says | Status | What changes |
|---|---|---|---|---|
| 1 | Overdue bills are rising | Overdue share of open bills: 30% in 2026-04 → 44% in 2026-10. Overdue now $633,245. | ✅ holds | Lead the video with the trend. |
| 2 | Things got worse after the billing rewrite (2026-03) | Bills that don't match the contract: 0.0% in the 6 months before 2026-03, 0.0% since (710 and 981 bills checked). Average overdue share 34% before, 39% after. | ❌ contradicts | Keep the wrong-bill check but don't blame the rewrite. |
| 3 | Some overdue customers are unhappy right now (open tickets) | 2 overdue bills ($50,964) have an open billing complaint or serious escalation; 3 more have an open product complaint. | ✅ holds | Hold rule is core. |
| 4 | Some 'overdue' bills were already paid | 7 payments aren't linked to a bill ($87,335). 5 overdue bills ($78,348) look already paid. | ✅ holds | Probably-paid check stays in v1. |
| 5 | Names differ across systems (the matcher is needed) | Match rate 100.0%. By method: {'exact_id': 405, 'exact_name': 58}. By system: overdue list: 51/51; accounting export (by name): 51/51; support tickets: 354/354; bank payments: 7/7. | ❌ contradicts | Report the match rate on the Proof page. |
| 6 | There's no record of reminders sent | Columns that look like reminder history: none | ✅ holds | Stage comes from days overdue; say reminders aren't tracked today. |
| 7 | Failed card payments are recorded | Payment status values: none | ❌ contradicts | Drop the card check. |
| 8 | We know who sends reminders today | Alan Brandt (CEO) has Finance and Product & Engineering reporting to him. Maya Lindqvist (COO) has Sales, Marketing, Customer Success, Support and People & Oper / Finance / Dana Ruiz, VP Finance / Marcus Bell, Staff Accountant / Ana Duarte, Billing Support Specialist | ⚠️ partly | Confirm with Maya (question 1). |
| 9 | No collections tool is in place | / CRM and marketing / HubSpot / Forms, contacts, deals, email sequences, meetings / Marketing and Sales / / / Billing / Stripe / Subscriptions, card and ACH payments / Finance / / / Accounting / QuickBooks Online / Ledger, invoices, AR aging / Finance / / / Support / Zendesk, Zendesk Guide / Tickets and the help centre / Support / / / Support / Intercom / Website chat / Support / / The product's own admin panel holds usage and billing detail for each customer. It has no API that other teams can use; `product/usage_monthly.csv` is a monthly | ✅ holds | Build vs buy section must name what they already pay for. |
| 10 | Leadership cares about collections | Growth stayed slow and the business stayed at break-even. ARR ended the quarter at $8,465,928. New business was $157,308 against churn of $129,504. Collections  / / Cash / $2,979,195 / / 1. **Cash collection.** Overdue receivables have risen for three quarters. Two people handle collections part-time, and one goes on leave in March. | ✅ holds | Quote the board update in the video. |
| 11 | collections_policy.md gives clear rules | Sections: Collections policy. Day numbers mentioned: 5, 30, 45, 90, 150 | ✅ holds | Copy the real section names and day limits into config.yaml so every verdict cites them. |
| 12 | Billing contacts are up to date | 0 'send' bills have a missing or stale billing contact. | ✅ holds | Show the contact warning in the draft. |

## Surprises

- Tickets cover 2026-07-01 to 2026-10-31; anything before that can't be checked for complaints.

## Numbers for the one-pager (check before using)

- Overdue: 54 bills, $633,245
- Shouldn't chase today: $343,692
- Customer match rate: 100.0%
