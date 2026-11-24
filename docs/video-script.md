# Demo video script (about 8 to 9 minutes)

Record the live site, https://ledgerline-collections.vercel.app/story, in a **private window** (so nothing is decided yet and the counts match). Light mode (Light, at the bottom of the left panel), browser zoom 110%, notifications off. Keep the demo guide page open on a second screen. Speak slowly; it's fine to pause. If a number on screen differs from this script, read the screen.

**Two examples carry the video:**
- **Banerjee Petrov Engineers** (INV-25539, $2,652, 92 days late): the bill we must not chase. The customer disputes it and is holding payment; Zendesk marks the ticket solved, but the bill was never corrected.
- **Kingsway Engineering Group** (INV-25469 and INV-25852, $5,100 each): one $5,100 payment with a blank memo could pay either bill. The older one is probably paid; the newer one waits for Marcus. Nobody who paid gets chased.

Crane IT Partners appears on its own as the first card on Today (Maya's pending-ticket rule).

---

## 1. The problem (0:00 to 2:00 · Story)

### 0:00 · Story, top of the page (20 s)

Do:

1. Open ledgerline-collections.vercel.app/story in a private window, light mode.
2. Stay at the top for a moment.

Say:

> Hi, I'm Aakash. I chose Ledgerline's collections process, FIN-1. It belongs to Priya Nair, the AR specialist. Every morning she has to answer one question for every overdue bill: should we chase this invoice today? This tool answers it with the evidence, and Priya makes the call.

### 0:20 · Story, chapters 1 to 3 (70 s)

Do:

1. Scroll slowly. Stop on each big number: $633,245, then 134, then $309,000.
2. In chapter 3, point at the Banerjee Petrov quote.

Say:

> Chapter one is the problem. $633,245 is overdue across 54 bills. That's the highest month-end in a year, and finance chases it by hand, about 16 hours a week.
>
> Chapter two is the wall. 134 support tickets come from customers who owe money, and finance can't open Zendesk at all. So a reminder can reach a customer who is still waiting for us to fix something.
>
> Chapter three is what I found. $309,000, almost half of the overdue money, is disputed in tickets that name the exact invoice: wrong seats, a missing discount, a fee that was meant to be waived. Banerjee Petrov is holding payment until their bill is fixed. Zendesk says the ticket is solved, but the bill was never corrected. A reminder here would only make things worse.

### 1:30 · Story, chapters 4 to 6 (30 s)

Do:

1. Keep scrolling: 11, then 46 of 54, then 0.

Say:

> Chapter four is the answer: 11 decisions sort Priya's morning, and $446,810 isn't chased today. Chapter five: an independent AI review agreed with the tool on 46 of 54 bills at first, and every disagreement became a fix or an explained choice. Chapter six is the COO's test: nobody gets chased who has paid or has a complaint open. Today that number is zero.

## 2. How it decides (2:00 to 3:20 · How it works, then this guide)

### 2:00 · How it works (35 s)

Do:

1. Click How it works in the left menu.
2. Point at the five questions, top to bottom.

Say:

> Every bill gets five questions, in order, and the first yes decides. One: is it already paid? Then it's probably paid, and Marcus matches the payment. Two: is there a reason not to talk about money, like a dispute or an open ticket? Then we hold. Three: is it under 7 days late? Then it waits, because the first reminder goes at day 7. Four: is it 45 days late or more? Then a person calls. Five: if none of these, a polite reminder goes.

If time: “Some things always stay with a person: top-50 accounts, disputes, probably-paid bills and every call.”

### 2:35 · This guide: the process and the build (45 s)

Do:

1. Switch to this guide.
2. Show the diagram “How it fits Priya's process”, then “How it was built, with Maya”.

Say:

> On the left is Priya's process today. She exports the aging report, then asks around on Slack whether a customer has a dispute, because she can't see the tickets. That asking is the slow part. On the right is the same morning with the tool: it reads the bills, the payments and the tickets, and gives her one list with the reasons.
>
> I built it with Maya, the COO. I asked her questions in rounds, and every answer became a rule. Then an independent AI review checked all 54 bills, and every miss became a fix.

## 3. Priya's morning (3:20 to 6:05 · Today)

### 3:20 · Today: the money bar and Check first (45 s)

Do:

1. Click Today.
2. Point at the money bar, then the row of step tiles.
3. In Check first, the first card is Crane IT Partners. Point at the ruler, then click Agree.

Say:

> This is Priya's morning. The bar shows all $633,245, split by what to do: $446,810 shouldn't be chased today.
>
> Each step is a tile. The big number is how many bills are left, and the small line says how many of today's 11 decisions it holds.
>
> Check first has the 7 bills that need a person. Crane IT Partners has a support ticket open, but it isn't about money, so by Maya's rule a polite reminder can go once Priya has read the ticket. The ruler shows where the bill is in the policy: day 7, the first reminder. This is the shadow week, so the button says Agree. Nothing goes out from the tool.

### 4:05 · Today: Probably paid and the holds, with Kingsway (45 s)

Do:

1. Click the Probably paid tile and find Kingsway Engineering Group.
2. Click the Hand off holds tile, then pick Kingsway in the list.

Say:

> Probably paid means a payment has arrived, but nobody has matched it to the bill yet. Here's Kingsway. One $5,100 payment came in on October 29 with a blank memo, and they have two $5,100 bills. The older bill goes to Marcus to match. The newer one waits here, in the holds, until Marcus says which bill the money was for.
>
> That was the COO's biggest worry. An old tool, Paidly, once chased a customer who had already paid. Here, nobody who paid gets a reminder.

If time: “The holds step also says which bills go to an owner with a deadline, 6 of them, and which one is simply too early for a reminder.”

### 4:50 · Today: reminders and calls (35 s)

Do:

1. Click Send reminders and open one draft, for example Rosales Engineering.
2. Click Agree with all 14.
3. Click Make calls.

Say:

> Send reminders: 14 bills where nothing is in the way. The email is Ledgerline's own template, without the old line that threatened to suspend the account. Rosales has two bills, so they get one email. I agree with all 14 at once, and the saved list records that it was done all at once.
>
> Make calls: these are cards that failed and ran out of retries. A person phones, one call per customer.

### 5:25 · Today: Decisions done, then the day's disputes (40 s)

Do:

1. Point at the Decisions done tile. It counts up as you agree.
2. Click “Then: the day's disputes”. The first card is Banerjee Petrov.

Say:

> The Decisions done tile counts the morning: 7 in Check first, then one per step, so 11 in all.
>
> After that comes the real work of the day: 14 disputes, oldest first. Banerjee Petrov is first, 92 days late, and 12 of the 14 are past the 5-day target. Priya fixes these herself, with a corrected bill or a clear answer. The tool drafts a reply that names the issue; this week it's there to compare. At the end of the morning she downloads the day's decisions.

## 4. The other pages (6:05 to 7:20)

### 6:05 · Why overdue (25 s)

Do:

1. Click Why overdue.
2. Point at the reason bars: disputed bills in colour, the rest grey.

Say:

> Why is the money overdue? The biggest reason by far is disputed bills: $309,000. Then customers who are simply late, payments that arrived but aren't matched, open complaints, and failed cards. The reason decides the fix.

### 6:30 · Customers (25 s)

Do:

1. Click Customers.
2. Search “Banerjee” and open Banerjee Petrov Engineers.

Say:

> Each customer has one page: their bills, their tickets and their payments, side by side. Finance never had this view, because the tickets live in Zendesk.

If time: “For Banerjee Petrov you can see the dispute, and why we hold.”

### 6:55 · Morning message (25 s)

Do:

1. Click Morning message.
2. Show Priya's message, then scroll to Marcus's.

Say:

> Every morning each person gets one short message. Priya's lists what's waiting: 19 reminders, 14 disputes, 6 hand-offs and 1 that's too early, 9 calls and 5 probably paid. Marcus's asks one question: which bill does Kingsway's $5,100 pay? This week only Priya's is used; the others are previews.

## 5. Proof and honesty (7:20 to 8:50)

### 7:20 · How sure are we (45 s)

Do:

1. Click How sure are we.
2. Point at 85% → 96% and the squares.
3. Then “The 2 that differ, on purpose”, the COO's two tests, and the four safety cards.

Say:

> How sure are we? A separate AI model checked all 54 bills without seeing the tool's answers. It agreed on 85% at first, and on 96% after the fixes. To be fair, that's on the same bills the rules were fixed on, so the shadow week is the real test.
>
> Two bills still differ, on purpose. Eastman & Wexler has an open ticket waiting on us, and Kingsway's payment could pay either bill. All 13 misses are listed, with the check that found each one and what changed.
>
> The COO's two tests read zero. And the daily tool uses no AI on customer data until legal approves a vendor.

### 8:05 · Dark mode and phone (15 s)

Do:

1. Click Dark at the bottom left.
2. Make the window narrow.

Say:

> It works in dark mode, and on a phone the steps sit in a simple two-column grid.

### 8:20 · This guide: limits and what's next (30 s)

Do:

1. Switch to this guide.
2. Show “Honest limitations”, then “With more days”.

Say:

> What isn't proven yet: the 96% is on the same bills, the day's list is saved by hand until March, it runs on exports, and disputes emailed to billing@ are invisible to it. Next: automatic saving, live read-only connections to QuickBooks, Zendesk and Stripe, then the billing@ inbox and payment plans. Thank you for watching.

---

## If something goes wrong while recording

- A page is slow: wait two seconds, keep talking.
- You click the wrong thing: say "let me go back" and carry on. No need to restart.
- A number differs from this script: read the screen.
