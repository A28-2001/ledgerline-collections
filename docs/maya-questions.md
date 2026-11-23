# Questions for Maya

Maya Lindqvist is Ledgerline's COO, played by an AI in the challenge. Ask in hour 2, after reading the documents, so nothing we ask is already answered in a file. Rewrite any question the files already answer.

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
