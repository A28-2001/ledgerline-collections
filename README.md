# Collections check

**"Should we chase this invoice today?"** Ledgerline's collections process (FIN-1), owned by Priya Nair, the AR Specialist.

Every morning it reads the overdue bills, bank and Stripe payments, support tickets and contracts, and gives each bill one answer with its reason, the records behind it and the policy line. A person approves everything before anything reaches a customer.

- **Live tool:** https://ledgerline-collections.vercel.app/story (start with the story)
- **One-page description:** [`docs/one-pager.md`](docs/one-pager.md)
- **What was built before the clock started:** [`docs/disclosure.md`](docs/disclosure.md); the git history shows the rest

Built for the Scaleworks AI Operator Challenge. Ledgerline and its data room are fictional.

## The five questions, in order

| # | Question | If yes | Who acts |
|---|---|---|---|
| 1 | Already paid? | **Probably paid** | Marcus matches the payment in 2 working days; no reminder |
| 2 | A reason not to talk about money? (dispute, open ticket, chargeback or regulator threat, refund owed, unclear payment) | **Hold** | Priya fixes disputes in 5 working days; account managers get 3 days on open tickets; Marcus gets 2 on an unclear payment |
| 3 | Under 7 days late? | **Wait** | Comes back on day 7 |
| 4 | 45+ days late, or already calling them? | **Call** | Priya calls, with the customer's tickets in front of her |
| 5 | None of the above | **Send** | Priya approves a polite reminder from Ledgerline's own templates |

Always with a person, permanently: top-50 accounts, disputes, probably-paid bills, anything firmer than a friendly nudge, and every call. Auto-send stays off until a month of approvals is on record.

## Today's numbers (data as of 31 Oct 2026)

54 overdue bills, $633,245. 19 bills to remind, 21 holds (14 of them disputes Priya fixes herself), 9 bills to call about, 5 probably paid. The morning sort is 11 decisions: 7 bills to check, then four bulk approvals. $309,000 (49%) is disputed in tickets that name the exact invoice.

Accuracy: a separate AI model (Claude, in its own session) reviewed all 54 bills without seeing the tool's answers, and a person checked the 11 contested bills. First pass 46 of 54 (85%); 52 of 54 (96%) after the fixes, on the same bills, so not a fresh test. The last 2 differ on purpose: an open ticket, and a payment that could belong to either of two bills. Every miss is listed in the tool and in [`reports/review/review-log.json`](reports/review/review-log.json).

## AI and data safety

- **No-vendor mode is the default** (`ai.ticket_text: "off"` in `pipeline/config.yaml`). Ledgerline's SLA policy bars sending ticket content to a new vendor without a data agreement, so tickets are read with tags, status and rules, inside Ledgerline. Amazon Bedrock, in the existing AWS account, is proposed to legal ([`docs/ai-vendor-for-legal.md`](docs/ai-vendor-for-legal.md)).
- **When AI is on**, two models from different families read masked ticket text; if they disagree, a person decides. Answers are cached in `data/cache/ai_cache.json`.
- **Measured, not claimed:** `pipeline/measure_ai.py` re-runs the 54 bills with the cached AI answers (no new calls). AI changed no decisions on these bills, as rules already catch all 14 disputes, and it would only send 10 bills to Check first instead of 7. These answers came from Groq on masked tickets, in testing, before the COO said no vendor was approved. Result in [`reports/ai-uplift.json`](reports/ai-uplift.json).
- Every ticket excerpt is masked (emails, card numbers, bank details, phone numbers) before anyone sees it.
- The "Redraft with AI" button is switched off until legal approves a vendor. For a demo, set `AI_REDRAFT=on` and `NEXT_PUBLIC_AI_REDRAFT=on`: it then sends a draft to Groq, with guards against leaking ticket details or adding threats.

## How it's built

```
data files ──► pipeline/ (Python) ───────────────────────────────► web/ (Next.js on Vercel)
               load → match customers → payments, tickets,          The story · Today · Why overdue ·
               contracts → answer + reasons + evidence + policy     Customers · Morning message ·
               → web/src/data/results.json                          How sure are we · How it works
```

| File | What it does |
|---|---|
| `pipeline/config.yaml` | Column mapping, policy rules and every setting the COO gave (each cites its source) |
| `pipeline/load.py`, `match.py` | Loads the files; links each customer across systems (ID, then exact name; near-matches go to a person) |
| `pipeline/engine.py` | The five questions, reasons, evidence, owners and deadlines, drafts from Ledgerline's templates |
| `pipeline/ai.py` | The only place that calls an AI model; off by default; cached |
| `pipeline/run.py` | Runs everything, checks the headline numbers two ways, writes `results.json` |
| `pipeline/measure_ai.py` | Measures what AI ticket-reading changes, from cached answers |
| `pipeline/compare_review.py` | Compares the tool with the independent review |
| `pipeline/test_pipeline.py` | Tests: the Paidly case, renamed columns, memory between mornings |

**Memory between mornings:** drop each day's decision list (the CSV from the Today page) into `data/history/`. If the last working day's list is missing, the next morning message and every page say so. Maya (24 Nov): by hand is fine for the shadow week; automatic before March.

**Shadow week:** `shadow_week: true` in `pipeline/config.yaml` (the default for Monday). Nothing goes out from the tool; Priya compares her calls with its suggestions, and the decision list records where she agrees. Set it to `false` after the week, and approved reminders open in her own mailbox. The next run reads it: an approved reminder is never suggested twice, the next stage follows what was actually sent, and hold deadlines run from the first hand-off, so an untouched hold comes back to Priya.

## Run it

```bash
uv venv .venv --python 3.11 && uv pip install --python .venv/bin/python -r pipeline/requirements.txt
.venv/bin/python pipeline/make_sample.py                      # made-up sample data
.venv/bin/python pipeline/test_pipeline.py                    # tests
.venv/bin/python pipeline/run.py --data raw --publish         # the data room files, put in data/raw/
.venv/bin/python pipeline/measure_ai.py                       # what AI changes, from cached answers
cd web && npm install && npm run dev
```

The data room files aren't in this repo. Without `GROQ_API_KEY` (or with `ai.ticket_text: "off"`), the run uses rules only and says so.

## Docs

- [`docs/one-pager.md`](docs/one-pager.md): the one-page description
- [`docs/maya-conversation.md`](docs/maya-conversation.md): the COO conversation, word for word
- [`docs/process-diagram.md`](docs/process-diagram.md): the process, and how the tool maps to FIN-1's steps
- [`docs/worklog.md`](docs/worklog.md): decisions and times
- [`docs/build-vs-buy.md`](docs/build-vs-buy.md), [`docs/ai-vendor-for-legal.md`](docs/ai-vendor-for-legal.md), [`docs/disclosure.md`](docs/disclosure.md)
