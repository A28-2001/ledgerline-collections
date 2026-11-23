"use client";

import {
  ArrowDown,
  ArrowUp,
  CheckCheck,
  CircleCheck,
  CircleDollarSign,
  Download,
  Flag,
  PauseCircle,
  Search,
  Send,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { KpiCard } from "@/components/shared/kpi-card";
import { VerdictBadge } from "@/components/shared/verdict-badge";
import { InvoiceSheet } from "@/components/today/invoice-sheet";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDecisions, type Decisions } from "@/lib/decisions";
import { formatMoney, formatPercent, VERDICT_META, VERDICTS } from "@/lib/data";
import type { Invoice, Results, Verdict } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "all" | Verdict;
type SortKey = "amount" | "daysOverdue";

function effectiveVerdict(inv: Invoice, decisions: Decisions): Verdict {
  return decisions[inv.id]?.verdict ?? inv.verdict;
}

function csvCell(value: string | number) {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function TodayView({ data }: { data: Pick<Results, "invoices" | "summary" | "meta"> }) {
  const { invoices, summary, meta } = data;
  const { decisions, approve, override, undo } = useDecisions();
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [reviewOnly, setReviewOnly] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "daysOverdue", dir: "desc" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { all: invoices.length, send: 0, hold: 0, paid: 0, call: 0 };
    for (const inv of invoices) c[effectiveVerdict(inv, decisions)] += 1;
    return c;
  }, [invoices, decisions]);

  const needsReviewCount = useMemo(() => invoices.filter((i) => i.needsReview).length, [invoices]);
  const decidedCount = useMemo(() => invoices.filter((i) => decisions[i.id]).length, [invoices, decisions]);

  // Bulk approval only covers clear-cut reminders: flagged cases need a person to open them.
  const bulkSend = useMemo(
    () => invoices.filter((i) => effectiveVerdict(i, decisions) === "send" && !i.needsReview && !decisions[i.id]),
    [invoices, decisions],
  );
  const flaggedSend = useMemo(
    () => invoices.filter((i) => effectiveVerdict(i, decisions) === "send" && i.needsReview && !decisions[i.id]).length,
    [invoices, decisions],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = invoices.filter((inv) => {
      if (tab !== "all" && effectiveVerdict(inv, decisions) !== tab) return false;
      if (reviewOnly && !inv.needsReview) return false;
      if (!q) return true;
      return (
        inv.customerName.toLowerCase().includes(q) ||
        inv.id.toLowerCase().includes(q) ||
        inv.headline.toLowerCase().includes(q)
      );
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => (a[sort.key] - b[sort.key]) * dir || a.id.localeCompare(b.id));
  }, [invoices, decisions, tab, query, reviewOnly, sort]);

  const selected = selectedId ? invoices.find((i) => i.id === selectedId) ?? null : null;

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
  }

  function approveAllSend() {
    approve(bulkSend.map((i) => ({ id: i.id, verdict: "send" as const })));
    setConfirmOpen(false);
    toast.success(`Approved ${bulkSend.length} reminders`, {
      description: "They're marked approved here. Export the list to send them from your email tool.",
    });
  }

  function exportApproved() {
    const decided = invoices.filter((i) => decisions[i.id]);
    if (decided.length === 0) {
      toast.info("Nothing approved yet", { description: "Approve a bill, or use “Approve all Send”, then export." });
      return;
    }
    const header = ["invoice_id", "customer", "amount", "days_overdue", "tool_verdict", "final_verdict", "decision", "reason", "decided_at", "to", "subject"];
    const lines = decided.map((i) => {
      const d = decisions[i.id];
      return [i.id, i.customerName, i.amount, i.daysOverdue, i.verdict, d.verdict, d.status, d.reason ?? "", d.at, i.draft?.to ?? "", i.draft?.subject ?? ""]
        .map(csvCell)
        .join(",");
    });
    try {
      const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `approved-${meta.asOf}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${decided.length} decisions`);
    } catch {
      toast.error("Couldn't create the file in this browser.");
    }
  }

  const shouldNotChaseShare = summary.overdueAmount > 0 ? summary.shouldNotChaseAmount / summary.overdueAmount : 0;

  return (
    <>
      <PageHeader
        title="Today"
        description={
          <>
            {summary.overdueCount} overdue bills, each checked against tickets, payments and contracts. Nothing goes
            out until a person approves it.
          </>
        }
        actions={
          <>
            <Button variant="outline" onClick={exportApproved}>
              <Download />
              Export approved
            </Button>
            <Button onClick={() => setConfirmOpen(true)} disabled={bulkSend.length === 0}>
              <CheckCheck />
              Approve all Send ({bulkSend.length})
            </Button>
          </>
        }
      />

      <section aria-label="Key numbers" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Overdue"
          value={formatMoney(summary.overdueAmount)}
          hint={`${summary.overdueCount} bills`}
          icon={CircleDollarSign}
        />
        <KpiCard
          label="Shouldn't chase today"
          value={formatMoney(summary.shouldNotChaseAmount)}
          hint={`${formatPercent(shouldNotChaseShare)} of overdue · paid or on hold`}
          icon={PauseCircle}
          tone="warning"
        />
        <KpiCard
          label="Ready to send"
          value={formatMoney(summary.byVerdict.send.amount)}
          hint={`${summary.byVerdict.send.count} reminders`}
          icon={Send}
        />
        <KpiCard
          label="Needs a person"
          value={needsReviewCount}
          hint="Judges disagreed or the customer match is weak"
          icon={Flag}
          tone={needsReviewCount > 0 ? "attention" : "default"}
        />
      </section>

      <div className="mt-6 flex items-center gap-3 text-xs text-muted-foreground">
        <Progress
          value={invoices.length ? (decidedCount / invoices.length) * 100 : 0}
          className="h-1.5 max-w-48"
          aria-label="Share of bills decided"
        />
        <span className="tabular">
          {decidedCount} of {invoices.length} decided
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
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
          <Button
            variant={reviewOnly ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setReviewOnly((r) => !r)}
            aria-pressed={reviewOnly}
          >
            <Flag />
            Needs a person
          </Button>
          <div className="relative w-full xl:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search customer or invoice"
              aria-label="Search customer or invoice"
              className="pl-8"
            />
          </div>
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border bg-card">
        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No bills here"
              description={query ? "Nothing matches that search." : "There are no overdue bills with this verdict today."}
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Customer</TableHead>
                <TableHead
                  className="text-right"
                  aria-sort={sort.key === "amount" ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                >
                  <SortButton label="Amount" active={sort.key === "amount"} dir={sort.dir} onClick={() => toggleSort("amount")} />
                </TableHead>
                <TableHead
                  className="hidden text-right sm:table-cell"
                  aria-sort={sort.key === "daysOverdue" ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                >
                  <SortButton label="Days late" active={sort.key === "daysOverdue"} dir={sort.dir} onClick={() => toggleSort("daysOverdue")} />
                </TableHead>
                <TableHead>Verdict</TableHead>
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
                    onClick={() => setSelectedId(inv.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedId(inv.id);
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
                      {inv.daysOverdue}d
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <VerdictBadge verdict={verdict} />
                        {decision?.status === "overridden" && (
                          <span className="text-xs text-muted-foreground">changed</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden w-full max-w-0 lg:table-cell">
                      <span className="block truncate text-muted-foreground" title={inv.headline}>
                        {inv.headline}
                      </span>
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {inv.needsReview && !decision && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex" aria-label="Needs a person">
                                <Flag className="size-4 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>{inv.reviewReason ?? "Needs a person to look"}</TooltipContent>
                          </Tooltip>
                        )}
                        {decision && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex" aria-label="Decided">
                                <CircleCheck className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {decision.status === "approved" ? "Approved" : `Changed: ${decision.reason}`}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <InvoiceSheet
        invoice={selected}
        decision={selected ? decisions[selected.id] : undefined}
        asOf={meta.asOf}
        onOpenChange={(open) => !open && setSelectedId(null)}
        onApprove={(inv) => {
          approve([{ id: inv.id, verdict: effectiveVerdict(inv, decisions) }]);
          toast.success(`Approved: ${VERDICT_META[effectiveVerdict(inv, decisions)].label}`, { description: `${inv.customerName} · ${inv.id}` });
        }}
        onOverride={(inv, verdict, reason) => {
          override(inv.id, verdict, reason);
          toast.success(`Changed to ${VERDICT_META[verdict].label}`, { description: "Logged with your reason." });
        }}
        onUndo={(inv) => {
          undo(inv.id);
          toast("Decision undone", { description: `${inv.customerName} · ${inv.id}` });
        }}
      />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve {bulkSend.length} reminders?</DialogTitle>
            <DialogDescription>
              These are bills with no open complaint, no matching payment and a clear customer match. They&apos;ll be
              marked approved here; you send them from your email tool.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="tabular font-medium">
                {formatMoney(bulkSend.reduce((sum, i) => sum + i.amount, 0))}
              </span>
            </div>
            {flaggedSend > 0 && (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                <Flag className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                {flaggedSend} flagged {flaggedSend === 1 ? "reminder is" : "reminders are"} left out. Open{" "}
                {flaggedSend === 1 ? "it" : "them"} and decide one by one.
              </p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={approveAllSend}>
              <CheckCheck />
              Approve {bulkSend.length}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SortButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
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
