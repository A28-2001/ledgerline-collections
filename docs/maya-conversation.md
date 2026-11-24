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

## 3. Which AI vendor, and does it work without one

**Us:** Done. Each disputed bill now shows Priya as the owner, the account manager when it's seats or pricing, and how many working days it's been open against your five. The list is rebuilt from Zendesk and the ledger every morning, so nothing depends on memory, and Dana gets the same morning summary for when Priya's on leave. One more: the tool uses AI to read ticket text, and the SLA policy says ticket content can't go to a new vendor without a data processing agreement. Is there an AI vendor legal has approved, or should it run on rules only until there is?

**Maya:** Legal hasn't signed off on any AI provider specifically. The rule is that vendors we already use are covered and anything new needs a DPA first. So tell me exactly which provider you'd use and show me in writing that it doesn't train on our data, and I'll take that to legal. If it turns out to be a new vendor, a DPA won't land by Monday, so I'd rather see it run on rules against ticket tags and status until then than have it blocked on day one. Does it still catch most of those disputed bills without reading the text?

**What it changes:**
- Production default is now no-vendor mode: ticket tags, status and simple rules run locally; nothing leaves Ledgerline's systems. Measured on the real data: 12 of the 14 disputed bills held, 1 sent to a person (tagged billing), the last ($2,652) is 92 days late so it's a phone call anyway. No disputed bill gets an unchecked reminder. Cost: 18 bills in Check first instead of 10.
- Provider for legal: Amazon Bedrock in Ledgerline's existing AWS account (AWS is already a vendor; legal to confirm the existing terms cover it). AWS states Bedrock doesn't use prompts or completions to train models or share them with third parties. Groq (used in the demo) is a new vendor: it offers a DPA, says it doesn't train on customer data, and has zero data retention, but it would need that DPA first.
- The AI step stays one swappable function: switch `ai.ticket_text` to `redacted` and point it at the approved provider once legal signs off.

## 4. Could routine reminders ever go out on their own

**Us:** (sent the no-vendor result and the Bedrock recommendation) Next: once it agrees with Priya most of the time, could small routine reminders go out on their own? What must always stay with a person?

**Maya:** Possibly, but not on a percentage alone. I'd want a month of Priya's approvals on record showing she almost never changed those reminders, and then only for small, polite, first-or-second reminders to customers outside the top 50 with no open ticket and no unmatched payment. Anything top-50, anything disputed or "probably paid," anything firmer than a friendly nudge, and every phone call stays with a person, permanently, because one bad email undoes all of it. Priya or Dana also needs to be able to see why each one went out and turn auto-send off herself in a click. Send me the Bedrock note today and I'll get it in front of legal this week.

**What it changes:**
- The trust ladder, in her words. Auto-send stays off until a month of Priya's approvals is on record showing she almost never changed those reminders.
- Even then, only: small, polite, first or second reminders, customers outside the top 50, no open ticket, no unmatched payment.
- Permanently with a person: top-50 accounts, disputed or probably-paid bills, anything firmer than a friendly nudge, every phone call.
- Each bill shows whether it could ever be auto-sent and why not. Priya or Dana can see why each one went out and turn auto-send off in one click.
- Open: what counts as "small" (ask her).

## 5. The note for legal, and what counts as "small"

**Us:** (sent the Bedrock note for legal and confirmed the ladder) One gap: what amount counts as a "small" reminder?

**Maya:** Thanks, the note is exactly what legal needs, and I'll send it over today. For "small," I'd start at invoices under $5,000, which covers most monthly bills from our smaller firms and keeps every big annual invoice with a person. Our VP Finance may want it lower, so make it a setting Priya can change herself rather than something baked in. I'd rather start tight and loosen it after a quiet month than the other way round.

**What it changes:**
- "Small" starts at under $5,000, as a setting Priya changes herself on the page, not a number in the code.
- Start tight, loosen after a quiet month: the setting only matters once the ladder unlocks; until then every reminder is approved by a person.

## 6. The "before" number and how she'd judge it in a month

**Us:** Two quick ones so I measure this honestly. Your process notes say the team spends about 16 hours a week on collections, and one step is checking each overdue account for disputes by asking support and the account managers. Roughly how much of those 16 hours is that asking around? And a month from now, what one number would tell you this is working?

**Maya:** My guess is three to four hours of the sixteen go on chasing support and the account managers on Slack and waiting for answers, but Priya would know better, so ask her to sanity-check it before you put it in front of anyone. The one number I'd watch is overdue dollars over 60 days, which should start coming down from where it is today. Behind that number, my real test is whether Priya is still opening it every morning a month from now and nobody has been chased who'd paid or had a complaint open. If either of those slips, a good receivables number won't save it.

**What it changes:**
- Time saved, said honestly: the tool replaces the "asking around" step, which Maya estimates at 3 to 4 hours of the team's 16 a week. Labelled as her estimate, for Priya to confirm.
- Month-1 test on the proof page, in her order: overdue dollars over 60 days (today's figure as the starting point), Priya opening it every morning, and zero customers chased who had paid or had a complaint open.

## 7. Ticket access for finance, and how the data gets in

**Us:** Two practical ones before I finish. Finance has no Zendesk access today. The tool needs read-only access to tickets from customers with an overdue bill, and it would show Priya the subject, status and a short excerpt with card and bank details masked. Is that OK, and who should sign off? And how should the data get in each morning: Priya exporting the AR aging from QuickBooks, or the tool pulling from QuickBooks and Zendesk directly?

**Maya:** Read-only access with masked excerpts is fine by me, since it stays inside tools we already pay for and Priya needs that context. Support reports to me, so I'll sign off with our Head of Support, who owns Zendesk and will want to set up the access herself, and the VP Finance should approve the QuickBooks side. Pull directly from QuickBooks and Zendesk with read-only service accounts rather than relying on a morning export. A manual step is exactly what quietly stops happening when Priya's on leave, though keep an export upload as a fallback if the connection breaks.

**What it changes:**
- Every ticket subject and excerpt finance sees is masked (card numbers, bank details, emails, phone numbers), not just what an AI would read.
- Production data path: read-only service accounts for QuickBooks (VP Finance approves) and Zendesk (Head of Support sets it up; Maya signs off). The export folder stays as the fallback. This run used the fallback (the data room files).
- The proof page lists each source, how it connects, and who signs it off.

## 8. Account manager pauses, Slack, and the probably-paid list

**Us:** When a bill is paused because the customer has an open support ticket, how long should the account manager get before it comes back to Priya, and should those nudges reach them on Slack? Also, should the "probably paid" list go to Marcus, since he matches the payments, or to Priya?

**Maya:** I'd give the account manager three working days to either get the issue moving or tell Priya the reminder can go, then it comes back to her automatically. Slack is right, since that's where they live, but send them a direct message rather than posting to a channel so it doesn't get lost, and only one nudge a day. The "probably paid" list should go to Marcus, because matching is his job and he's the one who can clear it. Copy Priya so she knows those invoices are on hold, and if Marcus hasn't matched one within two working days it should come back to her. Our VP Finance would confirm those timings, but that's where I'd start.

**What it changes:**
- Open-ticket and complaint pauses: the account manager has 3 working days to get the issue moving or tell Priya the reminder can go; then it comes back to Priya automatically.
- Nudges: one Slack direct message a day per account manager, listing all their paused bills, never a channel post.
- Probably paid: goes to Marcus Bell to match, with Priya copied; if not matched within 2 working days, it comes back to Priya.
- The morning message page shows who gets what each day. Timings are Maya's starting point, for Dana to confirm.

## 9. Failed cards, Priya's leave, and who approves corrections

**Us:** Three practical ones to close the loop: 1. There are 16 failed card payments where Stripe's retries have finished, and two will be written off automatically within nine days. Who should follow those up, and should Dana be flagged before an automatic write-off happens? 2. When Priya's on leave in March, who should own the morning list, Dana, or someone else? 3. Fixing a disputed bill often means lowering it (Riverside was billed 62 seats for 38 people). Can Priya issue a corrected invoice or credit herself, or does Dana approve above a certain amount?

**Maya:** Priya should own the failed card payments, since it's a polite "your card didn't go through, here's the link to update it" email, and the same top-50 and open-ticket checks apply before anything goes out. And yes, Dana should be flagged at least five working days before any automatic write-off so someone can decide whether to chase it or let it go. For March, Dana owns the morning list, with Marcus covering the "probably paid" side as he does now, though I'll confirm with Dana that she can give it twenty minutes a day. On credits, I'd let Priya issue corrections up to about $2,500 herself and have Dana approve anything above that, or anything on a top-50 account. Dana may want a different line, so make it a setting rather than hard-coding it. Riverside would go to Dana either way.

**What it changes:**
- Failed cards: Priya owns them; a polite update-your-card email with the link; the top-50 and open-ticket checks still apply.
- Automatic write-offs: Dana gets a direct message at least five working days before, to decide whether to chase or let it go.
- March: Dana owns the morning list while Priya is on leave; Marcus keeps the probably-paid list. (Maya to confirm Dana's twenty minutes a day.)
- Corrections: Priya up to $2,500; Dana above that or on any top-50 account. A setting, not code.
- All of Maya's numbers now sit on one Settings card, each with who can change it.
