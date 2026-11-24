import raw from "@/data/results.json";
import type { Cause, Confidence, Invoice, Results, Tone, Verdict } from "@/lib/types";

// The pipeline writes src/data/results.json; every page reads it at build time.
export const results = raw as unknown as Results;

export const VERDICTS: Verdict[] = ["send", "hold", "paid", "call"];

export const VERDICT_META: Record<
  Verdict,
  { label: string; short: string; description: string; badge: string; dot: string; chart: string }
> = {
  send: {
    label: "Send reminder",
    short: "Send",
    description: "Nothing is blocking: a reminder email can go out today.",
    badge:
      "bg-send-soft text-send-ink ring-send/35",
    dot: "bg-send",
    chart: "var(--verdict-send)",
  },
  hold: {
    label: "Hold",
    short: "Hold",
    description: "Pause and hand to the owner. Don't chase until they act, by a deadline.",
    badge:
      "bg-hold-soft text-hold-ink ring-hold/45",
    dot: "bg-hold",
    chart: "var(--verdict-hold)",
  },
  paid: {
    label: "Probably paid",
    short: "Paid?",
    description: "A payment seems to cover it. Check the payment and close the bill. No reminder.",
    badge:
      "bg-paid-soft text-paid-ink ring-paid/35",
    dot: "bg-paid",
    chart: "var(--verdict-paid)",
  },
  call: {
    label: "Call them",
    short: "Call",
    description: "Too late, too large or too unclear for an email. A person calls.",
    badge:
      "bg-call-soft text-call-ink ring-call/35",
    dot: "bg-call",
    chart: "var(--verdict-call)",
  },
};

export const CAUSE_META: Record<Cause, { label: string; color: string; description: string }> = {
  simply_late: {
    label: "Simply late",
    color: "var(--cause-simply-late)",
    description: "No sign of a problem. A reminder or a call should do it.",
  },
  unhappy: {
    label: "Unhappy customer",
    color: "var(--cause-unhappy)",
    description: "An open complaint or escalation. Fix that first.",
  },
  wrong_bill: {
    label: "Customer disputes the bill",
    color: "var(--cause-wrong-bill)",
    description: "The customer says this bill is wrong, often in a ticket Zendesk marks solved. Correct it or answer them before asking for money.",
  },
  paid: {
    label: "Probably already paid",
    color: "var(--cause-paid)",
    description: "Money arrived but wasn't matched to the bill.",
  },
  card_failed: {
    label: "Card payment failed",
    color: "var(--cause-card-failed)",
    description: "The card on file failed. Ask for a new card, not for payment.",
  },
};

// Shown on a bill only when it matters: a clear answer needs no label.
export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: "Sure",
  medium: "Fairly sure",
  low: "Check first",
};

export const TONE_LABEL: Record<Tone, string> = {
  standard: "Standard",
  soft: "Softer tone",
  card_update: "Card update",
  none: "No message",
};

export function formatMoney(value: number, currency = "USD", compact = false): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: compact || Number.isInteger(value) ? 0 : 2,
      notation: compact ? "compact" : "standard",
    }).format(value);
  } catch {
    return `$${Math.round(value).toLocaleString("en-US")}`;
  }
}

export function formatPercent(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

// Dates in the data are ISO strings ("2026-10-31"). Parse them as UTC so the day never shifts.
function parseIsoDate(iso: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(iso?: string | null, withYear = true): string {
  if (!iso) return "—";
  const d = parseIsoDate(iso);
  if (!d) return iso;
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(d);
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = parseIsoDate(iso);
  if (!d) return iso;
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(d);
}

export function formatMonth(month: string): string {
  const d = parseIsoDate(`${month}-01`);
  if (!d) return month;
  // "Dec ’25", not "Dec 25", which reads as a day of the month.
  const mon = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(d);
  return `${mon} ’${String(d.getUTCFullYear()).slice(2)}`;
}

// Whole days from a to b (both ISO dates). Positive when b is later.
export function daysBetween(a: string, b: string): number | null {
  const da = parseIsoDate(a);
  const db = parseIsoDate(b);
  if (!da || !db) return null;
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}

export function invoiceById(id: string): Invoice | undefined {
  return results.invoices.find((inv) => inv.id === id);
}

export function customerHref(id: string): string {
  return `/customers/${encodeURIComponent(id)}`;
}

// ---------------------------------------------------------------------------------------------
// Plain words. One glossary, used everywhere, so the same idea always has the same name.
export const GLOSSARY: { term: string; meaning: string }[] = [
  { term: "What to do", meaning: "The tool's suggestion for each bill: send a reminder, hold, probably paid, or call them. A person approves it." },
  { term: "Send reminder", meaning: VERDICT_META.send.description },
  { term: "Hold", meaning: VERDICT_META.hold.description },
  { term: "Probably paid", meaning: VERDICT_META.paid.description },
  { term: "Call them", meaning: VERDICT_META.call.description },
  { term: "Why it's overdue", meaning: "The reason behind the late bill: simply late, unhappy customer, already paid, wrong bill or failed card." },
  { term: "Check first", meaning: "The tool isn't sure: the AI wasn't sure what a ticket means, a payment could belong to more than one bill, or the customer match is weak. A person decides these before anything else." },
  { term: "AI double-check", meaning: "Two different AI models read each ticket on their own. If they disagree, the AI wasn't sure, and nobody is chased until a person reads it." },
  { term: "Proof", meaning: "The records behind a suggestion: the ticket, payment or contract, with the file and row it came from." },
  { term: "Don't chase today", meaning: "Money we would have chased by mistake: bills that look paid, customers with an open complaint or a chargeback threat, and bills the customer disputes." },
  { term: "Chase today", meaning: "Bills with nothing blocking them: reminders to send and customers to call." },
  { term: "Decision", meaning: "One click by a person: each bill to check first, plus one click to approve each step. The tool never acts on its own." },
];

export const MATCH_METHOD_LABEL: Record<string, string> = {
  exact_id: "Same customer ID",
  exact_name: "Same name",
  fuzzy: "Close spelling",
  ai: "AI checks agreed",
  unmatched: "No match: a person checks",
};

export const VOTE_LABEL: Record<string, string> = {
  billing_complaint: "Billing complaint",
  serious_escalation: "Serious escalation",
  other_complaint: "Other complaint",
  not_a_complaint: "Not a complaint",
  disagree: "Disagree",
  unclear: "Unclear",
  yes: "Same customer",
  no: "Different customer",
};

export function judgeLabel(judge: string): string {
  return judge === "rules" ? "Keyword rules" : judge;
}

export const AGE_BUCKETS = ["1-30", "31-60", "61-90", "90+"] as const;

const DEFINITE_HOLD = /^(Open billing complaint|Serious open escalation|The bill doesn.t match)/;

// A hold that exists only because the AI wasn't sure what a ticket means (its two checks
// disagreed). These are "not sure yet", not "found a problem", so they are kept out of
// the "don't chase today" total.
const UNSURE = /AI wasn.t sure|judges disagreed|checks disagreed/i;
export function isUnsureHold(inv: Invoice): boolean {
  return inv.verdict === "hold" && inv.reasons.some((r) => UNSURE.test(r.text)) && !inv.reasons.some((r) => DEFINITE_HOLD.test(r.text));
}

export function sumAmount(list: Invoice[]): number {
  return list.reduce((s, i) => s + i.amount, 0);
}

export function moneyStats(invoices: Invoice[]) {
  const by = (v: Verdict) => invoices.filter((i) => i.verdict === v);
  const unsure = invoices.filter(isUnsureHold);
  const paid = sumAmount(by("paid"));
  const hold = sumAmount(by("hold"));
  const unsureAmount = sumAmount(unsure);
  return {
    overdue: sumAmount(invoices),
    count: invoices.length,
    dontChase: paid + hold - unsureAmount,
    dontChaseCount: by("paid").length + by("hold").length - unsure.length,
    unsureAmount,
    unsureCount: unsure.length,
    chase: sumAmount(by("send")) + sumAmount(by("call")),
    chaseCount: by("send").length + by("call").length,
    byVerdict: Object.fromEntries(VERDICTS.map((v) => [v, { amount: sumAmount(by(v)), count: by(v).length }])) as Record<
      Verdict,
      { amount: number; count: number }
    >,
    checkFirst: invoices.filter((i) => i.needsReview).length,
  };
}

export function pluralize(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
}
