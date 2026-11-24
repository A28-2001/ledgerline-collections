// Where a bill sits on Ledgerline's reminder schedule, and what happens next.
//
// The schedule is hardcoded on purpose: it comes from two of Ledgerline's documents, not from the data.
// - collections_policy.md: "Reminders: a courtesy note 5 days before the due date, then at 7, 21 and 45 days
//   past due." and "No message may threaten suspension or legal action without the VP Finance's sign-off."
//   The 45-day template threatens suspension, so at day 45 the tool proposes a call instead of that email.
// - collections_policy.md: "Card invoices unpaid after 150 days are written off automatically."
// - process_maps.md, FIN-1: "Still unpaid at 90 days? -> Escalate to VP Finance".
// If either document changes, change this list.
import { shortDate } from "@/lib/bill-text";
import type { Invoice, Verdict } from "@/lib/types";

export const SCHEDULE = [
  { day: 0, short: "Due", label: "Due date" },
  { day: 7, short: "Day 7", label: "1st reminder" },
  { day: 21, short: "Day 21", label: "2nd reminder" },
  { day: 45, short: "Day 45", label: "Call" },
  { day: 90, short: "Day 90", label: "VP Finance" },
] as const;

export const CARD_WRITE_OFF_DAY = 150;

export type ScheduleState = "waiting" | "active" | "paused" | "paid";

export interface SchedulePosition {
  step: number; // index in SCHEDULE of the step the bill has reached
  state: ScheduleState;
  day: number;
  line: string; // one plain sentence
  next?: string; // what comes next, if still unpaid
  cardWriteOff?: string; // only for card bills
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isWaiting(inv: Invoice, verdict: Verdict): boolean {
  return verdict === "hold" && inv.headline.startsWith("Too early");
}

function isCardBill(inv: Invoice): boolean {
  return inv.evidence.some((e) => e.kind === "invoice" && /fail/i.test(e.status ?? ""));
}

export function schedulePosition(inv: Invoice, verdict: Verdict): SchedulePosition {
  const day = inv.daysOverdue;
  let step = 0;
  SCHEDULE.forEach((s, i) => {
    if (day >= s.day) step = i;
  });
  const nextStep = (from: number) => {
    const s = SCHEDULE[from + 1];
    return s ? `${s.label} on day ${s.day} (${shortDate(addDays(inv.dueDate, s.day))}), if still unpaid.` : undefined;
  };
  const cardWriteOff = isCardBill(inv)
    ? day >= CARD_WRITE_OFF_DAY
      ? `Card bill: past day ${CARD_WRITE_OFF_DAY}, when card bills are written off automatically.`
      : `Card bill: written off automatically on day ${CARD_WRITE_OFF_DAY} (${shortDate(addDays(inv.dueDate, CARD_WRITE_OFF_DAY))}) unless someone acts.`
    : undefined;

  if (verdict === "paid") {
    return { step, state: "paid", day, line: `Day ${day}. Reminders stopped: a payment seems to cover this bill.`, cardWriteOff };
  }
  if (isWaiting(inv, verdict)) {
    return {
      step: 0,
      state: "waiting",
      day,
      line: `Day ${day}. Too early: the first reminder goes on day 7 (${shortDate(addDays(inv.dueDate, 7))}).`,
      cardWriteOff,
    };
  }
  if (verdict === "hold") {
    return { step, state: "paused", day, line: `Paused on day ${day}: no reminders while it's on hold.`, cardWriteOff };
  }
  if (verdict === "call") {
    const callStep = Math.max(step, 3);
    const line =
      day >= 90
        ? `Day ${day}. Past day 90: a person calls, and it goes to the VP Finance.`
        : day >= 45
          ? `Day ${day}. A person calls instead of the 45-day email, which threatens suspension.`
          : `Day ${day}. A call before day 45: ${inv.headline.replace(/\.$/, "")}.`;
    return { step: callStep, state: "active", day, line, next: day < 90 ? nextStep(3) : undefined, cardWriteOff };
  }
  // send
  const label = SCHEDULE[step].label.toLowerCase();
  const line =
    inv.draft?.tone === "card_update"
      ? `Day ${day}. The card failed: an update-card note goes instead of the ${label}.`
      : step === 0
        ? `Day ${day}.`
        : `Day ${day}. The ${label} is due.`;
  return {
    step,
    state: "active",
    day,
    line,
    next: nextStep(step),
    cardWriteOff,
  };
}
