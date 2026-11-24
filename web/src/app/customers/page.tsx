import type { Metadata } from "next";
import { CustomerFinder, type CustomerRow } from "@/components/customers/customer-finder";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SimpleBars } from "@/components/why/cause-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, results, VERDICT_META } from "@/lib/data";
import type { Verdict } from "@/lib/types";

export const metadata: Metadata = { title: "Customers" };

const ORDER: Verdict[] = ["paid", "hold", "send", "call"];
// Size bands read the same whether there are 50 customers or 5,000.
const BANDS = [
  { key: "20k", label: "$20,000 or more", min: 20000 },
  { key: "5k", label: "$5,000 to $20,000", min: 5000 },
  { key: "1k", label: "$1,000 to $5,000", min: 1000 },
  { key: "0", label: "Under $1,000", min: 0 },
];

function Donut({ share, label }: { share: number; label: string }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 112 112" className="size-24 shrink-0 sm:size-28" role="img" aria-label={`${label} of the overdue money`}>
      <circle cx="56" cy="56" r={r} fill="none" stroke="var(--muted)" strokeWidth="14" />
      <circle
        cx="56"
        cy="56"
        r={r}
        fill="none"
        stroke="var(--accent-brand)"
        strokeWidth="14"
        strokeDasharray={`${share * c} ${c}`}
        strokeLinecap="butt"
        transform="rotate(-90 56 56)"
      />
      <text x="56" y="61" textAnchor="middle" fontSize="20" fontWeight="600" fill="var(--foreground)">
        {label}
      </text>
    </svg>
  );
}

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

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
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
          </CardHeader>
          <CardContent>
            <SimpleBars label="Customers by size of balance" total={total} rows={bands} highlight={biggestBand?.key} unit={["customer", "customers"]} />
          </CardContent>
        </Card>
        <Card className="min-w-0 lg:col-span-2 xl:col-span-1">
          <CardHeader>
            <CardTitle className="leading-snug">
              The {top.length} biggest hold {topShare}% of the overdue money
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-5">
            <Donut share={topShare / 100} label={`${topShare}%`} />
            <ol className="min-w-0 flex-1 space-y-1 text-sm">
              {top.map((r, i) => (
                <li key={r.id} className="flex items-baseline justify-between gap-3">
                  <span className="truncate">
                    <span className="tabular text-muted-foreground">{i + 1}.</span> {r.name}
                  </span>
                  <span className="tabular shrink-0 text-xs text-muted-foreground">{formatMoney(r.overdue, "USD", true)}</span>
                </li>
              ))}
              <li className="flex items-baseline justify-between gap-3 border-t pt-1 text-muted-foreground">
                <span>The other {rows.length - top.length}</span>
                <span className="tabular shrink-0 text-xs">{formatMoney(total - top.reduce((x, r) => x + r.overdue, 0), "USD", true)}</span>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>

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
