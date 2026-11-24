import type { Metadata } from "next";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { CauseChart, ColumnChart } from "@/components/why/cause-chart";
import { TrendChart } from "@/components/why/trend-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CAUSE_META, formatMoney, results } from "@/lib/data";
import { ageBreakdown, causeBreakdown } from "@/lib/insights";
import type { TrendPoint } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Why overdue" };

function trendTitle(trend: TrendPoint[]): string {
  if (trend.length < 2) return "Not enough history for a trend";
  const first = trend[0];
  const last = trend[trend.length - 1];
  if (trend.every((t) => t.overdueAmount <= last.overdueAmount)) {
    return `The highest month-end in ${trend.length} months`;
  }
  const dir = last.overdueAmount > first.overdueAmount ? "up" : "down";
  return `Overdue is ${dir} over ${trend.length} months`;
}

export default function WhyPage() {
  const { summary, trend, invoices } = results;
  const total = summary.overdueAmount;
  const causes = causeBreakdown(summary.byCause, total);
  const age = ageBreakdown(invoices);
  const top = causes.sorted[0];
  const topMeta = top ? CAUSE_META[top.cause] : null;
  const tenths = total ? Math.round((summary.shouldNotChaseAmount / total) * 10) : 0;
  const disputed = invoices.filter((i) => i.cause === "wrong_bill");
  const solved = disputed.filter((i) => /marked solved/i.test(i.headline)).length;
  const twinHeld = invoices.filter((i) => i.cause === "paid" && i.verdict !== "paid" && i.hold?.twinOf);
  const otherCards = invoices.filter(
    (i) => i.cause !== "card_failed" && i.reasons.some((r) => /stripe|card (payment )?(failed|didn't go through)|failed card/i.test(r.text)),
  ).length;

  return (
    <>
      <PageHeader title="Why bills are overdue" description="The reason decides the fix." />

      <div className="rounded-xl border bg-card p-5">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">In one sentence</p>
        <p className="mt-2 text-lg leading-snug font-medium text-balance">
          {tenths} in 10 overdue dollars shouldn&apos;t be chased today
          {top?.cause === "wrong_bill" ? ", and the biggest reason is a bill the customer disputes." : "."}
        </p>
      </div>

      <Card className="mt-6 min-w-0">
        <CardHeader>
          <CardTitle className="leading-snug">
            {topMeta ? `The biggest reason: ${topMeta.label.toLowerCase()}` : "Why it's overdue"}
          </CardTitle>
          <CardDescription className="tabular">
            {formatMoney(total)} overdue across {summary.overdueCount} bills
          </CardDescription>
        </CardHeader>
        <CardContent>
          {causes.sorted.length === 0 ? (
            <EmptyState title="Nothing overdue" description="No overdue bills in this run." />
          ) : (
            <>
              <CauseChart slices={causes.sorted} total={total} highlight={top?.cause} />
              {top?.cause === "wrong_bill" && disputed.length > 0 && (
                <p className="mt-4 rounded-lg border-l-4 border-[var(--cause-wrong-bill)] bg-muted/40 px-3 py-2.5 text-sm leading-relaxed">
                  Each of these {disputed.length} bills has a ticket naming the exact invoice: wrong seats, a missing discount, a fee meant to be
                  waived. {solved > 0 && `Zendesk marks ${solved} of them solved, but the bill was never fixed. `}A reminder chases someone who is
                  waiting for a corrected bill.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {causes.sorted.length > 0 && (
        <section className="mt-6" aria-label="What each reason needs">
          <h2 className="text-base font-semibold tracking-tight">What each reason needs</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {causes.sorted.map((s, idx) => {
              const m = CAUSE_META[s.cause];
              const first = idx === 0;
              return (
                <li
                  key={s.cause}
                  className={cn("rounded-xl border bg-card p-3.5", first && "border-2 sm:col-span-2 xl:col-span-1")}
                  style={first ? { borderColor: m?.color } : undefined}
                >
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: m?.color }} aria-hidden="true" />
                    {m?.label ?? s.label}
                  </div>
                  {first && <p className="mt-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Biggest reason</p>}
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {m?.description}
                    {s.cause === "paid" &&
                      twinHeld.length > 0 &&
                      ` ${twinHeld.length} of these (${formatMoney(twinHeld.reduce((t, i) => t + i.amount, 0))}) ${twinHeld.length === 1 ? "is" : "are"} on hold instead, until Marcus confirms which bill the payment covers.`}
                    {s.cause === "card_failed" && otherCards > 0 &&
                      ` ${otherCards} more failed-card ${otherCards === 1 ? "bill is" : "bills are"} counted under another reason (a complaint or threat comes first).`}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="leading-snug">{age.title.replace(/ \(\d+%\)$/, "")}</CardTitle>
            <CardDescription>Overdue money by how late it is</CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <EmptyState title="No overdue bills" />
            ) : (
              <ColumnChart
                label="Overdue money by days late"
                total={age.total}
                rows={age.rows
                  .filter((r) => r.total > 0)
                  .map((r) => ({ key: r.bucket, label: r.label, amount: r.total, count: r.count, color: "var(--muted-foreground)" }))}
              />
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="leading-snug">{trendTitle(trend)}</CardTitle>
            <CardDescription>
              Overdue money at each month-end
              {trend.length > 0 && `: ${formatMoney(trend[trend.length - 1].overdueAmount, "USD", true)} now`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trend.length === 0 ? (
              <EmptyState title="No trend yet" description="The invoice history didn't cover enough months." />
            ) : (
              <TrendChart trend={trend} markers={[]} simple />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
