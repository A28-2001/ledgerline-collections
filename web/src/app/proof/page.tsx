import { CircleCheck, CircleX, FlaskConical, Info } from "lucide-react";
import type { Metadata } from "next";
import { Gauge, ShareBars, SplitBar } from "@/components/charts/charts";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { VerdictBadge } from "@/components/shared/verdict-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney, formatPercent, isUnsureHold, MATCH_METHOD_LABEL, pluralize, results } from "@/lib/data";

export const metadata: Metadata = { title: "How sure are we" };

const MATCH_COLOR: Record<string, string> = {
  exact_id: "var(--verdict-paid)",
  exact_name: "var(--verdict-paid)",
  fuzzy: "var(--verdict-send)",
  ai: "var(--verdict-call)",
  unmatched: "var(--cause-wrong-bill)",
};

export default function ProofPage() {
  const { proof, meta, invoices } = results;
  const matchRows = proof.matchBreakdown.map((m) => ({ key: m.method, label: MATCH_METHOD_LABEL[m.method] ?? m.method, count: m.count }));
  const matchTotal = matchRows.reduce((s, m) => s + m.count, 0);
  const verifiedOk = proof.verifiedNumbers.filter((v) => v.ok).length;
  const paused = invoices.filter(isUnsureHold);
  const aiOn = meta.aiMode === "groq" && proof.agreementRate !== null;

  return (
    <>
      <PageHeader
        title="How sure are we"
        description={`How far to trust today's list: how well customers were matched, how often the suggestions were right, where the AI wasn't sure, and where the tool is wrong. The full run took ${proof.runtimeSeconds.toFixed(1)} seconds.`}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="leading-snug">
              {formatPercent(proof.matchRate, 1)} of customer names were matched across systems
            </CardTitle>
            <CardDescription>
              {pluralize(matchTotal, "name")} from bills, payments and tickets. IDs first, then names; weak matches go to a person.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {matchRows.length === 0 ? (
              <EmptyState title="No matching data" />
            ) : (
              <ShareBars rows={matchRows} colors={MATCH_COLOR} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="leading-snug">
              {proof.accuracy
                ? `Right on ${proof.accuracy.agreed} of ${proof.accuracy.sampleSize} bills`
                : "Accuracy not measured yet"}
            </CardTitle>
            <CardDescription>
              {proof.accuracy ? `Checked against: ${proof.accuracy.labelledBy}` : "Needs a sample of bills checked by a person."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {proof.accuracy ? (
              <>
                <Gauge value={proof.accuracy.rate} label="Matched the right answer" sublabel={`${proof.accuracy.sampleSize} bills checked`} />
                <p className="mt-4 text-xs text-muted-foreground">
                  A small sample. It shows the tool is useful with a person approving, not that it can run alone.
                </p>
              </>
            ) : (
              <EmptyState
                title="Not measured yet"
                description="Check a sample of bills by hand, record what you'd have decided, and re-run. Until then, treat every suggestion as a suggestion."
                icon={FlaskConical}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="leading-snug">
              {aiOn ? `The two AI checks agreed on ${formatPercent(proof.agreementRate!)} of tickets` : "AI double-check was off for this run"}
            </CardTitle>
            <CardDescription>Two different AI models read each relevant ticket on their own. When they disagree, nobody is chased until a person reads it.</CardDescription>
          </CardHeader>
          <CardContent>
            {aiOn ? (
              <>
                <SplitBar
                  ariaLabel={`Judges agreed ${formatPercent(proof.agreementRate!)}`}
                  parts={[
                    { label: "Agreed", value: proof.agreementRate!, className: "bg-emerald-500" },
                    { label: "Disagreed", value: 1 - proof.agreementRate!, className: "bg-rose-500" },
                  ]}
                />
                <p className="mt-4 text-sm">
                  <span className="tabular font-semibold">{pluralize(paused.length, "bill")}</span>{" "}
                  <span className="text-muted-foreground">
                    ({formatMoney(paused.reduce((s, i) => s + i.amount, 0))}) paused only because the AI wasn&apos;t sure. They&apos;re not
                    counted in &ldquo;Don&apos;t chase today&rdquo;.
                  </span>
                </p>
              </>
            ) : (
              <EmptyState title="Rules only" description="Ticket reading used keyword rules. Add an AI key and re-run to turn the double-check on." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="leading-snug">
            {proof.verifiedNumbers.length
              ? `${verifiedOk} of ${proof.verifiedNumbers.length} figures agree when worked out two ways`
              : "No two-way checks recorded"}
          </CardTitle>
          <CardDescription>Each figure is worked out two independent ways. Where they disagree, the gap is shown and explained.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {proof.verifiedNumbers.length === 0 ? (
            <div className="px-6">
              <EmptyState title="No checks recorded" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">Figure</TableHead>
                  <TableHead className="hidden md:table-cell">Way 1</TableHead>
                  <TableHead className="text-right">Result</TableHead>
                  <TableHead className="hidden md:table-cell">Way 2</TableHead>
                  <TableHead className="text-right">Result</TableHead>
                  <TableHead className="pr-6 text-right">Agree?</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proof.verifiedNumbers.map((v) => {
                  const isCount = v.label.toLowerCase().includes("bills checked");
                  const fmt = (n: number) => (isCount ? n.toLocaleString("en-US") : formatMoney(n));
                  return (
                    <TableRow key={v.label}>
                      <TableCell className="pl-6 align-top whitespace-normal">
                        <span className="font-medium">{v.label}</span>
                        {!v.ok && (
                          <p className="tabular mt-0.5 text-xs font-medium text-rose-700 dark:text-rose-300">
                            Gap: {fmt(Math.abs(v.valueA - v.valueB))}
                          </p>
                        )}
                        {v.note && <p className="mt-0.5 text-xs text-muted-foreground">{v.note}</p>}
                      </TableCell>
                      <TableCell className="hidden align-top whitespace-normal text-muted-foreground md:table-cell">{v.methodA}</TableCell>
                      <TableCell className="tabular text-right align-top">{fmt(v.valueA)}</TableCell>
                      <TableCell className="hidden align-top whitespace-normal text-muted-foreground md:table-cell">{v.methodB}</TableCell>
                      <TableCell className="tabular text-right align-top">{fmt(v.valueB)}</TableCell>
                      <TableCell className="pr-6 text-right align-top">
                        {v.ok ? (
                          <CircleCheck className="ml-auto size-4 text-emerald-600 dark:text-emerald-400" aria-label="Agrees" />
                        ) : (
                          <CircleX className="ml-auto size-4 text-rose-600 dark:text-rose-400" aria-label="Disagrees" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="leading-snug">
            {proof.failures.length ? `Where the tool was wrong: ${pluralize(proof.failures.length, "bill")}` : "Where the tool is wrong"}
          </CardTitle>
          <CardDescription>Bills from the checked sample where the right answer differs from the tool&apos;s, and why.</CardDescription>
        </CardHeader>
        <CardContent>
          {proof.failures.length === 0 ? (
            <EmptyState title="No mistakes recorded" description="Either nothing was checked yet, or the sample found no mistakes." />
          ) : (
            <ul className="space-y-3">
              {proof.failures.map((f, i) => {
                const inv = invoices.find((x) => x.id === f.invoiceId);
                return (
                  <li key={`${f.invoiceId}-${i}`} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-mono text-xs">{f.invoiceId}</span>
                      {inv && (
                        <span className="text-muted-foreground">
                          {inv.customerName} · {formatMoney(inv.amount, inv.currency)}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      Tool said <VerdictBadge verdict={f.toolSaid} /> → right answer <VerdictBadge verdict={f.truth} />
                    </div>
                    <p className="mt-2 text-sm leading-relaxed">{f.why}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="size-4 text-muted-foreground" aria-hidden="true" />
            Notes on this run
          </CardTitle>
          <CardDescription>
            AI: {meta.aiMode === "groq" ? "two AI checks on" : "off (rules only)"} · {pluralize(meta.files.length, "file")} read
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {meta.notes.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {meta.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No caveats recorded.</p>
          )}
          {meta.files.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {meta.files.map((f) => (
                <span key={f.name} className="tabular rounded-md border px-2 py-1 font-mono text-xs text-muted-foreground">
                  {f.name} · {f.rows.toLocaleString("en-US")} rows
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
