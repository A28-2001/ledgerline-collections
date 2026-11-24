import { cn } from "@/lib/utils";
import { CAUSE_META, formatMoney, formatPercent } from "@/lib/data";
import type { CauseSlice } from "@/lib/types";

export type BarRow = { key: string; label: string; amount: number; count: number; color: string };

// Plain bars with the label above each one, so they read the same on a phone.
// One row can be highlighted; the others step back.
export function SimpleBars({
  rows,
  total,
  highlight,
  label,
  unit = ["bill", "bills"],
}: {
  rows: BarRow[];
  total: number;
  highlight?: string;
  label: string;
  unit?: [string, string];
}) {
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
                  · {r.count} {r.count === 1 ? unit[0] : unit[1]} · {formatPercent(total ? r.amount / total : 0)}
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

// Vertical columns for a short, ordered set (days late: 1-30, 31-60, 61-90, 90+). The tallest is highlighted.
export function ColumnChart({ rows, total, label }: { rows: BarRow[]; total: number; label: string }) {
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((r) => r.amount), 1);
  const top = rows.reduce((a, b) => (b.amount > a.amount ? b : a)).key;
  return (
    <div role="img" aria-label={`${label}: ${rows.map((r) => `${r.label} ${formatMoney(r.amount, "USD", true)}`).join(", ")}`}>
      <div className="flex h-48 items-end gap-3 border-b sm:gap-5">
        {rows.map((r) => (
          <div key={r.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
            <span className={cn("tabular mb-1.5 text-xs", r.key === top ? "font-semibold text-foreground" : "text-muted-foreground")}>
              {formatMoney(r.amount, "USD", true)}
            </span>
            <div
              className={cn("w-full max-w-16 rounded-t-md", r.key === top ? "bg-foreground/80" : "bg-muted-foreground/45")}
              style={{ height: `${Math.max(2, (r.amount / max) * 85)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-3 sm:gap-5">
        {rows.map((r) => (
          <div key={r.key} className="min-w-0 flex-1 text-center">
            <p className={cn("text-xs", r.key === top ? "font-semibold" : "text-muted-foreground")}>{r.label}</p>
            <p className="tabular text-[11px] text-muted-foreground">
              {r.count} {r.count === 1 ? "bill" : "bills"} · {formatPercent(total ? r.amount / total : 0)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
