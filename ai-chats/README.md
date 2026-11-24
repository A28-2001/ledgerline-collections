# AI conversations

The hand-in asks for **all AI conversations**. Every one goes in this folder, including the prep before Begin.

## Naming

`NN_tool_what_YYYY-MM-DD.ext`, for example:

- `01_claude-code_prep-and-plan_2026-11-23.jsonl`
- `02_claude-code_build-v1_2026-11-23.jsonl`
- `03_groq_tool-prompts_2026-11-24.json`

Number them in the order they happened, so a reviewer can read them as a story.

## How to export

- **Claude Code (desktop app or terminal):** each session is saved on your Mac as a `.jsonl` file under `~/.claude/projects/`, in a folder named after the project path. Copy the file here. You can also ask Claude in the session to export the transcript.
- **Claude.ai chats (browser or app):** use Share to create a link, or copy the conversation into a `.md` file. A share link can be opened by anyone who has it, so a `.md` copy is safer.
- **The tool's own AI calls (Groq):** the pipeline caches every prompt and answer. Copy that log here at the end. It shows exactly what the AI was asked.
- **Anything else** (ChatGPT, another assistant): export or copy it as text. If it was used, it goes in.

## Before handing in: privacy check

Search every file for these and replace them with `[redacted]`, noting in this README that you did:

- Names of people who aren't part of the challenge (for example, anyone who referred you)
- Email addresses and phone numbers
- API keys or tokens (search for `gsk_`, `sk-`, `key`)

The fictional Ledgerline people (Maya, Dana, Tom, Sam, Renata) can stay.

## List

The redacted exports are uploaded with the hand-in form rather than kept in this repo. Each file says what was left out: tool output, file contents, and private details such as names, email addresses and keys.

| # | File | Tool | What happened | Before or after Begin |
|---|---|---|---|---|
| 01 | `01-claude-code-session-2026-11-23.md` | Claude Code | One session from start to hand-in. It covers the prep (reading the challenge, picking the process, the plan), the build, Maya's questions, the review rounds and every fix. It started in a temporary folder and moved into this project at about 4:10 pm on 23 Nov. | Both (Begin is marked in the git history) |
| 02 | `02-subagents.md` | Claude Code | The independent reviews and helpers that session started: the blind review of all 54 bills, the critic rounds, the voice-note changes and the export. Each has its task and its final report. | After |
| 03 | (inside 01) | Groq | AI reading masked tickets, in testing only. The prompts and answers are cached in `data/cache/ai_cache.json`, and `pipeline/measure_ai.py` replays them without calling the API. | After |
