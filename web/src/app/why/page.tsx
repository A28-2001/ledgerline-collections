import type { Metadata } from "next";
import { AgeChart, TopCustomersChart, VerdictLegend } from "@/components/charts/charts";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { CauseChart } from "@/components/why/cause-chart";
import { TicketsChart, TrendChart } from "@/components/why/trend-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CAUSE_META, formatMonth, formatMoney, formatPercent, results } from "@/lib/data";
import { ageBreakdown, causeBreakdown, daysHistogram, topCustomers } from "@/lib/insights";
import type { TrendPoint } from "@/lib/types";

export const metadata: Metadata = { title: "Why overdue" };

function trendTitle(trend: TrendPoint[], markers: { month: string; label: string }[]): string {
  if (trend.length < 2) return "Not enough history for a trend";
  const first = trend[0];
  const last = trend[trend.length - 1];
  const marker = markers.find((m) => trend.some((t) => t.month === m.month));
  if (marker) {
    const before = trend.filter((t) => t.month < marker.month);
    const after = trend.filter((t) => t.month >= marker.month);
    if (before.length && after.length) {
      const avg = (xs: TrendPoint[]) => xs.reduce((s, t) => s + t.overdueShare, 0) / xs.length;
      const b = avg(before);
      const a = avg(after);
      const dir = a > b * 1.05 ? "higher" : a < b * 0.95 ? "lower" : "about the same";
      return `Since the ${marker.label.toLowerCase()} (${formatMonth(marker.month)}), the overdue share is ${dir}: ${formatPercent(b)} before, ${formatPercent(a)} after`;
    }
  }
  const dir = last.overdueAmount > first.overdueAmount ? "up" : "down";
  return `Overdue is ${dir} from ${formatMoney(first.overdueAmount, "USD", true)} to ${formatMoney(last.overdueAmount, "USD", true)} over ${trend.length} months`;
}

export default function WhyPage() {
  const { summary, trend, trendMarkers, invoices } = results;
  const total = summary.overdueAmount;
  const causes = causeBreakdown(summary.byCause, total);
  const top = topCustomers(invoices, 10);
  const days = daysHistogram(invoices);
  const age = ageBreakdown(invoices);
  const hasTickets = trend.some((t) => t.billingTickets !== null);

  return (
    <>
      <PageHeader
        title="Why bills are overdue"
        description="The reason decides the fix. A reminder won't help a customer who already paid, is in the middle of a complaint, or got the wrong bill."
      />

      <div className="rounded-xl border bg-card p-5">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">In one sentence</p>
        <p className="mt-2 text-lg leading-snug font-medium text-balance">{summary.headline}</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card className="min-w-0 xl:col-span-3">
          <CardHeader>
            <CardTitle className="leading-snug">{causes.title}</CardTitle>
            <CardDescription className="tabular">
              Why it&apos;s overdue · {formatMoney(total)} across {summary.overdueCount} bills
            </CardDescription>
          </CardHeader>
          <CardContent>
            {causes.sorted.length === 0 ? (
              <EmptyState title="Nothing overdue" description="No overdue bills in this run." />
            ) : (
              <CauseChart slices={causes.sorted} total={total} />
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 xl:col-span-2">
          <CardHeader>
            <CardTitle>What each reason needs</CardTitle>
            <CardDescription>The same numbers, with the fix for each</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">Why it&apos;s overdue</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="pr-6 text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {causes.sorted.map((s) => (
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

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card className="min-w-0 xl:col-span-3">
          <CardHeader>
            <CardTitle className="leading-snug">{top.title}</CardTitle>
            <CardDescription>
              Top customers by overdue money, coloured by what to do · {top.customerCount} customers in total
            </CardDescription>
          </CardHeader>
          <CardContent>
            {top.rows.length === 0 ? (
              <EmptyState title="No customers with overdue bills" />
            ) : (
              <>
                <TopCustomersChart rows={top.rows} />
                <VerdictLegend className="mt-3" />
              </>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 xl:col-span-2">
          <CardHeader>
            <CardTitle className="leading-snug">{age.title}</CardTitle>
            <CardDescription>
              Overdue money by days late, coloured by what to do. {invoices.length > 0 && `${days.title}.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <EmptyState title="No overdue bills" />
            ) : (
              <>
                <AgeChart rows={age.rows} />
                <VerdictLegend className="mt-3" />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="leading-snug">{trendTitle(trend, trendMarkers)}</CardTitle>
          <CardDescription>
            Overdue at each month end.{" "}
            {trendMarkers.length > 0 && "The dashed line marks an event worth checking against the trend."}
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
            <CardTitle>Billing complaints per month</CardTitle>
            <CardDescription>Support tickets about money, only for the months the ticket export covers.</CardDescription>
          </CardHeader>
          <CardContent>
            <TicketsChart trend={trend} />
          </CardContent>
        </Card>
      )}
    </>
  );
}
