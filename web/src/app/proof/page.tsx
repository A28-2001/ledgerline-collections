import { CircleCheck, CircleX, FlaskConical, Info } from "lucide-react";
import type { Metadata } from "next";
import { Gauge, ShareBars, SplitBar } from "@/components/charts/charts";
import { EmptyState } from "@/components/shared/empty-state";
import { TrustLadder } from "@/components/shared/trust-ladder";
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
  unmatched: "var(--alert)",
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

      {proof.reviewLog && (
        <Card className="mb-6 border-foreground/20">
          <CardHeader>
            <CardTitle className="leading-snug">Where it was wrong, and what we changed</CardTitle>
            <CardDescription>{proof.reviewLog.summary}</CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const log = proof.reviewLog!;
              const fixed = log.entries.filter((x) => x.status === "fixed").length;
              const kept = log.entries.filter((x) => x.status === "deliberate").length;
              const open = log.entries.filter((x) => x.status === "open").length;
              const item = (e: (typeof log.entries)[number], idx: number) => (
                    <li key={`${e.invoice}-${idx}`} className="rounded-lg border p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium">{e.customer}</span>
                        {e.invoice !== "-" && <span className="font-mono text-xs text-muted-foreground">{e.invoice}</span>}
                        {e.amount > 0 && <span className="tabular text-xs text-muted-foreground">{formatMoney(e.amount)}</span>}
                        <span
                          className={
                            e.status === "fixed"
                              ? "rounded-full border border-paid/45 px-2 text-[11px] text-paid-ink"
                              : e.status === "deliberate"
                                ? "rounded-full border px-2 text-[11px] text-muted-foreground"
                                : "rounded-full border border-hold/60 px-2 text-[11px] text-hold-ink"
                          }
                        >
                          {e.status === "fixed" ? "Fixed" : e.status === "deliberate" ? "Kept on purpose" : "Still open"}
                        </span>
                        <span className="text-[11px] text-muted-foreground">Found by {e.foundBy}</span>
                      </div>
                      {e.toolSaid !== "-" && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Tool said <span className="font-medium text-foreground">{e.toolSaid}</span> · should be{" "}
                          <span className="font-medium text-foreground">{e.shouldBe}</span>
                        </p>
                      )}
                      <p className="mt-1.5 leading-relaxed">{e.why}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Change: {e.change}</p>
                    </li>
              );
              return (
                <>
                  <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">First pass</p>
                      <p className="tabular text-xl font-semibold">85%</p>
                      <p className="text-[11px] text-muted-foreground">46 of 54 agreed</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">After the fixes</p>
                      <p className="tabular text-xl font-semibold">{proof.accuracy ? `${Math.round(proof.accuracy.rate * 100)}%` : "-"}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {proof.accuracy ? `${proof.accuracy.agreed} of ${proof.accuracy.sampleSize}, same bills` : "not measured"}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Misses fixed</p>
                      <p className="tabular text-xl font-semibold">{fixed}</p>
                      <p className="text-[11px] text-muted-foreground">each one led to a rule</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Kept on purpose / open</p>
                      <p className="tabular text-xl font-semibold">
                        {kept} / {open}
                      </p>
                      <p className="text-[11px] text-muted-foreground">shown below, not hidden</p>
                    </div>
                  </div>
                  <ol className="space-y-3">{log.entries.slice(0, 4).map((e, idx) => item(e, idx))}</ol>
                  {log.entries.length > 4 && (
                    <details className="group mt-3">
                      <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                        <span className="group-open:hidden">Show the other {log.entries.length - 4}</span>
                        <span className="hidden group-open:inline">Hide them</span>
                      </summary>
                      <ol className="mt-3 space-y-3">{log.entries.slice(4).map((e, idx) => item(e, idx + 4))}</ol>
                    </details>
                  )}
                </>
              );
            })()}
          </CardContent>
        </Card>
      )}


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
                    { label: "Agreed", value: proof.agreementRate!, className: "bg-paid" },
                    { label: "Disagreed", value: 1 - proof.agreementRate!, className: "bg-alert" },
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
              <EmptyState title="No-vendor mode" description="No AI provider is approved yet (COO, 23 Nov), so tickets were read with tags, status and local rules. Nothing left the company. The AI double-check switches on once legal approves a provider." />
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
                          <p className="tabular mt-0.5 text-xs font-medium text-alert-ink">
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
                          <CircleCheck className="ml-auto size-4 text-paid-ink" aria-label="Agrees" />
                        ) : (
                          <CircleX className="ml-auto size-4 text-alert-ink" aria-label="Disagrees" />
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

      {results.monthOne && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="leading-snug">How we&apos;ll know it works, a month from now</CardTitle>
            <CardDescription>{results.monthOne.source}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ol className="grid gap-3 sm:grid-cols-3">
              {results.monthOne.measures.map((m, idx) => (
                <li key={m.label} className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">{idx === 0 ? "The one number" : "The real test"}</p>
                  <p className="mt-0.5 font-medium">{m.label}</p>
                  <p className="tabular mt-1 text-base font-semibold">{m.todayText}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{m.target}</p>
                </li>
              ))}
            </ol>
            <p className="text-xs leading-relaxed text-muted-foreground">{results.monthOne.timeSaved}</p>
          </CardContent>
        </Card>
      )}


      <details className="group mt-8 rounded-xl border bg-card/50 p-4 sm:p-5">
        <summary className="cursor-pointer list-none text-sm font-semibold">
          How it runs safely: auto-send rules, settings, data sources and run notes
          <span className="ml-2 text-xs font-normal text-muted-foreground group-open:hidden">Show</span>
        </summary>
        <div className="-mt-2">
      {results.autoSend && <TrustLadder data={results.autoSend} invoices={invoices} />}

      {results.settings && results.settings.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="leading-snug">Settings, not code: every number the COO set, and who can change it</CardTitle>
            <CardDescription>Starting points from the conversation with the COO. The VP Finance may move them.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Setting</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Who changes it</TableHead>
                    <TableHead>From</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.settings.map((st) => (
                    <TableRow key={st.name}>
                      <TableCell className="min-w-48 whitespace-normal font-medium">{st.name}</TableCell>
                      <TableCell className="whitespace-normal">{st.value}</TableCell>
                      <TableCell className="whitespace-normal text-muted-foreground">{st.who}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{st.source}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {meta.sources && meta.sources.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="leading-snug">Where the data comes from, and who signs it off</CardTitle>
            <CardDescription>Read-only connections, so nothing depends on someone remembering a morning export. Every ticket excerpt finance sees is masked.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>What the tool reads</TableHead>
                    <TableHead>How</TableHead>
                    <TableHead>Signs off</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meta.sources.map((src) => (
                    <TableRow key={src.name}>
                      <TableCell className="font-medium">{src.name}</TableCell>
                      <TableCell className="min-w-48 whitespace-normal text-muted-foreground">{src.what}</TableCell>
                      <TableCell className="whitespace-normal">{src.how}</TableCell>
                      <TableCell className="whitespace-normal">{src.signOff}</TableCell>
                      <TableCell className="whitespace-normal text-muted-foreground">{src.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

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
        </div>
      </details>
    </>
  );
}
