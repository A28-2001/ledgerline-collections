// Ledgerline's reminder schedule (due, day 7, 21, 45, 90) and where one bill sits on it.
// Full version for the bill panel; tiny dots for the Today rows. No hooks, so it renders anywhere.
import { CirclePause, CircleCheck } from "lucide-react";
import { SCHEDULE, schedulePosition, type ScheduleState } from "@/lib/reminder-schedule";
import type { Invoice, Verdict } from "@/lib/types";
import { cn } from "@/lib/utils";

const CURRENT: Record<Verdict | "waiting", string> = {
  send: "bg-send text-send-contrast",
  hold: "bg-hold text-hold-contrast",
  paid: "bg-paid text-paid-contrast",
  call: "bg-call text-call-contrast",
  waiting: "border-2 border-dashed border-muted-foreground/60 bg-card text-muted-foreground",
};

const STATE_WORD: Record<ScheduleState, string> = {
  active: "",
  waiting: "Waiting for day 7",
  paused: "Paused (hold)",
  paid: "Probably paid",
};

export function ReminderStepper({ invoice: inv, verdict }: { invoice: Invoice; verdict: Verdict }) {
  const pos = schedulePosition(inv, verdict);
  const currentClass = CURRENT[pos.state === "waiting" ? "waiting" : verdict];
  const stopped = pos.state === "paused" || pos.state === "paid";

  return (
    <div className="rounded-lg border bg-card p-3">
      <ol className="grid grid-cols-5" aria-label="Reminder schedule">
        {SCHEDULE.map((s, i) => {
          const past = i < pos.step;
          const current = i === pos.step;
          return (
            <li key={s.day} className="relative flex flex-col items-center text-center" aria-current={current ? "step" : undefined}>
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-3 right-1/2 w-full -translate-y-1/2",
                    i <= pos.step ? "h-0.5 bg-foreground/35" : stopped ? "h-0 border-t-2 border-dashed border-foreground/20" : "h-0.5 bg-border",
                  )}
                />
              )}
              <span
                className={cn(
                  "relative z-10 grid size-6 place-items-center rounded-full text-[10px] font-semibold",
                  current ? cn(currentClass, "ring-4 ring-card") : past ? "bg-foreground/70 text-background" : "border-2 border-border bg-card",
                )}
                aria-hidden="true"
              >
                {current && pos.state === "paused" ? (
                  <CirclePause className="size-3.5" />
                ) : current && pos.state === "paid" ? (
                  <CircleCheck className="size-3.5" />
                ) : null}
              </span>
              <span className={cn("mt-1.5 text-[11px] leading-tight", current ? "font-semibold text-foreground" : "text-muted-foreground")}>
                {s.short}
              </span>
              <span className={cn("text-[11px] leading-tight", current ? "text-foreground" : "text-muted-foreground", stopped && i > pos.step && "line-through decoration-muted-foreground/50")}>
                {s.label}
              </span>
              <span className="sr-only">{past ? "(passed)" : current ? "(this bill is here)" : "(not yet)"}</span>
            </li>
          );
        })}
      </ol>
      <div className="mt-3 border-t pt-2.5 text-sm">
        {STATE_WORD[pos.state] && (
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{STATE_WORD[pos.state]}</p>
        )}
        <p className="leading-snug">{pos.line}</p>
        {pos.next && <p className="mt-1 text-xs text-muted-foreground">Next: {pos.next}</p>}
        {pos.cardWriteOff && <p className="mt-1 text-xs text-muted-foreground">{pos.cardWriteOff}</p>}
        <p className="mt-1.5 text-[11px] text-muted-foreground/80">Schedule from Ledgerline&rsquo;s collections policy and FIN-1 process map.</p>
      </div>
    </div>
  );
}

// Five tiny dots for a Today row. Hidden on phones, where the row has no room.
export function ReminderDots({ invoice: inv, verdict, className }: { invoice: Invoice; verdict: Verdict; className?: string }) {
  const pos = schedulePosition(inv, verdict);
  const currentClass = pos.state === "waiting" ? "border border-dashed border-muted-foreground bg-transparent" : CURRENT[verdict];
  const where = pos.state === "waiting" ? "waiting for day 7" : `${SCHEDULE[pos.step].short.toLowerCase()}, ${SCHEDULE[pos.step].label.toLowerCase()}`;
  const label = `Reminder schedule: day ${pos.day}, ${where}${STATE_WORD[pos.state] && pos.state !== "waiting" ? `, ${STATE_WORD[pos.state].toLowerCase()}` : ""}`;
  return (
    <span className={cn("items-center gap-0.5", className)} role="img" aria-label={label} title={label}>
      {SCHEDULE.map((s, i) => (
        <span
          key={s.day}
          className={cn(
            "rounded-full",
            i === pos.step ? cn("size-2", currentClass) : i < pos.step ? "size-1.5 bg-foreground/45" : "size-1.5 border border-foreground/25",
          )}
        />
      ))}
    </span>
  );
}
