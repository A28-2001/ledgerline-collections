// Numbers behind the charts, and the plain-words takeaway each chart title states.
// Everything is computed from results.json, so titles change when the data changes.
import { AGE_BUCKETS, CAUSE_META, formatMoney, formatPercent, VERDICTS } from "@/lib/data";
import type { CauseSlice, Invoice, Verdict } from "@/lib/types";

export type VerdictSplit = Record<Verdict, number>;
const emptySplit = (): VerdictSplit => ({ send: 0, hold: 0, paid: 0, call: 0 });

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

export function topCustomers(invoices: Invoice[], n = 10) {
  const map = new Map<string, { key: string; id: string | null; name: string; total: number; count: number } & VerdictSplit>();
  for (const i of invoices) {
    const key = i.customerId ?? `name:${i.customerName}`;
    const row = map.get(key) ?? { key, id: i.customerId, name: i.customerName, total: 0, count: 0, ...emptySplit() };
    row.total += i.amount;
    row.count += 1;
    row[i.verdict] += i.amount;
    map.set(key, row);
  }
  const all = [...map.values()].sort((a, b) => b.total - a.total);
  const rows = all.slice(0, n);
  const total = invoices.reduce((s, i) => s + i.amount, 0);
  const topSum = rows.reduce((s, r) => s + r.total, 0);
  const share = total ? topSum / total : 0;
  const title =
    rows.length === 0
      ? "No customers with overdue bills"
      : `The top ${rows.length} customers hold ${formatPercent(share)} of the overdue money`;
  return { rows, title, customerCount: all.length };
}

const DAY_BINS: { label: string; min: number; max: number }[] = [
  { label: "1–15", min: 1, max: 15 },
  { label: "16–30", min: 16, max: 30 },
  { label: "31–45", min: 31, max: 45 },
  { label: "46–60", min: 46, max: 60 },
  { label: "61–90", min: 61, max: 90 },
  { label: "91+", min: 91, max: Number.POSITIVE_INFINITY },
];

export function daysHistogram(invoices: Invoice[]) {
  const rows = DAY_BINS.map((b) => {
    const list = invoices.filter((i) => i.daysOverdue >= b.min && i.daysOverdue <= b.max);
    return { label: b.label, count: list.length, amount: list.reduce((s, i) => s + i.amount, 0) };
  });
  const days = invoices.map((i) => i.daysOverdue).sort((a, b) => a - b);
  const median = days.length ? (days.length % 2 ? days[(days.length - 1) / 2] : (days[days.length / 2 - 1] + days[days.length / 2]) / 2) : 0;
  const title = days.length ? `Half the overdue bills are at least ${Math.round(median)} days late` : "No overdue bills";
  return { rows, median, title };
}

export function verdictTotals(invoices: Invoice[]) {
  const split = emptySplit();
  const counts = emptySplit();
  for (const i of invoices) {
    split[i.verdict] += i.amount;
    counts[i.verdict] += 1;
  }
  return VERDICTS.map((v) => ({ verdict: v, amount: split[v], count: counts[v] }));
}
