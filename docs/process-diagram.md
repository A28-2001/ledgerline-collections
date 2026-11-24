# The process: Ledgerline collections (FIN-1)

**One process:** "Should we chase this invoice today?" Ledgerline's FIN-1 Collections, owned by Priya Nair (AR Specialist). It touches two neighbouring processes only where collections needs them: FIN-2 cash application (Marcus Bell matches payments) and FIN-6 billing errors (disputed bills are corrected before anyone asks for money).

The same diagram is live in the app on the "How it works" page, with today's counts.

## Every morning, for each overdue bill

```mermaid
flowchart TD
  S["Read-only sources: QuickBooks AR aging (54 overdue bills), bank and Stripe (7 unmatched payments), Zendesk (1,041 tickets, masked), contracts and contacts"] --> Q1
  Q1{"1. Already paid?<br/>An unmatched payment matches the bill"} -- yes --> P["Probably paid (5)<br/>Marcus matches it in 2 working days, Priya copied"]
  Q1 -- no --> Q2{"2. A reason not to talk about money?<br/>Dispute, open ticket, chargeback or regulator threat, refund owed"}
  Q2 -- yes --> H["Hold (20)<br/>Priya fixes disputes in 5 working days;<br/>account managers have 3 days on open tickets"]
  Q2 -- no --> Q3{"3. Under 7 days late?<br/>Policy: first reminder at day 7"}
  Q3 -- yes --> W["Wait (1)<br/>Back on the list on day 7"]
  Q3 -- no --> Q4{"4. 45+ days late, or already calling them?<br/>One conversation per customer"}
  Q4 -- yes --> C["Call (9)<br/>Priya reads the customer's tickets first"]
  Q4 -- no --> R["Send a reminder (19)<br/>Priya approves; in the shadow week she only compares"]
```

**Always a person:** top-50 accounts, disputed or probably-paid bills, anything firmer than a friendly nudge, and every phone call. Nothing is sent without a person.

## Ledgerline's FIN-1 today vs with the tool

| Step today (processes.md) | With the tool |
|---|---|
| 1. Export the AR aging report from QuickBooks | Read-only connection; export upload as the fallback |
| 2. Check each overdue account for a dispute or escalation by asking around | Reads tickets: 14 disputed bills found; account managers get one Slack DM a day (3 to 4 of the team's 16 hours a week, COO's estimate) |
| 3. Write reminder emails by hand from saved templates | Drafts from Ledgerline's own templates, without the 45-day suspension threat; after the shadow week, each approved reminder opens in Priya's own mailbox |
| 4. Phone the largest overdue accounts | Call list, with "read before you call" tickets beside each call |
| 5. Agree payment plans | Not built: plans need the VP Finance's approval. Next step |
| 6. Escalate stuck accounts to the VP Finance | 90-day escalation, warnings before automatic write-offs, corrections over $2,500 |

| FIN-1 pain (processes.md) | Answer |
|---|---|
| Reminders go out late and inconsistently | One morning list, rebuilt from the data every day |
| Customers with an open complaint get chased | Holds: disputes, open tickets, threats. "Would chase someone with a complaint open": 0 |
| Failed card payments are rarely followed up | Priya owns them; Dana is warned before automatic write-offs |

## How it fits Priya's process

```mermaid
flowchart LR
  subgraph T["FIN-1 today, by hand (16 hours a week)"]
    direction TB
    t1["Export the AR aging report"] --> t2["Ask around on Slack:<br/>is there a dispute?"]
    t2 --> t3["Write reminders from saved templates"]
    t3 --> t4["Phone the largest accounts"]
  end
  subgraph N["With the tool, every morning"]
    direction TB
    n1["Reads bills, payments and tickets<br/>(read-only)"] --> n2["11 decisions: Check first,<br/>then Paid, Hold, Send, Call"]
    n2 --> n3["14 disputes, oldest first:<br/>the day's work"]
    n3 --> n4["Shadow week: Priya compares,<br/>nothing goes out"]
    n4 --> n5["Save the list:<br/>tomorrow remembers"]
  end
  t2 -.->|"replaced: the tool reads the tickets"| n1
```

## How it was built, with Maya

```mermaid
flowchart LR
  a["Read the data room<br/>51 files"] --> b["Find the real problem<br/>$309,000 disputed"]
  b --> c["Ask Maya<br/>12 rounds of questions"]
  c --> d["Build the rules<br/>and the app"]
  d --> e["Independent AI review<br/>46 of 54 agree"]
  e --> f["Fix every miss<br/>52 of 54 agree"]
  f --> g["Design reviews,<br/>Maya confirms 3 rules"]
  g --> h["Monday:<br/>shadow week"]
```
