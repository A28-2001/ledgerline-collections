import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { VerdictBadge } from "@/components/shared/verdict-badge";
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
      const top = PRIORITY.find((v) => verdicts.has(v));
      const weakest = c.aliases.reduce((min, a) => Math.min(min, a.score), 1);
      return { c, invs, overdue, top, weakest };
    })
    .sort((a, b) => b.overdue - a.overdue || a.c.name.localeCompare(b.c.name));
  const unmatched = results.invoices.filter((i) => !i.customerId);

  return (
    <>
      <PageHeader
        title="Customers"
        description="Each customer joined across billing, the accounting export, payments, tickets and contracts. The weakest name match is shown so you can spot shaky joins."
      />
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
                <TableHead className="hidden sm:table-cell">Segment</TableHead>
                <TableHead className="text-right">Overdue</TableHead>
                <TableHead className="hidden md:table-cell">What to do</TableHead>
                <TableHead className="hidden pr-4 text-right md:table-cell">Weakest match</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ c, invs, overdue, top, weakest }) => (
                <TableRow key={c.id}>
                  <TableCell className="max-w-64 pl-4">
                    <Link
                      href={customerHref(c.id)}
                      className="block truncate rounded font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      {c.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {invs.length} overdue {invs.length === 1 ? "bill" : "bills"}
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{c.segment ?? "—"}</TableCell>
                  <TableCell className="tabular text-right font-medium">{formatMoney(overdue)}</TableCell>
                  <TableCell className="hidden md:table-cell">{top ? <VerdictBadge verdict={top} /> : "—"}</TableCell>
                  <TableCell className="tabular hidden pr-4 text-right text-muted-foreground md:table-cell">
                    {weakest.toFixed(2)}
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
