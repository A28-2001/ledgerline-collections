# Collections check: "Should we chase this invoice today?"

<!-- Template prepared before Begin. Every [X] is filled from Ledgerline's data after Begin. Keep the filled version to one page: cut words, not sections. -->

**Tool:** [Vercel link] · **Repo:** [GitHub link] · **Video:** [link] · **Process:** [FIN-1 / FIN-2 / FIN-6, as numbered in processes.md]

## The problem

Ledgerline has **$[X] overdue across [X] invoices** ([X]% of open receivables, up from [X]% in [month]). Today, [who, from org_chart.md] chases them [how, from Maya]. Finance can't see support tickets, bank payments or contracts in one place, so reminders can reach customers who **already paid**, are **in the middle of a complaint**, or got a **wrong bill**.

**Headline:** $[X] of overdue sits with customers we shouldn't chase today ([X]% of the total).

## What the tool does

Every morning it gives each overdue invoice one verdict, with the reason and the evidence behind it:

| Verdict | When | Count | $ |
|---|---|---|---|
| **Send** | Simply late. Softer tone if there's an open non-billing ticket | [X] | [X] |
| **Hold** | Open billing complaint, serious escalation, or the bill doesn't match the contract | [X] | [X] |
| **Probably paid** | A payment that isn't linked to any invoice matches it | [X] | [X] |
| **Call** | Very late or large: a person should talk to them | [X] | [X] |

The finance person approves all "Send" reminders in one click and reviews the rest. Each verdict cites the section of `collections_policy.md` it follows. A "Why overdue" view splits overdue dollars by cause.

## Who uses it

- **[Who sends reminders]:** the daily list and one-click approval.
- **Dana (VP Finance):** the "why overdue" view.
- **Account managers:** a task when one of their customers is on hold.

## AI vs person, and why

| AI does | A person does |
|---|---|
| Matches the same customer across systems | Confirms weak matches |
| Reads tickets and judges if they're about billing | Decides holds, disputes and credits |
| Finds likely payment matches | Confirms a bill is paid |
| Drafts the message | Approves every message |

- **Hold with a clock:** a hold creates an account manager task due in [X] days. If nobody acts, it returns to finance, flagged.
- **Two judges:** every AI judgment is made twice (two models or prompts). If they disagree, a person decides. ([X]% agreed.)
- **Trusting the AI more over time:** stage 1, a person approves everything. Stage 2, small routine reminders send themselves once the tool agrees with the team [X]% of the time over [X] weeks. Never automatic: disputes, credits, holds, calls, large accounts.

## Proof

**We claim (from Ledgerline's files):**
- Customer match rate across systems: [X]% ([X] exact, [X] fuzzy, [X] AI, [X] sent to a person)
- Verdict accuracy on [X] invoices I checked by hand: [X] / [X]
- $[X] overdue with an open billing complaint, $[X] probably already paid, $[X] with a bill that doesn't match the contract
- Today's list in [X] seconds, vs [X] today (Maya's estimate)
- Every dollar figure is calculated two ways; where the two disagree (e.g. accounting export vs billing system), we show the gap and why

**We don't claim:** that cash comes in [X] days sooner. That gets measured in month 1, comparing days to get paid before and after.

## Where it fails

- [Real failure case 1, and why]
- [Real failure case 2, and why]
- [Data gap, e.g. "failed card payments aren't recorded, so that check is off"]

## Build vs buy

Reminders, card retries and payment matching are solved problems. Buy them, starting with what Ledgerline already pays for ([from tool_stack.md]). In the products I checked, I didn't find one that reads support tickets before deciding whether to chase, so that judgment is what I built. The "why overdue" view decides what to buy next. Details: `docs/build-vs-buy.md`.

## What I'd do with more time

1. [Unfinished v2/v3 item]
2. Run it for 4 weeks alongside the team and track how often people change the verdict
3. [Next item from what the data showed]

## How it was built

A Python pipeline reads the CSVs, matches customers, runs the checks and saves the results. A Next.js app shows them, so pages load instantly. The AI runs on Groq behind one swappable function. I reused two patterns from my earlier projects: comparing two AI judges (Yardstick), and showing a number only when two independent calculations agree, with the policy source cited (Store Copilot). All AI conversations are in `ai-chats/`.

## Disclosure

[Paste docs/disclosure.md]
