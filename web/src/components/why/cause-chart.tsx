"use client";

import { Bar, BarChart, Cell, LabelList, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { CAUSE_META, formatMoney, formatPercent } from "@/lib/data";
import type { CauseSlice } from "@/lib/types";

export function CauseChart({ slices, total }: { slices: CauseSlice[]; total: number }) {
  const data = [...slices]
    .filter((s) => s.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .map((s) => ({ ...s, label: CAUSE_META[s.cause]?.label ?? s.label, fill: CAUSE_META[s.cause]?.color }));
  const config: ChartConfig = { amount: { label: "Overdue" } };

  if (data.length === 0) return null;

  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height: Math.max(160, data.length * 52) }}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 96, top: 4, bottom: 4 }} barCategoryGap={10}>
        <XAxis type="number" hide domain={[0, "dataMax"]} />
        <YAxis
          type="category"
          dataKey="label"
          width={170}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={({ active, payload }) => {
            const p = active && payload?.length ? (payload[0].payload as (typeof data)[number]) : null;
            if (!p) return null;
            return (
              <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                <div className="font-medium">{p.label}</div>
                <div className="tabular mt-1 text-muted-foreground">
                  {formatMoney(p.amount)} · {p.count} {p.count === 1 ? "bill" : "bills"} ·{" "}
                  {formatPercent(total ? p.amount / total : 0)}
                </div>
              </div>
            );
          }}
        />
        <Bar dataKey="amount" radius={[4, 4, 4, 4]} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.cause} fill={d.fill} />
          ))}
          <LabelList
            dataKey="amount"
            position="right"
            className="fill-foreground"
            fontSize={12}
            formatter={(v: unknown) => formatMoney(Number(v), "USD", true)}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
