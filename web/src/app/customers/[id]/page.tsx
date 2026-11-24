import { ArrowLeft, CreditCard, MessageSquareWarning, Receipt, ScrollText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { VerdictBadge } from "@/components/shared/verdict-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatMoney, results } from "@/lib/data";
import type { Customer, Evidence } from "@/lib/types";

const PLACEHOLDER_ID = "__none__";

export function generateStaticParams() {
  const ids = Object.keys(results.customers);
  // At least one param is required at build time; the placeholder renders a 404.
  return (ids.length ? ids : [PLACEHOLDER_ID]).map((id) => ({ id }));
}

function findCustomer(raw: string): Customer | undefined {
  let id = raw;
  try {
    id = decodeURIComponent(raw);
  } catch {
    // keep raw
  }
  return results.customers[id] ?? results.customers[raw];
}

export async function generateMetadata({ params }: PageProps<"/customers/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: findCustomer(id)?.name ?? "Customer" };
}

const MATCH_LABEL: Record<string, string> = {
  exact_id: "Exact ID",
  exact_name: "Exact name",
  fuzzy: "Fuzzy name",
  ai: "AI (two checks agreed)",
  unmatched: "Unmatched",
};

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="tabular mt-0.5 text-sm font-medium">{value ?? "—"}</dd>
    </div>
  );
}

function EvidenceColumn({ title, icon: Icon, items, empty }: { title: string; icon: typeof Receipt; items: Evidence[]; empty: string }) {
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
          {title}
          <span className="tabular font-normal text-muted-foreground">{items.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState title={empty} icon={Icon} />
        ) : (
          <ul className="space-y-2">
            {items.map((e) => (
              <li key={e.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">{e.title}</span>
                  {e.status && (
                    <Badge variant="outline" className="shrink-0 font-normal capitalize">
                      {e.status}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="font-mono">{e.recordId}</span>
                  {e.date && <> · {formatDate(e.date)}</>}
                </p>
                {e.detail && <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{e.detail}</p>}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function CustomerPage({ params }: PageProps<"/customers/[id]">) {
  return (
    <Suspense fallback={<CustomerSkeleton />}>
      <CustomerBody params={params} />
    </Suspense>
  );
}

function CustomerSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading customer">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-36 w-full rounded-xl" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

async function CustomerBody({ params }: { params: PageProps<"/customers/[id]">["params"] }) {
  const { id } = await params;
  const customer = findCustomer(id);
  if (!customer) notFound();

  const invoices = customer.invoiceIds
    .map((invId) => results.invoices.find((i) => i.id === invId))
    .filter((i) => i !== undefined);
  const overdue = invoices.reduce((sum, i) => sum + i.amount, 0);

  return (
    <>
      <Link
        href="/customers"
        className="mb-4 inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        All customers
      </Link>

      <div className="rounded-xl border bg-card p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{customer.name}</h1>
            <p className="font-mono text-xs text-muted-foreground">{customer.id}</p>
          </div>
          <p className="tabular text-sm">
            <span className="text-muted-foreground">Overdue </span>
            <span className="text-lg font-semibold">{formatMoney(overdue)}</span>
          </p>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Fact label="Segment" value={customer.segment} />
          <Fact label="Plan" value={customer.plan} />
          <Fact label="ARR" value={customer.arr !== undefined ? formatMoney(customer.arr) : undefined} />
          <Fact label="Account manager" value={customer.accountManager} />
          <Fact label="Renewal" value={customer.renewalDate ? formatDate(customer.renewalDate) : undefined} />
          <Fact label="Billing contact" value={<span className="break-all">{customer.billingContact ?? "—"}</span>} />
        </dl>
      </div>

      <Card className="mt-6 gap-3">
        <CardHeader>
          <CardTitle className="text-sm">How this customer was matched across systems</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {customer.aliases.length === 0 ? (
            <div className="px-6">
              <EmptyState title="No other names found" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">System</TableHead>
                  <TableHead>Name there</TableHead>
                  <TableHead className="hidden sm:table-cell">Matched by</TableHead>
                  <TableHead className="pr-6 text-right">How sure</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.aliases.map((a, i) => (
                  <TableRow key={`${a.system}-${i}`}>
                    <TableCell className="pl-6 font-mono text-xs">{a.system}</TableCell>
                    <TableCell className="max-w-56 truncate">{a.name}</TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{MATCH_LABEL[a.matchedBy] ?? a.matchedBy}</TableCell>
                    <TableCell className={`tabular pr-6 text-right ${a.score < 0.85 ? "font-medium text-rose-600 dark:text-rose-400" : ""}`}>
                      {a.score.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="gap-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Receipt className="size-4 text-muted-foreground" aria-hidden="true" />
              Overdue bills
              <span className="tabular font-normal text-muted-foreground">{invoices.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <EmptyState title="Nothing overdue" icon={Receipt} />
            ) : (
              <ul className="space-y-2">
                {invoices.map((inv) => (
                  <li key={inv.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs">{inv.id}</span>
                      <VerdictBadge verdict={inv.verdict} />
                    </div>
                    <p className="tabular mt-1.5 font-medium">
                      {formatMoney(inv.amount, inv.currency)}{" "}
                      <span className="font-normal text-muted-foreground">· {inv.daysOverdue} days late</span>
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{inv.headline}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <EvidenceColumn title="Payments" icon={CreditCard} items={customer.payments} empty="No payments found" />
        <EvidenceColumn title="Tickets" icon={MessageSquareWarning} items={customer.tickets} empty="No tickets in the export" />
        <EvidenceColumn title="Contracts" icon={ScrollText} items={customer.contracts} empty="No contracts found" />
      </div>
    </>
  );
}
