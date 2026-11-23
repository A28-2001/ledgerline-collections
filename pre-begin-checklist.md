# Pre-Begin checklist: Scaleworks AI Operator Challenge

Everything to have ready before pressing **Begin day one**, so the 24 hours go into the real data, the proof and the polish.

- **Score:** how ready each item is today, out of 10.
- **"New":** something we hadn't discussed before this checklist.
- Mac checks were run on 2026-11-23.

**Overall readiness: about 7.5 / 10** (updated 4:40 pm Monday). The tool is built and tested on sample data with the real AI judges. Left before Begin: first commit, the GitHub repo, the Vercel deploy test, and critic round 2.

## Timeline (Monday 23 Nov to Tuesday 24 Nov, CST)

| Time | What happens | Critic round |
|---|---|---|
| Now to about 4:30 pm | I build the generic starter kit and templates. You: Groq key, Vercel sign-in, 1-minute recording test, workspace | |
| About 5:15 pm | Review the built tool's look and speed | **Round 2: starter kit** |
| About 6:00 pm | **Press Begin.** The clock ends about 6 pm Tuesday | |
| 5:00 to 7:00 pm | Hour 1: read and run data checks. Hour 2: ask Maya | **Round 3: scope lock**, before any building |
| 7:00 pm to midnight | Build v1 end to end on real data | **Round 4: v1 works** |
| Midnight to 7:00 am | Sleep | |
| 7:00 to 10:00 am | v2, then proof: accuracy, match rate, failure cases | **Round 5: evidence** |
| 10:00 am to 12:00 pm | Polish, v3 if there's time, one-pager | |
| 12:00 to 1:30 pm | Record the video, test in a private window | **Round 6: full hand-in** |
| By about 2:30 pm | Fixes from round 6, then submit (about 21.5 hours after Begin) | |

Every critic round: score against the scorecard, the top 3 fixes, and a go / fix-first call. Target 8.5 to 9.5. You can also call a round at any time.

---

## A. Accounts and keys

| # | Item | Score | To reach 10 | Who | New |
|---|---|---|---|---|---|
| 1 | Scaleworks challenge login | 10 | Done. If the link stops working, log in at apply.scaleworks.com/login | Done | |
| 2 | Groq API key | 9 | New key works. Judges switched to models this key offers: gpt-oss-20b and Qwen 3.8 (two model families); drafts use gpt-oss-120b. Run the pipeline from the Terminal tab, which has the new key | Done | |
| 3 | Backup AI key | 2 | A second provider's key, in case Groq misreads tickets or hits its limits. The Anthropic library is already installed | You | New |
| 4 | GitHub | 9 | Local repo created in `Claude/Projects/ledgerline-collections`. Creating the GitHub repo (public, code only) waits for your OK | You (OK), me | |
| 5 | Vercel account | 7 | You already have an account. Sign in; I connect the repo and add the Groq key as an environment variable | You (sign-in), me (setup) | New |

## B. Your Mac

| # | Item | Score | To reach 10 | Who | New |
|---|---|---|---|---|---|
| 6 | Node.js | 8 | v23.10 works for Next.js. Switch to a long-term-support version only if builds act up | | New |
| 7 | Python | 10 | Done: a project environment (`.venv`) with pandas, rapidfuzz, pyyaml and groq | Done | New |
| 8 | Code editor | 10 | VS Code is installed | Done | New |
| 9 | Screen recorder | 5 | QuickTime is available; Loom isn't installed. Record a 1-minute test with your mic, then choose QuickTime (a file) or Loom (a link) | You | |

## C. Generic starter kit (built before Begin, nothing about Ledgerline, disclosed)

| # | Item | Score | To reach 10 | Who | New |
|---|---|---|---|---|---|
| 10 | Next.js web app | 8 | Done: all 5 screens working on the pipeline's output, dark mode, phone layout, approve-all, CSV export, AI redraft route. Builds cleanly. Polish in round 2 | Done | |
| 11 | Python pipeline | 9 | Done and tested on sample data: verdicts, reasons, evidence, policy refs, hold clock, drafts, trend, verified numbers, accuracy. 97.8% on planted answers with rules only, 100% with (fake) AI judges | Done | |
| 12 | Name matcher | 9 | Done: exact id → exact name → fuzzy → two AI judges. 98.5% on sample. The AI step needs a real key to test | Me (after key) | |
| 13 | Data profiler + plan-vs-data check | 10 | Done: `profile.py` suggests the column mapping; `plan_check.py` tests 12 plan assumptions and lists surprises | Done | New |
| 14 | Deploy test | 2 | Waits for the GitHub repo (your OK) and your Vercel sign-in | Me + you | |

## D. Hand-in prep

| # | Item | Score | To reach 10 | Who | New |
|---|---|---|---|---|---|
| 15 | One-page template | 8 | Done in `docs/one-pager.md`; fill the [X]s after Begin | Done | |
| 16 | Video outline | 8 | `docs/video-script.md`: first 60 seconds word for word. Practise once | You (practise) | |
| 17 | Capturing your AI chats | 7 | `ai-chats/README.md` explains export and naming. You export at the end, then redact private details | You (export at end) | |
| 18 | Worklog | 8 | `docs/worklog.md`, with today's decisions filled in | Done | |
| 19 | Disclosure note | 9 | `docs/disclosure.md` | Done | |
| 20 | Where the data goes | 5 | Recommended: a public repo with the code, the raw data room files left out (.gitignore), only the computed results the app needs, and a README saying "put the data room files in data/raw and run one command". If unsure, ask in the optional email | You decide | New |
| 21 | How the video gets to them | 0 | Check the hand-in form after Begin; have an unlisted YouTube, Loom or Drive link ready as an option | You | New |

## E. Content

| # | Item | Score | To reach 10 | Who | New |
|---|---|---|---|---|---|
| 22 | Plan v2 | 8 | Done. Update with real numbers after hour 1 | Me | |
| 23 | Questions for Maya | 9 | `docs/maya-questions.md`: top 4, then 4 backups, each with what changes depending on her answer | Done | |
| 24 | Hour-1 data checks | 8 | Listed. Have the profiler (#13) ready so they run fast | Me | |
| 25 | Build-vs-buy research | 8 | `docs/build-vs-buy.md`: 11 real products with sources. None found that reads support tickets before chasing; Chargebee Receivables is the closest | Done | |
| 26 | Critic scorecard | 9 | Done. Target 8.5–9.5 every round | Done | |
| 27 | Interface choice | 10 | Yes to Next.js + shadcn/ui. Streamlit stays as backup | Done | |
| 28 | Reusing Store Copilot / Yardstick | 9 | Found on your Mac. Reuse Yardstick's agreement check and Store Copilot's verified numbers and cited policies (see plan v2) | Me | |

## F. Logistics

| # | Item | Score | To reach 10 | Who | New |
|---|---|---|---|---|---|
| 29 | Start day and time | 9 | Today. Begin at about 5 pm once the starter kit passes round 2; submit by about 2:30 pm Tuesday | You | |
| 30 | Invitation deadline | 8 | Not stated, but you're starting today, so it no longer matters | Done | |
| 31 | Sleep and breaks | 8 | Sleep from midnight to 7 am, inside the clock (see timeline) | You | New |
| 32 | Workspace | 0 | Quiet place, charger, backup internet (phone hotspot), notifications off | You | New |
| 33 | Questions to Scaleworks before Begin | 0 | Optional, decision later: one short email to ai@apply.scaleworks.com about data in the repo and the video format. I draft; you decide whether to send | Me (draft), you (send) | New |

---

## Only you can do these

- Confirm the Groq key (#2), and optionally a backup key (#3)
- Create a Vercel account (#5)
- Record a 1-minute test (#9)
- Decide the repo and data question (#20)
- Say yes to Next.js (#27)
- Tell me about Store Copilot / Yardstick (#28)
- Pick the start day, sleep plan and workspace (#29, #31, #32)
- Decide whether to send the pre-Begin email (#33)

## I can do these once you say go

Starter kit and deploy test (#10–14), templates for the one-pager, worklog and disclosure (#15, #18, #19), video intro draft (#16), chat-capture folder (#17), top-4 Maya questions (#23), build-vs-buy research (#25), and the draft email (#33).
