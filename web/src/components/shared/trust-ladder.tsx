"use client";

import { Lock, Power, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, pluralize } from "@/lib/data";
import { couldAutoSend, useAutoSendCap } from "@/lib/auto-send";
import type { Invoice, Results } from "@/lib/types";

const KEY = "collections-check:auto-send";

// Maya's trust ladder: off by default, unlocks only after a month of approvals on record,
// and Priya or Dana can switch it off in one click at any time.
export function TrustLadder({ data, invoices }: { data: NonNullable<Results["autoSend"]>; invoices: Invoice[] }) {
  const [cap, setCap] = useAutoSendCap(data.maxAmount);
  const eligible = invoices.filter((i) => couldAutoSend(i, cap));
  const eligibleAmount = eligible.reduce((s, i) => s + i.amount, 0);
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
              {pluralize(eligible.length, "bill")} · {formatMoney(eligibleAmount)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Small, polite first or second reminders, outside the top 50, with no open ticket and no unmatched payment.
            </p>
            <label htmlFor="auto-send-cap" className="mt-3 block text-xs font-medium">
              Small means under
            </label>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">$</span>
              <input
                id="auto-send-cap"
                type="number"
                min={0}
                step={500}
                inputMode="numeric"
                value={cap ?? ""}
                onChange={(e) => setCap(e.target.value === "" ? null : Math.max(0, Number(e.target.value)))}
                className="tabular h-8 w-28 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              />
              {data.maxAmount !== null && cap !== data.maxAmount && (
                <button type="button" onClick={() => setCap(data.maxAmount)} className="text-xs text-muted-foreground underline underline-offset-2">
                  Reset to {formatMoney(data.maxAmount)}
                </button>
              )}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Priya can change this herself. Start tight, loosen after a quiet month (COO).</p>
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
