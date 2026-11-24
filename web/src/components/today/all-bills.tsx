"use client";

import { ArrowDown, ArrowUp, CircleCheck, Flag, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { ReminderDots } from "@/components/shared/reminder-stepper";
import { VerdictBadge } from "@/components/shared/verdict-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Decisions } from "@/lib/decisions";
import { formatMoney, VERDICT_META, VERDICTS } from "@/lib/data";
import type { Invoice, Verdict } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "all" | Verdict;
type SortKey = "amount" | "daysOverdue";

export function effectiveVerdict(inv: Invoice, decisions: Decisions): Verdict {
  return decisions[inv.id]?.verdict ?? inv.verdict;
}

// Every bill in one searchable table. Kept behind an expander on the home page.
export function AllBills({
  invoices,
  decisions,
  onSelect,
}: {
  invoices: Invoice[];
  decisions: Decisions;
  onSelect: (id: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [checkOnly, setCheckOnly] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "amount", dir: "desc" });

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { all: invoices.length, send: 0, hold: 0, paid: 0, call: 0 };
    for (const inv of invoices) c[effectiveVerdict(inv, decisions)] += 1;
    return c;
  }, [invoices, decisions]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = invoices.filter((inv) => {
      if (tab !== "all" && effectiveVerdict(inv, decisions) !== tab) return false;
      if (checkOnly && !inv.needsReview) return false;
      if (!q) return true;
      return inv.customerName.toLowerCase().includes(q) || inv.id.toLowerCase().includes(q) || inv.headline.toLowerCase().includes(q);
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => (a[sort.key] - b[sort.key]) * dir || a.id.localeCompare(b.id));
  }, [invoices, decisions, tab, query, checkOnly, sort]);

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
  }

  return (
    <div>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="min-w-0">
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <TabsList>
              <TabsTrigger value="all">
                All <span className="tabular text-muted-foreground">{counts.all}</span>
              </TabsTrigger>
              {VERDICTS.map((v) => (
                <TabsTrigger key={v} value={v}>
                  <span className={cn("size-1.5 rounded-full", VERDICT_META[v].dot)} aria-hidden="true" />
                  {VERDICT_META[v].label} <span className="tabular text-muted-foreground">{counts[v]}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
        <div className="flex items-center gap-2">
          <Button variant={checkOnly ? "secondary" : "ghost"} size="sm" onClick={() => setCheckOnly((r) => !r)} aria-pressed={checkOnly}>
            <Flag />
            Check first
          </Button>
          <div className="relative w-full xl:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search customer or bill"
              aria-label="Search customer or bill"
              className="pl-8"
            />
          </div>
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border bg-card">
        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState title="No bills here" description={query ? "Nothing matches that search." : "No bills with this choice today."} />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Customer</TableHead>
                <TableHead className="text-right" aria-sort={sort.key === "amount" ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
                  <SortButton label="Amount" active={sort.key === "amount"} dir={sort.dir} onClick={() => toggleSort("amount")} />
                </TableHead>
                <TableHead
                  className="hidden text-right sm:table-cell"
                  aria-sort={sort.key === "daysOverdue" ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                >
                  <SortButton label="Days late" active={sort.key === "daysOverdue"} dir={sort.dir} onClick={() => toggleSort("daysOverdue")} />
                </TableHead>
                <TableHead>What to do</TableHead>
                <TableHead className="hidden w-full lg:table-cell">Why</TableHead>
                <TableHead className="w-10 pr-4">
                  <span className="sr-only">Status</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((inv) => {
                const decision = decisions[inv.id];
                const verdict = effectiveVerdict(inv, decisions);
                return (
                  <TableRow
                    key={inv.id}
                    tabIndex={0}
                    aria-label={`${inv.customerName}, ${inv.id}, ${formatMoney(inv.amount, inv.currency)}, ${VERDICT_META[verdict].label}. Open details.`}
                    onClick={() => onSelect(inv.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(inv.id);
                      }
                    }}
                    className={cn(
                      "cursor-pointer outline-none focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset",
                      decision && "bg-muted/30",
                    )}
                  >
                    <TableCell className="max-w-56 pl-4">
                      <div className="truncate font-medium">{inv.customerName}</div>
                      <div className="font-mono text-xs text-muted-foreground">{inv.id}</div>
                    </TableCell>
                    <TableCell className="tabular text-right font-medium">{formatMoney(inv.amount, inv.currency)}</TableCell>
                    <TableCell className="tabular hidden text-right text-muted-foreground sm:table-cell">
                      <span className="inline-flex items-center gap-2">
                        <ReminderDots invoice={inv} verdict={verdict} className="hidden md:inline-flex" />
                        {inv.daysOverdue}d
                      </span>
                    </TableCell>
                    <TableCell>
                      <VerdictBadge verdict={verdict} />
                    </TableCell>
                    <TableCell className="hidden w-full max-w-0 lg:table-cell">
                      <span className="block truncate text-muted-foreground" title={inv.headline}>
                        {inv.headline}
                      </span>
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {inv.needsReview && !decision && <Flag className="size-4 text-alert-ink" aria-label="Check first" />}
                        {decision && <CircleCheck className="size-4 text-paid-ink" aria-label="Decided" />}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function SortButton({ label, active, dir, onClick }: { label: string; active: boolean; dir: "asc" | "desc"; onClick: () => void }) {
  const Icon = dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {label}
      <Icon className={cn("size-3", active ? "opacity-100" : "opacity-0")} aria-hidden="true" />
    </button>
  );
}
