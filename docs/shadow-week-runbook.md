# Shadow week: each morning

Until the read-only connections exist, the tool runs on exports. One person owns each step.

| When | Who | What |
|---|---|---|
| By 7:45 | Dana Ruiz (QuickBooks, Stripe) and Sam Whitfield (Zendesk) | Export the AR aging, invoices, payments, Stripe payouts and tickets into `data/raw`, replacing the files of the same name. |
| 7:50 | The tool's builder, during the shadow week | Run `python pipeline/run.py --data raw --publish` and push. The site updates in about 40 seconds. |
| 8:00 | Priya Nair (Dana Ruiz when covering) | Open Today, compare each suggestion with her own call, and download the decision list into `data/history` before noon. |
| Next morning | The tool | Reads yesterday's list. A missed save is flagged in the morning message. Shadow-week rows are comparisons only, so nothing counts as sent or handed off. |

Known gaps, next to fix:

- The list doesn't yet record what Priya did herself. A reminder she sent by hand comes back the next morning, so the next column to add is "done by me".
- Calls aren't remembered yet.
- After the first live morning, bills that were just reminded wait as holds. They need their own "reminded, waiting" state.
- Before March, all of this runs on its own: saved automatically in Ledgerline's AWS, with no manual export or push.
