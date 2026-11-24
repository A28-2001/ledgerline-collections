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

## After Begin (Monday 23 to Tuesday 24 Nov 2026, CST)

Times come from the git commit log where a commit exists; "~" marks an estimate between commits. (Corrected at 12:41 am: earlier entries had drifted ahead of the real clock.)

| Time | What | Why / what it changed |
|---|---|---|
| 8:40 pm | Pressed Begin. Deadline 8:40 pm Tuesday | |
| 8:41 pm | Data room zip: all 51 files present, unpacked to data/raw (not in the repo) | |
| ~8:42 pm | Read README, collections policy, SLA policy, billing rewrite, tool stack, org chart, board update, FIN-1/2/6, process maps, templates | Board: "collections ... now the main risk to cash". FIN-1 owner is the AR Specialist (Priya Nair), 16 h/week |
| ~8:44 pm | Profiled the files; type-aware mapping suggested every column; set config.yaml | Rehearsal paid off: hour 1 took minutes |
| ~8:45 pm | Found: invoices match contracts exactly (0 of 5,938 off), so a bill-vs-contract check finds nothing | Dropped that check; wrong bills show up only in tickets |
| ~8:46 pm | Found: SLA policy forbids sending ticket content to a new vendor without a DPA | AI reads redacted ticket text for this fictional demo; production setting is "off" until legal approves a vendor. Question for Maya |
| ~8:47 pm | Adapted engine: memo invoice numbers, failed cards on invoice status, top-50 rule, departed billing contacts, 90-day escalation, 150-day card write-off | Each rule cites the policy line |
| ~8:49 pm | Key finding: 14 overdue bills ($309,000, 49%) are disputed in tickets naming that exact invoice; 11 of those tickets are marked solved/pending while the bill was never fixed | New rule: a ticket naming an unpaid invoice, raised after it was issued, is a dispute whatever Zendesk says |
| 8:51 pm | Real run with AI judges (232 calls, ~4 min, cached). Published to the app | |
| by 11:52 pm | Maya, Q1: Paidly chased a customer who had paid by wire (not yet matched in QuickBooks). Switch-off lines: chasing someone who paid, an open Zendesk complaint, a top-50 account or anything threatening without a person checking | Became the never list, a Paidly test, a recent-payment check and a threat guard |
| by 11:52 pm | Maya, Q2: support closes the ticket after passing it to finance, then nobody owns it. Finance (Priya) owns the fix, account manager for seat or pricing questions; corrected invoice or clear answer within 5 working days (Dana to confirm). Priya on leave in March, no backfill | Dispute owner and 5-day clock in the tool; days-open shown; list rebuilt from the data every morning; morning message also to Dana |
| 11:55 pm | Maya, Q3: no AI provider approved; existing vendors are covered, new ones need a DPA; run on tags and status until then; asked if it still catches the disputes | No-vendor mode is the default: 12/14 held, 1 to a person, 1 already a phone call, none chased. Bedrock (existing AWS) proposed for legal |
| 12:00 am | Maya, Q4: auto-send only after a month of approvals on record; only small, polite 1st/2nd reminders outside the top 50 with no open ticket or unmatched payment; top-50, disputed, probably paid, anything firm and all calls stay with a person forever; Priya or Dana see why and switch it off in a click. Wants the Bedrock note today | Trust ladder built as she described |
| 12:05 am | Maya, Q5: legal note accepted, going to legal today. "Small" = under $5,000 to start, a setting Priya can change herself; start tight | Size limit $5,000 by default, editable on the page |
| 12:08 am | Maya, Q6: 3 to 4 of the 16 hours go on chasing support and AMs on Slack (Priya to confirm). Watch overdue $ over 60 days. Real test: Priya still opens it every morning, and nobody chased who had paid or had a complaint open | Month-1 test on the proof page; time-saved claim labelled as her estimate |
| 12:20 am | Maya, Q7: read-only access with masked excerpts is fine (Maya + Head of Support sign off Zendesk; VP Finance approves QuickBooks). Pull directly with read-only service accounts; keep export upload as fallback | Excerpts masked everywhere; data sources and sign-offs on the proof page |
| 12:25 am | Maya, Q8: AM gets 3 working days on an open-ticket pause, then back to Priya; Slack DM, one nudge a day; probably paid to Marcus (copy Priya), back to Priya after 2 working days. Dana to confirm timings | Owners, clocks and per-person morning routing built |
| 12:30 am | Maya, Q9: Priya owns failed cards (polite update-card email, same checks); Dana flagged at least 5 working days before any automatic write-off; March: Dana owns the list, Marcus keeps probably paid; corrections: Priya up to $2,500, Dana above or top-50, as a setting | Built; all of her numbers on a Settings card |
| ~12:33 am | Maya, Q10: show it on real records and, above all, what it got wrong and why; both earlier tools failed on unchecked cases. Asked what it takes to put it in front of Priya on Monday | Full review of all 54 bills; "where it is wrong" leads the proof page; Monday plan |
| ~12:35 am | Maya, follow-up: plan accepted; shadow week on exports. Banerjee Petrov miss worries her most; before Monday Priya must see any ticket from that customer next to a "call". She is contacting Support and Dana today and sending the legal note | Tickets shown beside every call; rules catch cancelled-but-charged disputes |
| 12:36 am | Fixed the two misses: tickets naming the invoice were read as escalations, not disputes, so the tool said "call". Now 14/14 disputes held without AI; every call shows the customer's tickets ("Read before you call") | Logged as a miss in the proof page notes |
| 12:40 am | Critic round 3+4 (scope lock and v1 on real data, after Maya): about 8.5. Plan intact; Maya refined it, no pivot. Feature freeze after the review fixes; the rest of the time goes to evidence and story | |
| 12:45 am | Independent review of all 54 real bills (a separate AI model that never saw the tool's answers): 46/54 agree (85%). Fixed 4 rule errors it exposed: a regulator complaint and a chargeback raised before the bill (Eastman Engineering, Drummond), a reminder before day 7 (Abbott), an email plus a call to one customer (Quill Mott). Now 50/54 (93%), labelled honestly as after-fix | 4 left: the open/pending ticket rule, a judgment call |
| 12:49 am | Pending tickets: my call (with Claude, after the review; for Maya to confirm) that a pending ticket (waiting on the customer) blocks only if about money, high priority, or still waiting on Ledgerline. Plus: customer-resolved tickets stop blocking (Crane IT); recent money complaints hold even when solved (Studio Marsh). Review now 53/54 (98%) after fixes; first pass 85% kept on the page | Review log of every miss leads the proof page |
| 12:55 am | Hand check: all 11 contested calls in the review confirmed by hand (the 8 first-pass misses, Crane IT, the pending-ticket cases and the deliberate Eastman & Wexler hold) | Accuracy is now human-checked: 85% first pass, 98% after fixes |
| 12:57 am | Second look at the hand check: Kingsway INV-25852 was confirmed as "send", but a $5,100 payment that could cover it is unmatched (the Paidly case). Both same-amount bills now go to Check first | The one hand-check call that did not hold up |
| 12:59 am | Critic round 5 (the proof): about 8.8. Evidence up to 9 (all 54 reviewed independently, honest 85% to 98%, 13-entry miss log including our own hand-check miss). Fix first in the morning: the proof page is long (about 11 cards), so lead with misses, accuracy and Maya's two checks | Go |
| 1:07 am | UX check on real data: no sideways scroll on any page at phone width. Added "How it works" page (the process diagram with live counts) and docs/process-diagram.md. Proof page: misses first with a 4-number stats line; settings, sources and trust ladder folded below. Fixed: "Why overdue" called disputes "Bill doesn't match contract" | |
| 9:45 am, 24 Nov | Critic rounds 6 and 7 (two fresh critics, 7.0 each): fixed overclaimed numbers, broken sentences, the miss reconciliation, AI explained once, the reviewer named as an AI model, the pending rule labelled as my call with Maya's test shown both ways, one email per customer, account managers told about contacts going out | |
| 12:20 pm, 24 Nov | Quick critic (5 minutes): 8.0, up from 7.5. Fixed: one way to count reminders (19 bills, 18 emails: 14 ready now, 5 after a check), accuracy against the reviewer's own labels (52 of 54, 96%), where AI was used in testing said plainly, the five questions listed in the story, the two judgment calls shown as Maya's to confirm. A check for generic AI-made UI patterns found no gradients, emoji, stock images or fake links; removed the create-next-app leftovers (default favicon, sample SVGs, README) and 5 unused components. The left panel now follows Light or Dark | |
| 12:40 pm, 24 Nov | Second quick critic: 7.8. Fixed what it found: the two judgment calls are Kingsway and Harbor (I had marked Crane by mistake), the story explains both bills that still differ, all five questions listed, exact dollars in the queue, and a same-day re-run no longer clears the morning's decisions. Its other top point, saving decisions on a server, is a new feature and stays under 'With more time' | |
| 12:51 pm, 24 Nov | Plain-words fixes: one meaning per colour (every reason grey except disputes, so no reason colour looks like an answer colour), each caveat said once on the proof page, and a missed save is now said in the next morning message and on every page instead of failing silently. Removed 7 more unused functions. The local build had reused a stale stylesheet; rebuilt clean | |
| 1:01 pm, 24 Nov | Glass finish, used sparingly: a glossy edge and lifted shadow on the one card being decided, a sheen on the money bar, frosted bars on phones, the next card slides in (off when motion is reduced), glass on the selected theme button. Screenshot review: 7.6, UI up to 8.0. Fixed what it found: 'Already paid' overstated, now 'Probably paid'; the 2 bills that differ named under the 96%; plain names for where misses came from; no unmeasured '2 minutes'; systems cited, not file names; why a person checks pending tickets; Send or Call written on each queue row; the $5,100 payment explained on Why overdue | |
| 1:11 pm, 24 Nov | Content cuts for easy reading: bills are the only count in headlines (emails and calls stay inside the steps), story chapters 2 and 5 in one line, the date said once on the story instead of six times, the miss-source table folded, the safety list at 4 lines, shorter step text on Today. Visible words: story 843 to 747, proof 610 to 519 | |
| 1:27 pm, 24 Nov | Last review, 7.8. Fixed: AI redraft switched off until legal approves a vendor (it called Groq); How sure are we shows two numbers with the after-fix one highlighted, and the 2 bills that differ first; the phone button says what its count means; story chapter 4 pairs each question with its answer; the COO tests say 'would chase'. A productive finish: every approved reminder opens in the email app, written and addressed | |
