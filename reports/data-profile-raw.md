# Data profile: raw

Made by `pipeline/profile_data.py`. Facts about the files only, no conclusions.

**24 CSV files, 27 Markdown files.**

## Suggested column mapping

Each field shows the column picked (✓ = same as config.yaml, a number = how close the name is). `?` means nothing of the right type fits: map it by hand or leave it null. The same mapping is written to `reports/config-suggested-raw.yaml`.

- **customers** (`customers.csv`): id: customer_id ✓, name: name ✓, segment: ?, plan: plan ✓, arr: current_arr (90), account_manager: account_manager ✓, renewal_date: renewal_date ✓, billing_email: ?
- **contacts** (`contacts.csv`): id: contact_id ✓, customer_id: customer_id ✓, name: first_name (90), email: email ✓, role: role ✓, last_active: ?
- **contracts** (`contracts.csv`): id: ?, customer_id: customer_id ✓, start: term_start (90), end: term_end (90), seats: seats ✓, unit_price: price_per_seat_per_month (88), status: ?
- **invoices** (`invoices.csv`): id: invoice_id ✓, customer_id: customer_id ✓, customer_name: customer_name ✓, issue_date: issue_date ✓, due_date: due_date ✓, amount: amount ✓, status: status ✓, paid_date: paid_date ✓, method: payment_method ✓, seats: ?, unit_price: ?
- **payments** (`payments.csv`): id: payment_id ✓, invoice_id: invoice_id ✓, payer: payer_name ✓, amount: amount ✓, date: received_date (90), method: method ✓, status: ?
- **ar_aging** (`ar_aging.csv`): invoice_id: invoice_id (100), customer_name: customer_name (100), issue_date: issue_date (100), due_date: due_date ✓, amount: amount (100), days_overdue: days_past_due ✓
- **tickets** (`tickets.csv`): id: ticket_id ✓, customer_id: customer_id (100), customer_name: customer_name (100), created: created_at ✓, status: status ✓, priority: priority ✓, category: category ✓, subject: subject ✓, body: body ✓

## CSV files

### contacts.csv  (967 rows, 7 columns)

| Column | Blank | Distinct | Looks like | Examples / range |
|---|---|---|---|---|
| contact_id | 0% | 967 | text | `P5001`, `P5002`, `P5003` |
| customer_id | 0% | 508 | text | `C1001`, `C1002`, `C1003` |
| first_name | 0% | 58 | text | `Milan`, `Odette`, `Nico` |
| last_name | 0% | 80 | text | `Delacroix`, `Underhill`, `Wexler` |
| email | 0% | 967 | text | `milan.delacroix@lowellconsulting.example`, `odette.underhill@lowellconsulting.exampl`, `nico.underhill@quillingramarchitects.exa` |
| role | 0% | 4 | category | `Billing contact` 398, `Account admin` 346, `Account admin and billing` 162, `Executive sponsor` 61 |
| status | 0% | 2 | category | `active` 915, `left the firm; still on invoice emails` 52 |

### contracts.csv  (1,757 rows, 10 columns)

| Column | Blank | Distinct | Looks like | Examples / range |
|---|---|---|---|---|
| customer_id | 0% | 508 | text | `C1001`, `C1002`, `C1003` |
| term_start | 0% | 1,063 | date | 2022-01-03 to 2026-10-27 |
| term_end | 0% | 1,063 | date | 2023-01-02 to 2027-10-26 |
| plan | 0% | 3 | category | `Growth` 999, `Core` 509, `Enterprise` 249 |
| seats | 0% | 63 | number | 5.00 to 87.00 (sum 39,828) |
| price_per_seat_per_month | 0% | 6 | number | 45.00 to 88.00 (sum 110,958) |
| platform_fee | 0% | 2 | number | 0.00 to 12,000.00 (sum 2,988,000) |
| arr | 0% | 189 | number | 2,700.00 to 103,872.00 (sum 35,410,548) |
| change_type | 0% | 5 | category | `renewal` 643, `expansion` 526, `in force at 1 Jan 2023` 322, `new` 186, `contraction` 80 |
| prior_arr | 29% | 172 | number | 2,700.00 to 88,500.00 (sum 25,349,892) |

### customers.csv  (508 rows, 19 columns)

| Column | Blank | Distinct | Looks like | Examples / range |
|---|---|---|---|---|
| customer_id | 0% | 508 | text | `C1001`, `C1002`, `C1003` |
| name | 0% | 508 | text | `Lowell Consulting`, `Quill + Ingram Architects`, `Langford Thackeray Chartered Accountants` |
| website | 0% | 508 | text | `lowellconsulting.example`, `quillingramarchitects.example`, `langfordthackeraychart.example` |
| industry | 0% | 7 | category | `Management consultancy` 137, `Marketing or creative agency` 88, `Law firm` 82, `Architecture practice` 57, `Engineering consultancy` 57, `Accounting firm` 55, `IT services firm` 32 |
| country | 0% | 3 | category | `United States` 392, `Canada` 62, `United Kingdom` 54 |
| employees | 0% | 137 | number | 9.00 to 431.00 (sum 31,835) |
| plan | 0% | 3 | category | `Growth` 285, `Core` 162, `Enterprise` 61 |
| status | 0% | 2 | category | `active` 396, `churned` 112 |
| signup_date | 0% | 446 | date | 2019-01-01 to 2026-10-27 |
| churn_date | 78% | 105 | date | 2023-01-03 to 2026-10-28 |
| churn_reason | 78% | 7 | category | `Low adoption` 49, `Moved to a competitor` 16, `Price` 13, `Switched to accounting suite module` 12, `Support and reliability` 8, `Business closed or downsized` 8, `Acquired or merged` 6 |
| billing_frequency | 0% | 3 | category | `annual` 303, `monthly` 104, `quarterly` 101 |
| payment_method | 0% | 4 | category | `ach` 223, `wire` 129, `card` 109, `check` 47 |
| current_seats | 0% | 60 | number | 0.00 to 87.00 (sum 9,391) |
| current_arr | 0% | 97 | number | 0.00 to 103,872.00 (sum 8,529,288) |
| renewal_date | 22% | 232 | date | 2026-11-03 to 2027-10-27 |
| account_manager | 0% | 4 | category | `Nadia Upton` 130, `Nadia Sinclair` 130, `Hannah Drummond` 130, `Maria Yardley` 118 |
| acquisition_channel | 63% | 8 | category | `organic_search` 56, `referral` 41, `paid_search` 23, `direct` 22, `outbound` 19, `event` 15, `partner` 7, `paid_social` 3 |
| accounting_integration | 0% | 3 | category | `QuickBooks Online` 228, `none` 160, `Xero` 120 |

### ar_aging.csv  (117 rows, 10 columns)

| Column | Blank | Distinct | Looks like | Examples / range |
|---|---|---|---|---|
| invoice_id | 0% | 117 | text | `INV-25433`, `INV-25469`, `INV-25470` |
| customer_id | 0% | 107 | text | `C1029`, `C1469`, `C1477` |
| customer_name | 0% | 107 | text | `Northgate Creative`, `Kingsway Engineering Group`, `Hollis Nair Engineers` |
| plan | 0% | 3 | category | `Growth` 69, `Core` 32, `Enterprise` 16 |
| issue_date | 0% | 58 | date | 2026-06-04 to 2026-10-27 |
| due_date | 0% | 60 | date | 2026-06-04 to 2026-11-26 |
| amount | 0% | 76 | number | 282.00 to 78,528.00 (sum 1,430,632) |
| days_past_due | 0% | 37 | number | 0.00 to 149.00 (sum 2,080) |
| bucket | 0% | 5 | category | `Not yet due` 63, `1-30 days` 31, `31-60 days` 13, `Over 90 days` 5, `61-90 days` 5 |
| status | 0% | 3 | category | `open` 63, `overdue` 38, `payment_failed` 16 |

### arr_movements_monthly.csv  (46 rows, 10 columns)

| Column | Blank | Distinct | Looks like | Examples / range |
|---|---|---|---|---|
| month | 0% | 46 | date | 2023-01-01 to 2026-10-01 |
| opening_arr | 0% | 46 | number | 5,910,840.00 to 8,465,928.00 (sum 335,549,928) |
| new_arr | 0% | 46 | number | 26,040.00 to 142,500.00 (sum 3,315,072) |
| expansion_arr | 0% | 45 | number | 2,160.00 to 64,008.00 (sum 1,150,332) |
| contraction_arr | 0% | 34 | number | 0.00 to 41,616.00 (sum 315,588) |
| churned_arr | 0% | 41 | number | 0.00 to 119,220.00 (sum 1,531,368) |
| closing_arr | 0% | 46 | number | 5,976,900.00 to 8,529,288.00 (sum 338,168,376) |
| new_customers | 0% | 5 | number | 2.00 to 6.00 (sum 186) |
| churned_customers | 0% | 6 | number | 0.00 to 5.00 (sum 112) |
| customers_at_month_end | 0% | 36 | number | 325.00 to 396.00 (sum 16,835) |

### balance_sheet_monthly.csv  (46 rows, 12 columns)

| Column | Blank | Distinct | Looks like | Examples / range |
|---|---|---|---|---|
| month | 0% | 46 | date | 2023-01-01 to 2026-10-01 |
| cash | 0% | 46 | number | 1,703,909.00 to 3,155,291.00 (sum 114,098,317) |
| accounts_receivable | 0% | 46 | number | 496,425.00 to 1,430,632.00 (sum 40,435,110) |
| other_assets | 0% | 1 | number | 185,000.00 to 185,000.00 (sum 8,510,000) |
| total_assets | 0% | 46 | number | 2,557,471.00 to 4,608,113.00 (sum 163,043,427) |
| deferred_revenue | 0% | 46 | number | 2,017,055.00 to 3,174,463.00 (sum 119,379,182) |
| unapplied_cash_receipts | 0% | 46 | number | 20,370.00 to 232,822.00 (sum 4,760,680) |
| accrued_liabilities | 0% | 1 | number | 240,000.00 to 240,000.00 (sum 11,040,000) |
| total_liabilities | 0% | 46 | number | 2,294,090.00 to 3,501,798.00 (sum 135,179,862) |
| equity | 0% | 46 | number | 94,354.00 to 1,106,315.00 (sum 27,863,565) |
| cash_collected_in_month | 0% | 46 | number | 379,665.00 to 982,654.00 (sum 28,727,782) |
| cash_paid_out_in_month | 0% | 46 | number | 461,038.00 to 734,981.00 (sum 27,385,302) |

### invoices.csv  (6,062 rows, 12 columns)

| Column | Blank | Distinct | Looks like | Examples / range |
|---|---|---|---|---|
| invoice_id | 0% | 6,062 | text | `INV-20001`, `INV-20002`, `INV-20003` |
| customer_id | 0% | 508 | text | `C1194`, `C1195`, `C1196` |
| customer_name | 0% | 508 | text | `Stanhope Engineering`, `Hartwell Engineering`, `Hale Legal` |
| type | 0% | 2 | category | `subscription` 5938, `implementation` 124 |
| issue_date | 0% | 1,555 | date | 2022-01-03 to 2026-10-28 |
| due_date | 0% | 1,578 | date | 2022-01-12 to 2026-11-26 |
| service_period_months | 0% | 3 | number | 1.00 to 12.00 (sum 20,428) |
| amount | 0% | 322 | number | 225.00 to 103,872.00 (sum 34,826,786) |
| currency | 0% | 1 | category | `USD` 6062 |
| status | 0% | 5 | category | `paid` 5801, `written_off` 144, `open` 63, `overdue` 38, `payment_failed` 16 |
| paid_date | 2% | 1,627 | date | 2022-01-12 to 2026-10-30 |
| payment_method | 0% | 4 | category | `card` 3402, `ach` 1789, `wire` 681, `check` 190 |

### payments.csv  (5,808 rows, 8 columns)

| Column | Blank | Distinct | Looks like | Examples / range |
|---|---|---|---|---|
| payment_id | 0% | 5,808 | text | `PAY-60001`, `PAY-60002`, `PAY-60003` |
| received_date | 0% | 1,632 | date | 2022-01-12 to 2026-10-31 |
| amount | 0% | 318 | number | 225.00 to 103,872.00 (sum 33,324,297) |
| method | 0% | 4 | category | `card` 3242, `ach` 1728, `wire` 655, `check` 183 |
| payer_name | 0% | 845 | text | `Corbin Design Partnership`, `Okafor Consulting`, `Yardley Accounting` |
| memo | 2% | 5,198 | text | `Stripe charge INV-20013`, `Stripe charge INV-20017`, `Stripe charge INV-20018` |
| applied_date | 0% | 1,624 | date | 2022-01-12 to 2026-10-30 |
| invoice_id | 0% | 5,801 | text | `INV-20013`, `INV-20017`, `INV-20018` |

### payroll_monthly.csv  (368 rows, 4 columns)

| Column | Blank | Distinct | Looks like | Examples / range |
|---|---|---|---|---|
| month | 0% | 46 | date | 2023-01-01 to 2026-10-01 |
| department | 0% | 8 | category | `Sales` 46, `Product & Engineering` 46, `Customer Success` 46, `Support` 46, `Finance` 46, `People & Operations` 46, `Executive` 46, `Marketing` 46 |
| payroll_cost | 0% | 50 | number | 8,334.00 to 193,125.00 (sum 20,432,867) |
| note | 0% | 1 | category | `Salaries plus employer taxes and benefits` 368 |

### pnl_monthly.csv  (966 rows, 4 columns)

| Column | Blank | Distinct | Looks like | Examples / range |
|---|---|---|---|---|
| month | 0% | 46 | date | 2023-01-01 to 2026-10-01 |
| section | 0% | 5 | category | `Operating expenses` 552, `Cost of revenue` 184, `Revenue` 138, `Gross profit` 46, `EBITDA` 46 |
| line | 0% | 21 | text | `Subscription revenue`, `Implementation services revenue`, `Total revenue` |
| amount | 0% | 734 | number | -50,985.00 to 723,774.00 (sum 135,995,271) |

### vendor_bills.csv  (1,651 rows, 7 columns)

| Column | Blank | Distinct | Looks like | Examples / range |
|---|---|---|---|---|
| bill_id | 0% | 1,651 | text | `B30001`, `B30002`, `B30003` |
| month | 0% | 46 | date | 2023-01-01 to 2026-10-01 |
| bill_date | 0% | 927 | date | 2023-01-01 to 2026-10-27 |
| vendor | 0% | 41 | text | `Amazon Web Services`, `Datadog`, `GitHub` |
| category | 0% | 6 | category | `Software` 998, `Marketing programs` 291, `Professional fees` 132, `Hosting` 92, `Rent and office` 92, `Travel and entertainment` 46 |
| department | 0% | 6 | category | `People & Operations` 432, `Marketing` 388, `Product & Engineering` 276, `Sales` 258, `Finance` 208, `Support` 89 |
| amount | 0% | 1,328 | number | 144.00 to 42,370.00 (sum 6,438,899) |

### blog_posts.csv  (68 rows, 8 columns)

| Column | Blank | Distinct | Looks like | Examples / range |
|---|---|---|---|---|
| post_id | 0% | 68 | text | `BP128`, `BP164`, `BP131` |
| published_on | 0% | 66 | date | 2023-02-22 to 2026-10-18 |
| title | 0% | 68 | text | `Multi-Entity Billing Is Here for Enterpr`, `Introducing the new Ledgerline billing e`, `A Plain-English Guide to Advance Fee Dep` |
| topic | 12% | 7 | category | `product news` 12, `getting paid` 12, `running the firm` 11, `pricing your services` 8, `retainers` 7, `accounting integrations` 5, `client experience` 5 |
| summary | 12% | 60 | long text | avg 137 chars |
| sessions_last_90_days | 0% | 62 | number | 40.00 to 2,147.00 (sum 47,708) |
| leads_last_90_days | 0% | 19 | number | 0.00 to 24.00 (sum 308) |
| body | 88% | 8 | category | `This month we finished rolling out something we've been working on for a long time: a completely rebuilt billing engine. It's the part of Ledgerline that calculates every invoice, retainer drawdown, proration and payment allocation, so it touches almost everything you do in the product.

You may not notice much on the surface, and that's partly the point. But underneath, a lot has changed, and it sets us up to ship features faster for the rest of 2026.

Here's what's new.

Faster invoice generation. Batch runs that used to take several minutes for larger firms now complete in seconds. If you run month-end billing for hundreds of clients at once, you'll see the difference right away.

More precise calculations. The new engine handles proration, partial periods and mid-cycle rate changes with consistent rounding rules across every invoice type. Retainers, milestones and hourly work all run through the same logic now, which means fewer edge cases and cleaner numbers.

A full audit trail. Every invoice now records exactly how each line was calculated, which rates applied and which rules were triggered. You can see this in a new "calculation details" panel on any invoice. Finance teams and auditors have asked for this for a while.

Better foundations for multi-currency. Enterprise customers billing across entities will see improved handling of exchange rates at invoice and payment time, with more to come later this year.

Cleaner sync with QuickBooks Online and Xero. Because invoice data is now structured more consistently, the records we send to your accounting system are more predictable, with clearer line descriptions and tax mapping.

The rebuild also gives our engineering team a much more modern codebase to work in. Features that used to require changes in a dozen places can now be built once. You'll see the benefit of that in the roadmap over the coming quarters, starting with more flexible approval rules and expanded scheduled reports.

There's nothing you need to do. All customers are now on the new engine, and your existing invoices, rates and settings carried over automatically.

Thanks to everyone on our product and engineering teams who put the last year into this, and to the customers who joined the early access group and gave us detailed feedback along the way. If you have questions about the new calculation details panel, our support team is happy to walk you through it.` 1, `Most firms we talk to don't have a revenue problem. They have a timing problem. The work is done, the invoice is out, and the cash shows up 60 days later. Here are seven things that reliably shorten that gap. None of them are complicated.

1. Invoice the day the work is billable, not at the end of the month. Monthly batching feels efficient for the billing team, but it adds an average of two weeks to every invoice's life before the client has even seen it. If you can't move everything, start with your largest clients.

2. Make the first payment terms you offer the ones you want. If net 30 is your standard, don't write net 45 into proposals "to be nice." Clients rarely push back on terms that are presented as normal.

3. Give clients a way to pay that doesn't involve a check. Card and bank transfer links on the invoice itself make a real difference. In our own customer data, invoices with an online payment option are paid noticeably faster than those without. Some firms pass card fees on, some absorb them for smaller invoices. Either is fine. Just decide.

4. Send reminders before the due date, not only after. A short note three days out ("just a heads-up, invoice 1042 is due Friday") is friendly and catches invoices that are stuck in someone's inbox.

5. Find out who actually approves payment. The person who hired you is often not the person who releases the money. Ask during onboarding who should receive invoices, whether a PO number is needed, and what their payment run schedule looks like.

6. Make invoices easy to approve. Clear descriptions, the right project reference, and backup detail attached. An invoice that raises a question gets set aside. An invoice that answers questions gets paid.

7. Look at your aging report every week. Not every month. Ten minutes on a Monday morning is enough to spot the invoices drifting past 30 days while there's still time to do something about them.

If you want to measure progress, track days sales outstanding (DSO) month over month. Pick one or two of these changes, give them a quarter, and see what moves. Small improvements in DSO compound quickly when you're a firm that runs on payroll.` 1, `A 22-person civil and structural engineering consultancy in the Midwest came to Ledgerline with a specific complaint: month-end took too long. Their controller estimated that closing the books took about six working days every month, and most of that time was spent on billing.

The firm bills a mix of hourly work for municipal clients, fixed-fee inspections, and a handful of long-running retainers with developers. Before Ledgerline they used a general-purpose invoicing tool and QuickBooks Online, with a lot of manual work in between. Timesheets were exported, cleaned up in a spreadsheet, turned into invoices one at a time, and then reconciled against QuickBooks by hand.

"Every month I'd find two or three invoices that didn't match what was in QuickBooks," the controller said. "Usually a rate change somebody forgot to update. Finding them took a full day on its own."

They signed up for Ledgerline Growth in mid-2025. The setup they landed on is fairly simple:

Client rates and project rates are stored in Ledgerline, so a rate change happens in one place.

Invoices are generated in a single batch at month end from approved time.

Retainer clients get automatic replenishment invoices when their balance drops below an agreed floor.

Everything syncs to QuickBooks Online, including payments collected by card or bank transfer through the client portal.

The results, according to the controller, came in two stages. In the first month, close dropped to about four days, mostly because they were still learning the batch process and double-checking everything. By the third month it was consistently two days.

The bigger change, she said, is that the reconciliation day disappeared. Because invoices and payments flow into QuickBooks directly, the mismatches she used to hunt for mostly don't happen anymore.

The firm also started offering online payment for the first time. Several municipal clients still pay by check, but most of their private clients now pay through the portal, and the controller says payments arrive faster as a result.

One thing she'd tell other firms: "Clean up your rate tables before you migrate. We brought some old mistakes over and spent the first few weeks fixing them."

The firm is considering approval rules next, so that project managers sign off on invoices for their own projects before the monthly batch runs.` 1, `Retainers are one of the most common billing arrangements in professional services, and one of the most commonly misunderstood. A client pays a fixed amount up front or monthly, you draw down against it as work happens, and at some point someone asks where the money went. If your answer takes more than a minute to explain, the retainer is probably set up wrong.

Here's what we see working at firms that run retainers well.

Decide what kind of retainer it is before you send the engagement letter. There are roughly three types. An evergreen retainer gets topped up when it falls below a floor. A monthly fixed-fee retainer covers a defined scope. A deposit retainer is held against a final invoice. They behave differently in your books and should be described differently to the client. Mixing them on the same engagement is where most of the confusion starts.

Put the replenishment rule in writing. "We'll invoice to bring the balance back to $10,000 when it drops below $3,000" is clear. "We'll top up as needed" isn't. Clients don't mind being asked for money. They mind being surprised.

Show the balance on every invoice: opening balance, work applied this period, closing balance. This one change cuts a lot of "can you explain this charge" emails. If your clients log in to a portal, make sure the running balance is visible there too, not just on the PDF.

Decide what happens to unused hours. For monthly fixed-fee retainers, do they roll over, expire, or roll over with a cap? There's no single right answer, but there needs to be an answer, and your billing team should know it without having to ask a partner.

Reconcile monthly, not at year end. Retainer liabilities left sitting for twelve months turn into a cleanup project nobody wants. A short monthly check of retainer balances against unbilled work catches drift early.

If you're a law firm, check the trust accounting rules. Client funds held on retainer usually have specific handling requirements depending on your jurisdiction. Your billing system should keep those funds clearly separated, but confirm the setup with your accountant or your bar's guidance rather than assuming.

If you're on Ledgerline Growth or Enterprise, retainers are built in, including automatic replenishment invoices and balance display in the client portal. There's a setup walkthrough in our help center if you want to try it on a single client first.` 1, `Ask a room of consultants which billing model is better and you'll get a long argument. The honest answer is that it depends on the engagement, and most firms should be using both.

Time and materials (T&M) means you bill for hours worked plus expenses, usually monthly. Milestone billing means you bill fixed amounts when defined pieces of work are completed or accepted. Here's a rough way to decide between them.

Use time and materials when scope is genuinely uncertain. Discovery work, advisory retainers, litigation, troubleshooting, anything where neither you nor the client can say with confidence what the work will involve. T&M protects you from underpricing, and it's easier to defend to a client when the scope changes every week.

Use milestone billing when the deliverables are clear. A design phase, a set of drawings, a system migration, a completed audit. Clients often prefer milestones because they know what they're paying for and when. You benefit from predictable cash flow and from getting paid for outcomes rather than effort, which rewards efficiency.

The risks are different. With T&M, the risk is client pushback on hours and slow approval of invoices with long timesheet backups. With milestones, the risk is scope creep inside a fixed price, and milestones that slip because acceptance depends on the client.

A few tips if you go with milestones:

Tie milestones to things you control where possible. "Draft report delivered" is better than "report approved by board," which may take months.

Front-load a little. A mobilization or kickoff milestone of 10 to 20 percent is common and reasonable.

Keep tracking time anyway. You need to know whether fixed-fee work is actually profitable, and the only way to know is to compare time spent to fee earned.

Write down what happens when scope changes. A simple change order process saves a lot of awkward conversations.

Many engagements end up as hybrids: milestones for defined phases, T&M for anything outside them. That's fine, as long as your billing system and your client both understand which bucket each piece of work falls into.

Ledgerline Growth and Enterprise support milestone billing alongside hourly billing on the same project, so you don't need to split engagements across tools.` 1, `Scheduled reports have been one of the most used features on our Growth and Enterprise plans since we launched them. Most firms set up a few: weekly aging, monthly revenue by client, unbilled work by partner. Until now they've gone out by email only.

Starting today, you can send any scheduled report to a Slack channel as well.

We built this because a lot of you told us the same thing in slightly different ways. The emailed reports were useful, but they landed in individual inboxes and nobody talked about them. One operations manager put it well: "I send the aging report to six partners every Monday and I have no idea if anyone opens it." Putting the report in a shared channel means the numbers are in front of the team, and people can reply in a thread when something looks off.

How it works:

An admin connects your Slack workspace from Settings > Integrations. This takes about a minute.

When you create or edit a scheduled report, you'll see a new delivery option for Slack. Pick a channel, and choose whether to post a summary only or a summary plus the full CSV attachment.

The summary shows the headline numbers, for example total outstanding, amount over 60 days and the top five overdue clients, with a link back to the full report in Ledgerline.

You can send a report to email and Slack at the same time, so nobody loses the version they're used to.

A couple of notes. Reports respect your existing Ledgerline permissions when someone clicks through, so a link in a channel doesn't give anyone access they didn't already have. That said, think about which channel you're posting to. Revenue by client probably belongs in a partners channel, not the general one.

Slack delivery is available now on Growth and Enterprise at no extra cost. We're also looking at Microsoft Teams support and would like to hear from customers who'd use it. Reply to our product update email or mention it to your account contact.

As always, the help center has a step-by-step guide, including screenshots of the setup screen.` 1, `By Marisa Delgado, CEO

I've spent a lot of time in conference rooms with partners at professional services firms, and there's a pattern I keep noticing. They'll talk for an hour about the quality of their work, their client relationships, how carefully they review every deliverable. Then the conversation turns to billing and the tone changes completely. Billing is admin. Billing is the thing the back office does. Billing is a necessary evil.

I think that's a mistake, and I think it costs firms more than they realize.

Here's my argument. For most clients, the invoice is the last thing they receive from you on a project, and often the only thing that goes to people beyond your direct contact. Finance teams, procurement, a CFO who never met you. An invoice that is late, vague, or wrong tells those people something about your firm. An invoice that is clear, accurate and on time tells them something too.

I've seen firms do excellent work and then send an invoice three weeks late with a single line that says "Professional services, March." The client contact has to go back and ask what it covers. The finance team holds it. Everyone is mildly annoyed. None of that has anything to do with the quality of the work, but it's part of what the client remembers.

The firms that do this well treat the invoice like any other deliverable. Someone owns it. It gets reviewed. It explains what was done in language the client will recognize. It goes out when it's supposed to. And when a client has a question, there's an answer ready.

This isn't about expensive software, although obviously I have a view on that. It's about attitude. A partner who wouldn't send a draft report with typos shouldn't be comfortable sending an invoice nobody checked.

There's a practical upside as well. Clear invoices get paid faster. Firms that invoice promptly have better cash flow, which means less stress about payroll and more room to make good decisions about hiring and pricing. Billing well is one of the cheapest ways a firm can improve its finances.

So my suggestion is simple. Next month, pick one invoice going to an important client and read it the way their CFO will. If it doesn't reflect the standard of the rest of your work, that's worth fixing.` 1, `When the operations director at a 40-person architecture practice in the Southwest first talked to us, she described their billing process as "three spreadsheets, a shared inbox and a lot of hope."

The firm works mostly on commercial and civic projects, many of which run for two or three years. Fees are usually structured by design phase: schematic design, design development, construction documents and construction administration. Each phase is billed as a percentage of completion, with additional services billed hourly on top.

The problem wasn't that the firm didn't know how to bill. It was that the information lived in too many places. Project managers tracked percent complete in one spreadsheet, the accounting team built invoices in another, and additional services were tracked by whoever remembered to write them down. Invoices often went out two or three weeks after month end, and clients regularly came back with questions about phase percentages that nobody could quickly answer.

"We weren't losing money exactly," she told us. "We were just always late, and we were leaving additional services on the table because nobody had a clean way to capture them."

The firm moved to Ledgerline Growth in early 2025. They set up each project with milestone billing by phase, so project managers update percent complete directly and the invoice draws from that. Additional services are logged against the same project as hourly work, and approval rules route any invoice over $25,000 to the principal in charge before it goes out.

The changes they've seen after a year:

Invoices now go out within five business days of month end, down from roughly three weeks.

The firm captured noticeably more additional services billing in its first full year, mostly from small items that had previously gone unrecorded.

Client questions about invoices dropped, which the operations director puts down to clients being able to see phase progress and past invoices in the portal.

The Xero integration means the accounting team no longer re-keys invoices, which saves a few days each month.

It wasn't all smooth. Getting project managers into the habit of updating percent complete on time took a couple of months and some reminding. "The software was the easy part," she said. "The habits took longer."

The firm is now looking at scheduled reports to give principals a weekly view of unbilled work by project.` 1 |

### marketing_spend_monthly.csv  (230 rows, 3 columns)

| Column | Blank | Distinct | Looks like | Examples / range |
|---|---|---|---|---|
| month | 0% | 46 | date | 2023-01-01 to 2026-10-01 |
| channel | 0% | 5 | category | `organic_search` 46, `paid_search` 46, `paid_social` 46, `referral` 46, `event` 46 |
| spend | 0% | 227 | number | 894.00 to 36,459.00 (sum 1,868,326) |

### reviews.csv  (48 rows, 8 columns)

| Column | Blank | Distinct | Looks like | Examples / range |
|---|---|---|---|---|
| review_id | 0% | 48 | text | `R315`, `R341`, `R346` |
| posted_on | 0% | 42 | date | 2026-01-24 to 2026-10-24 |
| product | 0% | 6 | category | `Ledgerline` 18, `Tallyfirm` 6, `FeeLedger` 6, `Billwright` 6, `Retainly` 6, `Practico` 6 |
| rating | 0% | 5 | number | 1.00 to 5.00 (sum 176) |
| title | 0% | 48 | text | `Scheduled reports are nice but limited`, `HubSpot integration is handy`, `Narrow but deep` |
| text | 0% | 48 | long text | avg 239 chars |
| reviewer_role | 0% | 45 | text | `Finance Manager, consultancy`, `Operations Lead, marketing agency`, `Legal Operations Manager, law firm` |
| firm_size | 0% | 4 | category | `11-50` 20, `51-200` 17, `1-10` 8, `201-1000` 3 |

### web_funnel_monthly.csv  (414 rows, 7 columns)

| Column | Blank | Distinct | Looks like | Examples / range |
|---|---|---|---|---|
| month | 0% | 46 | date | 2023-01-01 to 2026-10-01 |
| channel | 0% | 9 | category | `organic_search` 46, `paid_search` 46, `paid_social` 46, `direct` 46, `referral` 46, `email` 46, `event` 46, `outbound` 46, `partner` 46 |
| website_sessions | 33% | 273 | number | 818.00 to 14,223.00 (sum 1,299,874) |
| leads_created | 0% | 89 | number | 2.00 to 98.00 (sum 14,573) |
| opportunities_created | 0% | 10 | number | 0.00 to 10.00 (sum 704) |
| customers_won | 0% | 5 | number | 0.00 to 4.00 (sum 186) |
| new_arr_won | 0% | 90 | number | 0.00 to 109,080.00 (sum 3,315,072) |

### employees.csv  (52 rows, 9 columns)

| Column | Blank | Distinct | Looks like | Examples / range |
|---|---|---|---|---|
| employee_id | 0% | 52 | text | `E101`, `E102`, `E103` |
| name | 0% | 52 | text | `Owen Castellano`, `Noah Stanhope`, `Rhys Devlin` |
| title | 0% | 31 | text | `Account Executive`, `Engineer`, `Implementation Specialist` |
| department | 0% | 8 | category | `Product & Engineering` 16, `Customer Success` 9, `Sales` 7, `Support` 7, `Marketing` 5, `Finance` 4, `People & Operations` 2, `Executive` 2 |
| manager | 2% | 8 | category | `Ravi Mercer` 15, `Daniel Banerjee` 8, `Renata Kowalczyk` 6, `Maya Lindqvist` 6, `Sam Whitfield` 6, `Tom Okafor` 4, `Dana Ruiz` 3, `Alan Brandt` 3 |
| start_date | 0% | 52 | date | 2018-01-17 to 2026-01-08 |
| end_date | 88% | 6 | date | 2023-02-02 to 2025-11-07 |
| location | 0% | 3 | category | `Austin, TX` 30, `Remote, US` 18, `London, UK` 4 |
| base_salary_usd | 0% | 35 | number | 48,000.00 to 225,000.00 (sum 5,393,000) |

### usage_monthly.csv  (6,955 rows, 11 columns)

| Column | Blank | Distinct | Looks like | Examples / range |
|---|---|---|---|---|
| month | 0% | 18 | date | 2025-05-01 to 2026-10-01 |
| customer_id | 0% | 444 | text | `C1001`, `C1002`, `C1004` |
| seats_licensed | 0% | 61 | number | 5.00 to 87.00 (sum 162,648) |
| active_users | 0% | 64 | number | 1.00 to 67.00 (sum 109,944) |
| logins | 0% | 849 | number | 8.00 to 1,567.00 (sum 1,921,741) |
| invoices_sent | 0% | 280 | number | 2.00 to 376.00 (sum 480,305) |
| payments_collected_usd | 0% | 6,760 | number | 4,725.00 to 1,298,040.00 (sum 1,383,886,217) |
| uses_retainers | 0% | 2 | category | `yes` 4777, `no` 2178 |
| uses_milestones | 0% | 2 | category | `yes` 4436, `no` 2519 |
| uses_client_portal | 0% | 2 | category | `yes` 5615, `no` 1340 |
| accounting_integration | 0% | 3 | category | `QuickBooks Online` 3084, `none` 2160, `Xero` 1711 |

### deal_notes.csv  (186 rows, 6 columns)

| Column | Blank | Distinct | Looks like | Examples / range |
|---|---|---|---|---|
| opportunity_id | 0% | 45 | text | `OPP-40513`, `OPP-40595`, `OPP-41003` |
| account_name | 0% | 45 | text | `Ellery & Bramwell CPAs`, `Crane Consulting`, `Reyes Consulting` |
| date | 0% | 126 | date | 2023-10-25 to 2026-10-31 |
| type | 0% | 2 | category | `Email` 141, `Call notes` 45 |
| author | 0% | 49 | text | `Grace Mbeki`, `Nico at Ellery & Bramwell CPAs`, `Owen Castellano` |
| text | 0% | 186 | long text | avg 346 chars |

### leads.csv  (14,573 rows, 17 columns)

| Column | Blank | Distinct | Looks like | Examples / range |
|---|---|---|---|---|
| lead_id | 0% | 14,573 | text | `L100017`, `L100018`, `L100019` |
| created_at | 0% | 14,474 | date | 2023-01-01 to 2026-10-31 |
| source_form | 0% | 5 | category | `demo_request` 6825, `contact_sales` 4777, `outbound_list` 1631, `event_scan` 910, `partner_referral` 430 |
| channel | 0% | 9 | category | `organic_search` 3676, `direct` 2458, `paid_social` 2283, `paid_search` 1974, `outbound` 1631, `event` 910, `referral` 839, `partner` 430, `email` 372 |
| first_name | 0% | 64 | text | `Lucas`, `Milan`, `Noah` |
| last_name | 0% | 85 | text | `Lindgren`, `Ingram`, `Castell` |
| email | 0% | 11,893 | text | `lucas.lindgren@quaysidedevelopers.exampl`, `milan.ingram@greenlineexpo.example`, `noah.castell@reyesdesignpartnership.exam` |
| company | 5% | 8,821 | text | `Quayside Developers`, `Greenline Expo`, `Reyes Design Partnership` |
| job_title | 17% | 21 | text | `Business Development`, `Partnerships`, `Practice Manager` |
| country | 3% | 6 | category | `United States` 9918, `United Kingdom` 1590, `Canada` 1131, `India` 654, `Nigeria` 460, `Brazil` 425 |
| company_size_reported | 24% | 6 | category | `50-199` 3875, `20-49` 3208, `10-19` 2067, `1-9` 1317, `200-499` 500, `500+` 177 |
| message | 97% | 391 | long text | avg 115 chars |
| status | 0% | 6 | category | `Disqualified` 6865, `Nurture` 2917, `Working` 1983, `Unresponsive` 1720, `Converted to opportunity` 701, `Duplicate` 387 |
| owner | 0% | 5 | category | `Jules Tan` 10104, `Nick Ferraro` 2472, `Leila Haddad` 1698, `Grace Mbeki` 150, `Owen Castellano` 149 |
| first_response_at | 23% | 11,001 | date | 2023-01-02 to 2026-11-02 |
| disqualified_reason | 45% | 7 | category | `Spam or test` 2135, `Too small` 1826, `Existing customer` 1354, `Student or researcher` 1101, `Vendor pitch` 1032, `Repeat submission` 387, `Suspected competitor` 193 |
| opportunity_id | 95% | 701 | text | `OPP-40086`, `OPP-40090`, `OPP-40092` |

### opportunities.csv  (2,176 rows, 17 columns)

| Column | Blank | Distinct | Looks like | Examples / range |
|---|---|---|---|---|
| opportunity_id | 0% | 2,176 | text | `OPP-40001`, `OPP-40002`, `OPP-40003` |
| type | 0% | 2 | category | `Renewal` 1459, `New business` 717 |
| account_name | 0% | 1,039 | text | `Stanhope Engineering`, `Hartwell Engineering`, `Hale Legal` |
| customer_id | 24% | 508 | text | `C1194`, `C1195`, `C1196` |
| industry | 0% | 7 | category | `Management consultancy` 563, `Law firm` 384, `Marketing or creative agency` 381, `Architecture practice` 268, `Engineering consultancy` 246, `Accounting firm` 209, `IT services firm` 125 |
| employees | 0% | 252 | number | 9.00 to 634.00 (sum 169,551) |
| source_channel | 67% | 8 | category | `organic_search` 197, `paid_search` 132, `outbound` 92, `direct` 88, `referral` 79, `event` 70, `partner` 30, `paid_social` 29 |
| owner | 0% | 8 | category | `Nadia Sinclair` 371, `Hannah Drummond` 363, `Nadia Upton` 363, `Maria Yardley` 362, `Nick Ferraro` 334, `Leila Haddad` 324, `Grace Mbeki` 32, `Owen Castellano` 27 |
| created_date | 0% | 1,106 | date | 2022-10-05 to 2026-10-30 |
| stage | 0% | 8 | category | `Closed won` 1435, `Closed lost` 616, `Renewal: not started` 69, `Renewal: terms sent` 29, `Proposal sent` 8, `Discovery` 8, `Demo done` 6, `Negotiation` 5 |
| close_date | 6% | 1,043 | date | 2023-01-01 to 2026-10-31 |
| expected_close_date | 94% | 68 | date | 2026-11-03 to 2027-03-22 |
| amount_arr | 0% | 239 | number | 0.00 to 103,872.00 (sum 42,949,244) |
| prior_arr | 33% | 177 | number | 2,700.00 to 103,872.00 (sum 28,958,796) |
| plan | 0% | 3 | category | `Growth` 1267, `Core` 636, `Enterprise` 273 |
| loss_reason | 72% | 11 | category | `No decision` 167, `Lost to competitor` 118, `Price` 98, `Went dark` 78, `Missing feature` 56, `Low adoption` 49, `Moved to a competitor` 16, `Switched to accounting suite module` 12, `Business closed or downsized` 8, `Support and reliability` 8, `Acquired or merged` 6 |
| competitor | 95% | 5 | category | `FeeLedger` 36, `Retainly` 33, `Billwright` 32, `Tallyfirm` 9, `Practico` 8 |

### help_center_articles.csv  (120 rows, 7 columns)

| Column | Blank | Distinct | Looks like | Examples / range |
|---|---|---|---|---|
| article_id | 0% | 120 | text | `A7001`, `A7002`, `A7003` |
| title | 0% | 120 | text | `Setting up your firm profile`, `Inviting your team`, `Importing clients from a spreadsheet` |
| category | 0% | 12 | category | `Getting started` 10, `Users and permissions` 10, `Invoicing` 10, `Retainers and milestones` 10, `Payments` 10, `Client portal` 10, `Integrations` 10, `Reports` 10, `Notifications` 10, `Account and plan` 10, `Troubleshooting` 10, `Mobile and extras` 10 |
| last_updated | 0% | 115 | date | 2023-01-15 to 2026-09-30 |
| views_last_90_days | 0% | 106 | number | 8.00 to 618.00 (sum 26,785) |
| helpful_votes_pct | 0% | 46 | number | 31.00 to 92.00 (sum 8,287) |
| body | 0% | 120 | long text | avg 1094 chars |

### nps_responses.csv  (820 rows, 6 columns)

| Column | Blank | Distinct | Looks like | Examples / range |
|---|---|---|---|---|
| response_id | 0% | 820 | text | `N1`, `N2`, `N3` |
| survey | 0% | 7 | date | 2025-03-01 to 2026-09-01 |
| responded_on | 0% | 91 | date | 2025-03-19 to 2026-09-30 |
| customer_id | 0% | 363 | text | `C1008`, `C1016`, `C1019` |
| respondent_email | 0% | 493 | text | `kofi.ashby@rosalesiyerengineers.example`, `ravi.hale@highmoorarchitecture.example`, `harriet.haddad@pembertonyardleyagency.ex` |
| score | 0% | 9 | number | 2.00 to 10.00 (sum 6,529) |

### tickets.csv  (1,041 rows, 16 columns)

| Column | Blank | Distinct | Looks like | Examples / range |
|---|---|---|---|---|
| ticket_id | 0% | 1,041 | text | `T880001`, `T880002`, `T880003` |
| created_at | 0% | 1,032 | date | 2026-07-01 to 2026-10-31 |
| customer_id | 0% | 354 | text | `C1329`, `C1078`, `C1490` |
| customer_name | 0% | 354 | text | `Tavish, Brandt & Co`, `Yates, Oyelaran & Co`, `Drummond Engineering` |
| requester_name | 0% | 786 | text | `Theo Rosales`, `Aisha Pemberton`, `Renee Okafor` |
| requester_email | 0% | 857 | text | `theo.rosales@tavishbrandtco.example`, `aisha.pemberton@yatesoyelaranco.example`, `renee.okafor@drummondengineering.example` |
| channel | 0% | 3 | category | `email` 752, `web form` 234, `chat` 55 |
| subject | 0% | 162 | text | `(no subject)`, `Second attempt`, `hi` |
| body | 0% | 1,026 | long text | avg 159 chars |
| category | 23% | 4 | category | `How-to` 324, `Billing` 185, `Bug` 164, `Account change` 132 |
| priority | 0% | 4 | category | `normal` 683, `low` 175, `high` 151, `urgent` 32 |
| assignee | 0% | 5 | category | `Dev Malhotra` 248, `Ana Duarte` 211, `Ethan Finch` 198, `Nico Thackeray` 197, `Harriet Hume` 187 |
| first_response_at | 0% | 1,032 | date | 2026-07-01 to 2026-11-02 |
| status | 0% | 3 | category | `solved` 970, `pending` 59, `open` 12 |
| resolved_at | 7% | 961 | date | 2026-07-01 to 2026-11-02 |
| csat_rating | 73% | 5 | number | 1.00 to 5.00 (sum 1,207) |

### tickets_monthly.csv  (46 rows, 10 columns)

| Column | Blank | Distinct | Looks like | Examples / range |
|---|---|---|---|---|
| month | 0% | 46 | date | 2023-01-01 to 2026-10-01 |
| tickets | 0% | 35 | number | 174.00 to 285.00 (sum 9,719) |
| how_to | 0% | 24 | number | 79.00 to 119.00 (sum 4,435) |
| billing | 0% | 17 | number | 37.00 to 62.00 (sum 2,107) |
| bug | 0% | 17 | number | 37.00 to 87.00 (sum 2,116) |
| account_change | 0% | 20 | number | 12.00 to 49.00 (sum 1,061) |
| median_first_response_business_hours | 0% | 11 | number | 2.00 to 3.20 (sum 117) |
| sla_met_pct | 0% | 13 | number | 65.00 to 77.00 (sum 3,246) |
| csat_pct | 0% | 9 | number | 76.00 to 90.00 (sum 3,988) |
| source | 0% | 2 | category | `Zendesk monthly report` 42, `Calculated from tickets.csv` 4 |

## Markdown files

- **README.md**: 1,256 words. Headings: Ledgerline data room; Files; Documents; Customers; Finance; Sales; Marketing; Support; Product; People; How the files join; How real is it
- **docs/billing_engine_rewrite_2026.md**: 238 words. Headings: Billing engine rewrite: what changed on 16 March 2026
- **docs/board_update_2026_q3.md**: 247 words. Headings: Board update: third quarter 2026; Summary; Numbers; What we are worried about; What we are asking for
- **docs/collections_policy.md**: 178 words. Headings: Collections policy
- **docs/company_overview.md**: 370 words. Headings: Ledgerline: company overview; What it sells; Shape of the business at 2026-10-31; Customers; How it goes to market; The team; What is in this data room
- **docs/icp.md**: 121 words. Headings: Ideal customer profile; Who we sell to; Signs of a good fit; Not a fit
- **docs/org_chart.md**: 293 words. Headings: Org chart at 2026-10-31; Executive; Finance; Sales; Marketing; Customer Success; Support; Product & Engineering; People & Operations
- **docs/pricing_and_packaging.md**: 234 words. Headings: Pricing and packaging (internal price list); What each plan includes; Discounting
- **docs/process_maps.md**: 438 words. Headings: Process maps; FIN-1 Collections; FIN-2 Cash application; SAL-1 Inbound lead handling; SUP-1 Ticket triage; CS-2 Renewal preparation
- **docs/processes.md**: 3,337 words. Headings: Business processes at Ledgerline; Finance; FIN-1: Collections and payment reminders; FIN-2: Cash application; FIN-3: Month-end close and management accounts; FIN-4: Board and investor KPI pack; FIN-5: Vendor bills and software spend review; FIN-6: Renewal invoicing and billing changes; FIN-7: Revenue and cash forecast; Sales; SAL-1: Inbound lead qualification and routing; SAL-2: Outbound prospecting; SAL-3: Demo preparation and account research; SAL-4: Quotes and proposals
- **docs/sales_playbook.md**: 201 words. Headings: Sales playbook: inbound handling and routing; Inbound; Do not; Stages; Targets
- **docs/sla_policy.md**: 159 words. Headings: Support SLA policy; Handling rules; Reporting
- **docs/templates/collections.md**: 449 words. Headings: Collections reminders; Courtesy reminder, 5 days before due; First reminder, 7 days past due; Second reminder, 21 days past due; Final reminder, 45 days past due
- **docs/templates/nurture.md**: 1,023 words. Headings: Lead nurture sequences; General sequence, email 1; General sequence, email 2; General sequence, email 3; Law firms sequence, email 1; Law firms sequence, email 2; Law firms sequence, email 3; Agencies sequence, email 1; Agencies sequence, email 2; Agencies sequence, email 3
- **docs/templates/renewal.md**: 238 words. Headings: Renewal emails; Renewal notice, 60 days out; Price change at renewal
- **docs/templates/sdr.md**: 344 words. Headings: Sales development replies; Reply to demo request; Not a fit right now; Existing customer used the sales form
- **docs/templates/support_macro.md**: 460 words. Headings: Support macros; Password reset; How proration works; Card payment failed; Bug acknowledged, passed to engineering
- **docs/tool_stack.md**: 290 words. Headings: Tool stack; Things to know
- **marketing/competitor_battlecards.md**: 2,149 words. Headings: Competitor battlecards; Billwright; Retainly; Practico; Tallyfirm; FeeLedger
- **sales/proposals/proposal_OPP-41952.md**: 159 words. Headings: Proposal for Crane Strategy; What you asked for; What we propose; Terms; Next steps
- **sales/proposals/proposal_OPP-41988.md**: 161 words. Headings: Proposal for Nair & Hale Agency; What you asked for; What we propose; Terms; Next steps
- **sales/proposals/proposal_OPP-41999.md**: 163 words. Headings: Proposal for Hale & Ruiz Agency; What you asked for; What we propose; Terms; Next steps
- **sales/proposals/proposal_OPP-42035.md**: 155 words. Headings: Proposal for Brandt Strategy; What you asked for; What we propose; Terms; Next steps
- **sales/proposals/proposal_OPP-42065.md**: 157 words. Headings: Proposal for Rosales Engineering; What you asked for; What we propose; Terms; Next steps
- **sales/proposals/proposal_OPP-42071.md**: 172 words. Headings: Proposal for Achebe + Pemberton Architects; What you asked for; What we propose; Terms; Next steps
- **sales/proposals/proposal_OPP-42083.md**: 157 words. Headings: Proposal for Calloway & Voss Advisory; What you asked for; What we propose; Terms; Next steps
- **sales/proposals/proposal_OPP-42084.md**: 161 words. Headings: Proposal for Yates & Prior CPAs; What you asked for; What we propose; Terms; Next steps
