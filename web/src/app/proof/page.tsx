import { CircleCheck, CircleX, Info } from "lucide-react";
import type { Metadata } from "next";
import { ShareBars, SplitBar } from "@/components/charts/charts";
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
  const cross = proof.verifiedNumbers.filter((v) => (v.group ?? "cross") === "cross");
  const cooTests = proof.verifiedNumbers.filter((v) => v.group === "coo");
  const verifiedOk = cross.filter((v) => v.ok).length;
  const exactIds = proof.matchBreakdown.find((m) => m.method === "exact_id")?.count ?? 0;
  const exactNames = proof.matchBreakdown.find((m) => m.method === "exact_name")?.count ?? 0;
  const paused = invoices.filter(isUnsureHold);
  const aiOn = meta.aiMode === "groq" && proof.agreementRate !== null;

  return (
    <>
      <PageHeader
        title="How sure are we"
        description="How far to trust today's list: how often the suggestions were right, every place the tool was wrong, and the COO's two tests."
      />

      {proof.reviewLog && (
        <Card className="mb-6 border-foreground/20">
          <CardHeader>
            <CardTitle className="leading-snug">How often it&apos;s right, and every time it was wrong</CardTitle>
            <CardDescription>
              A separate AI model, which never saw the tool&apos;s answers, reviewed all 54 bills from fact files we built from the raw records
              (each bill with its tickets, payments and contract, plus a few flags such as top-50). A person checked the 11 contested calls,
              not the 43 where both agreed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const log = proof.reviewLog!;
              const fixed = log.entries.filter((x) => x.status === "fixed").length;
              const kept = log.entries.filter((x) => x.status === "deliberate").length;
              const open = log.entries.filter((x) => x.status === "open").length;
              const sources = log.entries.reduce<{ by: string; n: number; fixed: number; kept: number; open: number }[]>((acc, e) => {
                let row = acc.find((r) => r.by === e.foundBy);
                if (!row) {
                  row = { by: e.foundBy, n: 0, fixed: 0, kept: 0, open: 0 };
                  acc.push(row);
                }
                row.n += 1;
                if (e.status === "fixed") row.fixed += 1;
                else if (e.status === "deliberate") row.kept += 1;
                else row.open += 1;
                return acc;
              }, []);
              const split = (r: { fixed: number; kept: number; open: number }) =>
                [r.fixed && `${r.fixed} fixed`, r.kept && `${r.kept} kept on purpose`, r.open && `${r.open} still open`].filter(Boolean).join(", ");
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
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="rounded-lg border border-foreground/25 p-3">
                      <p className="text-xs text-muted-foreground">First pass</p>
                      <p className="tabular text-2xl font-semibold">85%</p>
                      <p className="text-xs text-muted-foreground">46 of 54 bills agreed</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">After fixing what it missed</p>
                      <p className="tabular text-xl font-semibold">{proof.accuracy ? `${Math.round(proof.accuracy.rate * 100)}%` : "-"}</p>
                      <p className="text-xs text-muted-foreground">
                        {proof.accuracy ? `${proof.accuracy.agreed} of ${proof.accuracy.sampleSize}, on the same bills: not a fresh test` : "not measured"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-dashed p-3">
                      <p className="text-xs text-muted-foreground">The fresh test</p>
                      <p className="text-xl font-semibold">Shadow week</p>
                      <p className="text-xs text-muted-foreground">New bills; Priya decides first, then compares</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    The 2 misses we found ourselves were fixed before the review ran, so the very first version would have agreed on at most 44
                    of 54.
                  </p>

                  <div className="mt-5">
                    <p className="text-sm font-medium">Where every miss came from</p>
                    <ul className="mt-2 divide-y rounded-lg border text-sm">
                      {sources.map((r) => (
                        <li key={r.by} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-3 py-2">
                          <span>{r.by}</span>
                          <span className="tabular text-muted-foreground">
                            <span className="font-medium text-foreground">{r.n}</span> · {split(r)}
                          </span>
                        </li>
                      ))}
                      <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 bg-muted/40 px-3 py-2 font-medium">
                        <span>All of them</span>
                        <span className="tabular">
                          {log.entries.length} · {split({ fixed, kept, open })}
                        </span>
                      </li>
                    </ul>
                  </div>

                  <p className="mt-5 text-sm font-medium">Each one, and what changed</p>
                  <ol className="mt-2 space-y-3">{log.entries.slice(0, 4).map((e, idx) => item(e, idx))}</ol>
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


      {cooTests.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="leading-snug">The COO&apos;s two tests</CardTitle>
            <CardDescription>
              Her words: &ldquo;nobody has been chased who&apos;d paid or had a complaint open.&rdquo; Either one failing gets the tool switched off.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {cooTests.map((v) => (
              <div key={v.label} className="rounded-lg border p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-medium">{v.label}</p>
                  <p className={v.ok ? "tabular text-2xl font-semibold text-paid-ink" : "tabular text-2xl font-semibold text-alert-ink"}>
                    {v.valueA}
                  </p>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Counted: {v.methodA.charAt(0).toLowerCase() + v.methodA.slice(1)}.</p>
                {v.strictValue !== undefined && v.strictValue > 0 && (
                  <p className="mt-2 text-xs font-medium text-hold-ink">
                    Strictest reading: {v.strictValue} {v.strictValue === 1 ? "customer" : "customers"} today
                  </p>
                )}
                {v.note && <p className="mt-1 text-xs leading-relaxed">{v.note}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
          More detail: name matching, cross-checks, auto-send rules, settings, data sources and run notes
          <span className="ml-2 text-xs font-normal text-muted-foreground group-open:hidden">Show</span>
        </summary>
        <div className="-mt-2">
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="leading-snug">
              {proof.matchRate >= 1
                ? `Every customer name was linked across systems`
                : `${formatPercent(proof.matchRate)} of customer names were linked across systems`}
            </CardTitle>
            <CardDescription>
              {pluralize(matchTotal, "name")} from bills, payments and tickets: {exactIds.toLocaleString("en-US")} by customer ID,{" "}
              {exactNames.toLocaleString("en-US")} by exact name. A close-but-not-exact name goes to a person.
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
              <EmptyState title="No-vendor mode" description="No AI provider is approved yet (COO, 23 Nov), so tickets were read with tags, status and local rules, and no ticket text left the company. The AI double-check switches on once legal approves a provider. The redraft button on each email is a demo that sends a draft from this fictional data room to Groq." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="leading-snug">
            {cross.length ? `${verifiedOk} of ${cross.length} headline figures agree when worked out two ways` : "No two-way checks recorded"}
          </CardTitle>
          <CardDescription>Each figure is worked out two independent ways. Where they disagree, the gap is shown and explained.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {cross.length === 0 ? (
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
                {cross.map((v) => {
                  const isCount = v.unit === "count";
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
            {proof.failures.length
              ? `Where the tool and the reviewer still differ: ${pluralize(proof.failures.length, "bill")}`
              : "Where the tool and the reviewer differ"}
          </CardTitle>
          <CardDescription>After the fixes. Each one is in the miss log above, with the reason it was kept.</CardDescription>
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
                      Tool says <VerdictBadge verdict={f.toolSaid} /> · reviewer says <VerdictBadge verdict={f.truth} />
                      {proof.reviewLog?.entries.some((e) => e.invoice === f.invoiceId && e.status === "deliberate") && (
                        <span className="rounded-full border px-2 text-[11px]">Kept on purpose</span>
                      )}
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
