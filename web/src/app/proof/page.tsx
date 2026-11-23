import { CircleCheck, CircleX, Clock, FlaskConical, GitCompareArrows, Link2, Info } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { KpiCard } from "@/components/shared/kpi-card";
import { VerdictBadge } from "@/components/shared/verdict-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney, formatPercent, results } from "@/lib/data";

export const metadata: Metadata = { title: "Proof" };

export default function ProofPage() {
  const { proof, meta } = results;
  const totalMatched = proof.matchBreakdown.reduce((sum, m) => sum + m.count, 0);

  return (
    <>
      <PageHeader
        title="Proof"
        description="How far to trust today's list: how well customers were matched, how often the verdicts were right on a hand-checked sample, and where the tool gets it wrong."
      />

      <section aria-label="Headline checks" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Customer match rate" value={formatPercent(proof.matchRate, 1)} hint={`${totalMatched} names across systems`} icon={Link2} />
        <KpiCard
          label="Verdict accuracy"
          value={proof.accuracy ? formatPercent(proof.accuracy.rate) : "Not measured"}
          hint={proof.accuracy ? `${proof.accuracy.agreed} of ${proof.accuracy.sampleSize} checked against ${proof.accuracy.labelledBy}` : "Needs a hand-checked sample"}
          icon={FlaskConical}
        />
        <KpiCard
          label="AI judges agreed"
          value={proof.agreementRate !== null ? formatPercent(proof.agreementRate) : "—"}
          hint="Disagreements go to a person"
          icon={GitCompareArrows}
        />
        <KpiCard label="Time to build the list" value={`${proof.runtimeSeconds.toFixed(1)}s`} hint="Full run, all files" icon={Clock} />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>How customers were matched</CardTitle>
            <CardDescription>Exact IDs first, then names, then AI only when two judges agree.</CardDescription>
          </CardHeader>
          <CardContent>
            {proof.matchBreakdown.length === 0 ? (
              <EmptyState title="No matching data" />
            ) : (
              <ul className="space-y-3">
                {proof.matchBreakdown.map((m) => (
                  <li key={m.method}>
                    <div className="flex items-center justify-between text-sm">
                      <span>{m.method}</span>
                      <span className="tabular text-muted-foreground">
                        {m.count} · {formatPercent(totalMatched ? m.count / totalMatched : 0)}
                      </span>
                    </div>
                    <Progress value={totalMatched ? (m.count / totalMatched) * 100 : 0} className="mt-1.5 h-1.5" aria-label={m.method} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verdict accuracy</CardTitle>
            <CardDescription>
              {proof.accuracy ? `Labelled by: ${proof.accuracy.labelledBy}` : "Compared with what a person would have decided."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {proof.accuracy ? (
              <div>
                <p className="tabular text-4xl font-semibold tracking-tight">{formatPercent(proof.accuracy.rate)}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  The tool matched the person on {proof.accuracy.agreed} of {proof.accuracy.sampleSize} bills.
                </p>
                <Progress value={proof.accuracy.rate * 100} className="mt-4 h-2" aria-label="Accuracy" />
                <p className="mt-4 text-xs text-muted-foreground">
                  A small sample. It shows the tool is useful with a person approving, not that it can run alone.
                </p>
              </div>
            ) : (
              <EmptyState
                title="Not measured yet"
                description="Hand-check a sample of bills, record what you'd have decided, and re-run. Until then, treat every verdict as a suggestion."
                icon={FlaskConical}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Verified numbers</CardTitle>
          <CardDescription>Each figure is worked out two independent ways. If they disagree, we say so.</CardDescription>
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
                  <TableHead className="hidden md:table-cell">Method A</TableHead>
                  <TableHead className="text-right">A</TableHead>
                  <TableHead className="hidden md:table-cell">Method B</TableHead>
                  <TableHead className="text-right">B</TableHead>
                  <TableHead className="pr-6 text-right">Match</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proof.verifiedNumbers.map((v) => (
                  <TableRow key={v.label}>
                    <TableCell className="pl-6 align-top whitespace-normal">
                      <span className="font-medium">{v.label}</span>
                      {v.note && <p className="mt-0.5 text-xs text-muted-foreground">{v.note}</p>}
                    </TableCell>
                    <TableCell className="hidden align-top whitespace-normal text-muted-foreground md:table-cell">{v.methodA}</TableCell>
                    <TableCell className="tabular text-right align-top">{formatMoney(v.valueA)}</TableCell>
                    <TableCell className="hidden align-top whitespace-normal text-muted-foreground md:table-cell">{v.methodB}</TableCell>
                    <TableCell className="tabular text-right align-top">{formatMoney(v.valueB)}</TableCell>
                    <TableCell className="pr-6 text-right align-top">
                      {v.ok ? (
                        <CircleCheck className="ml-auto size-4 text-emerald-600 dark:text-emerald-400" aria-label="Agrees" />
                      ) : (
                        <CircleX className="ml-auto size-4 text-rose-600 dark:text-rose-400" aria-label="Disagrees" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Where the tool is wrong</CardTitle>
          <CardDescription>Cases from the checked sample where the right answer differs from the tool&apos;s, and why.</CardDescription>
        </CardHeader>
        <CardContent>
          {proof.failures.length === 0 ? (
            <EmptyState title="No failures recorded" description="Either nothing was hand-checked yet, or the sample found no mistakes." />
          ) : (
            <ul className="space-y-3">
              {proof.failures.map((f, i) => {
                const inv = results.invoices.find((x) => x.id === f.invoiceId);
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
                      Tool said <VerdictBadge verdict={f.toolSaid} /> → should be <VerdictBadge verdict={f.truth} />
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
            AI mode: {meta.aiMode === "groq" ? "Groq (AI judges on)" : "Rules only (no AI key)"} · {meta.files.length} files read
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
