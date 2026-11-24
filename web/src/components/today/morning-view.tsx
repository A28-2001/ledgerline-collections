"use client";

import {
  ArrowRight,
  Check,
  CheckCheck,
  ChevronDown,
  Download,
  Flag,
  Handshake,
  Mail,
  Phone,
  Send,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CopyButton } from "@/components/shared/copy-button";
import { AllBills, effectiveVerdict } from "@/components/today/all-bills";
import { FocusQueue } from "@/components/today/focus-queue";
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
import { checkProof, plainReview, rowDetail } from "@/lib/bill-text";
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
    title: "Probably paid",
    explain: "A payment seems to cover each of these. Marcus matches them within 2 working days; no reminder goes out.",
    icon: Wallet,
    button: (n) => `Hand ${pluralize(n, "bill")} to Marcus`,
    confirmTitle: (n) => `Hand ${pluralize(n, "bill")} to Marcus to match?`,
    confirmText: "Marcus gets them in his morning message. If a payment isn't matched within 2 working days, the bill comes back to you.",
    done: (n) => `${pluralize(n, "bill")} with Marcus`,
  },
  {
    verdict: "hold",
    title: "Hand off holds",
    explain: "Don't chase these yet. Each goes to its owner with a deadline and comes back to you if nobody acts.",
    icon: Handshake,
    button: (n) => `Hand off ${pluralize(n, "hold")}`,
    confirmTitle: (n) => `Hand off ${pluralize(n, "hold")} to their owners?`,
    confirmText: "Each owner gets the bill, the reason and the deadline. The bills stay paused until the owner acts.",
    done: (n) => `${pluralize(n, "hold")} handed off`,
  },
  {
    verdict: "send",
    title: "Send reminders",
    explain: "Nothing blocks these. Read a draft or two, then approve the rest. Approving doesn't send anything.",
    icon: Mail,
    button: (n) => `Approve ${pluralize(n, "reminder")}`,
    confirmTitle: (n) => `Approve ${pluralize(n, "reminder")}?`,
    confirmText: "Approving marks them ready; it doesn't send. Until a mail connection is approved, you send them from your email tool. Each account manager sees them in their morning message.",
    done: (n) => `${pluralize(n, "reminder")} approved`,
  },
  {
    verdict: "call",
    title: "Make calls",
    explain: "Past 45 days, so a person phones instead of emailing. The reasons are the talking points.",
    icon: Phone,
    button: (n) => `Add ${pluralize(n, "call")} to the list`,
    confirmTitle: (n) => `Add ${pluralize(n, "customer")} to today's call list?`,
    confirmText: "They're marked approved here. The decision list at the end has the amounts, contacts and reasons.",
    done: (n) => `${pluralize(n, "call")} on the list`,
  },
];

type StepKey = "check" | Verdict | "dispute" | "finish";

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
  const { invoices, meta } = data;
  // Disputes Priya fixes herself: the day's real work, kept apart from the holds she hands to others.
  const isMyDispute = (i: Invoice) => i.verdict === "hold" && i.cause === "wrong_bill" && Boolean(i.hold?.ownerRole.startsWith("Finance"));
  const raisedOn = (i: Invoice) => {
    const id = i.reasons.flatMap((r) => r.evidenceIds).find((e) => e.startsWith("ticket:"));
    return i.evidence.find((e) => e.id === id)?.date ?? i.dueDate;
  };
  const myDisputes = invoices.filter(isMyDispute).sort((a, b) => (raisedOn(a) < raisedOn(b) ? -1 : raisedOn(a) > raisedOn(b) ? 1 : b.amount - a.amount));
  const pastTarget = myDisputes.filter((i) => i.hold!.deadline <= meta.asOf);
  const { decisions, approve, override, undo } = useDecisions();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [startChange, setStartChange] = useState(false);
  const [openStep, setOpenStep] = useState<StepKey | null | "auto">("auto");
  const [confirmStep, setConfirmStep] = useState<StepDef | null>(null);

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
          (i) => effectiveVerdict(i, decisions) === def.verdict && (!i.needsReview || decisions[i.id]) && !isMyDispute(i),
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

  // The main button on a step's card, in plain words.
  function stepPrimary(v: Verdict, inv: Invoice): string {
    if (v === "paid") return "Hand to Marcus";
    if (v === "send") return inv.draft?.combinedWith ? "Approve: goes in one email" : "Approve this reminder";
    if (v === "call") return "Add to the call list";
    if (/^too early/i.test(inv.headline)) return "OK, wait";
    if (inv.hold?.ownerRole.startsWith("Finance")) return "Keep it: yours to fix";
    return `Hand to ${inv.hold?.owner ?? "the owner"}`;
  }

  function decideOne(inv: Invoice, v: Verdict) {
    approve([{ id: inv.id, verdict: v }]);
    toast.success(`${inv.customerName}: done`, { action: { label: "Undo", onClick: () => undo(inv.id) } });
  }

  const disputesOpen = myDisputes.filter((i) => !decisions[i.id] && !i.hold?.repliedOn);
  const repliedEarlier = myDisputes.filter((i) => i.hold?.repliedOn).length;
  const current: StepKey =
    flaggedOpen.length > 0
      ? "check"
      : (steps.find((s) => s.undecided.length > 0)?.def.verdict ?? (disputesOpen.length > 0 ? "dispute" : "finish"));
  const expanded = openStep === "auto" ? current : openStep;
  const selected = selectedId ? (invoices.find((i) => i.id === selectedId) ?? null) : null;
  const allDone = decisionsLeft === 0;

  function openBill(id: string, change = false) {
    setStartChange(change);
    setSelectedId(id);
  }

  function goToStep(key: StepKey) {
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
            New here? Start with the story
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
              {myDisputes.length > 0 && <span className="hidden sm:inline"> · {disputesOpen.length} disputes to fix</span>}
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
                                setOpenStep(expanded === "check" ? null : "check");
                }}
                controls="step-check"
              />
              {expanded === "check" && (
                <div id="step-check" className="border-t px-4 pt-3 pb-4">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    One customer at a time: approve the suggestion, or change it.
                  </p>
                  <FocusQueue
                    items={openGroups.map((g) => ({ key: g[0].id, bills: g, why: plainReview(g[0]) }))}
                    verdictOf={(i) => i.verdict}
                    proofOf={checkProof}
                    primaryLabel={(it) => `Looks right: ${VERDICT_META[it.bills[0].verdict].label}`}
                    onPrimary={(it) => keepGroup(it.bills)}
                    onChange={(it) => openBill(it.bills[0].id, true)}
                    onOpen={(it) => openBill(it.bills[0].id)}
                    emptyText={`All ${pluralize(flagged.length, "bill")} checked.`}
                  />
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
                      <FocusQueue
                        items={s.undecided.map((inv) => ({
                          key: inv.id,
                          bills: [inv],
                          why: key === "paid" ? "A payment fits this bill, but nobody has matched it to the bill yet." : rowDetail(inv, key),
                        }))}
                        verdictOf={() => key}
                        primaryLabel={(it) => stepPrimary(key, it.bills[0])}
                        onPrimary={(it) => decideOne(it.bills[0], key)}
                        onChange={(it) => openBill(it.bills[0].id, true)}
                        onOpen={(it) => openBill(it.bills[0].id)}
                        doneText={s.decidedCount > 0 && s.undecided.length > 0 ? `${s.def.done(s.decidedCount)} so far` : undefined}
                        emptyText={`Step done: ${s.def.done(s.decidedCount)}.`}
                        footer={
                          s.undecided.length > 1 ? (
                            <Button variant="outline" className="w-full" onClick={() => setConfirmStep(s.def)}>
                              <CheckCheck />
                              {s.def.button(s.undecided.length)}
                            </Button>
                          ) : undefined
                        }
                      />
                    )}
                  </div>
                )}
              </li>
            );
          })}

          {/* The day's work: Priya's own disputes */}
          {myDisputes.length > 0 && (
            <li id="step-card-dispute" className={cn("scroll-mt-20 rounded-xl border bg-card", expanded === "dispute" && "shadow-sm ring-1 ring-foreground/5")}>
              <StepHeader
                status={<StepStatus n={5} done={disputesOpen.length === 0} current={current === "dispute"} label="Fix disputes" />}
                title="Fix disputes: the day's work"
                dot={VERDICT_META.hold.dot}
                sub={
                  disputesOpen.length === 0
                    ? `All ${myDisputes.length} answered`
                    : `${disputesOpen.length} of ${myDisputes.length} to answer · ${pastTarget.length} past the 5-day target${repliedEarlier ? ` · ${repliedEarlier} replied earlier` : ""}`
                }
                amount={formatMoney(sumAmount(myDisputes))}
                open={expanded === "dispute"}
                onToggle={() => setOpenStep(expanded === "dispute" ? null : "dispute")}
                controls="step-dispute"
              />
              {expanded === "dispute" && (
                <div id="step-dispute" className="border-t px-4 pt-3 pb-4">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Yours to fix: send the reply, then correct the bill or answer the customer. Oldest first.
                  </p>
                  <FocusQueue
                    items={disputesOpen.map((inv) => ({ key: inv.id, bills: [inv], why: rowDetail(inv, "hold") }))}
                    verdictOf={() => "hold"}
                    primaryLabel={() => "Reply sent"}
                    onPrimary={(it) => decideOne(it.bills[0], "hold")}
                    onChange={(it) => openBill(it.bills[0].id, true)}
                    onOpen={(it) => openBill(it.bills[0].id)}
                    extra={(it) =>
                      it.bills[0].reply ? (
                        <CopyButton
                          text={`To: ${it.bills[0].reply.to}\nSubject: ${it.bills[0].reply.subject}\n\n${it.bills[0].reply.body}`}
                          label="Copy the reply"
                        />
                      ) : null
                    }
                    doneText={myDisputes.length - disputesOpen.length > 0 ? `${myDisputes.length - disputesOpen.length} answered so far` : undefined}
                    emptyText={`All ${myDisputes.length} disputes answered. Correct each bill by its target date.`}
                  />
                </div>
              )}
            </li>
          )}

          {/* Finish line */}
          <li
            id="step-card-finish"
            className={cn("scroll-mt-20 rounded-xl border p-4", allDone ? "border-foreground/30 bg-muted/40" : "border-dashed bg-card")}
          >
            <div className={cn("flex items-start gap-3", !allDone && "opacity-60")}>
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full",
                  allDone ? "bg-foreground text-background" : "border text-muted-foreground",
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
                    : "When you're done, download the list and save it in the history folder, so tomorrow's run remembers today. Nothing is sent automatically."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant={allDone ? "default" : "outline"} onClick={exportDecisions} disabled={!allDone && Object.keys(decisions).length === 0}>
                    <Download />
                    Download the decision list (CSV)
                  </Button>
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
      <div className="glass-bar fixed inset-x-0 bottom-0 z-30 border-t px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] md:hidden">
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
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-foreground text-background" aria-label={`${label}: done`}>
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
