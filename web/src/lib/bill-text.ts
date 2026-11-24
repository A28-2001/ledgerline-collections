// Plain-words text for one bill: what makes this bill different from the others in its step,
// why the tool isn't sure about it, and the one record that proves the suggestion.
// Everything is read from the bill's own reasons and evidence, so it works on any data set.
import { formatDate, formatMoney } from "@/lib/data";
import type { Evidence, Invoice, Verdict } from "@/lib/types";

const CLOSED = /^(closed|resolved|solved)$/i;

const lowerFirst = (t: string) => (/^[A-Z][a-z]/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t);

// "2026-10-21" -> "Oct 21" (parsed as UTC, so the day never shifts).
export function shortDate(iso?: string | null): string {
  return iso ? formatDate(iso, false) : "—";
}

function shortenDates(text: string): string {
  return text.replace(/\bon (\d{4}-\d{2}-\d{2})\b/g, (_, d: string) => shortDate(d)).replace(/\b(\d{4}-\d{2}-\d{2})\b/g, (d) => shortDate(d));
}

function openTicket(inv: Invoice): Evidence | undefined {
  const cited = new Set(inv.reasons.flatMap((r) => r.evidenceIds));
  const tickets = inv.evidence.filter((e) => e.kind === "ticket" && !CLOSED.test(e.status ?? ""));
  return tickets.find((e) => cited.has(e.id)) ?? tickets[0];
}

function paymentProof(inv: Invoice, status: "succeeded" | "failed"): Evidence | undefined {
  return inv.evidence.find((e) => e.kind === "payment" && (e.status ?? "").toLowerCase() === status);
}

function contractMismatch(inv: Invoice): string | null {
  for (const r of inv.reasons) {
    const m = r.text.match(/doesn.t match the contract: (.+?)\. Fix/i);
    if (m) return m[1];
  }
  return null;
}

function callWhy(inv: Invoice): string {
  const parts: string[] = [];
  if (inv.reasons.some((r) => /isn.t in the billing system/i.test(r.text))) parts.push("Not in the billing system");
  if (inv.reasons.some((r) => /couldn.t confirm who/i.test(r.text))) parts.push("Customer not found");
  if (inv.reasons.some((r) => /large bill/i.test(r.text))) parts.push(`${formatMoney(inv.amount, inv.currency, true)} bill`);
  if (parts.length === 0 || inv.reasons.some((r) => /days overdue/i.test(r.text))) parts.unshift(`${inv.daysOverdue} days late`);
  return [...new Set(parts)].join(" · ");
}

// One line under the customer name in a step: what is different about this bill.
export function rowDetail(inv: Invoice, verdict: Verdict): string {
  switch (verdict) {
    case "paid": {
      const p = paymentProof(inv, "succeeded");
      // The row already shows the amount, so lead with when and from whom.
      return p ? shortenDates(p.title).replace(/^\$[\d,.]+ received/i, "Received") : "A payment seems to cover it";
    }
    case "hold": {
      const who = inv.hold ? `${inv.hold.owner} · by ${shortDate(inv.hold.deadline)}` : "";
      const mismatch = inv.cause === "wrong_bill" ? contractMismatch(inv) : null;
      const t = openTicket(inv);
      const what = mismatch ? mismatch.charAt(0).toUpperCase() + mismatch.slice(1) : t ? `“${t.title}”` : "";
      return [who, what].filter(Boolean).join(" · ") || inv.headline;
    }
    case "send": {
      const tone = inv.draft?.tone;
      if (tone === "card_update") return "Card failed: update-card note";
      if (tone === "soft") return "Softer tone: open product complaint";
      return inv.reminderStage ?? "Reminder";
    }
    case "call": {
      // Maya: any ticket from the customer sits next to the call, named invoice or not.
      const tickets = inv.evidence.filter((e) => e.kind === "ticket");
      const latest = [...tickets].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))[0];
      return latest ? `${callWhy(inv)} · Read first: \u201c${latest.title}\u201d` : callWhy(inv);
    }
  }
}

// Why the tool wants a person to look first, in plain words.
export function plainReview(inv: Invoice): string {
  const raw = (inv.reviewReason ?? "").split(/;\s*/).filter(Boolean);
  if (raw.length === 0) return "The tool isn't sure about this one.";
  const out = raw.map((r) => {
    let m: RegExpMatchArray | null;
    if (/AI wasn.t sure/i.test(r)) {
      const t = openTicket(inv);
      return t ? `The AI wasn't sure what this open ticket means: “${t.title}”` : "The AI wasn't sure what the open ticket means";
    }
    if ((m = r.match(/(\d+) overdue bills have this amount/i))) return `${m[1]} bills have this amount: confirm which one the payment covers`;
    if ((m = r.match(/customer name '(.+)' not found/i))) return `“${m[1]}” isn't in the customer list`;
    if (/borderline name match/i.test(r)) return "The customer's name is only a close match";
    if (/matched by name only/i.test(r)) return "The customer was matched by a similar name only";
    if (/no name/i.test(r)) return "This bill has no customer name";
    return r.charAt(0).toUpperCase() + r.slice(1);
  });
  return out.join(". ");
}

// The answer, as one sentence.
export function answerLine(inv: Invoice, verdict: Verdict): string {
  switch (verdict) {
    case "paid":
      return "Probably paid. Confirm the payment, then close the bill. No reminder.";
    case "hold":
      return inv.hold ? `Hold. Pause and hand to ${inv.hold.owner} by ${shortDate(inv.hold.deadline)}.` : "Hold. Pause and hand to the owner.";
    case "send":
      if (inv.draft?.tone === "card_update") return "Send the update-card note, not a payment reminder.";
      if (inv.draft?.tone === "soft") return "Send a reminder, in a softer tone, and tell the account manager.";
      return `Send the ${(inv.reminderStage ?? "reminder").toLowerCase()}.`;
    case "call":
      return `Call them: ${lowerFirst(callWhy(inv))}.`;
  }
}

export type KeyProof = { label: string; title: string; detail?: string; date?: string; audit?: string };

function fromEvidence(label: string, e: Evidence, detail?: string): KeyProof {
  return {
    label,
    title: shortenDates(e.title),
    detail: detail ?? e.detail,
    date: e.date ? formatDate(e.date) : undefined,
    audit: `${e.file} · ${e.recordId}`,
  };
}

// The single record that matters most for this suggestion.
export function keyProof(inv: Invoice, verdict: Verdict): KeyProof | null {
  if (verdict === "paid") {
    const p = paymentProof(inv, "succeeded");
    return p ? fromEvidence("The payment", p) : null;
  }
  if (verdict === "hold") {
    const mismatch = inv.cause === "wrong_bill" ? contractMismatch(inv) : null;
    const contract = inv.evidence.find((e) => e.kind === "contract");
    if (mismatch && contract) return fromEvidence("The contract", contract, `This bill: ${mismatch}.`);
    const t = openTicket(inv);
    return t ? fromEvidence(`The open ticket (${t.status || "open"})`, t) : null;
  }
  if (verdict === "send") {
    if (inv.draft?.tone === "card_update") {
      const f = paymentProof(inv, "failed");
      if (f) return fromEvidence("The failed payment", f);
    }
    if (inv.draft?.tone === "soft") {
      const t = openTicket(inv);
      if (t) return fromEvidence("The open complaint (not about money)", t);
    }
    return {
      label: "The bill",
      title: `${formatMoney(inv.amount, inv.currency)} · ${inv.daysOverdue} days late`,
      detail: `Due ${formatDate(inv.dueDate)}. No open complaint, no payment found, and the bill matches the contract.`,
    };
  }
  return {
    label: "The bill",
    title: `${formatMoney(inv.amount, inv.currency)} · ${callWhy(inv)}`,
    detail: `Due ${formatDate(inv.dueDate)}${inv.draft?.to ? ` · Contact: ${inv.draft.to}` : ""}.`,
  };
}
