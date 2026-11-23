# Build vs buy: collections and payment matching

Researched on Monday 23 Nov 2026, before Begin. Sources are linked. Where a vendor's own page makes a claim, it's marked "vendor says". Where I couldn't confirm something, it says so.

After Begin, check `tool_stack.md` to see which of these Ledgerline already pays for, and update this page.

## The question we asked of every product

Before it sends a reminder, does it look at **support tickets** (is the customer unhappy?) or the **contract** (is the bill right?)?

## A. Collections and reminder tools

| Product | What it does | Price (public?) | Reads support tickets or contracts before chasing? |
|---|---|---|---|
| **QuickBooks Online reminders** | Built-in reminder emails. You pick how many days before or after the due date, up to 3 reminders. Marks the invoice "(Reminded)". [Intuit help][qb1], [Intuit help (Advanced)][qb2] | Built in, no add-on found | No. Intuit's help article says **you can't exclude specific customers** from automatic reminders [qb1]. Menus vary by edition and region, so confirm on Ledgerline's edition |
| **Upflow** | Multi-step reminder sequences by payment history, invoice age and risk. Email, SMS, phone and letters. Syncs with QuickBooks, Chargebee, NetSuite, Xero, Salesforce [vendor says][up1], [vendor says][up2], [Capterra][up3] | Not published. Free trial listed [G2][up4] | Couldn't confirm. No support-desk link appeared in what I found |
| **Chaser** | Email and SMS reminders, automated calls, templates [Capterra][ch1]. Copies reminders and customer replies **into Zendesk** as tickets, so support can see them [vendor says][ch2] | Not published by the vendor [G2][ch3]. A third-party listing says "from 259 per month", currency not stated, may be out of date [GetApp][ch4] | Partly. It writes collections emails into Zendesk. I found nothing saying it **pauses** a reminder because a ticket is open |
| **Tesorio** | Collections workflows and dispute tracking with deadlines [vendor says][te1] | Couldn't confirm | No. Tesorio's own blog says it **does not integrate with Zendesk** and argues collections shouldn't review support tickets. It suggests a separate collections inbox instead [Tesorio blog][te2] |
| **Chargebee Receivables** | Collections on the same record Chargebee bills from (seats, usage, credits). Scores accounts on "payment history, dunning state, and subscription health" [vendor says][cb1] | Not published [G2][cb2] | Contracts: yes in effect, if billing already lives in Chargebee. Tickets: couldn't confirm. "Subscription health" is the closest thing I found to our idea |
| **Growfin** | "Finance CRM" for collections. Lists Salesforce, HubSpot, Slack and ERP integrations [ERP Research][gr1] | Couldn't confirm | No support-desk (Zendesk) integration found |
| **Versapay** | Customer portal where buyers view, question, dispute and pay invoices. Dispute deadlines and tracking [vendor says][vp1], [vendor says][vp2] | Couldn't confirm | Disputes are raised inside its portal. It doesn't read an outside support desk, as far as I found |

## B. Payment matching and failed card payments

| Product | What it does | Price (public?) | Notes |
|---|---|---|---|
| **HighRadius Cash Application** | Matches incoming payments to open invoices using invoice numbers, PO numbers, references, past payment habits and tolerance rules. Uses AI to guess matches when remittance details are missing [vendor says][hr1], [vendor says][hr2]. Claims 90%+ automation (vendor figure, not independent) | Couldn't confirm. Built for enterprise and mid-market | This is the "already paid" problem, solved properly. Probably too big for a 46-person company |
| **Upflow cash application** | Capterra lists cash application among its features [Capterra][up3] | Not published | Couldn't confirm how deep the matching goes |
| **Stripe Billing: Smart Retries and failed-payment emails** | Retries failed card payments at the best times (default up to 8 tries in 2 weeks for new accounts). Can email customers automatically when a card payment fails [Stripe docs][st1], [Stripe docs][st2] | Not checked | If Ledgerline bills cards through Stripe, this already covers "please update your card" |
| **Chargebee smart dunning** | Retry sequence for failed payments [vendor says][cb1] | Not published | Same as Stripe, if they bill through Chargebee |

## What the research says

1. **Reminders, retries and payment matching are solved problems.** Buy them. Don't rebuild them.
2. **In the products I checked, I didn't find one that reads support tickets to decide whether to pause a reminder.** Tesorio says on purpose that it doesn't. Chaser shares collections emails *with* support, but in the other direction. This is the gap our tool fills. (Careful wording: "I didn't find one", not "none exists".)
3. **If Ledgerline uses QuickBooks' own reminders,** every overdue customer gets the same reminder, complaint or not, because specific customers can't be excluded (per Intuit's help article). Confirm with `tool_stack.md` and Maya.
4. **Chargebee Receivables is the closest competitor** to our idea (it scores "subscription health"). If Ledgerline bills in Chargebee, say so in the one-pager and compare honestly.

## Recommendation

- **Buy the routine parts:** scheduled reminders, card retries and payment matching, using what they already pay for first.
- **Build the judgment:** the part that connects finance with support tickets and contracts, and decides "chase, hold, probably paid, or call".
- **Let the "why overdue" view decide what to buy next:**
  - Mostly "already paid" → buy payment-matching software.
  - Mostly "card failed" → switch on the billing tool's built-in retries and emails.
  - Mostly "unhappy" or "wrong bill" → fix billing and support. No collections tool will help.
- **Change to our scope:** for failed card payments, our tool only flags them and points to the billing tool's own retry emails. It doesn't build its own.

## Sources

[qb1]: https://quickbooks.intuit.com/learn-support/en-us/help-article/invoicing/send-invoice-reminders-automatically-manually/L84cQjpxo_US_en_US
[qb2]: https://quickbooks.intuit.com/learn-support/en-us/help-article/product-setup/set-auto-payment-reminders-quickbooks-online/L7HTMjgWm_US_en_US
[up1]: https://upflow.io/features/dunning
[up2]: https://upflow.io/automated-collections-software
[up3]: https://www.capterra.com/p/193097/Upflow/
[up4]: https://www.g2.com/products/upflow-upflow/reviews
[ch1]: https://capterra.com/p/157101/CHASER/
[ch2]: https://www.chaserhq.com/log-receivables-emails-and-replies-as-zendesk-tickets
[ch3]: https://www.g2.com/products/chaser/pricing
[ch4]: https://www.getapp.com/finance-accounting-software/a/chaser/pricing/
[te1]: https://www.tesorio.com/goals/better-collaboration
[te2]: https://www.tesorio.com/blog/the-right-tool-for-your-ar-team-tesorio-or-zendesk
[cb1]: https://chargebee.com/receivables
[cb2]: https://g2.com/products/chargebee-receivables/pricing
[gr1]: https://erpresearch.com/erp-add-ons/ar-collections/growfin
[vp1]: https://www.versapay.com/collaboration
[vp2]: https://www.versapay.com/resources/collaborative-dispute-management
[hr1]: https://www.highradius.com/product/cash-application-automation/enterprise/
[hr2]: https://www.highradius.com/product/cash-application-automation/mid-market/
[st1]: https://docs.stripe.com/billing/revenue-recovery/smart-retries
[st2]: https://docs.stripe.com/billing/revenue-recovery

- QuickBooks reminders: [Intuit help][qb1], [Intuit help (Advanced)][qb2]
- Upflow: [dunning][up1], [collections][up2], [Capterra][up3], [G2][up4]
- Chaser: [Capterra][ch1], [Zendesk logging][ch2], [G2 pricing][ch3], [GetApp pricing][ch4]
- Tesorio: [collaboration][te1], [blog on Zendesk][te2]
- Chargebee Receivables: [product page][cb1], [G2 pricing][cb2]
- Growfin: [ERP Research][gr1]
- Versapay: [collaboration][vp1], [dispute management][vp2]
- HighRadius: [enterprise][hr1], [mid-market][hr2]
- Stripe: [Smart Retries][st1], [revenue recovery][st2]
