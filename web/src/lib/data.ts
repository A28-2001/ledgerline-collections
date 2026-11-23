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
    description: "Safe to send the reminder today.",
    badge:
      "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-400/30",
    dot: "bg-blue-500",
    chart: "var(--verdict-send)",
  },
  hold: {
    label: "Hold",
    short: "Hold",
    description: "Don't chase yet. Someone owns the next step, with a deadline.",
    badge:
      "bg-amber-50 text-amber-800 ring-amber-600/25 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/30",
    dot: "bg-amber-500",
    chart: "var(--verdict-hold)",
  },
  paid: {
    label: "Probably paid",
    short: "Paid?",
    description: "A payment seems to cover it. Confirm and close it.",
    badge:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/30",
    dot: "bg-emerald-500",
    chart: "var(--verdict-paid)",
  },
  call: {
    label: "Call",
    short: "Call",
    description: "Too big or too late for an email. A person calls.",
    badge:
      "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-400/10 dark:text-violet-300 dark:ring-violet-400/30",
    dot: "bg-violet-500",
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
    label: "Bill doesn't match contract",
    color: "var(--cause-wrong-bill)",
    description: "The bill disagrees with the contract. Fix the bill first.",
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

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};

export const TONE_LABEL: Record<Tone, string> = {
  standard: "Standard",
  soft: "Softer tone",
  card_update: "Card update",
  none: "Call notes",
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
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit", timeZone: "UTC" }).format(d);
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
