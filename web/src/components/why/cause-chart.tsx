import { CAUSE_META, formatMoney, formatPercent } from "@/lib/data";
import type { CauseSlice } from "@/lib/types";

// Plain bars with the label above each one, so they use the full width on a phone too.
export function CauseChart({ slices, total }: { slices: CauseSlice[]; total: number }) {
  const data = [...slices]
    .filter((s) => s.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .map((s) => ({ ...s, label: CAUSE_META[s.cause]?.label ?? s.label, fill: CAUSE_META[s.cause]?.color }));

  if (data.length === 0) return null;
  const max = data[0].amount;

  return (
    <ul className="space-y-3.5" aria-label="Overdue money by reason">
      {data.map((d) => (
        <li key={d.cause}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
            <span className="font-medium">{d.label}</span>
            <span className="tabular text-muted-foreground">
              <span className="font-medium text-foreground">{formatMoney(d.amount, "USD", true)}</span> · {d.count}{" "}
              {d.count === 1 ? "bill" : "bills"} · {formatPercent(total ? d.amount / total : 0)}
            </span>
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div className="h-full rounded-full" style={{ width: `${Math.max(1.5, (d.amount / max) * 100)}%`, background: d.fill }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
