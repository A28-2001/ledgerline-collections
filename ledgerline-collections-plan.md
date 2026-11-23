# Ledgerline collections check: plan v2

Updated after critic round 1. Target for every critic round: **8.5 to 9.5**.

Ledgerline is the fictional company in the Scaleworks AI Operator Challenge. Every number below that isn't from the data room listing is a placeholder until the files open at Begin.

---

## The tool in one line

Every morning, it tells the finance team which overdue bills to chase, which to hold, and why, by connecting the bills with support tickets, bank payments and contracts. A person approves everything before it reaches a customer.

## Who it's for (fix 4)

- **Main user:** whoever sends payment reminders today. Confirm in `org_chart.md` and with Maya in hour 2. It may not be Dana.
- **Dana (VP Finance):** the "why are bills overdue" view and an overview of approvals.
- **Account managers:** get a task when a bill is held for their customer.

Rule: the tool must take fewer clicks than today's process, or nobody will use it a month later.

---

## Scope for the 24 hours (fix 7)

### v1: must ship
1. **Customer matcher (fix 1).** Links the same customer across invoices, payments, tickets and contracts. Uses exact IDs first and AI for messy names. Every match gets a confidence score, and low-confidence matches go to a person. Report the match rate.
2. **Morning run.** Every overdue bill gets a verdict (Send / Hold / Probably paid / Call), a plain-English reason and the evidence behind it. Follows `collections_policy.md`.
3. **Complaint check with relevance rules (fix 3).**
   - Billing complaint or a serious open escalation: **Hold**.
   - Other complaint, such as a product bug: **Send**, but in a softer tone, and tell the account manager.
   - Closed or resolved ticket: mentioned in the reason, but it doesn't block the reminder.
   - Sensitive-ticket rules come from `sla_policy.md`.
4. **Hold with a clock (fix 2).** Each hold creates an account manager task with a deadline, agreed with Maya. If nobody acts, the bill goes back to finance, flagged.
5. **"Why are bills overdue?" view.** Overdue dollars split by cause: unhappy customer, already paid, wrong bill, simply late.
6. **Less clicking (fix 4).** "Approve all Send" in one click, plus a preview of the morning summary message.

### v2: should ship
- Already-paid check: matches unmatched payments to overdue bills.
- Failed card payments: a friendly "please update your card" email, only if the data records failed payments.
- Override log: records every time a person changes a verdict and shows accuracy over time.

### v3: stretch
- Wrong bill: compare seats and price to the contract, around the March 2026 billing rewrite.
- Out-of-date billing contacts: only if `contacts.csv` supports it.

Anything not finished goes in the one-pager under "what I'd do with more time".

---

## Judgment: what the AI does vs what a person does (fix 6)

| AI does | A person does |
|---|---|
| Matches customers across systems | Confirms low-confidence matches |
| Reads tickets and judges relevance | Decides holds, disputes, credits |
| Finds likely payment matches | Confirms a bill is paid |
| Compares bills to contracts | Fixes wrong bills |
| Drafts the right message | Approves every message (stage 1) |

**Ladder for trusting the AI more over time:**
- **Stage 1 (first weeks):** a person approves every message.
- **Stage 2:** once the AI's verdicts agree with the team's often enough (the bar is set with Dana, for example 95% over 4 weeks), small, routine "Send" reminders go out automatically. Everything else is still approved.
- **Never automatic:** disputes, credits, holds, calls, and large or enterprise accounts.

**Reusing your own past work (from Yardstick and Store Copilot):**
- **Agreement check (Yardstick).** Yardstick found that most AI mistakes come with no warning and high confidence, and that comparing several answers caught most of them. So every AI judgment here (Is this ticket a billing complaint? Is this the same customer?) is made more than once, by two judges from different model families (gpt-oss-20b and Qwen 3.8, each with its own prompt wording). If the answers disagree, the case goes to a person. That's a judgment rule backed by your own evidence.
- **Verified numbers (Store Copilot).** Every dollar figure on screen is calculated two independent ways, and both must agree before it's shown as verified.
- **Cited policy (Store Copilot).** Each verdict cites the exact section of `collections_policy.md` or `sla_policy.md` behind it.
- **"What needs attention" brief (Store Copilot).** Becomes the morning summary.

---

## Evidence: what we claim and what we don't (fix 5)

**We claim (backed by the data):**
- How many overdue dollars sit with customers who have a billing complaint, have probably paid already, or have a bill that doesn't match their contract
- How accurate the verdicts are on a hand-checked sample
- The customer match rate across systems
- Seconds to build today's list, vs the manual process

**We don't claim:**
- "Cash comes in X days sooner." That's the expected result, measured in month 1 by comparing days to get paid before and after.
- Any number we didn't calculate from their files.

**We always show:** the cases the tool gets wrong, and why.

---

## Hour 1 data checks

| Question | File(s) |
|---|---|
| Is overdue really rising? Since when? | `invoices.csv`, `ar_aging.csv` |
| Did it get worse after the March 2026 billing rewrite? | `invoices.csv`, `tickets.csv`, `billing_engine_rewrite_2026.md` |
| How many overdue customers have an open ticket? | `ar_aging.csv` + `tickets.csv` |
| How many unmatched payments match an overdue bill? | `payments.csv` + `ar_aging.csv` |
| How well do customer names match across systems? | `customers.csv`, `invoices.csv`, `payments.csv`, `tickets.csv` |
| Is there a history of reminders sent? | `invoices.csv` columns, `templates/collections.md` |
| Are failed card payments recorded? | `payments.csv` |
| Who sends reminders today? | `org_chart.md`, `employees.csv` |
| What tools do they already have? | `tool_stack.md` |
| What does leadership worry about most? | `board_update_2026_q3.md` |

If a check comes back empty, we drop that part of the tool and say so.

---

## Questions for Maya (hour 2)

1. Who sends the reminders today, and how much of their week does it take?
2. When a customer has an open ticket, should reminders pause? Which kinds of tickets matter?
3. Has anyone been chased for a bill they'd already paid, or for a wrong bill? What happened?
4. What would make the finance team stop using a tool like this?
5. Would you let small, routine reminders send automatically after a trial period? What must always stay with a person?
6. Have you looked at buying collections software before? What happened?
7. Since the billing rewrite in March, have disputes gone up? Is there a known list of billing errors?
8. This quarter, which matters more: getting cash in faster, or keeping customers calm before renewals?

---

## Build vs buy

- Buy the routine parts (scheduled reminders, bank matching) once volume justifies it.
- Build the judgment that connects finance with support and contracts. That's the gap their own descriptions point to.
- The "why are bills overdue" view decides what's worth buying:
  - Mostly "already paid" → buy payment-matching software.
  - Mostly "unhappy" or "wrong bill" → fix billing and support; collections software won't help.
- During the challenge, check one or two real products so the one-pager describes them accurately.

---

## Interface (fix 8)

- **Recommended:** Python pipeline + Next.js front end.
  - **Python pipeline:** loads the CSVs, runs the matcher and AI checks, and saves the results ahead of time as JSON.
  - **Next.js + Tailwind + shadcn/ui on Vercel:** the screens. Pages load instantly because the results are already computed.
  - **Groq** behind one swappable AI function, called live only for things like redrafting an email. Key stored in environment variables, never in code.
- **Screens:**
  1. **Today:** the bill list, verdicts, "approve all Send"
  2. **Why overdue:** the cause breakdown, and the trend around the billing rewrite
  3. **Customer detail:** invoice, payments, tickets and contract side by side
  4. **Proof:** accuracy, match rate, failure cases
  5. **Morning summary:** a preview of the message the team would receive
- **Before handing in:** test the reviewer's exact path in a private browser window. No login required.

---

## Video outline (5 to 10 minutes)

| Time | Part |
|---|---|
| 0:00 | Headline number: "$X of overdue is sitting with customers we shouldn't be chasing" |
| 0:30 | The problem: the wall between finance, support, the bank and contracts |
| 1:30 | Live demo: today's list, one real Hold case from their tickets |
| 4:00 | "Why are bills overdue": the insight for Maya |
| 5:30 | Judgment: AI vs person, the hold clock, the ladder for trusting the AI more |
| 6:30 | Proof: accuracy, match rate, where it fails |
| 8:00 | Build vs buy, and what I'd do next |

---

## Critic scorecard (target 8.5 to 9.5)

My scorecard, built from Scaleworks' stated criteria. It isn't their official rubric.

| Area | Weight | What a 9+ looks like |
|---|---|---|
| Changes the job | 25% | The person who sends reminders could use it tomorrow, with fewer clicks than today |
| Evidence | 25% | Every claim backed by their data; accuracy measured; failures shown |
| Judgment | 20% | Clear AI/person split, hold clock, ladder for trusting the AI more |
| Design and smoothness | 15% | Looks professional, instant pages, works on first click |
| Story | 15% | Headline number first, sharp Maya questions, tight video and one-pager |

Round 1 (idea only): **7.4**. With the fixes in this plan: **about 8.6**. Getting above 9 requires a real finding from their data, such as a clear link between the billing rewrite and the rise in overdue bills.

---

## When each fix lands

| Fix | Now (in this plan) | Before Begin | Hours 1–2 | During the build |
|---|---|---|---|---|
| 1. Customer matcher | Approach set | Generic matching code | See real names | Tune, report match rate |
| 2. Hold with a clock | Designed | | Deadline agreed with Maya | Build in v1 |
| 3. Ticket relevance | Rules drafted | | Finalize from `sla_policy.md` and Maya | Build in v1 |
| 4. Right user, fewer clicks | Rule set | | Org chart and Maya | Approve-all and summary |
| 5. Honest claims | Claim list set | | | Fill in real numbers |
| 6. Trusting the AI over time | Designed | | Bar agreed with Maya | Shown in one-pager and video |
| 7. Scope and headline | Scope locked | Video outline | | Headline number from data |
| 8. Interface | Recommended | Generic front-end skeleton | | Polish, private-window test |

Anything built before Begin stays generic, contains nothing about Ledgerline, and is disclosed in the one-pager.
