# Review of all 54 overdue bills: tool vs independent reviewer

The reviewer read the raw records (masked tickets, payments, contracts) and Ledgerline's policy, without seeing the tool's answers.
Agreement: **50 of 54 bills (93%)**, $579,572 of $633,245.

## Tool (rows) vs reviewer (columns)

```
review  call  hold  paid  send  All
tool                               
call       9     0     0     0    9
hold       0    19     0     4   23
paid       0     0     5     0    5
send       0     0     0    17   17
All        9    19     5    21   54
```

## Where they disagree

| Invoice | Customer | $ | Days | Tool | Reviewer | Reviewer's reason | Tool's reason |
|---|---|---|---|---|---|---|---|
| INV-25873 | Eastman & Wexler CPAs | 43,680 | 15 | hold | send (medium) | TOP-50 account 15 days late with no dispute; open T881016 is a normal-priority product bug about a client's send log, so a person should write a personal reminder after telling the account manager. | Open product complaint (not about money): send, but in a softer tone, and tell the account manager. |
| INV-25852 | Kingsway Engineering Group | 5,100 | 19 | hold | send (medium) | Bill of $5,100 is 19 days late; PAY-65805 for the same $5,100 is most likely for older INV-25469, so remind about this one only after confirming which invoice the payment covers; pending T880184 is about a client's invoice and should not block. | They have a ticket pending in Zendesk since Jul 20, 2026 (103 days). Chasing payment while their question is unanswered is what gets the too |
| INV-25902 | Crane IT Partners | 3,060 | 7 | hold | send (high) | Bill of $3,060 is 7 days late; T880058 is still pending but the customer wrote that the tax codes are back and they are closing it out, so send a polite first reminder. | Serious open escalation with support. Money talk waits until it's resolved. |
| INV-25898 | Harbor Engineering Group | 1,833 | 10 | hold | send (medium) | Bill of $1,833 is 10 days late; T880226's July double-charge question is solved and pending T880229 is a timer bug, so send a polite reminder. | They have a ticket pending in Zendesk since Jul 24, 2026 (99 days). Chasing payment while their question is unanswered is what gets the tool |

## Where the reviewer doubts a rule

- **INV-25873 Eastman & Wexler CPAs**: The open-ticket rule would hold this bill, but a product bug about the customer's own client is not a dispute or escalation about money owed to Ledgerline.
- **INV-25902 Crane IT Partners**: The pending-ticket rule would hold this, but the ticket text says the issue is resolved.
- **INV-25898 Harbor Engineering Group**: A pending product bug from July should not block a reminder.
- **INV-25923 Abbott Design Partnership**: None of the four answers means 'not yet due for a reminder'; hold here only means wait three days, not a dispute.
- **INV-25975 Quill, Mott & Co**: The failed-card send rule would email about this bill on the same day a person phones about the older one; one contact per customer is better.
- **INV-25433 Northgate Creative**: The failed-card email rule would say send and the 150-day auto write-off would drop $799 from an active customer whose later monthly bills are paid; at this age it should be a call and the write-off should wait for a person.
- **INV-25470 Hollis Nair Engineers**: The failed-card email rule would say send, but an update-card email has clearly not worked after 141 days; the age rule should win.
- **INV-25622 Studio Nakamura**: The failed-card email rule would say send, which is wrong at 105 days.

## All bills where they agree

| Invoice | Customer | $ | Answer | Reviewer's reason |
|---|---|---|---|---|
| INV-25784 | Jessop & Orwell Agency | 62,688 | paid | PAY-65750 ($62,688 ACH from Jessop & Orwell Agency, memo 'Jessop payment', received 2026-10-17) matches this TOP-50 bill exactly; it is 10 working days unapplied, past the normal 3 to 5, so cash application should match it today. |
| INV-25787 | Riverside Partners | 60,576 | hold | TOP-50 account; T880886 (marked solved) says INV-25787 bills 62 seats against 38 people after a workspace merge and payment is paused pending a corrected invoice, and nothing shows one was issued. |
| INV-25730 | Westbrook Engineering Group | 47,904 | hold | TOP-50 Enterprise account with pending T880739 disputing the implementation fee on INV-25730 (finance has put the whole invoice on hold) and pending high-priority T880180 on rounding, so no contact about money. |
| INV-25765 | Okafor & Nakamura LLP | 46,848 | hold | TOP-50 account; T880816 (marked solved) says the promised 50% second-office discount is missing from INV-25765 and they will settle once it shows, and nothing shows it was applied. |
| INV-25662 | Upton & Bell Advisory | 44,064 | hold | TOP-50 account; T880582 (marked solved) refuses payment of INV-25662 while a late fee the agent promised to waive is on it, and nothing shows the fee was removed, so hold at 66 days until the account manager confirms a corrected invoice. |
| INV-25834 | Delacroix, Jessop & Co | 41,568 | hold | T881039 (today, marked solved as How-to) questions three departed-staff seats on INV-25834 and says they will hold payment until someone confirms, and two other tickets (T880201, T880996) are still pending. |
| INV-25862 | Thornfield Consulting Group | 39,456 | send | Bill of $39,456 is 17 days late with no dispute, but T880365 asked to align the annual renewal to 1 July with a prorated bridge and the invoice runs September to September, so check with the account manager before sending a reminder. |
| INV-25822 | Brandt Ashby IT | 26,112 | hold | Pending T881024 (2026-10-29) asks to void INV-25822 because they moved off the annual plan before renewal, so hold; the account manager should check this against the Growth annual renewal on the contract. |
| INV-25869 | Hollis & Stanhope Advisory | 22,848 | send | Bill of $22,848 is 16 days late and its four tickets are account and product questions (including a client chased early), none disputing this bill, so send a polite reminder. |
| INV-25848 | Okafor Legal | 19,584 | send | Bill of $19,584 is 20 days late, no matching payment, and both tickets (T880244, T880420) are how-to questions, so send a polite reminder. |
| INV-25885 | Riverside Consulting Group | 17,136 | send | Bill of $17,136 is 12 days late; T880631 asked where the downgrade credit was, but the renewal is already a contraction and nothing refuses payment, so send a polite reminder. |
| INV-25883 | Sinclair & Vance LLP | 16,320 | send | Bill of $16,320 is 13 days late, no matching payment, and both tickets are low-priority how-tos, so send a polite reminder. |
| INV-25906 | Rosales Engineering | 16,320 | send | New customer's $16,320 bill is 7 days late with no tickets and no matching payment, so send a polite first reminder covering this and INV-25907 together. |
| INV-25757 | Ellery Consulting | 13,056 | hold | T880738 (marked solved) says sales tax on INV-25757 uses the old office address and payment is on hold until it is recalculated, and nothing shows a recalculation. |
| INV-25859 | Voss & Kowalczyk Agency | 13,056 | send | Bill of $13,056 is 18 days late, no matching payment, and the tickets are a pricing question and a solved 2FA lockout, so send a polite reminder. |
| INV-25858 | Glover Strategy | 9,600 | send | Bill of $9,600 is 18 days late, no matching payment, and the only ticket T880988 is a how-to about the CRM sync, so send a polite reminder. |
| INV-25750 | Thackeray Accounting | 7,896 | hold | T880856 (marked solved) says INV-25750 wrongly adds 20% VAT when reverse charge applies and AP will not pay until it is reissued, and nothing shows a reissue; the pending how-to T880453 would not block by itself. |
| INV-25764 | Castell Engineering | 6,324 | hold | T880849 (marked solved) says INV-25764 bills the full month at the old higher plan after a downgrade on the 3rd and they will not pay until fixed; PAY-65766 for the same $6,324 is from Brandt & Lowell, not this customer. |
| INV-25806 | Brandt & Lowell CPAs | 6,324 | paid | PAY-65766 ($6,324 ACH from BRANDT & LOWELL CPAS, memo 'Ledgerline subscription', received 2026-10-19) matches this 28-day bill by name and amount and should be applied now. |
| INV-25469 | Kingsway Engineering Group | 5,100 | paid | PAY-65805 ($5,100 ACH from Kingsway Engineering Group on 2026-10-29, blank memo) matches this 111-day bill, but INV-25852 is also $5,100; apply it oldest-first here and confirm with the customer which invoice it was for. |
| INV-25863 | Banerjee Design Partnership | 5,100 | send | Bill of $5,100 is 17 days late and its tickets are how-tos and a bug; PAY-65805 for the same amount came from Kingsway Engineering Group, not this customer, so send a polite reminder. |
| INV-25890 | Oyelaran Strategy | 4,692 | send | Bill of $4,692 is 12 days late with no tickets and no matching payment, so send a polite reminder to Layla Garrick only, not departed contact Renee Fairbanks. |
| INV-25923 | Abbott Design Partnership | 4,692 | hold | Bill is only 4 days late (first reminder is due at 7 days, on 3 November) and T880542 is an ownership-transfer request, so no contact about money today. |
| INV-25712 | Wexler & Hume Advisory | 4,080 | hold | T880757 (marked solved, tagged How-to) disputes INV-25712's seat count (billed 24 users, they have 17) and refuses to pay until it is reissued, and nothing shows a reissue; also remove departed contact Hannah Iyer from invoice emails. |
| INV-25718 | Mercer & Banerjee LLP | 3,876 | hold | T880648 refuses to pay the time-tracking module on INV-25718 and T880514 gave notice of termination asking for the final amount owing, neither shows a fix, so the account manager must handle it; also remove departed contact Oscar Pemberton. |
| INV-25845 | Castellano, Crane & Co | 3,672 | paid | PAY-65806 ($3,672 wire from Castellano, Crane & Co, memo 'INV-25845', received 2026-10-30) matches this bill by name, amount and invoice number. |
| INV-25973 | Eastman Engineering | 3,264 | hold | T880519 complains of a 35% renewal increase, says a complaint was filed with the state consumer affairs office and threatens to contest the card charge, and nothing shows it was resolved, so do not chase this 23-day failed card bill. |
| INV-25711 | Oyelaran Devlin Engineers | 2,820 | hold | T880667 (marked solved) says the data migration fee on INV-25711 was waived in writing and asks for it to be removed and resent, and nothing shows that was done. |
| INV-25539 | Banerjee Petrov Engineers | 2,652 | hold | T880432 (marked solved) disputes INV-25539 by number, saying the cancelled portal fee and setup line were billed again and asking for a corrected invoice, and nothing shows a correction (next bill INV-25927 is the same $2,652); the account manager must resolve it before the 92-day call to the VP Finance. |
| INV-25907 | Rosales Engineering | 2,500 | send | The $2,500 implementation bill is 7 days late with no tickets and no matching payment, so include it in one polite first reminder with INV-25906. |
| INV-25881 | Corbin Media | 2,397 | send | Bill of $2,397 is 13 days late and its tickets are questions about the sync log and the customer's own credit notes, so send a polite reminder. |
| INV-25803 | Glover Engineering | 1,836 | call | Failed card bill of $1,836 is 59 days late with no dispute in its tickets, so a person phones; mention the two-seat removal asked for in T880736 so it is confirmed as done. |
| INV-25708 | Quill, Mott & Co | 1,632 | call | Failed card bill of $1,632 is 83 days late, a second $1,632 card bill (INV-25975) has also failed, and the only ticket T880731 is a product bug, so a person phones about both bills. |
| INV-25975 | Quill, Mott & Co | 1,632 | call | Second failed $1,632 card bill (22 days) for Quill, Mott & Co, whose INV-25708 is 83 days late, so cover it on the same phone call instead of a separate update-your-card email. |
| INV-25854 | Studio Marsh | 1,410 | hold | T881021 (2026-10-29) chases a duplicate-charge refund Ledgerline approved but has not paid, so confirm the refund (and whether it relates to this bill) before reminding about this 18-day $1,410 bill; pending T880643 is a product bug. |
| INV-25811 | Wexler Media | 1,224 | hold | Pending T880957 says INV-25811 is missing the 15% multi-year renewal discount and they cannot pay the current document, so hold until the account manager reissues it. |
| INV-25793 | Ashgrove Partners | 1,088 | call | Failed card bill of $1,088 is 64 days late and the four tickets (rebrand, cent-rounding explanation for auditors, accent bug, a client's retainer payment) do not dispute this bill, so a person phones. |
| INV-25926 | Ruiz & Whitfield CPAs | 846 | send | Failed card bill of $846 is 30 days late and its five tickets are account and how-to requests with no dispute, so send a polite update-your-card email. |
| INV-25433 | Northgate Creative | 799 | call | Failed card bill of $799 is 149 days late with only a plain seat question in T880944, so a person phones and the VP Finance decides today because the automatic card write-off fires tomorrow at 150 days. |
| INV-25912 | Ellery Achebe Chartered Accountants | 799 | send | Failed card bill of $799 is 36 days late, Stripe retries are long finished and both tickets are product or account requests, so send a polite update-your-card email to Signe Abbott only, not departed contact Bianca Sinclair. |
| INV-25825 | Kowalczyk + Stanhope Architects | 705 | call | Failed card bill of $705 is 54 days late and its tickets are a past refund timing question (T880147) and two how-tos, none disputing this bill, so a person phones. |
| INV-25709 | Moreau & Crane Agency | 658 | call | Failed card bill of $658 is 83 days late and the only ticket T880255 is a how-to about a cheque from the customer's own client, so a person phones. |
| INV-25769 | Drummond Consulting | 658 | hold | T880019 says the customer opened chargebacks on two Ledgerline payments over a claimed double charge and nothing shows it was resolved, so do not phone about this 68-day $658 failed card bill until the account manager and Head of Support settle the chargebacks (a refund owed could cover it). |
| INV-25897 | Ambrose & Lowell Advisory | 658 | hold | High-priority bug T880474 (payments marked unpaid) has been pending since 2026-08-24 alongside pending T880152, so ask the account manager before sending a first reminder on this 10-day $658 bill. |
| INV-25928 | Tan Accounting | 611 | send | Failed card bill of $611 is 30 days late with only a how-to and a contact change in its tickets, so send a polite update-your-card email. |
| INV-25969 | Bramwell Sinclair Chartered Accountants | 611 | send | Failed card bill of $611 is 23 days late with only a how-to and a product bug in its tickets, so send a polite update-your-card email to Mateo Abbott, not departed contact Caleb Jessop. |
| INV-25867 | Yardley & Duarte Advisory | 564 | paid | PAY-65808 ($564 ACH from YARDLEY & DUARTE ADVISORY, memo 'inv25867 Yardley', received 2026-10-31) names this bill, so it is not INV-26000 for the same amount. |
| INV-25470 | Hollis Nair Engineers | 517 | call | Failed card bill of $517 is 141 days late with no tickets and no matching payment, so a person phones, escalated to the VP Finance, before the automatic write-off at 150 days (9 days away). |
| INV-25622 | Studio Nakamura | 517 | call | Failed card bill of $517 is 105 days late with no tickets and no matching payment, so a person phones and it goes to the VP Finance (90+ days); auto write-off follows at 150 days. |
| INV-26005 | Hume Accounting | 282 | send | Failed card bill of $282 is 15 days late, Stripe retries are done and T880595 is a product bug about the email preview, so send a polite update-your-card email. |
