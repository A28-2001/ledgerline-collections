// A vertical timeline: date, a dot on a rail, and one line per event. Ends at today's suggestion.
// No hooks, so it renders on the server (customer page) and inside the client bill panel.
import { formatDate } from "@/lib/data";
import type { TimelineEvent, TimelineTone } from "@/lib/timeline";
import { cn } from "@/lib/utils";

const DOT: Record<TimelineTone, string> = {
  neutral: "bg-card border-2 border-foreground/35",
  send: "bg-send",
  hold: "bg-hold",
  paid: "bg-paid",
  call: "bg-call",
  alert: "bg-alert",
};

const TODAY_ROW: Record<TimelineTone, string> = {
  neutral: "bg-muted",
  send: "bg-send-soft",
  hold: "bg-hold-soft",
  paid: "bg-paid-soft",
  call: "bg-call-soft",
  alert: "bg-alert-soft",
};

function Row({ e, compact, showYear, last }: { e: TimelineEvent; compact: boolean; showYear: boolean; last: boolean }) {
  const today = e.kind === "today";
  return (
    <>
      {showYear && (
        <li className="grid grid-cols-[3.25rem_1rem_minmax(0,1fr)] gap-x-2" aria-hidden="true">
          <span className="tabular pt-2 pb-1 text-right text-[11px] font-semibold text-muted-foreground">{e.date.slice(0, 4)}</span>
          <span className="relative flex justify-center">
            <span className="absolute inset-y-0 w-px bg-border" />
          </span>
          <span />
        </li>
      )}
      <li className="grid grid-cols-[3.25rem_1rem_minmax(0,1fr)] gap-x-2">
        <span className={cn("tabular pt-1.5 text-right text-xs", today ? "font-semibold text-foreground" : "text-muted-foreground")}>
          {formatDate(e.date, false)}
        </span>
        <span className="relative flex justify-center" aria-hidden="true">
          <span className={cn("absolute top-0 w-px bg-border", last ? "h-2.5" : "inset-y-0")} />
          <span
            className={cn(
              "relative mt-2 shrink-0 rounded-full",
              today ? "size-3 ring-4 ring-card" : "size-2.5",
              DOT[e.tone],
              e.citedAs && "ring-2 ring-gold ring-offset-2 ring-offset-card",
            )}
          />
        </span>
        <div
          className={cn(
            "min-w-0 rounded-md px-2 py-1",
            compact ? "text-xs" : "text-sm",
            today && cn(TODAY_ROW[e.tone], "my-0.5 py-1.5"),
            e.citedAs && !today && "bg-hold-soft/70",
          )}
        >
          {today && e.note && <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{e.note}</p>}
          <p className={cn("leading-snug break-words", today && "font-medium")}>{e.title}</p>
          {(e.citedAs || (!today && e.note)) && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {e.citedAs && <span className="font-semibold text-hold-ink">{e.citedAs}</span>}
              {e.citedAs && !today && e.note && " · "}
              {!today && e.note}
            </p>
          )}
        </div>
      </li>
    </>
  );
}

function Rows({ events, compact, endsHere }: { events: TimelineEvent[]; compact: boolean; endsHere: boolean }) {
  return (
    <ol className="space-y-0.5">
      {events.map((e, i) => (
        <Row
          key={e.key}
          e={e}
          compact={compact}
          last={endsHere && i === events.length - 1}
          showYear={i === 0 || e.date.slice(0, 4) !== events[i - 1].date.slice(0, 4)}
        />
      ))}
    </ol>
  );
}

export function CustomerTimeline({
  events,
  compact = false,
  earlierBefore,
}: {
  events: TimelineEvent[];
  compact?: boolean;
  // Events before this ISO date fold away, unless the suggestion cites them.
  earlierBefore?: string;
}) {
  const earlier = earlierBefore ? events.filter((e) => e.date < earlierBefore && !e.citedAs && e.kind !== "today") : [];
  const recent = earlier.length ? events.filter((e) => !earlier.includes(e)) : events;
  return (
    <div>
      {earlier.length > 0 && (
        <details className="group mb-1">
          <summary className="ml-[5.25rem] cursor-pointer rounded text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50">
            <span className="group-open:hidden">
              Show {earlier.length} earlier {earlier.length === 1 ? "event" : "events"} (since {earlier[0].date.slice(0, 4)})
            </span>
            <span className="hidden group-open:inline">Hide earlier events</span>
          </summary>
          <div className="mt-1">
            <Rows events={earlier} compact={compact} endsHere={false} />
          </div>
        </details>
      )}
      <Rows events={recent} compact={compact} endsHere />
      {events.some((e) => e.citedAs) && (
        <p className="mt-2 ml-[5.25rem] flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="inline-block size-2 rounded-full ring-2 ring-gold ring-offset-1 ring-offset-card" aria-hidden="true" />
          Gold ring: the record behind the suggestion
        </p>
      )}
    </div>
  );
}
