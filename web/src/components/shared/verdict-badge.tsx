import { VERDICT_META } from "@/lib/data";
import type { Verdict } from "@/lib/types";
import { cn } from "@/lib/utils";

export function VerdictBadge({ verdict, className }: { verdict: Verdict; className?: string }) {
  const meta = VERDICT_META[verdict];
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        meta.badge,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} aria-hidden="true" />
      {meta.label}
    </span>
  );
}
