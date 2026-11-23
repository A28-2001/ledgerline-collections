import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { CauseChart } from "@/components/why/cause-chart";
import { TicketsChart, TrendChart } from "@/components/why/trend-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CAUSE_META, formatMoney, formatPercent, results } from "@/lib/data";

export const metadata: Metadata = { title: "Why overdue" };

export default function WhyPage() {
  const { summary, trend, trendMarkers } = results;
  const total = summary.overdueAmount;
  const slices = [...summary.byCause].sort((a, b) => b.amount - a.amount);
  const hasTickets = trend.some((t) => t.billingTickets !== null);

  return (
    <>
      <PageHeader
        title="Why bills are overdue"
        description="Overdue dollars split by cause. The cause decides the fix: a reminder won't help a customer who already paid or was billed wrong."
      />

      <div className="rounded-xl border bg-card p-5">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">The headline</p>
        <p className="mt-2 text-lg leading-snug font-medium text-balance">{summary.headline}</p>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Overdue by cause</CardTitle>
            <CardDescription className="tabular">
              {formatMoney(total)} across {summary.overdueCount} bills
            </CardDescription>
          </CardHeader>
          <CardContent>
            {slices.length === 0 ? (
              <EmptyState title="Nothing overdue" description="No overdue bills in this run." />
            ) : (
              <CauseChart slices={slices} total={total} />
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>What each cause needs</CardTitle>
            <CardDescription>The same numbers as a table</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">Cause</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="pr-6 text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slices.map((s) => (
                  <TableRow key={s.cause}>
                    <TableCell className="pl-6 whitespace-normal">
                      <div className="flex items-center gap-2 font-medium">
                        <span className="size-2 shrink-0 rounded-full" style={{ background: CAUSE_META[s.cause]?.color }} aria-hidden="true" />
                        {CAUSE_META[s.cause]?.label ?? s.label}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{CAUSE_META[s.cause]?.description}</p>
                    </TableCell>
                    <TableCell className="tabular text-right align-top">
                      {formatMoney(s.amount)}
                      <div className="text-xs text-muted-foreground">
                        {s.count} {s.count === 1 ? "bill" : "bills"}
                      </div>
                    </TableCell>
                    <TableCell className="tabular pr-6 text-right align-top">{formatPercent(total ? s.amount / total : 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Overdue over time</CardTitle>
          <CardDescription>
            Overdue at each month end.{" "}
            {trendMarkers.length > 0 && "Dashed lines mark events worth checking against the trend."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trend.length === 0 ? (
            <EmptyState title="No trend yet" description="The invoice history didn't cover enough months." />
          ) : (
            <TrendChart trend={trend} markers={trendMarkers} />
          )}
        </CardContent>
      </Card>

      {hasTickets && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Billing tickets per month</CardTitle>
            <CardDescription>Only the months the ticket export covers.</CardDescription>
          </CardHeader>
          <CardContent>
            <TicketsChart trend={trend} />
          </CardContent>
        </Card>
      )}
    </>
  );
}
