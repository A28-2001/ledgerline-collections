import type { Metadata } from "next";
import { AgeChart, TopCustomersChart, VerdictLegend } from "@/components/charts/charts";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { CauseChart } from "@/components/why/cause-chart";
import { TicketsChart, TrendChart } from "@/components/why/trend-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CAUSE_META, formatMoney, results } from "@/lib/data";
import { ageBreakdown, causeBreakdown, daysHistogram, topCustomers } from "@/lib/insights";
import type { TrendPoint } from "@/lib/types";

export const metadata: Metadata = { title: "Why overdue" };

function trendTitle(trend: TrendPoint[]): string {
  if (trend.length < 2) return "Not enough history for a trend";
  const first = trend[0];
  const last = trend[trend.length - 1];
  if (trend.every((t) => t.overdueAmount <= last.overdueAmount)) {
    return `Overdue money is at its highest month-end in ${trend.length} months: ${formatMoney(last.overdueAmount, "USD", true)}`;
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
            <CardDescription>The fix is different for each one</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {causes.sorted.map((s) => (
                <li key={s.cause}>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="size-2 shrink-0 rounded-full" style={{ background: CAUSE_META[s.cause]?.color }} aria-hidden="true" />
                    {CAUSE_META[s.cause]?.label ?? s.label}
                  </div>
                  <p className="mt-0.5 pl-4 text-xs leading-relaxed text-muted-foreground">{CAUSE_META[s.cause]?.description}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
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

        <Card className="min-w-0 xl:col-span-3">
          <CardHeader>
            <CardTitle className="leading-snug">{trendTitle(trend)}</CardTitle>
            <CardDescription>
              Overdue at each month-end.{" "}
              {trendMarkers.length > 0 && "The dashed line marks the billing engine rewrite, for context only."}
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
      </div>

      <details className="group mt-6 rounded-xl border bg-card/50 p-4 sm:p-5">
        <summary className="cursor-pointer list-none text-sm font-semibold">
          {hasTickets ? "Two more views: the biggest customers, and billing tickets by month" : "One more view: the biggest customers"}
          <span className="ml-2 text-xs font-normal text-muted-foreground group-open:hidden">Show</span>
        </summary>
        <div className="mt-4 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="min-w-0">
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
          {hasTickets && (
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>Billing complaints per month</CardTitle>
                <CardDescription>Support tickets about money, only for the months the ticket export covers.</CardDescription>
              </CardHeader>
              <CardContent>
                <TicketsChart trend={trend} />
              </CardContent>
            </Card>
          )}
        </div>
      </details>
    </>
  );
}
