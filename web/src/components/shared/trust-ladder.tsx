"use client";

import { Lock, Power, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, pluralize } from "@/lib/data";
import type { Results } from "@/lib/types";

const KEY = "collections-check:auto-send";

// Maya's trust ladder: off by default, unlocks only after a month of approvals on record,
// and Priya or Dana can switch it off in one click at any time.
export function TrustLadder({ data }: { data: NonNullable<Results["autoSend"]> }) {
  // Off unless unlocked AND switched on earlier on this device. Storage errors leave it off.
  const [on, setOn] = useState(() => {
    if (typeof window === "undefined" || data.daysOnRecord < data.daysNeeded) return false;
    try {
      return window.localStorage.getItem(KEY) === "on";
    } catch {
      return false;
    }
  });
  const unlocked = data.daysOnRecord >= data.daysNeeded;
  const toggle = () => {
    const next = !on;
    setOn(next);
    try {
      window.localStorage.setItem(KEY, next ? "on" : "off");
    } catch {
      /* ignore */
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 leading-snug">
          <ShieldCheck className="size-4 text-muted-foreground" aria-hidden="true" />
          Auto-send is off. It stays off until a month of Priya&apos;s approvals is on record.
        </CardTitle>
        <CardDescription>The trust ladder, in the COO&apos;s words. Every reminder goes through a person today.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
          <div>
            <p className="font-medium">Auto-send for small, polite reminders</p>
            <p className="text-xs text-muted-foreground">
              {unlocked
                ? "Approvals on record are enough. Priya or Dana can switch it on or off here."
                : `${data.daysOnRecord} of ${data.daysNeeded} days of approvals on record. Locked until then.`}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label="Auto-send"
            disabled={!unlocked}
            onClick={toggle}
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-60"
          >
            {unlocked ? <Power className="size-3.5" aria-hidden="true" /> : <Lock className="size-3.5" aria-hidden="true" />}
            {on ? "On: click to switch off" : unlocked ? "Off: click to switch on" : "Off (locked)"}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Could go out on their own later</p>
            <p className="tabular mt-1 text-lg font-semibold">
              {pluralize(data.eligibleCount, "bill")} · {formatMoney(data.eligibleAmount)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Small, polite first or second reminders, outside the top 50, with no open ticket and no unmatched payment.
              {data.maxAmount === null ? " The size limit for “small” isn't set yet." : ` Up to ${formatMoney(data.maxAmount)}.`}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Always with a person</p>
            <p className="tabular mt-1 text-lg font-semibold">{pluralize(data.permanentCount, "bill")} today</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Top-50 accounts, disputed or probably-paid bills, anything firmer than a friendly nudge, and every phone call. Permanently.
            </p>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{data.rule}</p>
      </CardContent>
    </Card>
  );
}
