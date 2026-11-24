"use client";

import { formatMoney, moneyStats, pluralize, VERDICT_META } from "@/lib/data";
import type { Invoice, Verdict } from "@/lib/types";
import { cn } from "@/lib/utils";

// One bar for all the overdue money, split by what to do. Every number on the Today page
// that is about money lives here, once: the total, the two groups, and the unsure part.
const ORDER: Verdict[] = ["paid", "hold", "send", "call"];
const SHORT: Record<Verdict, string> = { paid: "Paid", hold: "Hold", send: "Send", call: "Call" };

const HATCH = {
  backgroundImage: "repeating-linear-gradient(135deg, var(--background) 0 2px, transparent 2px 6px)",
  opacity: 0.75,
};

export function MoneyBar({ invoices, onSelect }: { invoices: Invoice[]; onSelect: (v: Verdict) => void }) {
  const s = moneyStats(invoices);
  const total = s.overdue || 1;
  const pct = (x: number) => `${(x / total) * 100}%`;

  return (
    <section aria-label="Where today's overdue money goes" className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <h2 className="text-sm font-medium">All overdue</h2>
        <p className="tabular text-sm">
          <span className="font-semibold">{formatMoney(s.overdue)}</span>
          <span className="text-muted-foreground"> · {pluralize(s.count, "bill")}</span>
        </p>
      </div>

      {/* The two groups the bar is split into */}
      <div className="mt-3 flex items-end justify-between gap-3 text-xs sm:text-sm">
        <p className="min-w-0">
          <span className="text-muted-foreground">Don&apos;t chase today</span>{" "}
          <span className="tabular font-semibold whitespace-nowrap">{formatMoney(s.dontChase)}</span>
        </p>
        <p className="min-w-0 text-right">
          <span className="text-muted-foreground">Chase today</span>{" "}
          <span className="tabular font-semibold whitespace-nowrap">{formatMoney(s.chase)}</span>
        </p>
      </div>
      <div className="mt-1 flex h-2" aria-hidden="true">
        <div style={{ width: pct(s.dontChase) }} className="rounded-tl-sm rounded-tr-sm border-x border-t border-foreground/25" />
        <div style={{ width: pct(s.unsureAmount) }} />
        <div style={{ width: pct(s.chase) }} className="rounded-tl-sm rounded-tr-sm border-x border-t border-foreground/25" />
      </div>

      {/* The bar itself: each part opens its step */}
      <div className="mt-1 flex h-5 w-full gap-0.5 overflow-hidden rounded-md">
        {ORDER.map((v) => {
          const { amount, count } = s.byVerdict[v];
          if (!amount) return null;
          const label = `${VERDICT_META[v].label}: ${formatMoney(amount)}, ${pluralize(count, "bill")}`;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onSelect(v)}
              title={label}
              aria-label={`${label}. Go to this step.`}
              style={{ width: pct(amount), background: VERDICT_META[v].chart }}
              className="relative h-full min-w-1 outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              {v === "hold" && s.unsureAmount > 0 && (
                <span className="absolute inset-y-0 right-0" style={{ width: `${(s.unsureAmount / amount) * 100}%`, ...HATCH }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Names and counts under the bar */}
      <div className="mt-2.5 grid grid-cols-4 gap-2">
        {ORDER.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onSelect(v)}
            className="min-w-0 rounded-md text-left outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <span className="flex items-center gap-1.5 text-xs font-medium">
              <span className={cn("size-2 shrink-0 rounded-sm", VERDICT_META[v].dot)} aria-hidden="true" />
              <span className="truncate">
                <span className="sm:hidden">{SHORT[v]}</span>
                <span className="hidden sm:inline">{VERDICT_META[v].label}</span>
              </span>
            </span>
            <span className="tabular block text-xs text-muted-foreground">{pluralize(s.byVerdict[v].count, "bill")}</span>
          </button>
        ))}
      </div>

      {s.unsureAmount > 0 && (
        <p className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="relative inline-block h-2.5 w-4 shrink-0 overflow-hidden rounded-sm" style={{ background: VERDICT_META.hold.chart }} aria-hidden="true">
            <span className="absolute inset-0" style={HATCH} />
          </span>
          <span>
            <span className="tabular font-medium text-foreground">{formatMoney(s.unsureAmount)}</span> of the holds paused: the AI
            wasn&apos;t sure
          </span>
        </p>
      )}
    </section>
  );
}
