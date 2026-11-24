"use client";

import Link from "next/link";
import { Bar, BarChart, CartesianGrid, LabelList, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { customerHref, formatMoney, formatPercent, VERDICT_META, VERDICTS } from "@/lib/data";
import type { Verdict } from "@/lib/types";
import { cn } from "@/lib/utils";

const verdictConfig: ChartConfig = Object.fromEntries(
  VERDICTS.map((v) => [v, { label: VERDICT_META[v].label, color: VERDICT_META[v].chart }]),
);

export function VerdictLegend({ className }: { className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground", className)} aria-label="Colours">
      {VERDICTS.map((v) => (
        <li key={v} className="flex items-center gap-1.5">
          <span className={cn("size-2 rounded-sm", VERDICT_META[v].dot)} aria-hidden="true" />
          {VERDICT_META[v].label}
        </li>
      ))}
    </ul>
  );
}

type SplitRow = { total: number; count?: number } & Record<Verdict, number>;



// A tiny constant added on top of each stack so the total label always has a bar to sit on.
function withPad<T extends { total: number }>(rows: T[]): (T & { pad: number })[] {
  const max = Math.max(0, ...rows.map((r) => r.total));
  return rows.map((r) => ({ ...r, pad: r.total > 0 ? max * 0.002 : 0 }));
}

function SplitTooltip({ title, row }: { title: string; row: SplitRow }) {
  return (
    <div className="min-w-44 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="font-medium">{title}</div>
      <div className="tabular mb-1.5 text-muted-foreground">
        {formatMoney(row.total)}
        {row.count !== undefined && ` · ${row.count} ${row.count === 1 ? "bill" : "bills"}`}
      </div>
      <ul className="space-y-0.5">
        {VERDICTS.filter((v) => row[v] > 0).map((v) => (
          <li key={v} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5">
              <span className={cn("size-2 rounded-sm", VERDICT_META[v].dot)} aria-hidden="true" />
              {VERDICT_META[v].label}
            </span>
            <span className="tabular">{formatMoney(row[v])}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Overdue money by how late it is, split by what to do.
export function AgeChart({ rows: input }: { rows: ({ bucket: string; label: string } & SplitRow)[] }) {
  const rows = withPad(input);
  return (
    <ChartContainer config={verdictConfig} className="aspect-auto h-56 w-full">
      <BarChart data={rows} margin={{ left: 0, right: 8, top: 20, bottom: 0 }} barCategoryGap="22%">
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
        <YAxis tickFormatter={(v: number) => formatMoney(v, "USD", true)} tickLine={false} axisLine={false} width={48} fontSize={11} />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={({ active, payload }) => {
            const row = active && payload?.length ? (payload[0].payload as (typeof rows)[number]) : null;
            return row ? <SplitTooltip title={row.label} row={row} /> : null;
          }}
        />
        {VERDICTS.map((v) => (
          <Bar key={v} dataKey={v} stackId="a" fill={VERDICT_META[v].chart} isAnimationActive={false} />
        ))}
        {/* Invisible sliver on top of each stack that carries the total label (works even when the top colour is 0). */}
        <Bar dataKey="pad" stackId="a" fill="transparent" isAnimationActive={false}>
          <LabelList
            dataKey="total"
            position="top"
            className="fill-foreground"
            fontSize={11}
            formatter={(val: unknown) => (Number(val) > 0 ? formatMoney(Number(val), "USD", true) : "")}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

// Top customers by overdue money, split by what to do.
export function TopCustomersChart({
  rows: input,
}: {
  rows: ({ key: string; id: string | null; name: string } & SplitRow)[];
}) {
  if (input.length === 0) return null;
  const rows = withPad(input);
  return (
    <div>
      <ChartContainer config={verdictConfig} className="aspect-auto w-full" style={{ height: Math.max(200, rows.length * 34) }}>
        <BarChart data={rows} layout="vertical" margin={{ left: 0, right: 64, top: 0, bottom: 0 }} barCategoryGap={6}>
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis
            type="category"
            dataKey="name"
            width={150}
            tickLine={false}
            axisLine={false}
            fontSize={12}
            tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 21)}…` : v)}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.5 }}
            content={({ active, payload }) => {
              const row = active && payload?.length ? (payload[0].payload as (typeof rows)[number]) : null;
              return row ? <SplitTooltip title={row.name} row={row} /> : null;
            }}
          />
          {VERDICTS.map((v) => (
            <Bar key={v} dataKey={v} stackId="a" fill={VERDICT_META[v].chart} isAnimationActive={false} />
          ))}
          <Bar dataKey="pad" stackId="a" fill="transparent" isAnimationActive={false}>
            <LabelList
              dataKey="total"
              position="right"
              className="fill-foreground"
              fontSize={11}
              formatter={(val: unknown) => formatMoney(Number(val), "USD", true)}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
      <p className="sr-only">
        {rows.map((r) => `${r.name}: ${formatMoney(r.total)}`).join("; ")}
      </p>
      <ul className="mt-3 flex flex-wrap items-center gap-1.5 text-xs" aria-label="Open a customer">
        <li className="text-muted-foreground">Open:</li>
        {rows
          .filter((r) => r.id)
          .slice(0, 5)
          .map((r) => (
            <li key={r.key}>
              <Link
                href={customerHref(r.id!)}
                className="inline-flex rounded-full border px-2 py-0.5 text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                {r.name}
              </Link>
            </li>
          ))}
      </ul>
    </div>
  );
}

// How many bills fall in each "days late" range.
export function DaysHistogram({ rows }: { rows: { label: string; count: number; amount: number }[] }) {
  const config: ChartConfig = { count: { label: "Bills", color: "var(--accent-brand)" } };
  return (
    <ChartContainer config={config} className="aspect-auto h-52 w-full">
      <BarChart data={rows} margin={{ left: 0, right: 8, top: 20, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} fontSize={11} />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={({ active, payload }) => {
            const row = active && payload?.length ? (payload[0].payload as (typeof rows)[number]) : null;
            if (!row) return null;
            return (
              <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                <div className="font-medium">{row.label} days late</div>
                <div className="tabular mt-1 text-muted-foreground">
                  {row.count} {row.count === 1 ? "bill" : "bills"} · {formatMoney(row.amount)}
                </div>
              </div>
            );
          }}
        />
        <Bar dataKey="count" fill="var(--accent-brand)" radius={[4, 4, 0, 0]} maxBarSize={56} isAnimationActive={false}>
          <LabelList dataKey="count" position="top" className="fill-foreground" fontSize={11} />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

// Horizontal bars with a label, a value and a share. Plain HTML so labels stay readable in narrow cards.
export function ShareBars({
  rows,
  colors = {},
}: {
  rows: { key: string; label: string; count: number }[];
  colors?: Record<string, string>;
}) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{r.label}</span>
            <span className="tabular shrink-0 text-muted-foreground">
              {r.count.toLocaleString("en-US")} · {formatPercent(total ? r.count / total : 0, 1)}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full" style={{ width: `${(r.count / max) * 100}%`, background: colors[r.key] ?? "var(--accent-brand)" }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

// A half-circle gauge for a 0..1 rate.
export function Gauge({ value, label, sublabel }: { value: number; label: string; sublabel?: string }) {
  const v = Math.max(0, Math.min(1, value));
  const r = 80;
  const c = Math.PI * r;
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 112" className="w-full max-w-60" role="img" aria-label={`${label}: ${formatPercent(v)}`}>
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="var(--muted)" strokeWidth="16" strokeLinecap="round" />
        <path
          d="M20 100 A80 80 0 0 1 180 100"
          fill="none"
          stroke="var(--accent-brand)"
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${c * v} ${c}`}
        />
        <text x="100" y="92" textAnchor="middle" className="fill-foreground tabular" fontSize="30" fontWeight="600">
          {formatPercent(v)}
        </text>
      </svg>
      <p className="mt-1 text-sm font-medium">{label}</p>
      {sublabel && <p className="mt-0.5 text-center text-xs text-muted-foreground">{sublabel}</p>}
    </div>
  );
}

// Two-part bar: e.g. AI checks agreed vs disagreed.
export function SplitBar({
  parts,
  ariaLabel,
}: {
  parts: { label: string; value: number; className: string }[];
  ariaLabel: string;
}) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label={ariaLabel}>
        {parts.map((p) => (
          <div key={p.label} className={p.className} style={{ width: `${(p.value / total) * 100}%` }} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-sm", p.className)} aria-hidden="true" />
            {p.label} <span className="tabular text-foreground">{formatPercent(p.value / total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
