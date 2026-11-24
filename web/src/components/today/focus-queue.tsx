"use client";

import { ArrowRight, Check, PencilLine } from "lucide-react";
import { useState, type ReactNode } from "react";
import { VerdictBadge } from "@/components/shared/verdict-badge";
import { Button } from "@/components/ui/button";
import { answerLine, keyProof, type KeyProof } from "@/lib/bill-text";
import { formatMoney, sumAmount, VERDICT_META } from "@/lib/data";
import { SCHEDULE } from "@/lib/reminder-schedule";
import type { Invoice, Verdict } from "@/lib/types";
import { cn } from "@/lib/utils";

// One customer at a time: the card on the left gets the full attention, the queue on the right shows what's next.
// Deciding the card removes it from the queue and the next one moves in.
export type FocusItem = { key: string; bills: Invoice[]; why: string };

const QUEUE_SHOWN = 8;
const SHORT_ANSWER: Record<Verdict, string> = { paid: "Paid", hold: "Hold", send: "Send", call: "Call" };

export function FocusQueue({
  items,
  verdictOf,
  primaryLabel,
  onPrimary,
  onChange,
  onOpen,
  footer,
  doneText,
  emptyText,
  proofOf,
  extra,
}: {
  items: FocusItem[];
  verdictOf: (inv: Invoice) => Verdict;
  primaryLabel: (item: FocusItem) => string;
  onPrimary: (item: FocusItem) => void;
  onChange: (item: FocusItem) => void;
  onOpen: (item: FocusItem) => void;
  footer?: ReactNode;
  doneText?: string;
  emptyText: string;
  proofOf?: (inv: Invoice) => KeyProof | null;
  extra?: (item: FocusItem) => ReactNode;
}) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [queueShown, setQueueShown] = useState(QUEUE_SHOWN);

  if (items.length === 0) {
    return (
      <div className="mt-3 space-y-3">
        <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">{emptyText}</p>
        {footer}
      </div>
    );
  }

  const found = items.findIndex((i) => i.key === activeKey);
  const idx = found >= 0 ? found : 0;
  const active = items[idx];
  const inv = active.bills[0];
  const verdict = verdictOf(inv);
  const proof = proofOf ? proofOf(inv) : keyProof(inv, verdict);
  const total = sumAmount(active.bills);

  const go = (step: number) => setActiveKey(items[(idx + step + items.length) % items.length].key);
  const decide = () => {
    const next = items[idx + 1] ?? items[idx - 1];
    onPrimary(active);
    setActiveKey(next ? next.key : null);
  };

  function onKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;
    const k = e.key.toLowerCase();
    if (k === "enter") {
      e.preventDefault();
      decide();
    } else if (k === "c") {
      e.preventDefault();
      onChange(active);
    } else if (k === "arrowdown" || k === "arrowright" || k === "j") {
      e.preventDefault();
      go(1);
    } else if (k === "arrowup" || k === "arrowleft" || k === "k") {
      e.preventDefault();
      go(-1);
    }
  }

  return (
    <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,17rem)]">
      <div
        tabIndex={0}
        onKeyDown={onKey}
        aria-label={`${inv.customerName}, ${formatMoney(total, inv.currency)}. Enter: ${primaryLabel(active)}. C: change. Down arrow: next.`}
        className="glass-card rounded-2xl border bg-background p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:p-5"
        style={{ borderTopWidth: 4, borderTopColor: VERDICT_META[verdict].chart }}
      >
        <div key={active.key} className="animate-in fade-in-0 slide-in-from-right-3 duration-200 motion-reduce:animate-none">
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="tabular font-medium">
              {idx + 1} of {items.length}
            </span>
            <VerdictBadge verdict={verdict} />
          </div>
          <h4 className="mt-2 text-xl leading-tight font-semibold tracking-tight">{inv.customerName}</h4>
          <p className="tabular mt-1 text-sm text-muted-foreground">
            <span className="text-2xl font-semibold text-foreground">{formatMoney(total, inv.currency)}</span>
            {active.bills.length > 1 ? ` · ${active.bills.length} bills` : ""} · {inv.daysOverdue} days late
          </p>
          <PolicyRuler days={inv.daysOverdue} color={VERDICT_META[verdict].chart} />

          <p className="mt-4 text-[15px] leading-relaxed font-medium">{active.why}</p>

          {proof && (
            <div className="mt-3 rounded-lg border-l-4 bg-muted/40 px-3 py-2.5 text-sm" style={{ borderLeftColor: VERDICT_META[verdict].chart }}>
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{proof.label}</p>
              <p className="mt-0.5 font-medium">{proof.title}</p>
              {proof.detail && <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{proof.detail}</p>}
            </div>
          )}

          <p className="mt-3 text-sm text-muted-foreground">{answerLine(inv, verdict)}</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button onClick={decide}>
              <Check />
              {primaryLabel(active)}
            </Button>
            {extra?.(active)}
            <Button variant="outline" onClick={() => onChange(active)}>
              <PencilLine />
              Change
            </Button>
            <Button variant="ghost" onClick={() => onOpen(active)}>
              Full details
              <ArrowRight />
            </Button>
          </div>
          <p className="mt-3 hidden text-[11px] text-muted-foreground sm:block">
            Keys: <kbd className="rounded border px-1">Enter</kbd> {primaryLabel(active).toLowerCase()} · <kbd className="rounded border px-1">C</kbd>{" "}
            change · <kbd className="rounded border px-1">↓</kbd> next
          </p>
        </div>
      </div>

      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">In this step · {items.length}</p>
        <ul className="mt-2 divide-y overflow-hidden rounded-lg border bg-background">
          {items.slice(0, queueShown).map((it, i) => {
            const b = it.bills[0];
            return (
              <li key={it.key}>
                <button
                  type="button"
                  onClick={() => setActiveKey(it.key)}
                  aria-current={i === idx ? "true" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset",
                    i === idx && "bg-muted font-medium",
                  )}
                >
                  <span className="size-2 shrink-0 rounded-full" style={{ background: VERDICT_META[verdictOf(b)].chart }} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{b.customerName}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{SHORT_ANSWER[verdictOf(b)]}</span>
                  <span className="tabular shrink-0 text-xs text-muted-foreground">{formatMoney(Math.round(sumAmount(it.bills)), b.currency)}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {items.length > queueShown && (
          <button
            type="button"
            onClick={() => setQueueShown((n) => n + 25)}
            className="mt-2 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Show {Math.min(25, items.length - queueShown)} more ({items.length - queueShown} left)
          </button>
        )}
        {doneText && <p className="mt-2 text-xs text-muted-foreground">{doneText}</p>}
        {footer && <div className="mt-3">{footer}</div>}
      </div>
    </div>
  );
}

// Ledgerline's collections policy as five stages: a grace week, two reminders, a call, then the VP Finance.
// The stage this bill has reached is lit in its answer's colour; the dot marks its exact day.
const STAGES = SCHEDULE.map((st, k) => ({
  from: st.day,
  to: SCHEDULE[k + 1]?.day ?? st.day + 60,
  label: k === 0 ? "Grace week" : st.label,
}));

function PolicyRuler({ days, color }: { days: number; color: string }) {
  const found = STAGES.findIndex((st) => days < st.to);
  const i = found === -1 ? STAGES.length - 1 : found;
  const stage = STAGES[i];
  const frac = Math.min(1, Math.max(0, (days - stage.from) / (stage.to - stage.from)));
  const left = ((i + frac) / STAGES.length) * 100;
  return (
    <div className="mt-3 max-w-md" role="img" aria-label={`Day ${days} late: the ${stage.label} stage of the collections policy`}>
      <div className="relative grid grid-cols-5 gap-0.5">
        {STAGES.map((st, k) => (
          <span
            key={st.label}
            title={k === 0 ? "Due date to day 7" : `From day ${st.from}: ${st.label}`}
            className="h-1.5 rounded-full"
            style={{ background: k < i ? `color-mix(in oklab, ${color} 40%, var(--muted))` : k === i ? color : "var(--muted)" }}
          />
        ))}
        <span
          className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background shadow-sm"
          style={{ left: `${left}%`, background: color }}
          aria-hidden="true"
        />
      </div>
      <div className="mt-1 grid grid-cols-5 gap-0.5 text-[10px] leading-tight text-muted-foreground" aria-hidden="true">
        {STAGES.map((st, k) => (
          <span key={st.label} className={cn("truncate", k === i ? "font-semibold text-foreground" : "invisible sm:visible")}>
            {st.label}
          </span>
        ))}
      </div>
    </div>
  );
}
