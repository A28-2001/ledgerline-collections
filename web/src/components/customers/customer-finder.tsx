"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { customerHref, formatMoney, VERDICT_META } from "@/lib/data";
import type { Verdict } from "@/lib/types";
import { cn } from "@/lib/utils";

export type CustomerRow = {
  id: string;
  name: string;
  overdue: number;
  bills: number;
  byVerdict: Record<Verdict, number>;
  nearMatch: boolean;
};

const ORDER: Verdict[] = ["hold", "paid", "call", "send"];
const PAGE = 15;

// Works the same for 50 customers or 5,000: search, filter by what to do, biggest first, 15 at a time.
export function CustomerFinder({ rows }: { rows: CustomerRow[] }) {
  const [q, setQ] = useState("");
  const [only, setOnly] = useState<Verdict | "all">("all");
  const [shown, setShown] = useState(PAGE);

  const counts = useMemo(() => {
    const c: Record<Verdict, number> = { hold: 0, paid: 0, call: 0, send: 0 };
    for (const r of rows) for (const v of ORDER) if (r.byVerdict[v] > 0) c[v] += 1;
    return c;
  }, [rows]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => (only === "all" || r.byVerdict[only] > 0) && (!needle || r.name.toLowerCase().includes(needle)));
  }, [rows, q, only]);
  const max = Math.max(...list.map((r) => r.overdue), 1);
  const visible = list.slice(0, shown);

  const chip = (key: Verdict | "all", label: string, n: number) => (
    <button
      key={key}
      type="button"
      onClick={() => {
        setOnly(key);
        setShown(PAGE);
      }}
      aria-pressed={only === key}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        only === key ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {key !== "all" && <span className="size-2 rounded-full" style={{ background: VERDICT_META[key].chart }} aria-hidden="true" />}
      {label} <span className="tabular opacity-70">{n}</span>
    </button>
  );

  return (
    <div>
      <label className="relative block">
        <span className="sr-only">Find a customer</span>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setShown(PAGE);
          }}
          placeholder="Find a customer"
          className="h-10 w-full rounded-lg border bg-background pr-3 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        {chip("all", "All", rows.length)}
        {ORDER.filter((v) => counts[v] > 0).map((v) => chip(v, VERDICT_META[v].label, counts[v]))}
      </div>

      {visible.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No customer matches.</p>
      ) : (
        <ul className="mt-4 space-y-2.5 sm:space-y-1.5" aria-label="Customers, biggest first">
          {visible.map((r) => (
            <li
              key={r.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 text-sm sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_5rem]"
            >
              <Link
                href={customerHref(r.id)}
                className="truncate rounded underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
                title={r.bills > 1 ? `${r.name} · ${r.bills} bills` : r.name}
              >
                {r.name}
                {r.nearMatch && <span className="text-hold-ink"> · check name</span>}
              </Link>
              <span className="tabular text-right text-xs text-muted-foreground sm:order-3">{formatMoney(r.overdue, "USD", true)}</span>
              <div className="col-span-2 flex h-2.5 overflow-hidden rounded-full bg-muted sm:order-2 sm:col-span-1 sm:h-3" aria-hidden="true">
                {ORDER.filter((v) => r.byVerdict[v] > 0).map((v) => (
                  <div key={v} className="h-full" style={{ width: `${Math.max(1, (r.byVerdict[v] / max) * 100)}%`, background: VERDICT_META[v].chart }} />
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="tabular">
          Showing {Math.min(shown, list.length)} of {list.length}
        </span>
        {list.length > shown && (
          <button
            type="button"
            onClick={() => setShown((n) => n + PAGE)}
            className="rounded-md border px-3 py-1.5 font-medium text-foreground hover:bg-muted"
          >
            Show {Math.min(PAGE, list.length - shown)} more
          </button>
        )}
      </div>
    </div>
  );
}
