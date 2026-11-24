// Numbers behind the charts, and the plain-words takeaway each chart title states.
// Everything is computed from results.json, so titles change when the data changes.
import { AGE_BUCKETS, CAUSE_META, formatMoney, formatPercent } from "@/lib/data";
import type { CauseSlice, Invoice, Verdict } from "@/lib/types";

const emptySplit = (): Record<Verdict, number> => ({ send: 0, hold: 0, paid: 0, call: 0 });

export function ageBreakdown(invoices: Invoice[]) {
  const rows = AGE_BUCKETS.map((bucket) => {
    const list = invoices.filter((i) => i.agingBucket === bucket);
    const split = emptySplit();
    for (const i of list) split[i.verdict] += i.amount;
    return { bucket, label: `${bucket} days`, count: list.length, total: list.reduce((s, i) => s + i.amount, 0), ...split };
  });
  const total = rows.reduce((s, r) => s + r.total, 0);
  const top = [...rows].sort((a, b) => b.total - a.total)[0];
  const title =
    total === 0 || !top
      ? "Nothing is overdue"
      : `${top.total / total > 0.505 ? "Most" : top.total / total >= 0.495 ? "Half" : "The largest share"} of the money is ${top.bucket} days late (${formatPercent(top.total / total)})`;
  return { rows, total, title };
}

export function causeBreakdown(slices: CauseSlice[], total: number) {
  const sorted = [...slices].filter((s) => s.amount > 0).sort((a, b) => b.amount - a.amount);
  const top = sorted[0];
  const label = top ? CAUSE_META[top.cause]?.label ?? top.label : "";
  const title = top
    ? `“${label}” is the biggest reason: ${formatMoney(top.amount, "USD", true)} (${formatPercent(total ? top.amount / total : 0)})`
    : "No overdue money to explain";
  return { sorted, title };
}
