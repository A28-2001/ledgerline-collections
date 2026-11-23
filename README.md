# Collections check

Every morning, it tells the finance team which overdue bills to chase, which to hold, and why. It connects each bill with support tickets, bank payments and the contract. A person approves everything before it reaches a customer.

Built for the Scaleworks AI Operator Challenge. See `docs/disclosure.md` for what was prepared before the 24-hour clock started.

## The four verdicts

| Verdict | When | What happens |
|---|---|---|
| **Probably paid** | A payment already covers the bill | Finance confirms and closes it. No reminder |
| **Hold** | Open billing complaint, serious escalation, or the bill doesn't match the contract | The owner gets a task with a deadline. If nobody acts, it returns to finance |
| **Call** | Long overdue, a large bill, or we can't confirm who the customer is | A person calls |
| **Send** | Nothing blocking | Reminder email: standard, softer if there's an open product complaint, or an update-card note if a card failed |

When the two AI judges disagree about a ticket, the tool doesn't chase: a person reads it first.

## How it works

```
data files ──► pipeline/ (Python)                                    ──► web/ (Next.js on Vercel)
               load → match customers → check payments, tickets,         Today · Why overdue ·
               contracts → verdict + reasons + evidence + policy ref      Customer · Proof · Morning summary
               → results.json
```

- `pipeline/config.yaml`: column mapping and policy rules. Each rule cites its policy section.
- `pipeline/match.py`: links the same customer across systems (exact id → exact name → fuzzy → AI judges). Weak matches go to a person.
- `pipeline/ai.py`: the only place that calls an AI model (Groq). Two judges per decision; disagreement goes to a person. Cached, and optional.
- `pipeline/engine.py`: the verdict logic.
- `pipeline/run.py`: runs everything and writes `web/src/data/results.json`.
- `pipeline/profile.py` and `pipeline/plan_check.py`: profile new data, and test the plan's assumptions against it.

## Run it

```bash
uv venv .venv --python 3.11 && uv pip install --python .venv/bin/python -r pipeline/requirements.txt
.venv/bin/python pipeline/make_sample.py          # fake sample data
.venv/bin/python pipeline/run.py --publish        # add --data raw for the real files in data/raw
.venv/bin/python pipeline/test_pipeline.py        # checks
cd web && npm install && npm run dev
```

The data room files are not in this repo. To re-run on them, put them in `data/raw/` and run `pipeline/run.py --data raw --publish`. AI judges need `GROQ_API_KEY` in the environment; without it, the run uses rules only and says so.
