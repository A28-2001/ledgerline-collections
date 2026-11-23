"use client";

import { CircleHelp, Info } from "lucide-react";
import type { ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { GLOSSARY } from "@/lib/data";
import { cn } from "@/lib/utils";

// A small "i" that explains a number in one line. A popover, not a tooltip, so it works on touch.
export function InfoTip({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`What is “${label}”?`}
          className={cn(
            "inline-grid size-5 place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
            className,
          )}
        >
          <Info className="size-3.5" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="text-xs leading-relaxed">
        <p className="mb-1 font-semibold text-foreground">{label}</p>
        <div className="text-muted-foreground">{children}</div>
      </PopoverContent>
    </Popover>
  );
}

export function GlossaryButton({ compact = false }: { compact?: boolean }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="What the words mean"
          className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <CircleHelp className="size-4" aria-hidden="true" />
          {!compact && <span>What the words mean</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" side="top" className="w-80 p-0">
        <p className="border-b px-4 py-3 text-sm font-semibold">What the words mean</p>
        <dl className="max-h-[60vh] space-y-3 overflow-y-auto px-4 py-3 text-xs leading-relaxed">
          {GLOSSARY.map((g) => (
            <div key={g.term}>
              <dt className="font-medium text-foreground">{g.term}</dt>
              <dd className="text-muted-foreground">{g.meaning}</dd>
            </div>
          ))}
        </dl>
      </PopoverContent>
    </Popover>
  );
}
