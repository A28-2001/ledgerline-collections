# Demo video script (about 7½ minutes)

Record the live site, https://ledgerline-collections.vercel.app/story, in a **private window** (so nothing is decided yet and the counts match). Light mode (Light, at the bottom of the left panel), browser zoom 110%, notifications off. Keep the demo guide page open on a second screen. Speak slowly; it's fine to pause. If a number on screen differs from this script, read the screen.

**Two examples carry the video:**
- **Banerjee Petrov Engineers** (INV-25539, $2,652, 92 days late): the bill we must not chase. The customer disputes it and is holding payment; Zendesk marks the ticket solved, but the bill was never corrected.
- **Kingsway Engineering Group** (INV-25469 and INV-25852, $5,100 each): one $5,100 payment with a blank memo could pay either bill. The older one is probably paid; the newer one waits for Marcus. Nobody who paid gets chased.

Crane IT Partners appears on its own as the first card on Today (Maya's pending-ticket rule).

---

## 1. The hook and the problem (0:00 to 1:20 · Story)

### 0:00 · Story, first screen: the hook (40 s)

Do:

1. Open the story and stay on the first screen.

Say:

> Half of Ledgerline's overdue money, $309,000, is owed by customers who are waiting for Ledgerline to fix their bill. Finance can't see that, so its reminders can land on exactly those customers.
>
> I'm Aakash. I built a tool for FIN-1, Ledgerline's collections process. Every morning it answers one question for every overdue bill: should we chase this invoice today? It shows the evidence, and Priya, the AR specialist, makes the call.

### 0:40 · Story, chapters 1 to 3 (40 s)

Do:

1. Scroll slowly. Pause on $633,245, then 134, then $309,000 and the Banerjee Petrov quote.
2. Scroll past chapters 4 to 6 without stopping.

Say:

> $633,245 is overdue, the highest month-end in a year, and finance chases it by hand, about 16 hours a week. 134 support tickets come from customers who owe money, and finance can't open Zendesk.
>
> So $309,000 is disputed in tickets that name the exact invoice. Banerjee Petrov is holding payment until their bill is fixed. Zendesk says solved, but the bill was never corrected.

## 2. How we tackled it (1:20 to 2:40 · How it works, then this guide)

### 1:20 · How it works: the five questions (25 s)

Do:

1. Click How it works and point at the five questions.

Say:

> Every bill gets five questions, and the first yes decides: already paid, a reason to hold, under 7 days late, 45 days late or more, or none of these, so a polite reminder goes. Top-50 accounts, disputes and every call always stay with a person.

### 1:45 · This guide: how I tackled it, and what I used (55 s)

Do:

1. Switch to this guide.
2. Show the three sections: Priya's process, How it was built, What we used.

Say:

> Today Priya asks around on Slack whether a customer has a problem, because she can't see the tickets. The tool does that asking for her.
>
> I read the data room's 51 files and asked Maya, the COO, twelve rounds of questions; every answer became a rule. The rules are Python, the app is Next.js on Vercel, and every number comes from one results file. I built it with Claude Code. A separate Claude session reviewed all 54 bills without seeing the tool's answers, and a person checked every bill where they disagreed.

## 3. Priya's morning (2:40 to 4:50 · Today)

### 2:40 · Today: the money bar and Check first (45 s)

Do:

1. Click Today. Point at the money bar, then the step tiles.
2. On Crane IT Partners, point at the ruler, then click Agree.

Say:

> This is Priya's morning: $446,810 shouldn't be chased today. Each tile is a step, with the bills left and how many of the 11 decisions it holds.
>
> Check first has 7 bills that need a person. Crane IT has a ticket open that isn't about money, so by Maya's rule a polite reminder can go once Priya has read it. It's the shadow week, so the button says Agree: nothing goes out.

### 3:25 · Today: Probably paid and the holds, with Kingsway (30 s)

Do:

1. Click Probably paid, then Hand off holds, and pick Kingsway.

Say:

> Kingsway: one $5,100 payment with a blank memo, and two $5,100 bills. The older bill goes to Marcus to match; the newer one waits until he says which bill it paid. That was Maya's biggest worry: an old tool once chased a customer who had already paid. Here, nobody who paid gets a reminder.

### 3:55 · Today: reminders and calls (25 s)

Do:

1. Click Send reminders and open the Rosales draft.
2. Click Agree with all 14, then Make calls.

Say:

> Reminders use Ledgerline's own template, without the old threat to suspend the account, and Rosales gets one email for two bills. Calls are cards that failed and ran out of retries: one call per customer.

### 4:20 · Today: Decisions done, then the day's disputes (30 s)

Do:

1. Point at Decisions done.
2. Click “Then: the day's disputes”. Banerjee Petrov is first.

Say:

> That's the morning: 11 decisions. Then the real work: 14 disputes, oldest first, Banerjee Petrov at 92 days, and 12 of the 14 past the 5-day target. Priya fixes each with a corrected bill or a clear answer, and downloads the day's decisions at the end.

## 4. The other pages (4:50 to 5:35 · Why overdue, Customers, Morning message)

### 4:50 · Why overdue, then Customers (30 s)

Do:

1. Click Why overdue and point at the reason bars.
2. Click Customers, search “Banerjee” and open it.

Say:

> The biggest reason money is overdue is disputed bills: $309,000. Then customers simply late, payments not yet matched, open complaints and failed cards. The reason decides the fix. And each customer has one page with their bills, tickets and payments side by side, which finance never had.

### 5:20 · Morning message (15 s)

Do:

1. Click Morning message. Show Priya's, then Marcus's.

Say:

> Each person gets one short message. Priya's lists what's waiting today. Marcus's asks one question: which bill does Kingsway's $5,100 pay? This week only Priya's is used.

## 5. The proof (5:35 to 6:15 · How sure are we, then dark mode and phone)

### 5:35 · How sure are we (30 s)

Do:

1. Click How sure are we.
2. Point at 85% → 96%, the 2 that differ, and the COO's two tests.

Say:

> A separate AI model checked all 54 bills blind: 85% agreed at first, 96% after the fixes. Two differ on purpose: Eastman & Wexler has an open ticket waiting on us, and Kingsway's payment could pay either bill. Every miss is listed, and the COO's two tests read zero.

### 6:05 · Dark mode and phone (10 s)

Do:

1. Click Dark, then make the window narrow.

Say:

> It also works in dark mode and on a phone.

## 6. The close (6:15 to 7:30 · this guide, then the story)

### 6:15 · This guide: honest limits (35 s)

Do:

1. Switch to this guide and show Honest limitations.

Say:

> What isn't proven: the 96% is on the same bills I fixed the rules on, so the shadow week is the real test. The AI has limits too: in testing it would have let 3 reminders skip a person's check, so daily use stays on rules. And it runs on exports, saved by hand until March, with disputes emailed to billing@ invisible to it.

### 6:50 · This guide: with more days (20 s)

Do:

1. Show With more days.

Say:

> Next: automatic saving and a shadow-week report of where Priya agreed, then live read-only connections to QuickBooks, Zendesk and Stripe, the billing@ inbox and payment plans. After legal approves, AI reads a ticket's tone.

### 7:10 · Story, first screen: the closing (20 s)

Do:

1. Switch back to the story's first screen.

Say:

> So, should we chase this invoice today? The tool answers for all 54 bills, with the evidence, in 11 decisions. Nobody waiting for a fix, and nobody who has paid, gets chased. Thank you.

---

## If something goes wrong while recording

- A page is slow: wait two seconds, keep talking.
- You click the wrong thing: say "let me go back" and carry on. No need to restart.
- A number differs from this script: read the screen.
