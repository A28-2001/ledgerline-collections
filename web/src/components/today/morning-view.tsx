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
  PencilLine,
  Phone,
  Send,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CopyButton } from "@/components/shared/copy-button";
import { VerdictBadge } from "@/components/shared/verdict-badge";
import { AllBills, effectiveVerdict } from "@/components/today/all-bills";
import { InvoiceSheet } from "@/components/today/invoice-sheet";
import { MoneyBar } from "@/components/today/money-bar";
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
import { plainReview, rowDetail } from "@/lib/bill-text";
import { useDecisions } from "@/lib/decisions";
import { formatDate, formatMoney, pluralize, sumAmount, VERDICT_META } from "@/lib/data";
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
    explain: "A payment seems to cover each of these bills. Confirm them, then close them in your accounting tool. No reminder goes out.",
    icon: Wallet,
    button: (n) => `Confirm ${pluralize(n, "payment")}`,
    confirmTitle: (n) => `Confirm ${pluralize(n, "bill")} as probably paid?`,
    confirmText: "Each has one payment that matches the bill exactly. They're marked confirmed here; you close them in your accounting tool.",
    done: (n) => `${pluralize(n, "bill")} confirmed`,
  },
  {
    verdict: "send",
    title: "Send reminders",
    explain: "Nothing is blocking these: no open complaint, no payment found, and the bill matches the contract. Read one or two drafts, then approve the rest.",
    icon: Mail,
    button: (n) => `Approve ${pluralize(n, "reminder")}`,
    confirmTitle: (n) => `Approve ${pluralize(n, "reminder")}?`,
    confirmText: "They're marked approved here and you send them from your email tool. Nothing is sent automatically.",
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
    button: (n) => `Add ${pluralize(n, "call")} to the list`,
    confirmTitle: (n) => `Add ${pluralize(n, "customer")} to today's call list?`,
    confirmText: "They're marked approved here. The decision list at the end has the amounts, contacts and reasons.",
    done: (n) => `${pluralize(n, "call")} on the list`,
  },
];

const ROWS_SHOWN = 6;
type StepKey = "check" | Verdict | "finish";

function csvCell(value: string | number) {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function scrollToStep(key: StepKey) {
  window.requestAnimationFrame(() =>
    document.getElementById(`step-card-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" }),
  );
}

export function MorningView({ data }: { data: Pick<Results, "invoices" | "summary" | "meta" | "morningSummary"> }) {
  const { invoices, meta, morningSummary } = data;
  const { decisions, approve, override, undo } = useDecisions();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [startChange, setStartChange] = useState(false);
  const [openStep, setOpenStep] = useState<StepKey | null | "auto">("auto");
  const [confirmStep, setConfirmStep] = useState<StepDef | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Bills the tool isn't sure about go to "Check first" until a person has decided them.
  const flagged = useMemo(() => invoices.filter((i) => i.needsReview), [invoices]);
  const flaggedOpen = flagged.filter((i) => !decisions[i.id]);

  const steps = useMemo(
    () =>
      STEPS.map((def) => {
        const items = invoices.filter(
          (i) => effectiveVerdict(i, decisions) === def.verdict && (!i.needsReview || decisions[i.id]),
        );
        const undecided = items.filter((i) => !decisions[i.id]);
        const waiting = invoices.filter((i) => i.needsReview && !decisions[i.id] && i.verdict === def.verdict).length;
        return { def, items, undecided, waiting, decidedCount: items.length - undecided.length, done: undecided.length === 0 };
      }),
    [invoices, decisions],
  );

  // Decisions: one per bill to check first, plus one click per step that has bills. Never minutes.
  const totalDecisions = useMemo(
    () => flagged.length + STEPS.filter((d) => invoices.some((i) => i.verdict === d.verdict && !i.needsReview)).length,
    [invoices, flagged],
  );
  const decisionsLeft = flaggedOpen.length + steps.filter((s) => s.undecided.length > 0).length;

  const current: StepKey =
    flaggedOpen.length > 0 ? "check" : (steps.find((s) => s.undecided.length > 0)?.def.verdict ?? "finish");
  const expanded = openStep === "auto" ? current : openStep;
  const selected = selectedId ? (invoices.find((i) => i.id === selectedId) ?? null) : null;
  const allDone = decisionsLeft === 0;

  function openBill(id: string, change = false) {
    setStartChange(change);
    setSelectedId(id);
  }

  function goToStep(key: StepKey) {
    setShowAll(false);
    setOpenStep(key);
    scrollToStep(key);
  }

  function runBulk(step: (typeof steps)[number]) {
    approve(step.undecided.map((i) => ({ id: i.id, verdict: step.def.verdict })));
    setConfirmStep(null);
    setOpenStep("auto");
    toast.success(step.def.done(step.undecided.length), { description: "Step done." });
  }

  function exportDecisions() {
    const decided = invoices.filter((i) => decisions[i.id]);
    if (decided.length === 0) {
      toast.info("Nothing decided yet", { description: "Finish a step first." });
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
      toast.success(`Downloaded ${pluralize(decided.length, "decision")}`);
    } catch {
      toast.error("Couldn't create the file in this browser.");
    }
  }

  const decidedBy = (v: Verdict) => invoices.filter((i) => decisions[i.id] && decisions[i.id].verdict === v).length;
  const morningText = [morningSummary.title, "", morningSummary.text].join("\n");
  const currentStep = steps.find((s) => s.def.verdict === current);

  return (
    <>
      {/* 1. Header: one short line, no repeated numbers */}
      <header>
        <p className="text-sm text-muted-foreground">Data as of {formatDate(meta.asOf)}</p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight sm:text-3xl">Good morning</h1>
        <p className="tabular mt-1.5 text-sm text-muted-foreground sm:text-base">
          {pluralize(invoices.length, "overdue bill")} · {pluralize(totalDecisions, "decision")} today · nothing is sent until you
          approve
        </p>
      </header>

      <div className="mt-4 sm:mt-5">
        <MoneyBar invoices={invoices} onSelect={(v) => goToStep(v)} />
      </div>

      {/* 2. Steps first */}
      <section aria-label="Morning steps" className="mt-5 sm:mt-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Your morning</h2>
          <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
            <Progress
              value={totalDecisions ? ((totalDecisions - decisionsLeft) / totalDecisions) * 100 : 100}
              className="h-1.5 w-16 sm:w-28"
              aria-label="Decisions made"
            />
            <span className="tabular whitespace-nowrap">
              {decisionsLeft} of {totalDecisions} decisions left
            </span>
          </div>
        </div>

        <ol className="mt-3 space-y-3">
          {/* Step 0: check first */}
          {flagged.length > 0 && (
            <li id="step-card-check" className={cn("scroll-mt-20 rounded-xl border bg-card", expanded === "check" && "shadow-sm ring-1 ring-foreground/5")}>
              <StepHeader
                status={<StepStatus done={flaggedOpen.length === 0} current={current === "check"} label="Check first" flag />}
                title="Check first"
                sub={
                  flaggedOpen.length === 0
                    ? `All ${pluralize(flagged.length, "bill")} checked`
                    : `${pluralize(flaggedOpen.length, "bill")} the tool isn't sure about · one decision each`
                }
                open={expanded === "check"}
                onToggle={() => {
                  setShowAll(false);
                  setOpenStep(expanded === "check" ? null : "check");
                }}
                controls="step-check"
              />
              {expanded === "check" && (
                <div id="step-check" className="border-t px-4 pt-3 pb-4">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Read why the tool isn&apos;t sure. If its suggestion looks right, say so; if not, change it. Then these bills
                    join their step, already decided.
                  </p>
                  {flaggedOpen.length === 0 ? (
                    <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      <CircleCheck className="size-4" aria-hidden="true" />
                      All checked
                    </p>
                  ) : (
                    <ul className="mt-3 divide-y overflow-hidden rounded-lg border">
                      {(showAll ? flaggedOpen : flaggedOpen.slice(0, ROWS_SHOWN)).map((inv) => (
                        <li key={inv.id} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3">
                          <button
                            type="button"
                            onClick={() => openBill(inv.id)}
                            className="min-w-0 flex-1 rounded text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                          >
                            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="truncate text-sm font-medium">{inv.customerName}</span>
                              <VerdictBadge verdict={inv.verdict} className="text-[11px]" />
                              <span className="tabular text-xs text-muted-foreground">{formatMoney(inv.amount, inv.currency)}</span>
                            </span>
                            <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{plainReview(inv)}</span>
                          </button>
                          <div className="flex shrink-0 gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                approve([{ id: inv.id, verdict: inv.verdict }]);
                                toast.success(`Kept: ${VERDICT_META[inv.verdict].label}`, { description: inv.customerName });
                              }}
                            >
                              <Check />
                              Looks right
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => openBill(inv.id, true)}>
                              <PencilLine />
                              Change
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {flaggedOpen.length > ROWS_SHOWN && (
                    <Button variant="ghost" size="sm" className="mt-2" onClick={() => setShowAll((v) => !v)}>
                      {showAll ? "Show fewer" : `Show all ${flaggedOpen.length}`}
                    </Button>
                  )}
                </div>
              )}
            </li>
          )}

          {/* Steps 1-4 */}
          {steps.map((s, idx) => {
            const key = s.def.verdict;
            const isOpen = expanded === key;
            const Icon = s.def.icon;
            const amount = sumAmount(s.items);
            const ordered = [...s.undecided, ...s.items.filter((i) => decisions[i.id])];
            const visible = showAll && isOpen ? ordered : ordered.slice(0, ROWS_SHOWN);
            const sub =
              s.items.length === 0 && s.waiting === 0
                ? "Nothing today"
                : [
                    s.done && s.items.length > 0 ? s.def.done(s.decidedCount) : pluralize(s.items.length, "bill"),
                    s.waiting > 0 ? `${s.waiting} more in Check first` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ");
            return (
              <li
                key={key}
                id={`step-card-${key}`}
                className={cn("scroll-mt-20 rounded-xl border bg-card", isOpen && "shadow-sm ring-1 ring-foreground/5")}
              >
                <StepHeader
                  status={<StepStatus n={idx + 1} done={s.done && s.items.length > 0} current={current === key} label={s.def.title} />}
                  title={s.def.title}
                  dot={VERDICT_META[key].dot}
                  sub={sub}
                  amount={s.items.length ? formatMoney(amount) : undefined}
                  open={isOpen}
                  onToggle={() => {
                    setShowAll(false);
                    setOpenStep(isOpen ? null : key);
                  }}
                  controls={`step-${key}`}
                />
                {isOpen && (
                  <div id={`step-${key}`} className="border-t px-4 pt-3 pb-4">
                    <p className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
                      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      {s.def.explain}
                    </p>
                    {s.items.length === 0 ? (
                      <p className="mt-3 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                        {s.waiting > 0 ? "These bills are waiting in Check first." : "No bills in this step today."}
                      </p>
                    ) : (
                      <ul className="mt-3 divide-y overflow-hidden rounded-lg border">
                        {visible.map((inv) => {
                          const d = decisions[inv.id];
                          return (
                            <BillRow
                              key={inv.id}
                              inv={inv}
                              decided={Boolean(d)}
                              detail={d?.status === "overridden" ? `Changed by you: ${d.reason ?? ""}` : rowDetail(inv, key)}
                              onOpen={() => openBill(inv.id)}
                            />
                          );
                        })}
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
                      {s.undecided.length > 0 ? (
                        <Button onClick={() => setConfirmStep(s.def)}>
                          <CheckCheck />
                          {s.def.button(s.undecided.length)}
                        </Button>
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

          {/* Finish line */}
          <li
            id="step-card-finish"
            className={cn("scroll-mt-20 rounded-xl border p-4", allDone ? "border-emerald-600/30 bg-emerald-50/50 dark:border-emerald-400/25 dark:bg-emerald-400/5" : "border-dashed bg-card")}
          >
            <div className={cn("flex items-start gap-3", !allDone && "opacity-60")}>
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full",
                  allDone ? "bg-emerald-600 text-white dark:bg-emerald-500" : "border text-muted-foreground",
                )}
                aria-hidden="true"
              >
                <Send className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-medium">Done: send to billing</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {allDone
                    ? `${pluralize(decidedBy("send"), "reminder")} ready to send, ${pluralize(decidedBy("hold"), "hold")} handed to owners, ${pluralize(decidedBy("paid"), "bill")} closed as paid, ${pluralize(decidedBy("call"), "call")} on the call list.`
                    : "When every decision is made, hand the list to billing and post the morning message. Nothing is sent automatically."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant={allDone ? "default" : "outline"} onClick={exportDecisions} disabled={!allDone && Object.keys(decisions).length === 0}>
                    <Download />
                    Download the decision list (CSV)
                  </Button>
                  <CopyButton text={morningText} label="Copy the morning message" />
                </div>
              </div>
            </div>
          </li>
        </ol>
      </section>

      <Link
        href="/why"
        className="mt-6 inline-flex items-center gap-1 rounded text-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        Why is it overdue?
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>

      {/* Every bill, for searching */}
      <details className="group mt-6 rounded-xl border bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="font-medium">Every bill in one table</span>
            <span className="ml-2 text-sm text-muted-foreground">search, sort and filter all {invoices.length}</span>
          </span>
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="border-t p-4">
          <AllBills invoices={invoices} decisions={decisions} onSelect={(id) => openBill(id)} />
        </div>
      </details>

      {/* Room for the phone action bar */}
      <div className="h-20 md:hidden" aria-hidden="true" />

      {/* Phone: the current step's one action, always in reach */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] backdrop-blur md:hidden">
        {current === "check" ? (
          <Button className="w-full" onClick={() => flaggedOpen[0] && openBill(flaggedOpen[0].id)}>
            <Flag />
            Check the next bill ({flaggedOpen.length} left)
          </Button>
        ) : current !== "finish" && currentStep ? (
          <Button className="w-full" onClick={() => setConfirmStep(currentStep.def)}>
            <CheckCheck />
            {currentStep.def.button(currentStep.undecided.length)}
          </Button>
        ) : (
          <Button className="w-full" onClick={exportDecisions}>
            <Download />
            Download the decision list
          </Button>
        )}
      </div>

      <InvoiceSheet
        invoice={selected}
        decision={selected ? decisions[selected.id] : undefined}
        asOf={meta.asOf}
        startWithChange={startChange}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null);
            setStartChange(false);
          }
        }}
        onApprove={(inv) => {
          const v = effectiveVerdict(inv, decisions);
          approve([{ id: inv.id, verdict: v }]);
          toast.success(`Approved: ${VERDICT_META[v].label}`, { description: inv.customerName });
        }}
        onOverride={(inv, verdict, reason) => {
          override(inv.id, verdict, reason);
          toast.success(`Changed to ${VERDICT_META[verdict].label}`, { description: "Logged with your reason." });
        }}
        onUndo={(inv) => {
          undo(inv.id);
          toast("Decision undone", { description: inv.customerName });
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
                    <DialogTitle>{confirmStep.confirmTitle(s.undecided.length)}</DialogTitle>
                    <DialogDescription>{confirmStep.confirmText}</DialogDescription>
                  </DialogHeader>
                  <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total</span>
                      <span className="tabular font-medium">{formatMoney(sumAmount(s.undecided))}</span>
                    </div>
                    {s.waiting > 0 && (
                      <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                        <Flag className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                        {pluralize(s.waiting, "bill")} still in Check first {s.waiting === 1 ? "is" : "are"} not included.
                      </p>
                    )}
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={() => runBulk(s)}>
                      <Check />
                      {confirmStep.button(s.undecided.length)}
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

function StepHeader({
  status,
  title,
  dot,
  sub,
  amount,
  open,
  onToggle,
  controls,
}: {
  status: React.ReactNode;
  title: string;
  dot?: string;
  sub: string;
  amount?: string;
  open: boolean;
  onToggle: () => void;
  controls: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
      className="flex w-full items-center gap-3 rounded-xl p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {status}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{title}</span>
          {dot && <span className={cn("size-1.5 rounded-full", dot)} aria-hidden="true" />}
        </div>
        <p className="tabular text-xs text-muted-foreground">
          {sub}
          {amount && <span className="sm:hidden"> · {amount}</span>}
        </p>
      </div>
      {amount && <span className="tabular hidden text-right text-sm font-semibold sm:block">{amount}</span>}
      <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden="true" />
    </button>
  );
}

function StepStatus({ n, done, current, label, flag = false }: { n?: number; done: boolean; current: boolean; label: string; flag?: boolean }) {
  if (done)
    return (
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-600 text-white dark:bg-emerald-500" aria-label={`${label}: done`}>
        <Check className="size-4" aria-hidden="true" />
      </span>
    );
  return (
    <span
      className={cn(
        "tabular grid size-7 shrink-0 place-items-center rounded-full text-sm font-semibold",
        flag
          ? current
            ? "bg-rose-600 text-white dark:bg-rose-500"
            : "border border-rose-500/40 text-rose-600 dark:text-rose-400"
          : current
            ? "bg-foreground text-background"
            : "border text-muted-foreground",
      )}
      aria-label={current ? `${label}: do this now` : `${label}: next`}
    >
      {flag ? <Flag className="size-3.5" aria-hidden="true" /> : n}
    </span>
  );
}

function BillRow({ inv, decided, detail, onOpen }: { inv: Invoice; decided: boolean; detail: string; onOpen: () => void }) {
  return (
    <li>
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
