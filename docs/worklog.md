# Worklog

Time, decision, why. Times are US Central. This feeds the one-pager and the video.

## Before Begin: Monday 23 Nov 2026

Times before 2:30 pm are approximate: the decisions were made in one long prep chat, which is in `ai-chats/`.

| Time | Decision | Why |
|---|---|---|
| Before 2:30 pm | Read the challenge page without pressing Begin | See the rules, the 31 processes and the data room file list before the 24-hour clock starts |
| Before 2:30 pm | Pick **one** process: the collections check ("Should we chase this invoice today?") | One process done in depth, with proof, beats three done thinly. It touches FIN-1, FIN-2 and FIN-6 and needs finance, support and bank data together, which is where the judgment is |
| Before 2:30 pm | Backups: incident spotting (SUP-4) as the fallback, expansion spotting (CS-5) as the growth alternative | If the data doesn't support collections after hour 1, switch without losing the day |
| Before 2:30 pm | Critic round 1 on the idea: **7.4 / 10**. Eight fixes, giving about **8.6** | Target for every round is 8.5 to 9.5 |
| | Fix 1: customer matcher across systems | The same customer has different names in QuickBooks, the bank and the support desk. Without matching, every other check is wrong |
| | Fix 2: hold with a clock | A hold with no deadline just hides the bill. The account manager gets a task with a deadline, then it comes back to finance |
| | Fix 3: ticket relevance rules | Not every ticket should stop a reminder. Billing complaints and serious escalations hold. Other complaints get a softer tone. Closed tickets don't block |
| | Fix 4: right user, fewer clicks | If it takes more clicks than today, nobody uses it a month later. "Approve all Send" plus a morning summary |
| | Fix 5: honest claims | No "cash comes in X days sooner". That can only be measured after launch |
| | Fix 6: ladder for trusting the AI more | A person approves everything at first. Small routine reminders go automatic only after the tool proves itself. Some things never go automatic |
| | Fix 7: scope (v1 / v2 / v3) and a headline number | A clear must-ship list, and one number that opens the video |
| | Fix 8: design | It has to look professional and load instantly |
| Before 2:30 pm | Build the judgment, buy the routine parts | Reminders and payment matching already exist as products. The cross-system judgment is the gap |
| Before 2:30 pm | **Next.js + shadcn/ui** on Vercel, not Streamlit | Looks professional, loads instantly, and doesn't fall asleep when idle (Streamlit's free hosting does). A Python pipeline computes everything ahead of time |
| Before 2:30 pm | **Groq** for the AI, behind one swappable function | Already used in my earlier projects, fast, free tier. Swappable in case it misreads tickets or hits limits |
| About 2:30 pm | Reuse my earlier projects: Yardstick's agreement check, Store Copilot's verified numbers and cited policy | Yardstick found that most AI mistakes come with high confidence and no warning, and comparing several answers caught most of them. Store Copilot only showed a number when two calculations agreed |
| About 2:30 pm | Public repo with code only. Raw data room files stay out (`.gitignore`); only the computed results the app needs go in | The data belongs to Scaleworks |
| About 4:10 pm | Build a generic kit before Begin: pipeline, matcher, app, sample data, templates. Disclose it | Use the 24 hours for Ledgerline's real data, the proof and the polish. Nothing in the kit uses their data |
| About 4:10 pm | Build-vs-buy research | Found no product (of those checked) that reads support tickets before chasing. Tesorio says it doesn't integrate with Zendesk on purpose. If they use QuickBooks' own reminders, those can't skip specific customers. Card retries: buy, don't build |

## After Begin

| Time | Decision | Why |
|---|---|---|
| [ ] | Pressed Begin | |
| [ ] | Hour 1: plan vs data. Surprises: [ ] | |
| [ ] | Hour 2: asked Maya. What changed: [ ] | |
| [ ] | Critic round 3 (scope lock): [score] | |
| [ ] | | |

## After Begin (Monday 23 Nov 2026, CST)

| Time | What | Why / what it changed |
|---|---|---|
| 8:40 pm | Pressed Begin. Deadline 8:40 pm Tuesday | |
| 8:41 pm | Data room zip: all 51 files present, unpacked to data/raw (not in the repo) | |
| 8:45 pm | Read README, collections policy, SLA policy, billing rewrite, tool stack, org chart, board update, FIN-1/2/6, process maps, templates | Board: "collections ... now the main risk to cash". FIN-1 owner is the AR Specialist (Priya Nair), 16 h/week |
| 8:55 pm | Profiled the files; type-aware mapping suggested every column; set config.yaml | Rehearsal paid off: hour 1 took minutes |
| 9:00 pm | Found: invoices match contracts exactly (0 of 5,938 off), so a bill-vs-contract check finds nothing | Dropped that check; wrong bills show up only in tickets |
| 9:05 pm | Found: SLA policy forbids sending ticket content to a new vendor without a DPA | AI reads redacted ticket text for this fictional demo; production setting is "off" until legal approves a vendor. Question for Maya |
| 9:10 pm | Adapted engine: memo invoice numbers, failed cards on invoice status, top-50 rule, departed billing contacts, 90-day escalation, 150-day card write-off | Each rule cites the policy line |
| 9:20 pm | Key finding: 14 overdue bills ($309,000, 49%) are disputed in tickets naming that exact invoice; 11 of those tickets are marked solved/pending while the bill was never fixed | New rule: a ticket naming an unpaid invoice, raised after it was issued, is a dispute whatever Zendesk says |
| 9:35 pm | Real run with AI judges (232 calls, ~4 min, cached). Published to the app | |
| 9:55 pm | Maya, Q1: Paidly chased a customer who had paid by wire (not yet matched in QuickBooks). Switch-off lines: chasing someone who paid, an open Zendesk complaint, a top-50 account or anything threatening without a person checking | Became the never list, a Paidly test, a recent-payment check and a threat guard |
| 10:05 pm | Maya, Q2: support closes the ticket after passing it to finance, then nobody owns it. Finance (Priya) owns the fix, account manager for seat or pricing questions; corrected invoice or clear answer within 5 working days (Dana to confirm). Priya on leave in March, no backfill | Dispute owner and 5-day clock in the tool; days-open shown; list rebuilt from the data every morning; morning message also to Dana |
| 10:20 pm | Maya, Q3: no AI provider approved; existing vendors are covered, new ones need a DPA; run on tags and status until then; asked if it still catches the disputes | No-vendor mode is the default: 12/14 held, 1 to a person, 1 already a phone call, none chased. Bedrock (existing AWS) proposed for legal |
| 10:35 pm | Maya, Q4: auto-send only after a month of approvals on record; only small, polite 1st/2nd reminders outside the top 50 with no open ticket or unmatched payment; top-50, disputed, probably paid, anything firm and all calls stay with a person forever; Priya or Dana see why and switch it off in a click. Wants the Bedrock note today | Trust ladder built as she described |
| 12:05 am | Maya, Q5: legal note accepted, going to legal today. "Small" = under $5,000 to start, a setting Priya can change herself; start tight | Size limit $5,000 by default, editable on the page |
