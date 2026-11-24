import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { VerdictBadge } from "@/components/shared/verdict-badge";
import { SimpleBars } from "@/components/why/cause-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { customerHref, formatMoney, results } from "@/lib/data";
import type { Verdict } from "@/lib/types";

export const metadata: Metadata = { title: "Customers" };

const PRIORITY: Verdict[] = ["hold", "call", "paid", "send"];

export default function CustomersPage() {
  const invoicesById = new Map(results.invoices.map((i) => [i.id, i]));
  const rows = Object.values(results.customers)
    .map((c) => {
      const invs = c.invoiceIds.map((id) => invoicesById.get(id)).filter((i) => i !== undefined);
      const overdue = invs.reduce((sum, i) => sum + i.amount, 0);
      const verdicts = new Set(invs.map((i) => i.verdict));
      const todo = PRIORITY.filter((v) => verdicts.has(v));
      const weakest = c.aliases.reduce((min, a) => Math.min(min, a.score), 1);
      return { c, invs, overdue, todo, weakest };
    })
    .sort((a, b) => b.overdue - a.overdue || a.c.name.localeCompare(b.c.name));
  const unmatched = results.invoices.filter((i) => !i.customerId);
  const total = rows.reduce((sum, r) => sum + r.overdue, 0);
  const top = rows.slice(0, 5);
  const topShare = total ? Math.round((top.reduce((sum, r) => sum + r.overdue, 0) / total) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Customers"
        description="Every customer with an overdue bill, biggest first."
      />
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
              rows={top.map((r) => ({
                key: r.c.id,
                label: r.c.name,
                amount: r.overdue,
                count: r.invs.length,
                color: "var(--muted-foreground)",
              }))}
            />
          </CardContent>
        </Card>
      )}

      <div className="overflow-hidden rounded-xl border bg-card">
        {rows.length === 0 ? (
          <div className="p-4">
            <EmptyState title="No customers in this run" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Customer</TableHead>
                <TableHead className="text-right">Overdue</TableHead>
                <TableHead className="hidden pr-4 md:table-cell">What to do</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ c, invs, overdue, todo, weakest }) => (
                <TableRow key={c.id}>
                  <TableCell className="max-w-64 pl-4">
                    <Link
                      href={customerHref(c.id)}
                      className="block truncate rounded font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      {c.name}
                    </Link>
                    {(invs.length > 1 || weakest < 1) && (
                      <span className="text-xs text-muted-foreground">
                        {invs.length > 1 && `${invs.length} bills`}
                        {weakest < 1 && <span className="text-hold-ink">{invs.length > 1 ? " · " : ""}name only nearly matched: check</span>}
                      </span>
                    )}
                    {todo.length > 0 && (
                      <span className="mt-1 flex flex-wrap gap-1 md:hidden">
                        {todo.map((v) => (
                          <VerdictBadge key={v} verdict={v} />
                        ))}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="tabular text-right font-medium">{formatMoney(overdue)}</TableCell>
                  <TableCell className="hidden pr-4 md:table-cell">
                    {todo.length ? (
                      <span className="flex flex-wrap gap-1">
                        {todo.map((v) => (
                          <VerdictBadge key={v} verdict={v} />
                        ))}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      {unmatched.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          {unmatched.length} overdue {unmatched.length === 1 ? "bill isn't" : "bills aren't"} matched to any customer yet.
          {" "}{unmatched.length === 1 ? "It's" : "They're"} flagged on the Today page for a person to confirm.
        </p>
      )}
    </>
  );
}
