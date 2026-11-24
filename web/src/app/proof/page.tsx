import { CircleCheck, CircleX, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { TrustLadder } from "@/components/shared/trust-ladder";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney, results } from "@/lib/data";
import type { Results } from "@/lib/types";

export const metadata: Metadata = { title: "How sure are we" };

type Entry = NonNullable<Results["proof"]["reviewLog"]>["entries"][number];

function MissItem({ e }: { e: Entry }) {
  return (
    <li className="rounded-lg border p-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-medium">{e.customer}</span>
        {e.amount > 0 && <span className="tabular text-xs text-muted-foreground">{formatMoney(e.amount)}</span>}
        <span
          className={
            e.status === "fixed"
              ? "rounded-full border border-foreground/30 px-2 text-[11px] text-foreground"
              : e.status === "deliberate"
                ? "rounded-full border px-2 text-[11px] text-muted-foreground"
                : "rounded-full border border-hold/60 px-2 text-[11px] text-hold-ink"
          }
        >
          {e.status === "fixed" ? "Fixed" : e.status === "deliberate" ? "Kept on purpose" : "Still open"}
        </span>
        {e.toolSaid !== "-" && (
          <span className="text-xs text-muted-foreground">
            said {e.toolSaid}, should be {e.shouldBe}
          </span>
        )}
      </div>
      <p className="mt-1.5 leading-relaxed">{e.why}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Change: {e.change}</p>
    </li>
  );
}

export default function ProofPage() {
  const { proof, meta, invoices } = results;
  const log = proof.reviewLog;
  const cross = proof.verifiedNumbers.filter((v) => (v.group ?? "cross") === "cross");
  const cooTests = proof.verifiedNumbers.filter((v) => v.group === "coo");
  const crossOk = cross.filter((v) => v.ok).length;
  const up = proof.aiUplift;

  const sources = (log?.entries ?? []).reduce<{ by: string; n: number; fixed: number; kept: number; open: number }[]>((acc, e) => {
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
  const totals = sources.reduce((t, r) => ({ fixed: t.fixed + r.fixed, kept: t.kept + r.kept, open: t.open + r.open }), { fixed: 0, kept: 0, open: 0 });

  const guards: { lead: string; rest: string }[] = [
    { lead: "A person approves everything.", rest: "Auto-send stays off until a month of approvals is on record." },
    { lead: "Some bills always stay with a person:", rest: "top-50 accounts, disputes, probably-paid bills and every call." },
    { lead: "No customer data goes to an AI vendor", rest: "until legal approves one; ticket excerpts are masked." },
    {
      lead: "AI is double-checked and measured:",
      rest: up && up.cacheMisses === 0 ? `two models must agree; on these bills it changed ${up.verdictsChanged.length === 0 ? "no answers" : `${up.verdictsChanged.length} answers`}.` : "two models must agree, or a person decides.",
    },
    { lead: "No threats, no invented facts:", rest: "emails come from Ledgerline's templates, checked for threat words." },
    { lead: "The headline totals are checked:", rest: `worked out two ways, ${crossOk} of ${cross.length} agree; every customer name is linked.` },
  ];

  return (
    <>
      <PageHeader title="How sure are we" description="Can finance trust the list, and is the AI safe on billing?" />

      {log && (
        <Card className="mb-6 border-foreground/20">
          <CardHeader>
            <CardTitle className="leading-snug">How often it agrees with an independent review, and every miss</CardTitle>
            <CardDescription>
              A separate AI model reviewed all 54 bills from fact files we built, without the tool&apos;s answers. A person checked the 11
              contested calls, not the other 43.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                  {proof.accuracy
                    ? `${proof.accuracy.agreed} of ${proof.accuracy.sampleSize} on the same bills${
                        proof.accuracy.agreedOriginal != null && proof.accuracy.agreedOriginal !== proof.accuracy.agreed
                          ? ` (${proof.accuracy.agreedOriginal} against the reviewer's first labels; I changed one after my hand check)`
                          : ""
                      }`
                    : "not measured"}
                </p>
              </div>
              <div className="rounded-lg border border-dashed p-3">
                <p className="text-xs text-muted-foreground">The fresh test</p>
                <p className="text-xl font-semibold">Shadow week</p>
                <p className="text-xs text-muted-foreground">New bills; Priya decides first, then compares</p>
              </div>
            </div>

            <ul className="mt-5 divide-y rounded-lg border text-sm" aria-label="Where every miss came from">
              {sources.map((r) => (
                <li key={r.by} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-3 py-2">
                  <span>{r.by}</span>
                  <span className="tabular text-muted-foreground">
                    <span className="font-medium text-foreground">{r.n}</span> · {split(r)}
                  </span>
                </li>
              ))}
              <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 bg-muted/40 px-3 py-2 font-medium">
                <span>Every miss</span>
                <span className="tabular">
                  {log.entries.length} · {split(totals)}
                </span>
              </li>
            </ul>

            <ol className="mt-4 space-y-3">
              {log.entries.slice(0, 2).map((e, idx) => (
                <MissItem key={`${e.invoice}-${idx}`} e={e} />
              ))}
            </ol>
            {log.entries.length > 2 && (
              <details className="group mt-3">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                  <span className="group-open:hidden">Show the other {log.entries.length - 2}</span>
                  <span className="hidden group-open:inline">Hide them</span>
                </summary>
                <ol className="mt-3 space-y-3">
                  {log.entries.slice(2).map((e, idx) => (
                    <MissItem key={`${e.invoice}-${idx + 2}`} e={e} />
                  ))}
                </ol>
              </details>
            )}
          </CardContent>
        </Card>
      )}

      {cooTests.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="leading-snug">The COO&apos;s two tests</CardTitle>
            <CardDescription>
              Her words: &ldquo;nobody has been chased who&apos;d paid or had a complaint open.&rdquo;
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {cooTests.map((v) => (
              <div key={v.label} className="rounded-lg border p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-medium">{v.label}</p>
                  <p className={v.ok ? "tabular text-2xl font-semibold text-foreground" : "tabular text-2xl font-semibold text-alert-ink"}>{v.valueA}</p>
                </div>
                {v.strictValue !== undefined && v.strictValue > 0 && (
                  <p className="mt-1 text-xs font-medium text-hold-ink">
                    Strictest reading: {v.strictValue} {v.strictValue === 1 ? "customer" : "customers"}
                  </p>
                )}
                {v.note && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{v.note}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 leading-snug">
            <ShieldCheck className="size-4 text-muted-foreground" aria-hidden="true" />
            Why it&apos;s safe to use on billing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2.5 text-sm">
            {guards.map((g) => (
              <li key={g.lead} className="flex gap-2.5">
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-foreground" aria-hidden="true" />
                <span className="leading-relaxed">
                  <span className="font-semibold">{g.lead}</span> <span className="text-muted-foreground">{g.rest}</span>
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {results.monthOne && (
        <Card>
          <CardHeader>
            <CardTitle className="leading-snug">How we&apos;ll know it works, a month from now</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-3 text-sm sm:grid-cols-3">
              {results.monthOne.measures.map((m, idx) => (
                <li key={m.label} className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">{idx === 0 ? "The COO's one number" : "Her real test"}</p>
                  <p className="mt-0.5 font-medium">{m.label}</p>
                  <p className="tabular mt-1 text-base font-semibold">{m.todayText}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{m.target}</p>
                </li>
              ))}
            </ol>
            {results.monthOne.timeSaved && <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{results.monthOne.timeSaved}</p>}
          </CardContent>
        </Card>
      )}

      <details className="group mt-8 rounded-xl border bg-card/50 p-4 sm:p-5">
        <summary className="cursor-pointer list-none text-sm font-semibold">
          For reviewers: auto-send rules, every setting, data sources and the two-way checks
          <span className="ml-2 text-xs font-normal text-muted-foreground group-open:hidden">Show</span>
        </summary>
        <div className="-mt-2">
          {results.autoSend && <TrustLadder data={results.autoSend} invoices={invoices} />}

          {results.settings && results.settings.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="leading-snug">Every number the COO set, and who can change it</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Setting</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Who changes it</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.settings.map((st) => (
                        <TableRow key={st.name}>
                          <TableCell className="min-w-48 whitespace-normal font-medium">{st.name}</TableCell>
                          <TableCell className="whitespace-normal">{st.value}</TableCell>
                          <TableCell className="whitespace-normal text-muted-foreground">{st.who}</TableCell>
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
                <CardTitle className="leading-snug">Where the data comes from (read-only)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source</TableHead>
                        <TableHead>What the tool reads</TableHead>
                        <TableHead>Signs off</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {meta.sources.map((src) => (
                        <TableRow key={src.name}>
                          <TableCell className="font-medium">{src.name}</TableCell>
                          <TableCell className="min-w-48 whitespace-normal text-muted-foreground">{src.what}</TableCell>
                          <TableCell className="whitespace-normal">{src.signOff}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {cross.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="leading-snug">
                  {crossOk} of {cross.length} headline figures agree when worked out two ways
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-6">Figure</TableHead>
                      <TableHead className="hidden md:table-cell">Way 1</TableHead>
                      <TableHead className="hidden md:table-cell">Way 2</TableHead>
                      <TableHead className="pr-6 text-right">Result</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cross.map((v) => (
                      <TableRow key={v.label}>
                        <TableCell className="pl-6 align-top whitespace-normal font-medium">{v.label}</TableCell>
                        <TableCell className="hidden align-top whitespace-normal text-muted-foreground md:table-cell">{v.methodA}</TableCell>
                        <TableCell className="hidden align-top whitespace-normal text-muted-foreground md:table-cell">{v.methodB}</TableCell>
                        <TableCell className="pr-6 text-right align-top">
                          <span className="tabular inline-flex items-center gap-1.5">
                            {formatMoney(v.valueA)}
                            {v.ok ? (
                              <CircleCheck className="size-4 text-foreground" aria-label="Both ways agree" />
                            ) : (
                              <CircleX className="size-4 text-alert-ink" aria-label="The two ways disagree" />
                            )}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </details>
    </>
  );
}
