# Questions for Maya

Maya Lindqvist is Ledgerline's COO, played by an AI in the challenge. Ask in hour 2, after reading the documents, so nothing we ask is already answered in a file. Rewrite any question the files already answer.

## Ask these now (rewritten after reading the data room, Monday 9:50 pm)

The files already answer the old questions 1 and 2: Priya Nair (AR Specialist) owns reminders, about 16 hours a week across the team (processes.md FIN-1), and the policy says disputes and open escalations wait for the account manager. These four ask what the files can't tell us. The challenge brief: "What matters, what has failed before, what would get it switched off."

1. **"Paidly ran for six weeks last year and then got switched off. What went wrong? And what would make you switch this off too?"**
   - Why: what failed before and what gets it switched off, in one question. The vendor bills show Paidly was paid for May and June 2025.
   - What changes: if it chased disputed or unhappy customers, that's our headline and the reason Hold comes first. If it was noise or too many clicks, we lead with the decision count.
2. **"I found 14 overdue invoices, about $309K, that customers disputed in Zendesk. Most of those tickets are marked solved, but none of the bills were fixed. Who should own getting a disputed bill fixed, and how fast?"**
   - Why: sets the hold owner and the hold clock (now 3 business days, Ana Duarte with the account manager), and shows her the finding.
   - What changes: her owner and days go into config.yaml and the one-pager word for word.
3. **"The SLA policy says ticket content can't go to a new vendor without a data processing agreement. Is there an AI vendor legal has approved, or should the tool read tickets with rules only until there is?"**
   - Why: the tool's AI reads ticket text. This is the line that could get it switched off on day one.
   - What changes: an approved vendor goes into the swappable AI function; "rules only" becomes the production default, with unsure tickets sent to a person.
4. **"Once the tool agrees with Priya most of the time, could small routine reminders go out on their own? What must always stay with a person?"**
   - Why: stage 2 of the trust ladder.
   - What changes: her bar goes into the one-pager. The policy already says the top 50 accounts and anything threatening always stay with a person.

Backups: "Of Priya's collections time, how much is asking support and account managers about open issues?" (our time-saved baseline) · "Can we retire the 45-day 'final notice' template? It threatens suspension, which needs Dana's sign-off." · "For the 50 largest accounts, does Dana or Priya write?"

## Original questions (written before Begin)

Short and natural, one at a time. Write down her exact answer in `worklog.md`.

## Ask these first

### 1. "Who sends the payment reminders today, and how much of their week does it take?"
- **Why:** the tool is for that person. We also need today's time as the "before" number.
- **What changes:**
  - If it's Dana herself, the main screen is the "why overdue" view, with the list second.
  - If it's a junior or part-time role, "approve all Send" and the morning summary come first.
  - If nobody really does it, the story is "reminders that weren't going out at all", and Send matters more than Hold.

### 2. "When a customer has an open support ticket, should we pause reminders? Which kinds of tickets, and for how many days?"
- **Why:** this sets the hold rules and the hold clock. It's the core judgment in the tool.
- **What changes:**
  - Her list of ticket types becomes the relevance rules (billing complaint, outage, escalation, and so on).
  - Her number of days becomes the hold deadline.
  - If she says "never pause", holds turn into "softer tone plus a note to the account manager".

### 3. "Has anyone been chased for a bill they'd already paid, or for a wrong bill? What happened?"
- **Why:** checks that the "probably paid" and "wrong bill" problems really hurt, and gives a real story for the video.
- **What changes:**
  - Yes, with a story: those checks move up and the story goes in the video.
  - "Not that I know of": keep them as a flag only, and lead with complaints.

### 4. "Would you let small, routine reminders go out on their own after a trial period? What must always stay with a person?"
- **Why:** sets stage 2 of the ladder for trusting the AI more, and the "never automatic" list.
- **What changes:**
  - Her bar (for example "95% agreement over a month") goes into the tool and the one-pager word for word.
  - If she says "never", the tool stays approve-only and we sell it on speed and judgment instead.

## Backups (if there's time, or if the files already answer one above)

### 5. "What would make your finance team stop using a tool like this?"
- **Why:** finds the adoption risk early.
- **What changes:** if the answer is "too many clicks" or "can't trust it", we push one-click approval and the evidence on every verdict.

### 6. "Have you looked at buying collections software before? What happened?"
- **Why:** the build-vs-buy section has to match their history.
- **What changes:** if they tried a product and dropped it, the one-pager says why ours is different. If they never looked, we recommend what to buy for the routine parts.

### 7. "Since the billing rewrite in March, have billing disputes gone up? Is there a known list of billing errors?"
- **Why:** a link between the rewrite and rising overdue bills is the finding that would take the score above 9.
- **What changes:** a known error list becomes test cases for the "wrong bill" check. If she says no, we check the data ourselves and report what we find.

### 8. "This quarter, what matters more: getting cash in faster, or keeping customers calm before renewals?"
- **Why:** decides which way the tool leans when it's unsure.
- **What changes:**
  - "Cash": borderline cases become Send.
  - "Calm": borderline cases become Hold, and renewal dates show on every invoice.
