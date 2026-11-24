"use client";

import {
  ArrowRight,
  Check,
  CheckCheck,
  Download,
  FileWarning,
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
    document.getElementById(`step-tile-${key}`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" }),
  );
}

export function MorningView({ data }: { data: Pick<Results, "invoices" | "summary" | "meta" | "morningSummary"> }) {
  const { invoices, meta } = data;
  const shadow = !!meta.shadowWeek; // Maya: nothing goes out from the tool during the shadow week
  const agree = (label: string) => (shadow ? "Agree" : label); // in the shadow week the buttons compare; nothing goes out
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
  const [view, setView] = useState<"steps" | "table">("steps");
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
    if (isTooEarly(inv)) return "OK, wait";
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
      : (steps.find((s) => s.undecided.length > 0)?.def.verdict ?? "finish");
  const expanded: StepKey = openStep === "auto" || openStep === null ? current : openStep;
  const selected = selectedId ? (invoices.find((i) => i.id === selectedId) ?? null) : null;
  const allDone = decisionsLeft === 0;

  function openBill(id: string, change = false) {
    setStartChange(change);
    setSelectedId(id);
  }

  function goToStep(key: StepKey) {
    setView("steps");
    setOpenStep(key);
    scrollToStep(key);
  }

  function runBulk(step: (typeof steps)[number]) {
    approve(
      step.undecided.map((i) => ({ id: i.id, verdict: step.def.verdict })),
      { bulk: true },
    );
    setConfirmStep(null);
    setOpenStep("auto");
    toast.success(shadow ? `Agreed with ${step.undecided.length}` : step.def.done(step.undecided.length), { description: "Step done." });
  }

  function exportDecisions() {
    const decided = invoices.filter((i) => decisions[i.id]);
    if (decided.length === 0) {
      toast.info("Nothing decided yet", { description: "Finish a step first." });
      return;
    }
    const header = ["invoice_id", "customer", "amount", "days_overdue", "tool_said", "final", "decision", "how", "reason", "decided_at", "to", "subject", "body", "owner", "deadline"];
    const lines = decided.map((i) => {
      const d = decisions[i.id];
      // Subject and body travel with each approved reminder, so sending is a paste, not a hunt.
      const sendIt = d.verdict === "send";
      const how = d.status === "overridden" ? "changed" : d.bulk ? "all at once" : "one by one";
      return [i.id, i.customerName, i.amount, i.daysOverdue, i.verdict, d.verdict, d.status, how, d.reason ?? "", d.at, i.draft?.to ?? "",
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
  // Bills that ride in another bill's email (one email per customer), so the row shows the email's full amount.
  const alsoIn = (i: Invoice) => invoices.filter((x) => x.draft?.combinedWith === i.id);
  const emailTotal = (i: Invoice) => i.amount + sumAmount(alsoIn(i));
  // Approved reminders with a written draft, largest first: one click opens each in the email app, ready to send.
  const readyEmails = invoices
    .filter((i) => decisions[i.id]?.verdict === "send" && i.draft?.body && i.draft?.to)
    .sort((a, b) => emailTotal(b) - emailTotal(a));
  const emailBills = readyEmails.reduce((t, i) => t + 1 + alsoIn(i).length, 0); // one email per customer
  const currentStep = steps.find((s) => s.def.verdict === current);

  // The pipeline: one tile per step, all in view. The big number is bills left; the small line says how many of
  // the day's decisions the tile holds, so the tiles add up to the header's count. Money lives in the bar above.
  const tiles: TileData[] = [
    ...(flagged.length > 0
      ? [{ key: "check" as StepKey, label: "Check first", icon: Flag, color: "var(--alert)", left: flaggedOpen.length, total: flagged.length, note: pluralize(allGroups.length, "decision"), done: flaggedOpen.length === 0 }]
      : []),
    ...steps.map((st) => ({
      key: st.def.verdict as StepKey,
      label: st.def.title,
      icon: st.def.icon,
      color: VERDICT_META[st.def.verdict].chart,
      left: st.undecided.length,
      total: st.items.length,
      note: st.items.length > 0 && invoices.some((i) => i.verdict === st.def.verdict && !i.needsReview) ? "1 decision" : "",
      done: st.done && st.items.length > 0,
    })),
    { key: "finish", label: "Decisions done", icon: Send, color: "var(--foreground)", left: decisionsLeft, total: totalDecisions, note: "", done: allDone },
    ...(myDisputes.length > 0
      ? [{ key: "dispute" as StepKey, label: "Then: the day's disputes", icon: FileWarning, color: "var(--cause-wrong-bill)", left: disputesOpen.length, total: myDisputes.length, note: `after the ${totalDecisions}`, done: disputesOpen.length === 0 }]
      : []),
  ];
  const active: StepKey = tiles.some((t) => t.key === expanded) ? expanded : current;
  const activeStep = steps.find((st) => st.def.verdict === active);

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
          {pluralize(invoices.length, "overdue bill")} · {pluralize(totalDecisions, "decision")} today ·{" "}
          {shadow ? "shadow week: nothing goes out from the tool" : "nothing is sent until you approve"}
        </p>
      </header>

      <div className="mt-4 sm:mt-5">
        <MoneyBar invoices={invoices} onSelect={(v) => goToStep(v)} />
      </div>

      {/* 2. The morning as a pipeline: every step's numbers in view, one step's work below. No accordions. */}
      <section aria-label="Morning steps" className="mt-5 sm:mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Your morning</h2>
            <div role="tablist" aria-label="Show" className="flex rounded-lg border p-0.5 text-xs font-medium">
              {(["steps", "table"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => setView(v)}
                  className={cn(
                    "rounded-md px-2.5 py-1 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
                    view === v ? "glass-pill" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {v === "steps" ? "Steps" : `All ${invoices.length} bills`}
                </button>
              ))}
            </div>
          </div>
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

        {view === "table" ? (
          <div className="mt-3 rounded-xl border bg-card p-4">
            <AllBills invoices={invoices} decisions={decisions} onSelect={(id) => openBill(id)} />
          </div>
        ) : (
          <>
            <div role="tablist" aria-label="Steps" className="mt-3 grid grid-cols-2 gap-2 pt-2.5 pb-2 sm:grid-cols-4 lg:grid-cols-7">
              {tiles.map((t) => (
                <StepTile key={t.key} tile={t} active={active === t.key} next={current === t.key && active !== t.key} onSelect={() => setOpenStep(t.key)} />
              ))}
            </div>

            <div id="step-panel" role="tabpanel" aria-label={tiles.find((t) => t.key === active)?.label} className="mt-2 scroll-mt-20 rounded-xl border bg-card p-4 sm:p-5">
              {active === "check" && (
                <>
                  <PanelHead
                    title="Check first"
                    sub={flaggedOpen.length === 0 ? `All ${pluralize(flagged.length, "bill")} checked` : `${pluralize(flaggedOpen.length, "bill")} that need a person first. One customer at a time: ${shadow ? "agree with" : "approve"} the suggestion, or change it.`}
                    amount={formatMoney(sumAmount(flagged))}
                  />
              <FocusQueue
                items={openGroups.map((g) => ({ key: g[0].id, bills: g, why: plainReview(g[0]) }))}
                verdictOf={(i) => i.verdict}
                proofOf={checkProof}
                primaryLabel={(it) => agree(`Looks right: ${VERDICT_META[it.bills[0].verdict].label}`)}
                onPrimary={(it) => keepGroup(it.bills)}
                onChange={(it) => openBill(it.bills[0].id, true)}
                onOpen={(it) => openBill(it.bills[0].id)}
                emptyText={`All ${pluralize(flagged.length, "bill")} checked.`}
              />
                </>
              )}

              {activeStep &&
                (() => {
                  const activeKey = activeStep.def.verdict;
                  const ActiveIcon = activeStep.def.icon;
                  return (
                    <>
                      <PanelHead
                        title={activeStep.def.title}
                        sub={
                          shadow && activeKey === "send"
                            ? "Nothing blocks these. Compare each with your own call; agreeing with all at once is marked as such in the list. Nothing goes out this week."
                            : activeKey === "hold"
                              ? holdExplain(activeStep.items)
                              : activeStep.def.explain
                        }
                        amount={activeStep.items.length ? formatMoney(sumAmount(activeStep.items)) : undefined}
                        icon={<ActiveIcon className="size-4" style={{ color: VERDICT_META[activeKey].chart }} aria-hidden="true" />}
                      />
              {activeStep.items.length === 0 ? (
                <p className="mt-3 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                  {activeStep.waiting > 0 ? "These bills are waiting in Check first." : "No bills in this step today."}
                </p>
              ) : (
                <FocusQueue
                  items={activeStep.undecided.map((inv) => ({
                    key: inv.id,
                    bills: [inv],
                    why: activeKey === "paid" ? "A payment fits this bill, but nobody has matched it to the bill yet." : rowDetail(inv, activeKey),
                  }))}
                  verdictOf={() => activeKey}
                  primaryLabel={(it) => agree(stepPrimary(activeKey, it.bills[0]))}
                  onPrimary={(it) => decideOne(it.bills[0], activeKey)}
                  onChange={(it) => openBill(it.bills[0].id, true)}
                  onOpen={(it) => openBill(it.bills[0].id)}
                  doneText={activeStep.decidedCount > 0 && activeStep.undecided.length > 0 ? `${shadow ? `${activeStep.decidedCount} agreed` : activeStep.def.done(activeStep.decidedCount)} so far` : undefined}
                  emptyText={`Step done: ${shadow ? `${activeStep.decidedCount} agreed` : activeStep.def.done(activeStep.decidedCount)}.`}
                  footer={
                    activeStep.undecided.length > 1 ? (
                      <Button variant="outline" className="w-full" onClick={() => setConfirmStep(activeStep.def)}>
                        <CheckCheck />
                        {shadow ? `Agree with all ${activeStep.undecided.length}` : activeStep.def.button(activeStep.undecided.length)}
                      </Button>
                    ) : undefined
                  }
                />
              )}
                    </>
                  );
                })()}

              {active === "dispute" && (
                <>
                  <PanelHead
                    title="Fix disputes: the day's work"
                    sub={
                      disputesOpen.length === 0
                        ? `All ${myDisputes.length} answered`
                        : `${disputesOpen.length} of ${myDisputes.length} to answer · ${pastTarget.length} past the 5-day target${repliedEarlier ? ` · ${repliedEarlier} replied earlier` : ""}`
                    }
                    amount={formatMoney(sumAmount(myDisputes))}
                  />
              <p className="text-sm leading-relaxed text-muted-foreground">
                {shadow
                  ? "Yours to fix, as you do today. The tool's reply is there to compare; nothing goes out this week. Oldest first."
                  : "Yours to fix: send the reply, then correct the bill or answer the customer. Oldest first."}
              </p>
              <FocusQueue
                items={disputesOpen.map((inv) => ({ key: inv.id, bills: [inv], why: rowDetail(inv, "hold") }))}
                verdictOf={() => "hold"}
                primaryLabel={() => agree("Reply sent")}
                onPrimary={(it) => decideOne(it.bills[0], "hold")}
                onChange={(it) => openBill(it.bills[0].id, true)}
                onOpen={(it) => openBill(it.bills[0].id)}
                extra={(it) =>
                  !shadow && it.bills[0].reply ? (
                    <CopyButton
                      text={`To: ${it.bills[0].reply.to}\nSubject: ${it.bills[0].reply.subject}\n\n${it.bills[0].reply.body}`}
                      label="Copy the reply"
                    />
                  ) : null
                }
                doneText={myDisputes.length - disputesOpen.length > 0 ? `${myDisputes.length - disputesOpen.length} answered so far` : undefined}
                emptyText={`All ${myDisputes.length} disputes answered. Correct each bill by its target date.`}
              />
                </>
              )}

              {active === "finish" && (
                <>
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
              <h3 className="font-medium">{shadow ? "Done: save today's comparison" : "Done: send the emails, save the list"}</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {allDone
                  ? shadow
                    ? `${pluralize(decidedBy("send"), "reminder")} agreed, ${pluralize(decidedBy("hold"), "hold")}, ${pluralize(decidedBy("paid"), "bill")} for Marcus to match, ${pluralize(decidedBy("call"), "call")}. Download the list: it is today's comparison with your own calls.`
                    : `${pluralize(decidedBy("send"), "reminder")} ready to send, ${pluralize(decidedBy("hold"), "hold")} handed to owners, ${pluralize(decidedBy("paid"), "bill")} with Marcus to match, ${pluralize(decidedBy("call"), "call")} on the call list. Keep the list: tomorrow's run reads it, so nothing is suggested twice.`
                  : shadow
                    ? "When you're done, download the list into the history folder: it records where you agreed with the tool. Nothing goes out from the tool this week."
                    : "When you're done, download the list into the history folder, so tomorrow remembers today. By hand for now; automatic before March."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant={allDone ? "default" : "outline"} onClick={exportDecisions} disabled={!allDone && Object.keys(decisions).length === 0}>
                  <Download />
                  Download the decision list (CSV)
                </Button>
                {disputesOpen.length > 0 && (
                  <Button size="sm" variant="outline" onClick={() => setOpenStep("dispute")}>
                    Then the day&apos;s work: {pluralize(disputesOpen.length, "dispute")}
                    <ArrowRight />
                  </Button>
                )}
              </div>
            </div>
          </div>
          {shadow && readyEmails.length > 0 && (
            <p className="mt-4 border-t pt-3 text-xs leading-relaxed text-muted-foreground">
              After the shadow week, these {readyEmails.length} emails
              {emailBills !== readyEmails.length ? ` (${emailBills} bills: one email per customer)` : ""} open in your own email app, written and
              addressed. This week nothing goes out from the tool.
            </p>
          )}
          {!shadow && readyEmails.length > 0 && (
            <div className="mt-4 border-t pt-3">
              <p className="text-sm font-medium">
                Emails ready to send · {readyEmails.length}
                {emailBills !== readyEmails.length ? ` (${emailBills} bills)` : ""}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">Each opens in your email app, written and addressed. Read it, then press send.</p>
              <ul className="mt-2 divide-y rounded-lg border bg-background text-sm">
                {readyEmails.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 px-3 py-2">
                    <span className="min-w-0 flex-1 truncate">{i.customerName}</span>
                    <span className="tabular shrink-0 text-xs text-muted-foreground">
                      {formatMoney(emailTotal(i), i.currency)}
                      {alsoIn(i).length > 0 && ` · ${alsoIn(i).length + 1} bills`}
                    </span>
                    <a
                      href={mailtoFor(i.draft?.to ?? "", i.draft?.subject ?? "", i.draft?.body ?? "")}
                      className="shrink-0 rounded text-xs font-medium text-brand underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      Open in email
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
                </>
              )}
            </div>
          </>
        )}
      </section>

      <Link
        href="/why"
        className="mt-6 inline-flex items-center gap-1 rounded text-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        Why is it overdue?
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>

      {/* Room for the phone action bar */}
      <div className="h-20 md:hidden" aria-hidden="true" />

      {/* Phone: the current step's one action, always in reach */}
      <div className="glass-bar fixed inset-x-0 bottom-0 z-30 border-t px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] md:hidden">
        {current === "check" ? (
          <Button className="w-full" onClick={() => flaggedOpen[0] && openBill(flaggedOpen[0].id)}>
            <Flag />
            Check the next bill ({openGroups.length} left in Check first)
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
          toast.success(`${shadow ? "Agreed" : "Approved"}: ${VERDICT_META[v].label}`, { description: inv.customerName });
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
                    <DialogTitle>{shadow ? `Agree with all ${s.undecided.length}?` : confirmStep.confirmTitle(s.undecided.length)}</DialogTitle>
                    <DialogDescription>
                      {shadow
                        ? "This is the shadow week: agreeing records that you'd do the same, marked 'all at once' in the list. Nothing goes out from the tool."
                        : confirmStep.confirmText}
                    </DialogDescription>
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
                      {shadow ? `Agree with all ${s.undecided.length}` : confirmStep.button(s.undecided.length)}
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

type TileData = { key: StepKey; label: string; icon: LucideIcon; color: string; left: number; total: number; note: string; done: boolean };

const isTooEarly = (i: Invoice) => /^too early/i.test(i.headline);

// The hold step mixes bills that go to an owner with bills that are simply too early for a reminder: say which is which.
function holdExplain(items: Invoice[]): string {
  const early = items.filter(isTooEarly).length;
  const owned = items.length - early;
  if (!early) return STEPS[1].explain;
  const ownedText = owned ? `${owned} ${owned === 1 ? "goes" : "go"} to an owner with a deadline and ${owned === 1 ? "comes" : "come"} back to you if nobody acts; ` : "";
  return `Don't chase these yet. ${ownedText}${early} ${early === 1 ? "is" : "are"} too early for a reminder and simply ${early === 1 ? "waits" : "wait"}.`;
}

// One step of the morning as a tile: bills left (big), the decisions it holds, and a bar for what's done, in the answer's colour.
function StepTile({ tile, active, next, onSelect }: { tile: TileData; active: boolean; next: boolean; onSelect: () => void }) {
  const Icon = tile.icon;
  const isFinish = tile.key === "finish";
  const pct = tile.total ? ((tile.total - tile.left) / tile.total) * 100 : tile.done ? 100 : 0;
  const empty = !isFinish && tile.total === 0;
  return (
    <button
      id={`step-tile-${tile.key}`}
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls="step-panel"
      onClick={onSelect}
      className={cn(
        "relative flex min-w-0 flex-col gap-1.5 rounded-xl border bg-card p-3 text-left outline-none transition-[background-color,box-shadow] focus-visible:ring-2 focus-visible:ring-ring/50",
        tile.key === "dispute" && "col-span-2 sm:col-span-1",
        !active && "hover:bg-muted/50",
        empty && "opacity-60",
      )}
      style={active ? { boxShadow: `inset 0 0 0 2px ${tile.color}`, background: `color-mix(in oklab, ${tile.color} 9%, var(--card))` } : undefined}
    >
      <span className="flex h-8 items-start gap-1.5 text-xs leading-tight font-medium text-muted-foreground">
        <Icon className="mt-px size-3.5 shrink-0" style={{ color: tile.color }} aria-hidden="true" />
        <span className="line-clamp-2">{tile.label}</span>
      </span>
      <span className="tabular flex items-baseline gap-1.5">
        {tile.done ? (
          <span className="grid size-7 place-items-center rounded-full bg-foreground text-background" aria-label="Done">
            <Check className="size-4" aria-hidden="true" />
          </span>
        ) : (
          <span className="text-2xl leading-none font-semibold">{empty ? "0" : isFinish ? tile.total - tile.left : tile.left}</span>
        )}
        <span className="truncate text-xs text-muted-foreground">
          {isFinish
            ? tile.done
              ? "save the list"
              : `of ${tile.total}`
            : empty
              ? "nothing today"
              : tile.done
                ? `${tile.total} done`
                : `of ${tile.total} left`}
        </span>
      </span>
      <span className="tabular truncate text-xs font-medium">{tile.note || "\u00a0"}</span>
      <span className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <span className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: tile.color }} />
      </span>
      {next && <span className="absolute -top-2 right-2.5 rounded-full bg-foreground px-1.5 py-px text-[10px] font-semibold text-background">Next</span>}
    </button>
  );
}

function PanelHead({ title, sub, amount, icon }: { title: string; sub: string; amount?: string; icon?: React.ReactNode }) {
  return (
    <div className="mb-1 flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 font-semibold">
          {icon}
          {title}
        </h3>
        <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{sub}</p>
      </div>
      {amount && <span className="tabular text-lg font-semibold">{amount}</span>}
    </div>
  );
}

// A reminder as a mailto link: the email app opens with the address, subject and body filled in. Nothing is sent until Priya presses send.
function mailtoFor(to: string, subject: string, body: string): string {
  return `mailto:${to.trim()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
