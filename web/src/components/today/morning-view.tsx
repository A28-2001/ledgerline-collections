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
import { ReminderDots } from "@/components/shared/reminder-stepper";
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
    explain: "A payment seems to cover each of these bills. Marcus matches them within 2 working days and you're copied. No reminder goes out.",
    icon: Wallet,
    button: (n) => `Hand ${pluralize(n, "bill")} to Marcus`,
    confirmTitle: (n) => `Hand ${pluralize(n, "bill")} to Marcus to match?`,
    confirmText: "Marcus gets them in his morning message. If a payment isn't matched within 2 working days, the bill comes back to you.",
    done: (n) => `${pluralize(n, "bill")} with Marcus`,
  },
  {
    verdict: "send",
    title: "Send reminders",
    explain: "Nothing is blocking these: no open complaint, no payment found, and the bill matches the contract. Read one or two drafts, then approve the rest. Approving doesn't send anything.",
    icon: Mail,
    button: (n) => `Approve ${pluralize(n, "reminder")}`,
    confirmTitle: (n) => `Approve ${pluralize(n, "reminder")}?`,
    confirmText: "Approving marks them ready; it doesn't send. Until a mail connection is approved, you send them from your email tool. Each account manager sees them in their morning message.",
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
// With hundreds of bills, a step opens 25 more at a time instead of all at once.
const MORE_ROWS = 25;

function moreLabel(shown: number, total: number): string {
  if (shown >= total) return "Show fewer";
  return total - shown <= MORE_ROWS ? `Show all ${total}` : `Show ${MORE_ROWS} more (${total - shown} left)`;
}
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
  const myOverdueHolds = invoices.filter(
    (i) => i.verdict === "hold" && i.cause === "wrong_bill" && i.hold && i.hold.deadline <= meta.asOf && i.hold.ownerRole.startsWith("Finance"),
  );
  const { decisions, approve, override, undo } = useDecisions();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [startChange, setStartChange] = useState(false);
  const [openStep, setOpenStep] = useState<StepKey | null | "auto">("auto");
  const [confirmStep, setConfirmStep] = useState<StepDef | null>(null);
  const [shownRows, setShownRows] = useState(ROWS_SHOWN);

  // Bills the tool isn't sure about go to "Check first" until a person has decided them.
  const flagged = useMemo(() => invoices.filter((i) => i.needsReview), [invoices]);
  const flaggedOpen = flagged.filter((i) => !decisions[i.id]);
  // Same customer + same reason (e.g. one ticket holding three bills) = one decision.
  const groupKey = (i: Invoice) => `${i.customerId ?? i.customerName}|${i.verdict}|${plainReview(i)}`;
  const groupBills = (list: Invoice[]) => {
    const m = new Map<string, Invoice[]>();
    list.forEach((i) => m.set(groupKey(i), [...(m.get(groupKey(i)) ?? []), i]));
    return [...m.values()];
  };
  const allGroups = useMemo(() => groupBills(flagged), [flagged]); // eslint-disable-line react-hooks/exhaustive-deps
  const openGroups = groupBills(flaggedOpen);

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
    () => allGroups.length + STEPS.filter((d) => invoices.some((i) => i.verdict === d.verdict && !i.needsReview)).length,
    [invoices, allGroups],
  );
  const decisionsLeft = openGroups.length + steps.filter((s) => s.undecided.length > 0).length;

  function keepGroup(group: Invoice[]) {
    approve(group.map((i) => ({ id: i.id, verdict: i.verdict })));
    toast.success(`Kept: ${VERDICT_META[group[0].verdict].label}`, {
      description: group.length > 1 ? `${group[0].customerName} · ${group.length} bills` : group[0].customerName,
    });
  }

  // Keyboard: arrows or J/K move, Enter keeps the suggestion, C changes it.
  function onRowKey(e: React.KeyboardEvent<HTMLLIElement>, group: Invoice[]) {
    if (e.target !== e.currentTarget) return;
    const rows = Array.from(e.currentTarget.parentElement?.querySelectorAll<HTMLLIElement>("li[data-row]") ?? []);
    const at = rows.indexOf(e.currentTarget);
    const k = e.key.toLowerCase();
    if (k === "arrowdown" || k === "j") { e.preventDefault(); rows[Math.min(at + 1, rows.length - 1)]?.focus(); }
    else if (k === "arrowup" || k === "k") { e.preventDefault(); rows[Math.max(at - 1, 0)]?.focus(); }
    else if (k === "enter") {
      e.preventDefault();
      keepGroup(group);
      window.requestAnimationFrame(() => (rows[at + 1] ?? rows[at - 1])?.focus());
    } else if (k === "c") { e.preventDefault(); openBill(group[0].id, true); }
  }

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
    setShownRows(ROWS_SHOWN);
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
    const header = ["invoice_id", "customer", "amount", "days_overdue", "tool_said", "final", "decision", "reason", "decided_at", "to", "subject", "body", "owner", "deadline"];
    const lines = decided.map((i) => {
      const d = decisions[i.id];
      // Subject and body travel with each approved reminder, so sending is a paste, not a hunt.
      const sendIt = d.verdict === "send";
      return [i.id, i.customerName, i.amount, i.daysOverdue, i.verdict, d.verdict, d.status, d.reason ?? "", d.at, i.draft?.to ?? "",
        sendIt ? (i.draft?.subject ?? "") : "", sendIt ? (i.draft?.body ?? "") : "", i.hold?.owner ?? "", i.hold?.deadline ?? ""]
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
  const morningText = [
    morningSummary.title,
    "",
    morningSummary.text,
    ...morningSummary.bullets.map((b) => `• ${b}`),
    ...(morningSummary.link ? ["", `Open today's list: ${morningSummary.link}`] : []),
  ].join("\n");
  const currentStep = steps.find((s) => s.def.verdict === current);

  return (
    <>
      {/* 1. Header: one short line, no repeated numbers */}
      <header>
        <p className="text-sm text-muted-foreground">
          Data as of {formatDate(meta.asOf)}
          <span aria-hidden="true"> · </span>
          <Link
            href="/story"
            className="whitespace-nowrap underline decoration-border underline-offset-4 hover:text-foreground hover:decoration-foreground"
          >
            New here? The 2-minute story
          </Link>
        </p>
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
                    : `${pluralize(flaggedOpen.length, "bill")} that need a person first · ${pluralize(openGroups.length, "decision")}`
                }
                open={expanded === "check"}
                onToggle={() => {
                  setShownRows(ROWS_SHOWN);
                  setOpenStep(expanded === "check" ? null : "check");
                }}
                controls="step-check"
              />
              {expanded === "check" && (
                <div id="step-check" className="border-t px-4 pt-3 pb-4">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Read why each one needs a person. If the suggestion looks right, say so; if not, change it. Then these bills
                    join their step, already decided. Bills from one customer with the same reason are one decision.
                  </p>
                  <p className="mt-1.5 hidden text-xs text-muted-foreground sm:block">
                    Keys: <kbd className="rounded border px-1">↑</kbd> <kbd className="rounded border px-1">↓</kbd> to move ·{" "}
                    <kbd className="rounded border px-1">Enter</kbd> looks right · <kbd className="rounded border px-1">C</kbd> change
                  </p>
                  {flaggedOpen.length === 0 ? (
                    <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-paid-ink">
                      <CircleCheck className="size-4" aria-hidden="true" />
                      All checked
                    </p>
                  ) : (
                    <ul className="mt-3 divide-y overflow-hidden rounded-lg border">
                      {openGroups.slice(0, shownRows).map((group) => {
                        const inv = group[0];
                        return (
                        <li
                          key={inv.id}
                          data-row
                          tabIndex={0}
                          onKeyDown={(e) => onRowKey(e, group)}
                          aria-label={`${inv.customerName}, ${pluralize(group.length, "bill")}, ${VERDICT_META[inv.verdict].label}. Enter keeps it, C changes it.`}
                          className="flex flex-col gap-2 px-3 py-2.5 outline-none focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50 sm:flex-row sm:items-center sm:gap-3"
                        >
                          <button
                            type="button"
                            onClick={() => openBill(inv.id)}
                            className="min-w-0 flex-1 rounded text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                          >
                            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="truncate text-sm font-medium">{inv.customerName}</span>
                              <VerdictBadge verdict={inv.verdict} className="text-[11px]" />
                              <span className="tabular text-xs text-muted-foreground">
                                {formatMoney(sumAmount(group), inv.currency)}
                                {group.length > 1 ? ` · ${group.length} bills` : ""}
                              </span>
                            </span>
                            <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{plainReview(inv)}</span>
                          </button>
                          <div className="flex shrink-0 gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => keepGroup(group)}
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
                        );
                      })}
                    </ul>
                  )}
                  {openGroups.length > ROWS_SHOWN && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={() => setShownRows((n) => (n >= openGroups.length ? ROWS_SHOWN : n + MORE_ROWS))}
                    >
                      {moreLabel(shownRows, openGroups.length)}
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
            const visible = ordered.slice(0, isOpen ? shownRows : ROWS_SHOWN);
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
                    setShownRows(ROWS_SHOWN);
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
                    {s.def.verdict === "hold" && myOverdueHolds.length > 0 && (
                      <p className="mt-2 rounded-lg border border-hold/40 bg-hold-soft/60 px-3 py-2 text-sm">
                        <span className="font-medium">
                          Yours today: {pluralize(myOverdueHolds.length, "disputed bill")} ({formatMoney(sumAmount(myOverdueHolds))})
                        </span>{" "}
                        <span className="text-muted-foreground">
                          past the 5-day fix target. Each needs a corrected invoice or a clear answer from you. The rest go to their owners.
                        </span>
                      </p>
                    )}
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
                              verdict={key}
                              detail={d?.status === "overridden" ? `Changed by you: ${d.reason ?? ""}` : rowDetail(inv, key)}
                              onOpen={() => openBill(inv.id)}
                            />
                          );
                        })}
                      </ul>
                    )}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      {ordered.length > ROWS_SHOWN ? (
                        <Button variant="ghost" size="sm" onClick={() => setShownRows((n) => (n >= ordered.length ? ROWS_SHOWN : n + MORE_ROWS))}>
                          {moreLabel(shownRows, ordered.length)}
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
                        <p className="flex items-center gap-1.5 text-sm font-medium text-paid-ink">
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
            className={cn("scroll-mt-20 rounded-xl border p-4", allDone ? "border-paid/40 bg-paid-soft/60" : "border-dashed bg-card")}
          >
            <div className={cn("flex items-start gap-3", !allDone && "opacity-60")}>
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full",
                  allDone ? "bg-paid text-paid-contrast" : "border text-muted-foreground",
                )}
                aria-hidden="true"
              >
                <Send className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-medium">Done: send to billing</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {allDone
                    ? `${pluralize(decidedBy("send"), "reminder")} ready to send, ${pluralize(decidedBy("hold"), "hold")} handed to owners, ${pluralize(decidedBy("paid"), "bill")} with Marcus to match, ${pluralize(decidedBy("call"), "call")} on the call list. Keep the list: tomorrow's run reads it, so nothing is suggested twice.`
                    : "When every decision is made, download the list for billing and post the morning message. Keep the list: tomorrow's run reads it, so nothing is suggested twice. Nothing is sent automatically."}
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
            Check the next bill ({pluralize(openGroups.length, "decision")} left)
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
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-paid text-paid-contrast" aria-label={`${label}: done`}>
        <Check className="size-4" aria-hidden="true" />
      </span>
    );
  return (
    <span
      className={cn(
        "tabular grid size-7 shrink-0 place-items-center rounded-full text-sm font-semibold",
        flag
          ? current
            ? "bg-alert text-alert-contrast"
            : "border border-alert/45 text-alert-ink"
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

function BillRow({
  inv,
  decided,
  verdict,
  detail,
  onOpen,
}: {
  inv: Invoice;
  decided: boolean;
  verdict: Verdict;
  detail: string;
  onOpen: () => void;
}) {
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
            {decided && <CircleCheck className="size-3.5 shrink-0 text-paid-ink" aria-label="Decided" />}
            <span className="truncate text-sm font-medium">{inv.customerName}</span>
          </div>
          <p className="truncate text-xs text-muted-foreground" title={detail}>
            {detail}
          </p>
        </div>
        <ReminderDots invoice={inv} verdict={verdict} className="hidden shrink-0 sm:flex" />
        <div className="shrink-0 text-right">
          <p className="tabular text-sm font-medium">{formatMoney(inv.amount, inv.currency)}</p>
          <p className="tabular text-xs text-muted-foreground">{inv.daysOverdue}d late</p>
        </div>
      </button>
    </li>
  );
}
