"use client";

import { useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMoney, formatMonth, formatPercent } from "@/lib/data";
import type { TrendPoint } from "@/lib/types";

type Mode = "amount" | "share";

export function TrendChart({ trend, markers }: { trend: TrendPoint[]; markers: { month: string; label: string }[] }) {
  const [mode, setMode] = useState<Mode>("amount");
  const config: ChartConfig = {
    overdueAmount: { label: "Overdue", color: "var(--accent-brand)" },
    overdueShare: { label: "Share overdue", color: "var(--accent-brand)" },
  };
  const key = mode === "amount" ? "overdueAmount" : "overdueShare";
  const fmt = (v: number) => (mode === "amount" ? formatMoney(v, "USD", true) : formatPercent(v));
  const monthsInData = new Set(trend.map((t) => t.month));

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <TabsList>
            <TabsTrigger value="amount">Overdue $</TabsTrigger>
            <TabsTrigger value="share">Share of open bills</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <ChartContainer config={config} className="aspect-auto h-64 w-full">
        <AreaChart data={trend} margin={{ left: 4, right: 12, top: 16, bottom: 0 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-brand)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--accent-brand)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="month" tickFormatter={formatMonth} tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
          <YAxis tickFormatter={fmt} tickLine={false} axisLine={false} width={56} />
          <Tooltip
            content={({ active, payload, label }) => {
              const v = active && payload?.length ? Number(payload[0].value) : null;
              if (v === null) return null;
              return (
                <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                  <div className="font-medium">{formatMonth(String(label))}</div>
                  <div className="tabular mt-1 text-muted-foreground">{mode === "amount" ? formatMoney(v) : formatPercent(v, 1)}</div>
                </div>
              );
            }}
          />
          {markers
            .filter((m) => monthsInData.has(m.month))
            .map((m) => (
              <ReferenceLine
                key={m.month}
                x={m.month}
                stroke="var(--muted-foreground)"
                strokeDasharray="4 4"
                label={{ value: m.label, position: "insideTopLeft", fill: "var(--muted-foreground)", fontSize: 11 }}
              />
            ))}
          <Area
            type="monotone"
            dataKey={key}
            stroke="var(--accent-brand)"
            strokeWidth={2}
            fill="url(#trendFill)"
            isAnimationActive={false}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

export function TicketsChart({ trend }: { trend: TrendPoint[] }) {
  const data = trend.filter((t) => t.billingTickets !== null);
  const config: ChartConfig = { billingTickets: { label: "Billing tickets", color: "var(--cause-unhappy)" } };
  if (data.length === 0) return null;
  return (
    <ChartContainer config={config} className="aspect-auto h-40 w-full">
      <BarChart data={data} margin={{ left: 4, right: 12, top: 16, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="month" tickFormatter={formatMonth} tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={({ active, payload, label }) => {
            const v = active && payload?.length ? Number(payload[0].value) : null;
            if (v === null) return null;
            return (
              <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                <div className="font-medium">{formatMonth(String(label))}</div>
                <div className="tabular mt-1 text-muted-foreground">{v} billing tickets</div>
              </div>
            );
          }}
        />
        <Bar dataKey="billingTickets" fill="var(--cause-unhappy)" radius={[4, 4, 0, 0]} maxBarSize={48} isAnimationActive={false} />
      </BarChart>
    </ChartContainer>
  );
}
