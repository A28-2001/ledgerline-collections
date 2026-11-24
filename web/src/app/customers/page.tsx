import type { Metadata } from "next";
import { CustomerFinder, type CustomerRow } from "@/components/customers/customer-finder";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SimpleBars } from "@/components/why/cause-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { results, VERDICT_META } from "@/lib/data";
import type { Verdict } from "@/lib/types";

export const metadata: Metadata = { title: "Customers" };

const ORDER: Verdict[] = ["hold", "paid", "call", "send"];
// Size bands read the same whether there are 50 customers or 5,000.
const BANDS = [
  { key: "20k", label: "$20,000 or more", min: 20000 },
  { key: "5k", label: "$5,000 to $20,000", min: 5000 },
  { key: "1k", label: "$1,000 to $5,000", min: 1000 },
  { key: "0", label: "Under $1,000", min: 0 },
];

export default function CustomersPage() {
  const invoicesById = new Map(results.invoices.map((i) => [i.id, i]));
  const rows: CustomerRow[] = Object.values(results.customers)
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

  const byAction = ORDER.map((v) => ({
    key: v,
    label: VERDICT_META[v].label,
    amount: rows.reduce((s, r) => s + r.byVerdict[v], 0),
    count: rows.filter((r) => r.byVerdict[v] > 0).length,
    color: VERDICT_META[v].chart,
  })).filter((r) => r.amount > 0);
  const bands = BANDS.map((b, idx) => {
    const upper = idx === 0 ? Infinity : BANDS[idx - 1].min;
    const inBand = rows.filter((r) => r.overdue >= b.min && r.overdue < upper);
    return { key: b.key, label: b.label, amount: inBand.reduce((s, r) => s + r.overdue, 0), count: inBand.length, color: "var(--muted-foreground)" };
  }).filter((b) => b.count > 0);
  const biggestBand = [...bands].sort((a, b) => b.amount - a.amount)[0];

  if (rows.length === 0) {
    return (
      <>
        <PageHeader title="Customers" description="Every customer with an overdue bill, biggest first." />
        <EmptyState title="No customers in this run" />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Customers" description={`${rows.length} customers with an overdue bill. Find any of them below.`} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="leading-snug">What to do, across all customers</CardTitle>
            <CardDescription>A customer with two kinds of bill counts in both.</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBars label="Overdue money by what to do" total={total} rows={byAction} unit={["customer", "customers"]} />
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="leading-snug">
              {biggestBand ? `Most of the money sits with balances of ${biggestBand.label.toLowerCase()}` : "How big the balances are"}
            </CardTitle>
            <CardDescription>Customers grouped by how much they owe</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBars label="Customers by size of balance" total={total} rows={bands} highlight={biggestBand?.key} unit={["customer", "customers"]} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
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

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="leading-snug">Find a customer</CardTitle>
          <CardDescription>Biggest first. The dot shows what to do; a ring means a second kind of bill. Click a name for the details.</CardDescription>
        </CardHeader>
        <CardContent>
          <CustomerFinder rows={rows} />
        </CardContent>
      </Card>

      {unmatched.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          {unmatched.length} overdue {unmatched.length === 1 ? "bill isn't" : "bills aren't"} matched to any customer yet. {unmatched.length === 1 ? "It's" : "They're"}{" "}
          flagged on the Today page for a person to confirm.
        </p>
      )}
    </>
  );
}
