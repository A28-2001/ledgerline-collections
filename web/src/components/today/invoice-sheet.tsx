"use client";

import {
  ArrowUpRight,
  BadgeCheck,
  CalendarClock,
  CreditCard,
  FileText,
  Flag,
  Loader2,
  Mail,
  MessageSquareWarning,
  Phone,
  Receipt,
  ScrollText,
  Sparkles,
  Undo2,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { CopyButton } from "@/components/shared/copy-button";
import { VerdictBadge } from "@/components/shared/verdict-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { couldAutoSend, useAutoSendCap } from "@/lib/auto-send";
import { answerLine, keyProof, plainReview } from "@/lib/bill-text";
import type { Decision } from "@/lib/decisions";
import {
  CONFIDENCE_LABEL,
  customerHref,
  daysBetween,
  formatDate,
  formatMoney,
  judgeLabel,
  TONE_LABEL,
  VERDICT_META,
  VERDICTS,
  VOTE_LABEL,
  results,
} from "@/lib/data";
import type { Evidence, Invoice, Tone, Verdict } from "@/lib/types";
import { cn } from "@/lib/utils";

const EVIDENCE_ICON: Record<Evidence["kind"], typeof FileText> = {
  ticket: MessageSquareWarning,
  payment: CreditCard,
  contract: ScrollText,
  invoice: Receipt,
  contact: UserRound,
  policy: FileText,
};

const EVIDENCE_WORD: Record<Evidence["kind"], string> = {
  ticket: "See the ticket",
  payment: "See the payment",
  contract: "See the contract",
  invoice: "See the bill",
  contact: "See the contact",
  policy: "See the policy",
};

const APPROVE_LABEL: Record<Verdict, string> = {
  send: "Approve reminder",
  hold: "Hand off hold",
  paid: "Confirm it's paid",
  call: "Add to call list",
};

function Section({ title, icon: Icon, children }: { title: string; icon: typeof FileText; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        <Icon className="size-3.5" aria-hidden="true" />
        {title}
      </h3>
      {children}
    </section>
  );
}

export function InvoiceSheet({
  invoice,
  decision,
  asOf,
  startWithChange = false,
  onOpenChange,
  onApprove,
  onOverride,
  onUndo,
}: {
  invoice: Invoice | null;
  decision?: Decision;
  asOf: string;
  startWithChange?: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (inv: Invoice) => void;
  onOverride: (inv: Invoice, verdict: Verdict, reason: string) => void;
  onUndo: (inv: Invoice) => void;
}) {
  return (
    <Sheet open={invoice !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        {invoice && (
          <InvoiceDetail
            key={invoice.id}
            invoice={invoice}
            decision={decision}
            asOf={asOf}
            startWithChange={startWithChange}
            onApprove={onApprove}
            onOverride={onOverride}
            onUndo={onUndo}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function InvoiceDetail({
  invoice: inv,
  decision,
  asOf,
  startWithChange,
  onApprove,
  onOverride,
  onUndo,
}: {
  invoice: Invoice;
  decision?: Decision;
  asOf: string;
  startWithChange: boolean;
  onApprove: (inv: Invoice) => void;
  onOverride: (inv: Invoice, verdict: Verdict, reason: string) => void;
  onUndo: (inv: Invoice) => void;
}) {
  const [highlight, setHighlight] = useState<string | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(startWithChange && !decision);
  const [cap] = useAutoSendCap(results.autoSend?.maxAmount ?? null);
  const verdict = decision?.verdict ?? inv.verdict;
  const evidenceById = new Map(inv.evidence.map((e) => [e.id, e]));

  function jumpTo(evidenceId: string) {
    setHighlight(evidenceId);
    document.getElementById(`ev-${inv.id}-${evidenceId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => setHighlight((h) => (h === evidenceId ? null : h)), 1600);
  }

  const holdDays = inv.hold ? daysBetween(asOf, inv.hold.deadline) : null;
  const proof = keyProof(inv, verdict);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SheetHeader className="gap-3 border-b p-5 pr-12">
        <div className="flex flex-wrap items-center gap-2">
          <VerdictBadge verdict={verdict} />
          {decision?.status === "overridden" && (
            <span className="text-xs text-muted-foreground">
              tool said <span className="font-medium">{VERDICT_META[inv.verdict].label}</span>
            </span>
          )}
          {inv.confidence !== "high" && !decision && (
            <Badge
              variant="outline"
              className={cn(
                "font-normal",
                inv.confidence === "low" && "border-rose-500/40 text-rose-700 dark:text-rose-300",
              )}
            >
              {CONFIDENCE_LABEL[inv.confidence]}
            </Badge>
          )}
        </div>
        <div>
          <SheetTitle className="text-lg">
            {inv.customerId ? (
              <Link
                href={customerHref(inv.customerId)}
                className="inline-flex items-center gap-1 rounded underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                {inv.customerName}
                <ArrowUpRight className="size-4 text-muted-foreground" aria-hidden="true" />
              </Link>
            ) : (
              inv.customerName
            )}
          </SheetTitle>
          <SheetDescription className="tabular mt-1">
            {formatMoney(inv.amount, inv.currency)} · {inv.daysOverdue} days late · due {formatDate(inv.dueDate)}
          </SheetDescription>
        </div>
      </SheetHeader>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-6 p-5">
          {inv.needsReview && !decision && (
            <Alert className="border-rose-500/30 bg-rose-50 text-rose-900 dark:bg-rose-400/10 dark:text-rose-100">
              <Flag aria-hidden="true" />
              <AlertTitle>Check first</AlertTitle>
              <AlertDescription className="text-rose-900/80 dark:text-rose-100/80">
                {plainReview(inv)}
              </AlertDescription>
            </Alert>
          )}

          {decision && (
            <Alert className="border-emerald-500/30 bg-emerald-50 text-emerald-900 dark:bg-emerald-400/10 dark:text-emerald-100">
              <BadgeCheck aria-hidden="true" />
              <AlertTitle>
                {decision.status === "approved"
                  ? `Approved: ${VERDICT_META[decision.verdict].label}`
                  : `Changed to ${VERDICT_META[decision.verdict].label}`}
              </AlertTitle>
              {decision.reason && (
                <AlertDescription className="text-emerald-900/80 dark:text-emerald-100/80">
                  Reason: {decision.reason}
                </AlertDescription>
              )}
            </Alert>
          )}

          <section aria-label="What to do" className="rounded-xl border bg-muted/30 p-4">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">What to do</p>
            <p className="mt-1 text-base leading-snug font-medium">{answerLine(inv, verdict)}</p>
            {proof && (
              <div className="mt-3 rounded-lg border-l-4 bg-card p-3 text-sm" style={{ borderLeftColor: VERDICT_META[verdict].chart }}>
                <p className="text-xs text-muted-foreground">{proof.label}</p>
                <p className="mt-0.5 font-medium">{proof.title}</p>
                {proof.detail && <p className="mt-1 leading-relaxed text-muted-foreground">{proof.detail}</p>}
                {(proof.date || proof.audit) && (
                  <p className="mt-1.5 text-[11px] text-muted-foreground/80">
                    {proof.date}
                    {proof.date && proof.audit && " · "}
                    {proof.audit && <span className="font-mono">{proof.audit}</span>}
                  </p>
                )}
              </div>
            )}
            {inv.autoSend && (
              <p className="mt-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Auto-send:</span>{" "}
                {couldAutoSend(inv, cap)
                  ? "could go out on its own once the trust ladder is on. Today a person approves it."
                  : inv.autoSend.eligible
                    ? `not now. Over the ${cap === null ? "size" : "$" + cap.toLocaleString("en-US")} limit for small reminders (Priya can change it).`
                  : `${inv.autoSend.permanent ? "never" : "not now"}. ${inv.autoSend.why}.`}
              </p>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground/80">
              Invoice <span className="font-mono">{inv.id}</span>
            </p>
          </section>

          <Section title="Why the tool suggests this" icon={FileText}>
            <ol className="space-y-2.5">
              {inv.reasons.map((r, i) => (
                <li key={i} className="rounded-lg border bg-card p-3 text-sm">
                  <p className="leading-relaxed">{r.text}</p>
                  {(r.policyRef || r.evidenceIds.length > 0) && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {r.policyRef && (
                        <Badge variant="outline" className="text-[11px] font-normal">
                          Policy: {r.policyRef}
                        </Badge>
                      )}
                      {r.evidenceIds.map((id) =>
                        evidenceById.has(id) ? (
                          <button
                            key={id}
                            type="button"
                            onClick={() => jumpTo(id)}
                            title={evidenceById.get(id)!.recordId}
                            className="inline-flex h-5 items-center rounded-full bg-secondary px-2 text-[11px] text-secondary-foreground outline-none hover:bg-secondary/70 focus-visible:ring-2 focus-visible:ring-ring/50"
                          >
                            {EVIDENCE_WORD[evidenceById.get(id)!.kind]}
                          </button>
                        ) : null,
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </Section>

          {inv.hold && (
            <Section title="Hold: pause and hand to the owner" icon={CalendarClock}>
              <div className="rounded-lg border border-amber-500/30 bg-amber-50/60 p-3 text-sm dark:bg-amber-400/5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-medium">
                    <Users className="size-4 text-muted-foreground" aria-hidden="true" />
                    {inv.hold.owner}
                    <span className="font-normal text-muted-foreground">· {inv.hold.ownerRole}</span>
                  </span>
                  <span className="tabular text-xs font-medium">
                    Due {formatDate(inv.hold.deadline)}
                    {holdDays !== null && (
                      <span className="text-muted-foreground">
                        {" "}
                        · {holdDays} {Math.abs(holdDays) === 1 ? "day" : "days"} to act
                      </span>
                    )}
                  </span>
                </div>
                <p className="mt-2 leading-relaxed">{inv.hold.action}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  If nobody acts by the deadline, the bill goes back to finance, flagged.
                </p>
              </div>
            </Section>
          )}

          {inv.draft && inv.draft.tone !== "none" && inv.draft.body ? (
            <DraftSection invoice={inv} />
          ) : verdict === "paid" || verdict === "hold" ? null : (
            <Section title={verdict === "call" ? "Before you call" : "Message"} icon={verdict === "call" ? Phone : Mail}>
              <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                {verdict === "send" && "No draft for this bill. Write the reminder by hand, or change what to do."}
                {verdict === "call" && (
                  <>
                    <p>
                      Call about <span className="font-medium text-foreground">{formatMoney(inv.amount, inv.currency)}</span>, due{" "}
                      {formatDate(inv.dueDate)} ({inv.daysOverdue} days late).
                      {inv.draft?.to && (
                        <>
                          {" "}Contact: <span className="font-medium text-foreground">{inv.draft.to}</span>.
                        </>
                      )}
                    </p>
                    <p className="mt-1.5">Talking points: the reasons above.</p>
                  </>
                )}
              </div>
            </Section>
          )}

          {inv.agreement && (
            <Section title="AI double-check" icon={Sparkles}>
              <div className="rounded-lg border">
                <div className="flex items-center justify-between gap-3 border-b px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Keyword rules and two AI models read the ticket separately.</span>
                  <Badge
                    className={cn(
                      "ring-1 ring-inset",
                      inv.agreement.agree
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300"
                        : "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-400/10 dark:text-rose-300",
                    )}
                  >
                    {inv.agreement.agree ? "AI agrees" : "The AI wasn't sure"}
                  </Badge>
                </div>
                <ul className="divide-y text-sm">
                  {inv.agreement.votes.map((v, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 px-3 py-2">
                      <span className="truncate text-muted-foreground">{judgeLabel(v.judge)}</span>
                      <span className="shrink-0 text-xs font-medium">{VOTE_LABEL[v.answer] ?? v.answer}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Section>
          )}

          <Section title="All the proof" icon={Receipt}>
            {inv.evidence.length === 0 ? (
              <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">No linked records.</p>
            ) : (
              <ul className="space-y-2">
                {inv.evidence.map((e) => {
                  const Icon = EVIDENCE_ICON[e.kind] ?? FileText;
                  return (
                    <li
                      key={e.id}
                      id={`ev-${inv.id}-${e.id}`}
                      className={cn(
                        "rounded-lg border p-3 text-sm transition-colors duration-500",
                        highlight === e.id && "border-ring bg-accent",
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                            <span className="font-medium">{e.title}</span>
                            {e.status && (
                              <Badge variant="outline" className="font-normal capitalize">
                                {e.status}
                              </Badge>
                            )}
                          </div>
                          {e.date && <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(e.date)}</p>}
                          {e.detail && <p className="mt-2 leading-relaxed text-muted-foreground">{e.detail}</p>}
                          <p className="mt-1.5 font-mono text-[11px] text-muted-foreground/70">
                            {e.file} · {e.recordId}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-background p-4">
        {decision ? (
          <Button variant="ghost" onClick={() => onUndo(inv)}>
            <Undo2 />
            Undo decision
          </Button>
        ) : (
          <Button variant="outline" onClick={() => setOverrideOpen(true)}>
            Change what to do
          </Button>
        )}
        {!decision && (
          <Button onClick={() => onApprove(inv)}>
            <BadgeCheck />
            {APPROVE_LABEL[verdict]}
          </Button>
        )}
      </div>

      <OverrideDialog
        open={overrideOpen}
        onOpenChange={setOverrideOpen}
        current={inv.verdict}
        onSave={(v, reason) => {
          onOverride(inv, v, reason);
          setOverrideOpen(false);
        }}
      />
    </div>
  );
}

function DraftSection({ invoice: inv }: { invoice: Invoice }) {
  const draft = inv.draft!;
  const [tone, setTone] = useState<Tone>(draft.tone === "none" ? "standard" : draft.tone);
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [redraft, setRedraft] = useState<{ subject: string; body: string } | null>(null);
  const shown = redraft ?? { subject: draft.subject, body: draft.body };
  const isCallNotes = draft.tone === "none";

  async function runRedraft() {
    setLoading(true);
    try {
      const res = await fetch("/api/redraft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: inv.id, tone, instruction: instruction.trim() || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { subject?: string; body?: string; error?: string };
      if (!res.ok || !data.body) {
        toast.error("AI redraft isn't available", {
          description: data.error ?? "The original draft is still here and works as is.",
        });
        return;
      }
      setRedraft({ subject: data.subject ?? draft.subject, body: data.body });
      toast.success("Redrafted. Read it before you approve.");
    } catch {
      toast.error("AI redraft isn't available", { description: "Check the connection. The original draft still works." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Section title={isCallNotes ? "Call notes" : "Draft message"} icon={Mail}>
      <div className="rounded-lg border">
        <dl className="space-y-1 border-b px-3 py-2.5 text-sm">
          <div className="flex gap-2">
            <dt className="w-14 shrink-0 text-muted-foreground">{isCallNotes ? "Call" : "To"}</dt>
            <dd className="min-w-0 break-words">{draft.to}</dd>
          </div>
          {!isCallNotes && (
            <div className="flex gap-2">
              <dt className="w-14 shrink-0 text-muted-foreground">Subject</dt>
              <dd className="min-w-0 font-medium break-words">{shown.subject}</dd>
            </div>
          )}
          <div className="flex gap-2">
            <dt className="w-14 shrink-0 text-muted-foreground">Tone</dt>
            <dd>
              {TONE_LABEL[draft.tone]}
              {redraft && <span className="text-muted-foreground"> · AI redraft ({TONE_LABEL[tone].toLowerCase()})</span>}
            </dd>
          </div>
        </dl>
        <p className="px-3 py-3 text-sm leading-relaxed whitespace-pre-wrap">{shown.body}</p>
        <div className="flex flex-wrap items-center gap-2 border-t px-3 py-2.5">
          <CopyButton text={isCallNotes ? shown.body : `Subject: ${shown.subject}\n\n${shown.body}`} />
          {redraft && (
            <Button variant="ghost" size="sm" onClick={() => setRedraft(null)}>
              <Undo2 />
              Original
            </Button>
          )}
        </div>
      </div>

      {!isCallNotes && (
        <div className="grid gap-2 rounded-lg border border-dashed p-3 sm:grid-cols-[9rem_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor={`tone-${inv.id}`} className="text-xs">
              Tone
            </Label>
            <Select value={tone} onValueChange={(v) => setTone(v as Tone)}>
              <SelectTrigger id={`tone-${inv.id}`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["standard", "soft", "card_update"] as Tone[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {TONE_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`instr-${inv.id}`} className="text-xs">
              Instruction (optional)
            </Label>
            <Input
              id={`instr-${inv.id}`}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="e.g. shorter, mention the PO number"
              maxLength={200}
            />
          </div>
          <Button variant="secondary" onClick={runRedraft} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
            Redraft with AI
          </Button>
        </div>
      )}
    </Section>
  );
}

function OverrideDialog({
  open,
  onOpenChange,
  current,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: Verdict;
  onSave: (verdict: Verdict, reason: string) => void;
}) {
  const options = VERDICTS.filter((v) => v !== current);
  const [verdict, setVerdict] = useState<Verdict>(options[0]);
  const [reason, setReason] = useState("");
  const valid = reason.trim().length >= 5;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change what to do</DialogTitle>
          <DialogDescription>
            The tool said <span className="font-medium text-foreground">{VERDICT_META[current].label}</span>. Your reason
            is logged and used to measure how often the tool is right.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) onSave(verdict, reason.trim());
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="override-verdict">Do this instead</Label>
            <Select value={verdict} onValueChange={(v) => setVerdict(v as Verdict)}>
              <SelectTrigger id="override-verdict" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((v) => (
                  <SelectItem key={v} value={v}>
                    {VERDICT_META[v].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="override-reason">Reason (required)</Label>
            <Textarea
              id="override-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. AP confirmed the payment run on Friday"
              rows={3}
              required
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={!valid}>
              Save change
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
