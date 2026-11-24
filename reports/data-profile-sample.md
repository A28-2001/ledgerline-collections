# Data profile: sample

Made by `pipeline/profile_data.py`. Facts about the files only, no conclusions.

**8 CSV files, 5 Markdown files.**

## Suggested column mapping

Each field shows the column picked (✓ = same as config.yaml, a number = how close the name is). `?` means nothing of the right type fits: map it by hand or leave it null. The same mapping is written to `reports/config-suggested-sample.yaml`.

- **customers** (`customers.csv`): id: customer_id ✓, name: name ✓, segment: segment ✓, plan: plan ✓, arr: arr ✓, account_manager: account_manager ✓, renewal_date: renewal_date ✓, billing_email: billing_email ✓
- **contacts** (`contacts.csv`): id: contact_id ✓, customer_id: customer_id ✓, name: name ✓, email: email ✓, role: role ✓, last_active: last_active ✓
- **contracts** (`contracts.csv`): id: contract_id ✓, customer_id: customer_id ✓, start: start_date ✓, end: end_date ✓, seats: seats ✓, unit_price: price_per_seat ✓, status: status ✓
- **invoices** (`invoices.csv`): id: invoice_id ✓, customer_id: customer_id ✓, customer_name: customer_name ✓, issue_date: issue_date ✓, due_date: due_date ✓, amount: amount ✓, status: status ✓, paid_date: paid_date ✓, method: payment_method ✓, seats: seats_billed ✓, unit_price: unit_price ✓
- **payments** (`payments.csv`): id: payment_id ✓, invoice_id: invoice_id ✓, payer: payer_name ✓, amount: amount ✓, date: payment_date ✓, method: method ✓, status: status ✓
- **ar_aging** (`ar_aging.csv`): invoice_id: invoice_number ✓, customer_name: customer ✓, issue_date: invoice_date ✓, due_date: due_date ✓, amount: open_balance ✓, days_overdue: days_past_due ✓
- **tickets** (`tickets.csv`): id: ticket_id ✓, customer_id: ?, customer_name: company ✓, created: created_at ✓, status: status ✓, priority: priority ✓, category: category ✓, subject: subject ✓, body: body ✓

## CSV files

### ar_aging.csv  (90 rows, 6 columns)

| Column | Blank | Distinct | Looks like | Examples / range |
|---|---|---|---|---|
| invoice_number | 0% | 90 | number | 1,023.00 to 9,001.00 (sum 147,820) |
| customer | 0% | 53 | text | `JUNIPER PARTNERS LLC`, `Highland Hea.`, `The Willow Labs Inc` |
| invoice_date | 0% | 5 | date | 2026-06-01 to 2026-10-01 |
| due_date | 0% | 9 | date | 2026-07-01 to 2026-10-16 |
| open_balance | 0% | 50 | number | 195.00 to 8,004.00 (sum 222,603) |
| days_past_due | 0% | 9 | number | 15.00 to 122.00 (sum 3,489) |

### contacts.csv  (224 rows, 6 columns)

| Column | Blank | Distinct | Looks like | Examples / range |
|---|---|---|---|---|
| contact_id | 0% | 224 | text | `P00010`, `P00020`, `P00021` |
| customer_id | 0% | 110 | text | `C0001`, `C0002`, `C0003` |
| name | 0% | 224 | text | `Contact 1-0`, `Contact 2-0`, `Contact 2-1` |
| email | 0% | 224 | text | `billing0@evergreendentali.example`, `billing0@highlandhealthll.example`, `user1@highlandhealthll.example` |
| role | 0% | 3 | category | `billing` 110, `user` 59, `admin` 55 |
| last_active | 0% | 67 | date | 2025-09-26 to 2026-10-30 |

### contracts.csv  (110 rows, 7 columns)

| Column | Blank | Distinct | Looks like | Examples / range |
|---|---|---|---|---|
| contract_id | 0% | 110 | text | `K0001`, `K0002`, `K0003` |
| customer_id | 0% | 110 | text | `C0001`, `C0002`, `C0003` |
| start_date | 0% | 10 | date | 2025-01-01 to 2025-10-01 |
| end_date | 0% | 10 | date | 2027-01-01 to 2027-10-01 |
| seats | 0% | 66 | number | 5.00 to 308.00 (sum 6,246) |
| price_per_seat | 0% | 5 | number | 39.00 to 79.00 (sum 6,600) |
| status | 0% | 1 | category | `active` 110 |

### customers.csv  (110 rows, 8 columns)

| Column | Blank | Distinct | Looks like | Examples / range |
|---|---|---|---|---|
| customer_id | 0% | 110 | text | `C0001`, `C0002`, `C0003` |
| name | 0% | 110 | text | `Evergreen Dental Inc`, `Highland Health LLC`, `Maple Realty Inc` |
| segment | 0% | 3 | category | `SMB` 59, `Mid-market` 41, `Enterprise` 10 |
| plan | 0% | 3 | category | `Core` 40, `Pro` 38, `Scale` 32 |
| arr | 0% | 96 | number | 2,340.00 to 291,984.00 (sum 4,675,968) |
| account_manager | 0% | 5 | category | `Marcus Hill` 27, `Elena Ortiz` 23, `Jordan Lee` 22, `Priya Shah` 22, `Sam Carter` 16 |
| renewal_date | 0% | 10 | date | 2026-01-01 to 2026-10-01 |
| billing_email | 0% | 110 | text | `billing@evergreendentali.example`, `billing@highlandhealthll.example`, `billing@maplerealtyinc.example` |

### invoices.csv  (1,155 rows, 11 columns)

| Column | Blank | Distinct | Looks like | Examples / range |
|---|---|---|---|---|
| invoice_id | 0% | 1,155 | text | `INV-1001`, `INV-1002`, `INV-1003` |
| customer_id | 0% | 110 | text | `C0001`, `C0002`, `C0003` |
| customer_name | 0% | 110 | text | `Evergreen Dental Inc`, `Highland Health LLC`, `Maple Realty Inc` |
| issue_date | 0% | 12 | date | 2025-11-01 to 2026-10-01 |
| due_date | 0% | 32 | date | 2025-11-16 to 2026-11-15 |
| amount | 0% | 101 | number | 195.00 to 291,984.00 (sum 4,678,420) |
| status | 0% | 2 | category | `paid` 1038, `open` 117 |
| paid_date | 10% | 332 | date | 2025-11-06 to 2026-10-30 |
| payment_method | 0% | 3 | category | `card` 555, `wire` 308, `ach` 292 |
| seats_billed | 0% | 70 | number | 5.00 to 308.00 (sum 50,679) |
| unit_price | 0% | 5 | number | 39.00 to 79.00 (sum 68,695) |

### labels.csv  (90 rows, 3 columns)

| Column | Blank | Distinct | Looks like | Examples / range |
|---|---|---|---|---|
| invoice_id | 0% | 90 | number | 1,023.00 to 9,001.00 (sum 147,820) |
| true_verdict | 0% | 4 | category | `send` 27, `call` 27, `hold` 25, `paid` 11 |
| note | 0% | 11 | category | `long overdue or large` 26, `simply late` 15, `open billing complaint` 13, `unmatched bank payment for this bill` 8, `open product complaint: softer reminder` 7, `bill does not match the contract` 6, `failed card: update-card email` 5, `serious open escalation` 4, `paid and linked, but still open in the accounting export` 3, `billing complaint in vague words` 2, `not in the billing system: a person checks` 1 |

### payments.csv  (1,051 rows, 7 columns)

| Column | Blank | Distinct | Looks like | Examples / range |
|---|---|---|---|---|
| payment_id | 0% | 1,051 | text | `PAY-5001`, `PAY-5002`, `PAY-5003` |
| invoice_id | 1% | 1,043 | text | `INV-1001`, `INV-1002`, `INV-1003` |
| payer_name | 0% | 170 | text | `EVERGREEN DENTAL I`, `EVERGREEN DENTAL INC`, `HIGHLAND HEALTH LL` |
| amount | 0% | 96 | number | 195.00 to 291,984.00 (sum 4,433,741) |
| payment_date | 0% | 333 | date | 2025-11-06 to 2026-10-30 |
| method | 0% | 3 | category | `card` 504, `wire` 278, `ach` 269 |
| status | 0% | 2 | category | `succeeded` 1046, `failed` 5 |

### tickets.csv  (355 rows, 8 columns)

| Column | Blank | Distinct | Looks like | Examples / range |
|---|---|---|---|---|
| ticket_id | 0% | 355 | text | `T-20001`, `T-20002`, `T-20003` |
| company | 0% | 220 | text | `Meridian Supply Co`, `summit outfitters co`, `tidewater studios inc` |
| created_at | 0% | 353 | date | 2026-07-01 to 2026-10-30 |
| status | 0% | 3 | category | `closed` 310, `open` 34, `pending` 11 |
| priority | 0% | 4 | category | `normal` 185, `high` 98, `low` 69, `urgent` 3 |
| category | 0% | 6 | category | `how-to` 146, `bug` 105, `feature request` 50, `billing` 49, `outage` 3, `general` 2 |
| subject | 0% | 18 | text | `Overcharged this month`, `Dispute on invoice INV-1061`, `Dispute on invoice INV-2154` |
| body | 0% | 29 | text | `We were overcharged on invoice INV-1741.`, `We were overcharged on invoice INV-1790.`, `We were overcharged on invoice INV-1618.` |

## Markdown files

- **board_update_2026_q3.md**: 21 words. Headings: Board update Q3 (SAMPLE)
- **collections_policy.md**: 100 words. Headings: Collections policy (SAMPLE, made up); §1 Scope; §2 Reminder schedule; §3 Escalation; §4 Disputes and holds; §5 Card payments
- **org_chart.md**: 23 words. Headings: Org chart (SAMPLE)
- **sla_policy.md**: 47 words. Headings: Support SLA (SAMPLE, made up); §1 Priorities; §2 Sensitive tickets
- **tool_stack.md**: 38 words. Headings: Tool stack (SAMPLE)
