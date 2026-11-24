# After Begin: the runbook

Everything below is ready before Begin. After Begin, the job is to point it at the real files, check the plan against the data, and fill in the real numbers. Times are targets from the moment you press Begin.

## 0:00 to 0:10 — Get the files in

1. Download the data room and put every file in `data/raw/` (subfolders are fine).
2. Check nothing is missing:

```bash
ls -R data/raw | head -80
```

## 0:10 to 0:25 — Profile the files

```bash
.venv/bin/python pipeline/profile_data.py data/raw
```

Open `reports/data-profile-raw.md`:
- The top section suggests which real column fits each field. It only picks columns of the right type (amounts must be numbers, dates must be dates). Rehearsed on renamed columns: every field right.
- The same suggestions are in `reports/config-suggested-raw.yaml`. If they look right, copy that file over `pipeline/config.yaml`; otherwise fix the few wrong lines first.
- Set any column that doesn't exist to `null`. The check that needs it is skipped, and the run says so.
- Set `company_name: Ledgerline`.

## 0:25 to 0:45 — Plan vs data (the surprise check)

```bash
.venv/bin/python pipeline/plan_check.py --data raw
```

Open `reports/plan-vs-data-raw.md`. For every row:
- ✅ **holds**: keep it in the plan, and note the number for the one-pager.
- ⚠️ **partly**: keep it, with careful wording.
- ❌ **contradicts**: change the plan (the "What changes" column says how), and write it in the worklog.
- ❔ **can't tell**: ask Maya, or drop it.

Read the **Surprises** list out loud. Every surprise either becomes a finding (good for the video) or a rule in the tool.

## 0:45 to 1:00 — Read the documents that set the rules

In this order: `collections_policy.md`, `sla_policy.md`, `templates/collections*`, `org_chart.md`, `tool_stack.md`, `board_update_2026_q3.md`, `billing_engine_rewrite_2026.md`, `processes.md` (our process), `process_maps.md`.

Then update `pipeline/config.yaml`:
- `policy:` the real day limits, amount limit and section names (`ref:` fields), so every verdict cites the real policy
- `values:` the real status, priority and category words (from the profile)
- `trend_markers:` the real rewrite month
- `people:` the real owner names for holds

Paste the real reminder wording from `templates/collections*` into `_draft` in `pipeline/engine.py`.

## 1:00 to 2:00 — Ask Maya

Use `docs/maya-questions.md`. Start with the top 4. Update the plan, config and worklog with her answers (especially the hold deadline and who sends reminders).

**Critic round 3 (scope lock)** happens here, before building anything new.

## 2:00 onwards — Real run

```bash
.venv/bin/python pipeline/run.py --data raw --no-ai --publish
```

Then with the AI judges (needs `GROQ_API_KEY`):

```bash
.venv/bin/python pipeline/run.py --data raw --publish
```

Check the app:

```bash
cd web && npm run dev
```

## Proof (morning)

1. Open `reports/labels_todo.csv`. For each of the 30 bills, read the evidence in the app and write the right verdict in `true_verdict` (send / hold / paid / call) plus a short note. Save it as `data/labels.csv`.
2. Re-run the pipeline. The Proof page now shows the accuracy and every case the tool got wrong.
3. Compare rules-only with AI judges on the same labels. Report both numbers.

## Before handing in

- `git status`: no files from `data/raw/` and no `.env` in the commit
- Open the Vercel link in a private window: it must load with no login
- Search the repo and the AI chats for anything private before uploading
