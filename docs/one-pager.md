# Collections check: "Should we chase this invoice today?"

Tool (no login): https://ledgerline-collections.vercel.app. Start with the story. Process: FIN-1 Collections, owned by Priya Nair (AR Specialist).

## Which process I chose, and why

I chose FIN-1 Collections. Ledgerline has $633,245 overdue across 54 bills, its highest month-end in 12 months. Finance chases it by hand, about 16 hours a week, and can't open Zendesk.

$309,000 of it (49%) is disputed in tickets that name the exact invoice. Zendesk marks 11 of those 14 tickets solved, but the bills were never fixed, so reminders chase customers who are waiting for a corrected bill.

It's a daily decision made by rules, and the COO's test can be checked: nobody gets chased who has paid or has a complaint open.

## What the tool does, and how to use it

Each morning it reads QuickBooks, bank and Stripe payments, Zendesk tickets and contracts. It gives each overdue bill one of four answers, with the reason, the records behind it and the policy step:

- Probably paid: 5 bills, $78,348. Marcus matches the payment.
- Hold: 21 bills, $368,462. That's 14 disputes Priya fixes, 6 bills handed to an owner with a deadline, and 1 too early for a reminder.
- Send: 19 bills, $177,051.
- Call: 9 bills, $9,384. These are 45 or more days late.

To use it, read the story, then open Today:

1. Priya's morning is 11 decisions: 7 bills in Check first, then one agreement per step.
2. Then comes the day's work: 14 disputes, oldest first, each with a reply that names the issue.
3. Every bill opens with its evidence.

During the shadow week (the COO's decision), nothing goes out from the tool. Priya compares its suggestions with her own calls and downloads the day's decisions. After that week, approved reminders open in her own email app, ready to send.

## What is AI, what stays with a person, and why

- Daily use runs on rules only. No AI touches customer data until legal approves a vendor, because the SLA policy needs a data agreement first. Amazon Bedrock is with legal.
- AI is the auditor. A separate model (Claude, in its own session) reviewed all 54 bills from the raw records without seeing the tool's answers. A person then checked every contested bill.
- AI is measured before it's allowed. In testing, Groq read masked tickets: it changed none of the answers and would only add 3 bills to Check first. Once AI is allowed, two models must agree or a person decides.
- A person decides every send. Top-50 accounts, disputes, probably-paid bills and every call always stay with a person, and auto-send stays locked until a month of approvals is on record. The reason is Paidly, the tool Ledgerline switched off in 2025 after it chased a customer who had already paid by wire.

## What it gets wrong

- It agreed with an independent review on 46 of 54 bills (85%) at first, and 52 of 54 (96%) after the fixes. Those are the same bills the rules were fixed on, so the shadow week is the real test.
- The checks found 13 misses. Each became a rule fix, a confirmed rule or an explained choice. Two still differ on purpose:
  - Eastman & Wexler, which has an open ticket waiting on us.
  - Kingsway, where one $5,100 payment fits two bills, so Marcus confirms which one it paid.
- Disputes emailed to billing@ are invisible to it.
- It runs on exports, so messages are copied by hand and the day's list is saved by hand. That's allowed for the shadow week only: a missed day is flagged, and saving becomes automatic before March.
- "About 5 minutes" a morning, and 3 to 4 of 16 hours saved a week, are estimates until the shadow week times them.
- Payment plans (FIN-1 step 5) aren't built.

## What I would connect it to at Ledgerline

All of these come from Ledgerline's own tool stack.

- Read-only inputs:
  - QuickBooks Online
  - Stripe
  - Zendesk, masked, through a read-only account that Support signs off
  - DocuSign contracts
  - HubSpot, for account owners and the top-50 accounts
  - The billing@ inbox
- Outputs:
  - Slack for the morning messages
  - Priya's Gmail for reminders
  - Google Sheets for the decision list
  - AWS to run it each morning, with Bedrock once legal approves

## What I would do with more time

- Next 2 days: save the decisions automatically in Ledgerline's AWS. Add a shadow-week report showing where Priya agreed or differed, and the minutes per morning.
- Week 1: live read-only QuickBooks, Zendesk and Stripe, a Slack app, and Google sign-in.
- Week 2: read the billing@ inbox. Add payment plans with the VP Finance's approval, and a corrected-invoice step within Dana's limits.
- After legal approves: Bedrock reads a ticket's tone (the COO's "sounds unhappy" rule) and catches untagged tickets. Then auto-send for small polite reminders.
- Throughout: watch overdue over 60 days ($57,685 today), and keep the COO's two tests at 0 for a month.

Disclosure: I built and tested it on made-up data before Begin. Everything that uses Ledgerline's data came after (see the git history). Built with Claude Code.
