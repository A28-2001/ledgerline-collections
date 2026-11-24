// Plain-words text for one bill: what makes this bill different from the others in its step,
// why the tool isn't sure about it, and the one record that proves the suggestion.
// Everything is read from the bill's own reasons and evidence, so it works on any data set.
import { formatDate, formatMoney, results } from "@/lib/data";
import type { Evidence, Invoice, Verdict } from "@/lib/types";

const CLOSED = /^(closed|resolved|solved)$/i;

// Holds that are the AR Specialist's own work (disputes she corrects), not someone else's.
function isMine(inv: Invoice): boolean {
  return Boolean(inv.hold && inv.hold.ownerRole.startsWith("Finance") && !/^too early/i.test(inv.headline));
}

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

// The ticket a hold rests on: the one its first reason cites, whatever its status. For a dispute Zendesk marks
// solved, that solved ticket is the whole point, so it must not be skipped for some other open ticket.
function holdTicket(inv: Invoice): Evidence | undefined {
  const tickets = inv.evidence.filter((e) => e.kind === "ticket");
  for (const r of inv.reasons) {
    const t = r.evidenceIds.map((id) => tickets.find((e) => e.id === id)).find(Boolean);
    if (t) return t;
  }
  return openTicket(inv);
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
      if (/^too early/i.test(inv.headline)) return `Too early · back on ${shortDate(inv.hold?.deadline)}`;
      const who = inv.hold
        ? `${isMine(inv) ? "Yours" : inv.hold.owner} · ${inv.hold.deadline <= results.meta.asOf ? "act today" : `by ${shortDate(inv.hold.deadline)}`}`
        : "";
      const mismatch = inv.cause === "wrong_bill" ? contractMismatch(inv) : null;
      const t = inv.hold?.twinOf ? undefined : holdTicket(inv);
      const what = inv.hold?.twinOf
        ? "One payment, two bills"
        : mismatch
          ? mismatch.charAt(0).toUpperCase() + mismatch.slice(1)
          : t
            ? `“${t.title}”`
            : "";
      return [who, what].filter(Boolean).join(" · ") || inv.headline;
    }
    case "send": {
      const tone = inv.draft?.tone;
      if (tone === "card_update") return "Card failed: update-card note";
      if (tone === "soft") return "Softer tone: open support ticket, not about money";
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
    if (/still pending in Zendesk/i.test(r)) return "Zendesk still shows a support ticket as pending, though it isn't about money. A polite reminder can go: read the ticket first, and hold it if the customer sounds unhappy (Maya's rule)";
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
      return "Probably paid. Marcus matches the payment; no reminder.";
    case "hold": {
      if (!inv.hold) return "Hold. Pause and hand to the owner.";
      if (/^too early/i.test(inv.headline)) return `Wait. The first reminder comes back on ${shortDate(inv.hold.deadline)}.`;
      const late = inv.hold.deadline <= results.meta.asOf;
      if (isMine(inv)) return late ? "Hold. Yours to fix today: the target date has passed." : `Hold. Yours to fix by ${shortDate(inv.hold.deadline)}.`;
      return late
        ? `Hold. With ${inv.hold.owner}; the target date has passed, so it's back with you today.`
        : `Hold. With ${inv.hold.owner} until ${shortDate(inv.hold.deadline)}.`;
    }
    case "send":
      if (inv.draft?.tone === "card_update") return "Send the update-card note, not a payment reminder.";
      if (inv.draft?.tone === "soft") return "Send a reminder, in a softer tone, and tell the account manager.";
      return `Send the ${(inv.reminderStage ?? "reminder").toLowerCase()}.`;
    case "call":
      return `Call them: ${lowerFirst(callWhy(inv))}.`;
  }
}

// "pending (customer says resolved)" -> "pending, customer says resolved": no brackets inside a label.
const plainStatus = (s?: string) => (s ?? "").replace(/\s*\(([^)]*)\)/g, ", $1").trim();

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
  if (verdict === "hold" && inv.hold?.twinOf) {
    const first = inv.reasons[0]?.text ?? "";
    return {
      label: "The payment (one payment, two bills)",
      title: first.split(/(?<=\.)\s/)[0] || "An unmatched payment fits this bill and another one.",
      detail: `It could pay ${inv.hold.twinOf} or this bill. ${inv.hold.owner} confirms which by ${shortDate(inv.hold.deadline)}; no reminder until then.`,
    };
  }
  if (verdict === "hold") {
    const mismatch = inv.cause === "wrong_bill" ? contractMismatch(inv) : null;
    const contract = inv.evidence.find((e) => e.kind === "contract");
    if (mismatch && contract) return fromEvidence("The contract", contract, `This bill: ${mismatch}.`);
    const t = holdTicket(inv);
    if (!t) return null;
    const solved = CLOSED.test((t.status ?? "").split(" (")[0]);
    return fromEvidence(
      inv.cause === "wrong_bill" && solved ? "The dispute (ticket marked solved, bill not fixed)" : `The ticket (${t.status || "open"})`,
      t,
    );
  }
  if (verdict === "send") {
    if (inv.draft?.tone === "card_update") {
      const f = paymentProof(inv, "failed");
      if (f) return fromEvidence("The failed payment", f);
    }
    if (inv.draft?.tone === "soft") {
      const t = openTicket(inv);
      if (t) return fromEvidence(`The support ticket · ${plainStatus(t.status) || "open"} · not about money`, t);
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

// For a bill in Check first: the record the check is about (a solved billing ticket to confirm), else the usual proof.
export function checkProof(inv: Invoice): KeyProof | null {
  if (/still pending in Zendesk/i.test(inv.reviewReason ?? "")) {
    const t = inv.evidence.find((e) => e.kind === "ticket" && !CLOSED.test((e.status ?? "").split(" (")[0]));
    const note = plainStatus(t?.status).replace(/^pending,?\s*/i, "");
    if (t) return fromEvidence(`The pending ticket${note ? ` · ${note}` : ""}`, t);
  }
  const m = (inv.reviewReason ?? "").match(/ticket from ([A-Z][a-z]{2} \d{1,2}, \d{4})/);
  if (m) {
    const t = inv.evidence.find((e) => e.kind === "ticket" && e.date && formatDate(e.date) === m[1]);
    if (t) return fromEvidence(`The ticket to check · ${plainStatus(t.status) || "open"}`, t);
  }
  return keyProof(inv, inv.verdict);
}
