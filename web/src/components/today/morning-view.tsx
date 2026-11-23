"use client";

import {
  ArrowRight,
  Check,
  CheckCheck,
  ChevronDown,
  CircleCheck,
  Download,
  Flag,
  Handshake,
  Mail,
  Phone,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AgeChart, VerdictLegend } from "@/components/charts/charts";
import { InfoTip } from "@/components/shared/info-tip";
import { AllBills, effectiveVerdict } from "@/components/today/all-bills";
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
import { Progress } from "@/components/ui/progress";
import { useDecisions } from "@/lib/decisions";
import {
  CAUSE_META,
  formatDate,
  formatMoney,
  formatPercent,
  moneyStats,
  pluralize,
  sumAmount,
  VERDICT_META,
} from "@/lib/data";
import { ageBreakdown, causeBreakdown } from "@/lib/insights";
import type { Invoice, Results, Verdict } from "@/lib/types";
import { cn } from "@/lib/utils";

type StepDef = {
  verdict: Verdict;
  title: string;
  explain: string;
  icon: LucideIcon;
  button: (n: number) => string;
  confirmTitle: (n: number) => string;
  confirmText: string;
  done: (n: number) => string;
};

const STEPS: StepDef[] = [
  {
    verdict: "paid",
    title: "Already paid",
    explain: "A payment seems to cover these bills. Check the payment, then close the bill. No reminder goes out.",
    icon: Wallet,
    button: (n) => `Confirm ${pluralize(n, "clear match", "clear matches")}`,
    confirmTitle: (n) => `Confirm ${pluralize(n, "bill")} as probably paid?`,
    confirmText: "These have one payment that matches the bill exactly and a clear customer match. They're marked confirmed here; close them in your accounting tool.",
    done: (n) => `${pluralize(n, "bill")} confirmed`,
  },
  {
    verdict: "send",
    title: "Send reminders",
    explain: "Nothing is blocking these: no open complaint, no payment found, the bill matches the contract. Read one or two, then approve the rest.",
    icon: Mail,
    button: (n) => `Review & approve ${pluralize(n, "reminder")}`,
    confirmTitle: (n) => `Approve ${pluralize(n, "reminder")}?`,
    confirmText: "They're marked approved here; you send them from your email tool. Nothing is sent automatically.",
    done: (n) => `${pluralize(n, "reminder")} approved`,
  },
  {
    verdict: "hold",
    title: "Hand off holds",
    explain: "Don't chase these yet. Each goes to its owner with a deadline. If nobody acts by then, it comes back to finance, flagged.",
    icon: Handshake,
    button: (n) => `Hand off ${pluralize(n, "hold")}`,
    confirmTitle: (n) => `Hand off ${pluralize(n, "hold")} to their owners?`,
    confirmText: "Each owner gets the bill, the reason and the deadline. The bills stay paused until the owner acts.",
    done: (n) => `${pluralize(n, "hold")} handed off`,
  },
  {
    verdict: "call",
    title: "Make calls",
    explain: "Too late, too large or too unclear for an email. A person calls, using the reasons as talking points.",
    icon: Phone,
    button: (n) => `Add ${pluralize(n, "call")} to today's list`,
    confirmTitle: (n) => `Add ${pluralize(n, "customer")} to today's call list?`,
    confirmText: "They're marked approved here. Export the decisions to get the call list with amounts and reasons.",
    done: (n) => `${pluralize(n, "call")} on the list`,
  },
];

const ROWS_SHOWN = 6;

function csvCell(value: string | number) {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function MorningView({ data }: { data: Pick<Results, "invoices" | "summary" | "meta"> }) {
  const { invoices, summary, meta } = data;
  const { decisions, approve, override, undo } = useDecisions();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openStep, setOpenStep] = useState<Verdict | null | "auto">("auto");
  const [confirmStep, setConfirmStep] = useState<StepDef | null>(null);
  const [showAll, setShowAll] = useState(false);

  const stats = useMemo(() => moneyStats(invoices), [invoices]);
  const age = useMemo(() => ageBreakdown(invoices), [invoices]);
  const causes = useMemo(() => causeBreakdown(summary.byCause, summary.overdueAmount), [summary]);

  const steps = useMemo(
    () =>
      STEPS.map((def) => {
        const items = invoices.filter((i) => effectiveVerdict(i, decisions) === def.verdict);
        const undecided = items.filter((i) => !decisions[i.id]);
        const bulk = undecided.filter((i) => !i.needsReview);
        const check = undecided.filter((i) => i.needsReview);
        const decidedCount = items.length - undecided.length;
        return { def, items, undecided, bulk, check, decidedCount, done: undecided.length === 0 };
      }),
    [invoices, decisions],
  );
  const doneCount = steps.filter((s) => s.done).length;
  const current = steps.find((s) => !s.done)?.def.verdict ?? null;
  const expanded = openStep === "auto" ? current : openStep;
  const selected = selectedId ? invoices.find((i) => i.id === selectedId) ?? null : null;

  function runBulk(step: (typeof steps)[number]) {
    approve(step.bulk.map((i) => ({ id: i.id, verdict: step.def.verdict })));
    setConfirmStep(null);
    setOpenStep("auto");
    toast.success(step.def.done(step.bulk.length), {
      description: step.check.length ? `${pluralize(step.check.length, "bill")} still to check one by one.` : "Step done.",
    });
  }

  function exportDecisions() {
    const decided = invoices.filter((i) => decisions[i.id]);
    if (decided.length === 0) {
      toast.info("Nothing decided yet", { description: "Approve a step first, then export." });
      return;
    }
    const header = ["invoice_id", "customer", "amount", "days_overdue", "tool_said", "final", "decision", "reason", "decided_at", "to", "subject", "owner", "deadline"];
    const lines = decided.map((i) => {
      const d = decisions[i.id];
      return [i.id, i.customerName, i.amount, i.daysOverdue, i.verdict, d.verdict, d.status, d.reason ?? "", d.at, i.draft?.to ?? "", i.draft?.subject ?? "", i.hold?.owner ?? "", i.hold?.deadline ?? ""]
        .map(csvCell)
        .join(",");
    });
    try {
      const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `decisions-${meta.asOf}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${pluralize(decided.length, "decision")}`);
    } catch {
      toast.error("Couldn't create the file in this browser.");
    }
  }

  const headlineParts = summary.headline.split(/(?<=\.)\s+(?=Another )/);

  return (
    <>
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Data as of {formatDate(meta.asOf)}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Good morning</h1>
          <p className="mt-2 max-w-3xl text-base leading-relaxed text-pretty">{headlineParts[0]}</p>
          {headlineParts[1] && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{headlineParts[1]}</p>}
        </div>
        <Button variant="outline" onClick={exportDecisions} className="shrink-0 self-start">
          <Download />
          Export decisions
        </Button>
      </header>

      {/* Money strip: four numbers, each explained */}
      <section aria-label="Money at stake" className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MoneyCard
          label="Overdue"
          value={formatMoney(stats.overdue)}
          sub={pluralize(stats.count, "bill")}
          tip="Every bill past its due date in today's accounting export."
        />
        <MoneyCard
          label="Protected today"
          value={formatMoney(stats.protected)}
          sub={
            stats.unsureCount > 0
              ? `${formatPercent(stats.overdue ? stats.protected / stats.overdue : 0)} of overdue · +${formatMoney(stats.unsureAmount, "USD", true)} paused to check`
              : `${formatPercent(stats.overdue ? stats.protected / stats.overdue : 0)} of overdue`
          }
          tip={
            <>
              Money we would have chased by mistake: bills that look paid, customers with an open billing complaint or
              escalation, and bills that don&apos;t match the contract.
              {stats.unsureCount > 0 && (
                <>
                  {" "}
                  Not counted: {formatMoney(stats.unsureAmount)} on {pluralize(stats.unsureCount, "bill")} paused only
                  because the two AI judges disagreed about a ticket. That&apos;s &ldquo;not sure yet&rdquo;, not &ldquo;found a problem&rdquo;.
                </>
              )}
            </>
          }
          tone="good"
        />
        <MoneyCard
          label="Ready to collect"
          value={formatMoney(stats.readyToCollect)}
          sub={`${pluralize(stats.readyCount, "bill")} · reminders and calls`}
          tip="Bills with nothing blocking them: reminders to send and customers to call."
        />
        <MoneyCard
          label="Check first"
          value={String(stats.checkFirst)}
          sub={stats.checkFirst ? "the tool isn't sure" : "nothing unclear today"}
          tip="Bills where the AI judges disagreed or the customer match is weak. A person decides these before anything else happens."
          tone={stats.checkFirst ? "attention" : "default"}
        />
      </section>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* Steps */}
        <section aria-label="Morning steps" className="min-w-0 xl:col-span-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Your morning, in four steps</h2>
              <p className="text-sm text-muted-foreground">
                {doneCount === 4 ? "All done. Export the decisions to act on them." : "Start at the top. Nothing goes out until you approve it."}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
              <Progress value={(doneCount / 4) * 100} className="h-1.5 w-20 sm:w-28" aria-label="Steps done" />
              <span className="tabular whitespace-nowrap">
                {doneCount} of 4 done
              </span>
            </div>
          </div>

          <ol className="mt-4 space-y-3">
            {steps.map((s, idx) => {
              const isOpen = expanded === s.def.verdict;
              const isCurrent = current === s.def.verdict;
              const Icon = s.def.icon;
              const amount = sumAmount(s.items);
              const ordered = [...s.check, ...s.undecided.filter((i) => !i.needsReview), ...s.items.filter((i) => decisions[i.id])];
              const visible = showAll && isOpen ? ordered : ordered.slice(0, ROWS_SHOWN);
              return (
                <li
                  key={s.def.verdict}
                  className={cn(
                    "rounded-xl border bg-card transition-shadow",
                    isOpen && "shadow-sm ring-1 ring-foreground/5",
                    isCurrent && !isOpen && "border-foreground/20",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowAll(false);
                      setOpenStep(isOpen ? null : s.def.verdict);
                    }}
                    aria-expanded={isOpen}
                    aria-controls={`step-${s.def.verdict}`}
                    className="flex w-full items-center gap-3 rounded-xl p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <StepStatus n={idx + 1} done={s.done} current={isCurrent} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="font-medium">{s.def.title}</span>
                        <span className={cn("size-1.5 rounded-full", VERDICT_META[s.def.verdict].dot)} aria-hidden="true" />
                        {s.check.length > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-1.5 py-px text-[11px] font-medium text-rose-700 ring-1 ring-rose-600/20 ring-inset dark:bg-rose-400/10 dark:text-rose-300">
                            <Flag className="size-3" aria-hidden="true" />
                            {s.check.length} to check first
                          </span>
                        )}
                      </div>
                      <p className="tabular text-xs text-muted-foreground">
                        {s.items.length === 0
                          ? "Nothing today"
                          : [
                              s.done ? s.def.done(s.decidedCount) : pluralize(s.items.length, "bill"),
                              !s.done && s.decidedCount > 0 ? `${s.decidedCount} decided` : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                        {s.items.length > 0 && <span className="sm:hidden"> · {formatMoney(amount)}</span>}
                      </p>
                    </div>
                    <span className="tabular hidden text-right text-sm font-semibold sm:block">{formatMoney(amount)}</span>
                    <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
                  </button>

                  {isOpen && (
                    <div id={`step-${s.def.verdict}`} className="border-t px-4 pt-3 pb-4">
                      <p className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
                        <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        {s.def.explain}
                      </p>

                      {s.items.length === 0 ? (
                        <p className="mt-3 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">No bills in this step today.</p>
                      ) : (
                        <ul className="mt-3 divide-y overflow-hidden rounded-lg border">
                          {visible.map((inv, i) => (
                            <BillRow
                              key={inv.id}
                              inv={inv}
                              decided={Boolean(decisions[inv.id])}
                              showCheckLabel={i === 0 && s.check.length > 0 && inv.needsReview && !decisions[inv.id]}
                              onOpen={() => setSelectedId(inv.id)}
                            />
                          ))}
                        </ul>
                      )}

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        {ordered.length > ROWS_SHOWN ? (
                          <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
                            {showAll ? "Show fewer" : `Show all ${ordered.length}`}
                          </Button>
                        ) : (
                          <span />
                        )}
                        {s.bulk.length > 0 ? (
                          <Button onClick={() => setConfirmStep(s.def)}>
                            <CheckCheck />
                            {s.def.button(s.bulk.length)}
                          </Button>
                        ) : s.check.length > 0 ? (
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <p className="text-xs text-muted-foreground">Open the flagged bills one by one, or come back later.</p>
                            {idx < steps.length - 1 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setShowAll(false);
                                  setOpenStep(steps[idx + 1].def.verdict);
                                }}
                              >
                                Next step
                                <ArrowRight />
                              </Button>
                            )}
                          </div>
                        ) : s.items.length > 0 ? (
                          <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                            <CircleCheck className="size-4" aria-hidden="true" />
                            Step done
                          </p>
                        ) : null}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        {/* Charts */}
        <aside aria-label="Charts" className="min-w-0 space-y-6 xl:col-span-2">
          <div className="rounded-xl border bg-card p-4 sm:p-5">
            <h2 className="text-sm font-semibold leading-snug text-balance">{age.title}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Overdue money by days late, coloured by what to do</p>
            <div className="mt-4">
              <AgeChart rows={age.rows} />
            </div>
            <VerdictLegend className="mt-3" />
          </div>

          <div className="rounded-xl border bg-card p-4 sm:p-5">
            <h2 className="text-sm font-semibold leading-snug text-balance">{causes.title}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Why it&apos;s overdue, in dollars</p>
            <ul className="mt-4 space-y-3">
              {causes.sorted.map((c) => {
                const share = summary.overdueAmount ? c.amount / summary.overdueAmount : 0;
                return (
                  <li key={c.cause}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate">{CAUSE_META[c.cause]?.label ?? c.label}</span>
                      <span className="tabular shrink-0 text-muted-foreground">
                        {formatMoney(c.amount, "USD", true)} · {formatPercent(share)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${share * 100}%`, background: CAUSE_META[c.cause]?.color }} />
                    </div>
                  </li>
                );
              })}
            </ul>
            <Link
              href="/why"
              className="mt-4 inline-flex items-center gap-1 rounded text-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              See the full picture
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </aside>
      </div>

      {/* Every bill, for searching */}
      <details className="group mt-10 rounded-xl border bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="font-medium">Every bill in one table</span>
            <span className="ml-2 text-sm text-muted-foreground">search, sort and filter all {invoices.length}</span>
          </span>
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="border-t p-4">
          <AllBills invoices={invoices} decisions={decisions} onSelect={setSelectedId} />
        </div>
      </details>

      <InvoiceSheet
        invoice={selected}
        decision={selected ? decisions[selected.id] : undefined}
        asOf={meta.asOf}
        onOpenChange={(open) => !open && setSelectedId(null)}
        onApprove={(inv) => {
          const v = effectiveVerdict(inv, decisions);
          approve([{ id: inv.id, verdict: v }]);
          toast.success(`Approved: ${VERDICT_META[v].label}`, { description: `${inv.customerName} · ${inv.id}` });
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

      <Dialog open={confirmStep !== null} onOpenChange={(o) => !o && setConfirmStep(null)}>
        <DialogContent>
          {confirmStep &&
            (() => {
              const s = steps.find((x) => x.def.verdict === confirmStep.verdict)!;
              return (
                <>
                  <DialogHeader>
                    <DialogTitle>{confirmStep.confirmTitle(s.bulk.length)}</DialogTitle>
                    <DialogDescription>{confirmStep.confirmText}</DialogDescription>
                  </DialogHeader>
                  <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total</span>
                      <span className="tabular font-medium">{formatMoney(sumAmount(s.bulk))}</span>
                    </div>
                    {s.check.length > 0 && (
                      <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                        <Flag className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                        {pluralize(s.check.length, "flagged bill")} left out. Open {s.check.length === 1 ? "it" : "them"} and decide one by one.
                      </p>
                    )}
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={() => runBulk(s)}>
                      <Check />
                      {confirmStep.button(s.bulk.length)}
                    </Button>
                  </DialogFooter>
                </>
              );
            })()}
        </DialogContent>
      </Dialog>
    </>
  );
}

function MoneyCard({
  label,
  value,
  sub,
  tip,
  tone = "default",
}: {
  label: string;
  value: string;
  sub: string;
  tip: React.ReactNode;
  tone?: "default" | "good" | "attention";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4",
        tone === "good" && "border-emerald-600/25 bg-emerald-50/50 dark:border-emerald-400/20 dark:bg-emerald-400/5",
        tone === "attention" && "border-rose-600/25 bg-rose-50/50 dark:border-rose-400/20 dark:bg-rose-400/5",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <InfoTip label={label}>{tip}</InfoTip>
      </div>
      <p className="tabular mt-1.5 text-xl font-semibold tracking-tight sm:text-2xl">{value}</p>
      <p className="mt-1 text-xs leading-snug text-muted-foreground">{sub}</p>
    </div>
  );
}

function StepStatus({ n, done, current }: { n: number; done: boolean; current: boolean }) {
  if (done)
    return (
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-600 text-white dark:bg-emerald-500" aria-label="Done">
        <Check className="size-4" aria-hidden="true" />
      </span>
    );
  return (
    <span
      className={cn(
        "tabular grid size-7 shrink-0 place-items-center rounded-full text-sm font-semibold",
        current ? "bg-foreground text-background" : "border text-muted-foreground",
      )}
      aria-label={current ? `Step ${n}, current` : `Step ${n}, next`}
    >
      {n}
    </span>
  );
}

function BillRow({
  inv,
  decided,
  showCheckLabel,
  onOpen,
}: {
  inv: Invoice;
  decided: boolean;
  showCheckLabel: boolean;
  onOpen: () => void;
}) {
  const detail =
    inv.verdict === "hold" && inv.hold
      ? `${inv.hold.owner} · by ${formatDate(inv.hold.deadline, false)}`
      : inv.headline;
  return (
    <li>
      {showCheckLabel && (
        <p className="bg-rose-50 px-3 py-1 text-[11px] font-medium tracking-wide text-rose-700 uppercase dark:bg-rose-400/10 dark:text-rose-300">
          Check first
        </p>
      )}
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "flex w-full items-center gap-3 px-3 py-2.5 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset",
          decided && "opacity-60",
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {inv.needsReview && !decided && <Flag className="size-3.5 shrink-0 text-rose-600 dark:text-rose-400" aria-label="Check first" />}
            {decided && <CircleCheck className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-label="Decided" />}
            <span className="truncate text-sm font-medium">{inv.customerName}</span>
          </div>
          <p className="truncate text-xs text-muted-foreground" title={detail}>
            {detail}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="tabular text-sm font-medium">{formatMoney(inv.amount, inv.currency)}</p>
          <p className="tabular text-xs text-muted-foreground">{inv.daysOverdue}d late</p>
        </div>
      </button>
    </li>
  );
}
