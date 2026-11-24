// One customer's story in date order: contracts, bills issued and due, payments, tickets, and today's suggestion.
// Built only from results.json, so it works on any data set. For holds, probably-paid bills and calls, the records
// cited by the bill's first reason are marked ("Why it's on hold", ...). Reminders are not marked: their first
// reason cites every ticket it checked and found not blocking, which is not a reason to look at them.
import { answerLine, shortDate } from "@/lib/bill-text";
import { formatMoney } from "@/lib/data";
import type { Customer, Evidence, Invoice, Verdict } from "@/lib/types";

export type TimelineTone = "neutral" | "send" | "hold" | "paid" | "call" | "alert";

export interface TimelineEvent {
  key: string;
  date: string; // ISO date
  kind: "contract" | "bill" | "payment" | "unmatched" | "card_failed" | "ticket" | "today";
  title: string;
  note?: string;
  tone: TimelineTone;
  citedAs?: string; // set when the bill's first reason cites this record
}

const CITE_LABEL: Partial<Record<Verdict, string>> = {
  hold: "Why it's on hold",
  paid: "Why it's probably paid",
  call: "Read before you call",
};

type Cited = Map<string, string>;

function citedBy(invoices: { inv: Invoice; verdict: Verdict }[]): Cited {
  const m: Cited = new Map();
  for (const { inv, verdict } of invoices) {
    const label = CITE_LABEL[verdict];
    if (!label) continue;
    for (const id of inv.reasons[0]?.evidenceIds ?? []) if (!m.has(id)) m.set(id, label);
  }
  return m;
}

const ORDER: Record<TimelineEvent["kind"], number> = {
  contract: 0,
  bill: 1,
  ticket: 2,
  payment: 3,
  unmatched: 4,
  card_failed: 5,
  today: 6,
};

const MONEY = /^\$[\d,.]+/;

function ticketEvent(e: Evidence, cited: Cited): TimelineEvent {
  const status = (e.status ?? "").trim();
  const blocking = /^(open|pending|new|hold)$/i.test(status);
  return {
    key: e.id,
    date: e.date ?? "",
    kind: "ticket",
    title: `Ticket: “${e.title}”`,
    note: status ? (/^(solved|closed|resolved)$/i.test(status) ? `${status} in Zendesk` : status) : undefined,
    tone: blocking ? "hold" : "neutral",
    citedAs: cited.get(e.id),
  };
}

function paymentEvent(e: Evidence, cited: Cited): TimelineEvent {
  const amount = e.title.match(MONEY)?.[0];
  const forBill = e.title.match(/for invoice (\S+)/i)?.[1];
  const unmatched = /not linked|received on/i.test(e.title) || (e.status ?? "").toLowerCase() === "succeeded";
  if (unmatched) {
    return {
      key: e.id,
      date: e.date ?? "",
      kind: "unmatched",
      title: amount ? `${amount} received, not matched to a bill` : "Payment received, not matched to a bill",
      tone: "paid",
      citedAs: cited.get(e.id),
    };
  }
  return {
    key: e.id,
    date: e.date ?? "",
    kind: "payment",
    title: amount && forBill ? `Paid ${amount} for ${forBill}` : e.title,
    tone: "neutral",
    citedAs: cited.get(e.id),
  };
}

function contractEvent(e: Evidence, cited: Cited, key: string): TimelineEvent {
  return {
    key,
    date: e.date ?? "",
    kind: "contract",
    title: `Contract: ${e.title.replace(/^Contract:\s*/i, "")}`,
    tone: "neutral",
    citedAs: cited.get(e.id),
  };
}

function billEvents(inv: Invoice): TimelineEvent[] {
  const amount = formatMoney(inv.amount, inv.currency);
  if (inv.issueDate === inv.dueDate) {
    return [{ key: `bill:${inv.id}`, date: inv.issueDate, kind: "bill", title: `${inv.id} issued and due, ${amount}`, note: "card bill, charged on the day", tone: "neutral" }];
  }
  return [
    { key: `bill:${inv.id}`, date: inv.issueDate, kind: "bill", title: `${inv.id} issued, ${amount}`, tone: "neutral" },
    { key: `due:${inv.id}`, date: inv.dueDate, kind: "bill", title: `${inv.id} due`, tone: "neutral" },
  ];
}

function failedCardEvents(inv: Invoice, cited: Cited): TimelineEvent[] {
  return inv.evidence
    .filter((e) => (e.kind === "invoice" || e.kind === "payment") && /fail/i.test(e.status ?? ""))
    .map((e) => ({ key: `${e.id}:failed`, date: e.date ?? inv.dueDate, kind: "card_failed" as const, title: e.title, tone: "alert" as const, citedAs: cited.get(e.id) }));
}

function todayEvent(inv: Invoice, verdict: Verdict, asOf: string, withId: boolean): TimelineEvent {
  return {
    key: `today:${inv.id}`,
    date: asOf,
    kind: "today",
    title: `${withId ? `${inv.id}: ` : ""}${answerLine(inv, verdict)}`,
    note: `Today (${shortDate(asOf)})`,
    tone: verdict,
  };
}

function sortEvents(events: TimelineEvent[]): TimelineEvent[] {
  return events
    .filter((e) => e.date)
    .sort((a, b) => a.date.localeCompare(b.date) || ORDER[a.kind] - ORDER[b.kind]);
}

// The bill panel: this bill and the records linked to it.
export function invoiceTimeline(inv: Invoice, verdict: Verdict, asOf: string): TimelineEvent[] {
  const cited = citedBy([{ inv, verdict }]);
  const events: TimelineEvent[] = [...billEvents(inv), ...failedCardEvents(inv, cited)];
  for (const e of inv.evidence) {
    if (e.kind === "ticket") events.push(ticketEvent(e, cited));
    else if (e.kind === "payment" && !/fail/i.test(e.status ?? "")) events.push(paymentEvent(e, cited));
    else if (e.kind === "contract") events.push(contractEvent(e, cited, e.id));
  }
  return [...sortEvents(events), todayEvent(inv, verdict, asOf, false)];
}

// The customer page: the whole history on file, plus today's suggestion for each overdue bill.
export function customerTimeline(customer: Customer, invoices: Invoice[], asOf: string): TimelineEvent[] {
  const cited = citedBy(invoices.map((inv) => ({ inv, verdict: inv.verdict })));
  const events: TimelineEvent[] = [];
  customer.contracts.forEach((e, idx) => events.push(contractEvent(e, cited, `${e.id}:${idx}`)));
  customer.payments.forEach((e) => events.push(paymentEvent(e, cited)));
  customer.tickets.forEach((e) => events.push(ticketEvent(e, cited)));
  for (const inv of invoices) {
    events.push(...billEvents(inv), ...failedCardEvents(inv, cited));
  }
  const seen = new Set<string>();
  const unique = events.filter((e) => (seen.has(e.key) ? false : (seen.add(e.key), true)));
  return [...sortEvents(unique), ...invoices.map((inv) => todayEvent(inv, inv.verdict, asOf, invoices.length > 1))];
}
