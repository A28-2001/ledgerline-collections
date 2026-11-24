import { cn } from "@/lib/utils";
import { CAUSE_META, formatMoney, formatPercent } from "@/lib/data";
import type { CauseSlice } from "@/lib/types";

export type BarRow = { key: string; label: string; amount: number; count: number; color: string };

// Plain bars with the label above each one, so they read the same on a phone.
// One row can be highlighted; the others step back.
export function SimpleBars({ rows, total, highlight, label }: { rows: BarRow[]; total: number; highlight?: string; label: string }) {
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((r) => r.amount));
  return (
    <ul className="space-y-3.5" aria-label={label}>
      {rows.map((r) => {
        const dim = highlight !== undefined && r.key !== highlight;
        return (
          <li key={r.key}>
            <div className={cn("flex flex-wrap items-baseline justify-between gap-x-3 text-sm", dim && "text-muted-foreground")}>
              <span className={cn("font-medium", !dim && highlight && "font-semibold")}>{r.label}</span>
              <span className="tabular">
                <span className={cn("font-medium", !dim && "text-foreground")}>{formatMoney(r.amount, "USD", true)}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {r.count} {r.count === 1 ? "bill" : "bills"} · {formatPercent(total ? r.amount / total : 0)}
                </span>
              </span>
            </div>
            <div className={cn("mt-1.5 overflow-hidden rounded-full bg-muted", !dim && highlight ? "h-3.5" : "h-2.5")} aria-hidden="true">
              <div
                className={cn("h-full rounded-full", dim && "opacity-45")}
                style={{ width: `${Math.max(1.5, (r.amount / max) * 100)}%`, background: r.color }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function CauseChart({ slices, total, highlight }: { slices: CauseSlice[]; total: number; highlight?: string }) {
  const rows = [...slices]
    .filter((s) => s.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .map((s) => ({ key: s.cause, label: CAUSE_META[s.cause]?.label ?? s.label, amount: s.amount, count: s.count, color: CAUSE_META[s.cause]?.color }));
  return <SimpleBars rows={rows} total={total} highlight={highlight} label="Overdue money by reason" />;
}
