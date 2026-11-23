# Video script (5 to 10 minutes, aim for about 9)

Every [X] is filled from Ledgerline's data after Begin. Practise the first 60 seconds once out loud before recording. Speak to Maya, as if this is your first week.

## The first 60 seconds (word for word)

> **On screen: the Today screen, with the headline number big at the top.**
>
> "$[X] of Ledgerline's overdue invoices are sitting with customers we shouldn't be chasing today.
>
> [X] of them have an open billing complaint. [X] look like they've already paid us, but the payment never got linked to the invoice. And [X] were billed differently from what the contract says.
>
> Right now, nobody in finance can see that, because the invoices live in QuickBooks, the payments come from the bank, the complaints are in the support desk, and the contracts are somewhere else.
>
> **On screen: switch to the list of verdicts.**
>
> So I built a collections check. Every morning it looks at each overdue invoice and says one of four things: send the reminder, hold it, it's probably paid, or call them. It gives the reason and shows the evidence. A person approves everything before anything reaches a customer.
>
> In the next eight minutes I'll show you how it works on your data, how I know it's right, where it gets things wrong, and what I'd buy instead of build."

(About 150 words, roughly 60 seconds at a calm pace. After Begin, check the system names against `tool_stack.md` and fix them in the script.)

## Full outline

| # | Time | Part | What to say | On screen |
|---|---|---|---|---|
| 1 | 0:00 | **Headline** | The number, the three causes, the four verdicts (script above) | Today screen, headline card |
| 2 | 1:00 | **The problem** | Four systems, no shared view. Who chases today and how long it takes (Maya's answer). What happens when a customer with an open complaint gets a reminder | A simple diagram: invoices, payments, tickets, contracts, with a wall between them |
| 3 | 2:00 | **Live demo** | Walk the morning: the list, "approve all Send", then open **one real Hold case** from their tickets. Read the ticket line that triggered it and the policy section it cites | Today screen, then Customer detail for the Hold case |
| 4 | 4:00 | **Why overdue** | Overdue dollars split by cause. The trend around the March billing rewrite, only if the data shows it. What this tells Maya to fix | Why overdue screen |
| 5 | 5:15 | **Judgment** | What the AI does vs what a person does. Two judges, and disagreement goes to a person. The hold clock. The ladder for trusting the AI more, and what never goes automatic | Customer detail (agreement votes), then the one-pager table |
| 6 | 6:30 | **Proof** | Match rate, accuracy on the hand-checked sample, numbers verified two ways. Then **one case it got wrong, and why**. What we don't claim yet (cash X days sooner) | Proof screen |
| 7 | 7:45 | **Build vs buy** | Reminders, card retries and payment matching: buy, starting with what they already pay for. The judgment: build. The "why overdue" view decides what to buy next | build-vs-buy summary |
| 8 | 8:30 | **Next steps and close** | What I'd do in week one: run it alongside the team for 4 weeks and track overrides. The morning summary they'd get tomorrow. One-line close | Morning summary screen |

## Recording checklist

- Close email, Slack and notifications. Hide the bookmarks bar.
- Never show `.env` files, the Vercel environment variables page, or the Groq console.
- Browser zoom at 110 to 125% so text is readable.
- Start on the Today screen, already loaded.
- One take per part is fine. Join them afterwards if needed.
- Watch it back once at normal speed before handing in.
