import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SimpleBars } from "@/components/why/cause-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { customerHref, formatMoney, results, VERDICT_META } from "@/lib/data";
import type { Verdict } from "@/lib/types";

export const metadata: Metadata = { title: "Customers" };

// Order of the coloured pieces inside each bar: the ones that stop a chase first.
const ORDER: Verdict[] = ["hold", "paid", "call", "send"];

type Row = {
  id: string;
  name: string;
  overdue: number;
  bills: number;
  byVerdict: Record<Verdict, number>;
  nearMatch: boolean;
};

function CustomerBars({ rows, title }: { rows: Row[]; title: string }) {
  const max = Math.max(...rows.map((r) => r.overdue), 1);
  return (
    <div className="min-w-0">
      <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</p>
      <ul className="space-y-1.5" aria-label={title}>
        {rows.map((r) => (
          <li key={r.id} className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)_4.25rem] items-center gap-2 text-sm sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_4.75rem]">
            <Link
              href={customerHref(r.id)}
              className="truncate rounded underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
              title={r.bills > 1 ? `${r.name} · ${r.bills} bills` : r.name}
            >
              {r.name}
              {r.nearMatch && <span className="text-hold-ink"> · check name</span>}
            </Link>
            <div className="flex h-3 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              {ORDER.filter((v) => r.byVerdict[v] > 0).map((v) => (
                <div key={v} className="h-full" style={{ width: `${Math.max(1, (r.byVerdict[v] / max) * 100)}%`, background: VERDICT_META[v].chart }} />
              ))}
            </div>
            <span className="tabular text-right text-xs text-muted-foreground">{formatMoney(r.overdue, "USD", true)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function CustomersPage() {
  const invoicesById = new Map(results.invoices.map((i) => [i.id, i]));
  const rows: Row[] = Object.values(results.customers)
    .map((c) => {
      const invs = c.invoiceIds.map((id) => invoicesById.get(id)).filter((i) => i !== undefined);
      const byVerdict: Record<Verdict, number> = { send: 0, hold: 0, paid: 0, call: 0 };
      for (const i of invs) byVerdict[i.verdict] += i.amount;
      return {
        id: c.id,
        name: c.name,
        overdue: invs.reduce((sum, i) => sum + i.amount, 0),
        bills: invs.length,
        byVerdict,
        nearMatch: c.aliases.some((a) => a.score < 1),
      };
    })
    .sort((a, b) => b.overdue - a.overdue || a.name.localeCompare(b.name));
  const unmatched = results.invoices.filter((i) => !i.customerId);
  const total = rows.reduce((sum, r) => sum + r.overdue, 0);
  const top = rows.slice(0, 5);
  const topShare = total ? Math.round((top.reduce((sum, r) => sum + r.overdue, 0) / total) * 100) : 0;
  const half = Math.ceil(rows.length / 2);
  const bigger = rows.slice(0, half);
  const smaller = rows.slice(half);
  const used = ORDER.filter((v) => rows.some((r) => r.byVerdict[v] > 0));

  return (
    <>
      <PageHeader title="Customers" description="Every customer with an overdue bill, biggest first." />

      {top.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="leading-snug">
              The {top.length} biggest hold {topShare}% of the overdue money
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleBars
              label="The biggest customers by overdue money"
              total={total}
              rows={top.map((r) => ({ key: r.id, label: r.name, amount: r.overdue, count: r.bills, color: "var(--muted-foreground)" }))}
            />
          </CardContent>
        </Card>
      )}

      {rows.length === 0 ? (
        <EmptyState title="No customers in this run" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="leading-snug">All {rows.length} customers, coloured by what to do</CardTitle>
            <CardDescription>Click a name for the details.</CardDescription>
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
              {used.map((v) => (
                <span key={v} className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full" style={{ background: VERDICT_META[v].chart }} aria-hidden="true" />
                  {VERDICT_META[v].label}
                </span>
              ))}
            </div>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-2">
            <CustomerBars rows={bigger} title={`The bigger ${bigger.length}, down to ${formatMoney(bigger[bigger.length - 1].overdue, "USD", true)}`} />
            {smaller.length > 0 && (
              <CustomerBars rows={smaller} title={`The other ${smaller.length}, on their own scale`} />
            )}
          </CardContent>
        </Card>
      )}

      {unmatched.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          {unmatched.length} overdue {unmatched.length === 1 ? "bill isn't" : "bills aren't"} matched to any customer yet. {unmatched.length === 1 ? "It's" : "They're"}{" "}
          flagged on the Today page for a person to confirm.
        </p>
      )}
    </>
  );
}
