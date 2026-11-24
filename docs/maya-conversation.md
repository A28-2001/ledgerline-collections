# Conversation with Maya Lindqvist (COO, played by Scaleworks AI)

Logged word for word as it happens. Times are CST, Monday 23 Nov 2026.

## 1. What failed before, and what would get it switched off

**Us:** Paidly ran for six weeks last year and then got switched off. What went wrong? And what would make you switch this off too?

**Maya:** Paidly chased a customer who'd already paid us by wire. Payments take a few days to get matched in QuickBooks, so the invoice still looked open, and nobody had tested that case before it went live. That one email cost more goodwill than six weeks of reminders earned back.

I'd switch yours off for the same kind of thing: chasing someone who's paid, or someone with an open complaint in Zendesk, or anything that reaches a top-50 account or reads like a threat without a person checking it first. The CEO personally killed an aggressive reminder sequence last year after a long-standing customer called him, so that line isn't negotiable. Is this for collections, then?

**What it changes:**
- Her four switch-off lines become the tool's "never" list: already paid, open complaint, top-50 account, anything that reads like a threat. None of them can go out without a person.
- The Paidly case (paid by wire, not yet matched) gets its own test and its own line on the Proof page.
- Any unmatched payment from the same customer in the last three weeks, even if the amount differs, puts the bill in Check first.
- A threat guard on every draft and AI rewrite: "suspend", "collections agency", "legal action", "final notice" are blocked.

## 2. Who owns a disputed bill, and how fast

**Us:** Yes, collections. Every morning it checks each overdue invoice against unmatched bank payments, Zendesk tickets and the top-50 list, then suggests send, hold, probably paid or call. Nothing goes out until Priya approves it. Your Paidly case is the first thing it checks: Jessop & Orwell's $62,688 bank payment from Oct 17 is still unmatched, so the tool marks that invoice "probably paid" instead of chasing it. One thing I found: 14 overdue invoices, about $309K, were disputed by customers in Zendesk. Most of those tickets are marked solved, but none of the bills were fixed. Who should own getting a disputed bill fixed, and how fast?

**Maya:** That's nearly half our overdue balance, and it tells me support is closing the ticket once they've passed it to finance, and then nobody owns it. Finance should own the fix, so Priya day to day, with the account manager pulled in when it's a seat count or pricing question that needs the customer's agreement. I'd want a corrected invoice or a clear answer back to the customer within five working days, though our VP Finance would confirm that's realistic. Priya goes on leave in March with no backfill, so whatever you build can't rely on her remembering which ones are still open.

**What it changes:**
- Dispute holds are owned by Priya Nair; the account manager is added when the ticket is about seats, price, plan, discount or renewal.
- Target: a corrected invoice or a clear answer within 5 working days of the customer raising it (Dana to confirm). Each hold shows how many working days it has been open and whether it's past the 5.
- Nothing relies on memory: a dispute comes back on the list every morning, with its age and owner, until the bill is fixed or paid. The morning message also goes to Dana, so the list survives Priya's leave in March.
