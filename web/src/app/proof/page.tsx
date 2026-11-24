import { ArrowRight, BotOff, CircleCheck, CircleX, Gauge, MessageSquareText, ShieldCheck, UserCheck } from "lucide-react";
import type { Metadata } from "next";
import { TrustLadder } from "@/components/shared/trust-ladder";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMoney, results } from "@/lib/data";
import type { Results } from "@/lib/types";

export const metadata: Metadata = { title: "How sure are we" };

type Entry = NonNullable<Results["proof"]["reviewLog"]>["entries"][number];

function StatusBadge({ status }: { status: Entry["status"] }) {
  return (
    <span
      className={
        status === "fixed" || status === "confirm"
          ? "w-fit rounded-full border border-foreground/30 px-2 text-[11px] whitespace-nowrap text-foreground"
          : status === "deliberate"
            ? "w-fit rounded-full border px-2 text-[11px] whitespace-nowrap text-muted-foreground"
            : "w-fit rounded-full border border-hold/60 px-2 text-[11px] whitespace-nowrap text-hold-ink"
      }
    >
      {status === "fixed" ? "Fixed" : status === "confirm" ? "Changed, for Maya to confirm" : status === "deliberate" ? "Kept on purpose" : "Still open"}
    </span>
  );
}

// One line per miss: who, what happened to it, and what changed.
function MissRow({ e }: { e: Entry }) {
  return (
    <li className="grid gap-1 px-3 py-2.5 text-sm sm:grid-cols-[minmax(0,13rem)_8.5rem_minmax(0,1fr)] sm:items-baseline sm:gap-3">
      <span className="truncate font-medium">{e.customer}</span>
      <StatusBadge status={e.status} />
      <span className="text-xs leading-relaxed text-muted-foreground">{e.change}</span>
    </li>
  );
}

function MissItem({ e }: { e: Entry }) {
  return (
    <li className="rounded-lg border p-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-medium">{e.customer}</span>
        {e.amount > 0 && <span className="tabular text-xs text-muted-foreground">{formatMoney(e.amount)}</span>}
        <StatusBadge status={e.status} />
        {e.differsBecause && e.status !== "deliberate" && (
          <span className="rounded-full border px-2 text-[11px] text-muted-foreground">Differs from the reviewer on purpose</span>
        )}
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

  // The bills that still differ from the review come first, so "explained below" is the first thing below.
  const ordered = [...(log?.entries ?? [])].sort((a, b) => Number(!!b.differsBecause) - Number(!!a.differsBecause));
  const firstPass = (log?.entries ?? []).filter((e) => e.foundBy === "Independent review, first pass").length;
  const sources = (log?.entries ?? []).reduce<{ by: string; n: number; fixed: number; confirm: number; kept: number; open: number }[]>((acc, e) => {
    let row = acc.find((r) => r.by === e.foundBy);
    if (!row) {
      row = { by: e.foundBy, n: 0, fixed: 0, confirm: 0, kept: 0, open: 0 };
      acc.push(row);
    }
    row.n += 1;
    if (e.status === "fixed") row.fixed += 1;
    else if (e.status === "confirm") row.confirm += 1;
    else if (e.status === "deliberate") row.kept += 1;
    else row.open += 1;
    return acc;
  }, []);
  const split = (r: { fixed: number; confirm: number; kept: number; open: number }) =>
    [
      r.fixed && `${r.fixed} fixed`,
      r.confirm && `${r.confirm} for Maya to confirm`,
      r.kept && `${r.kept} kept on purpose`,
      r.open && `${r.open} still open`,
    ]
      .filter(Boolean)
      .join(", ");
  const totals = sources.reduce(
    (t, r) => ({ fixed: t.fixed + r.fixed, confirm: t.confirm + r.confirm, kept: t.kept + r.kept, open: t.open + r.open }),
    { fixed: 0, confirm: 0, kept: 0, open: 0 },
  );

  const guards = [
    {
      icon: UserCheck,
      lead: "A person approves everything",
      rest: "Top-50 accounts, disputes, probably-paid bills and every call always stay with a person. Auto-send stays off until a month of approvals is on record.",
    },
    {
      icon: BotOff,
      lead: "The daily tool uses no AI",
      rest: "Rules only, until legal approves an AI vendor; AI redraft is off. In testing only, Claude reviewed the bills and Groq read masked tickets.",
    },
    {
      icon: Gauge,
      lead: "AI is measured before it's allowed",
      rest:
        up && up.cacheMisses === 0
          ? `On these bills it changed ${up.verdictsChanged.length === 0 ? "no answers" : `${up.verdictsChanged.length} answers`}; it would only change which ${up.checkFirstChanged} bills a person checks first. Once allowed, two models must agree or a person decides.`
          : "Once allowed, two models must agree or a person decides.",
    },
    { icon: MessageSquareText, lead: "No threats, no invented facts", rest: "Emails come from Ledgerline's own templates, checked for threat words." },
  ];

  // The 54 bills as squares: agreed from the start, agree after a fix, differ on purpose.
  const total = proof.accuracy?.sampleSize ?? 0;
  const now = proof.accuracy?.agreed ?? 0;
  const agreedFirst = Math.max(0, total - firstPass);
  const fixedLater = Math.max(0, now - agreedFirst);
  const differ = Math.max(0, total - now);
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const KIND = [
    { key: "first", n: agreedFirst, label: "agreed from the start", cls: "bg-foreground/25" },
    { key: "fixed", n: fixedLater, label: "agree after a fix", cls: "bg-brand" },
    { key: "differ", n: differ, label: "differ on purpose", cls: "bg-hold" },
  ];
  const squares = KIND.flatMap((k) => Array.from({ length: k.n }, () => k.cls));

  return (
    <>
      <PageHeader title="How sure are we" description="Can finance trust the list, and is the AI safe on billing?" />

      {log && (
        <Card className="mb-6 border-foreground/20">
          <CardHeader>
            <CardTitle className="leading-snug">How often it agrees with an independent review</CardTitle>
            <CardDescription>
              A separate AI model (Claude, in its own session) checked all {total} bills without seeing the tool&apos;s answers. A person then
              checked the bills in doubt.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
              <div className="flex items-end gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">First pass</p>
                  <p className="tabular text-3xl font-semibold text-muted-foreground">{pct(agreedFirst)}%</p>
                </div>
                <ArrowRight className="mb-2 size-5 text-muted-foreground" aria-hidden="true" />
                <div>
                  <p className="text-xs font-medium text-brand">After the fixes</p>
                  <p className="tabular text-5xl leading-none font-semibold text-brand">{pct(now)}%</p>
                </div>
              </div>
              <div className="min-w-0">
                <div
                  className="flex flex-wrap gap-1.5"
                  role="img"
                  aria-label={`${total} bills: ${agreedFirst} agreed from the start, ${fixedLater} agree after a fix, ${differ} differ on purpose`}
                >
                  {squares.map((cls, i) => (
                    <span key={i} className={`size-4 rounded-[4px] ${cls}`} />
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {KIND.map((k) => (
                    <span key={k.key} className="inline-flex items-center gap-1.5">
                      <span className={`size-2.5 rounded-[3px] ${k.cls}`} aria-hidden="true" />
                      <span className="tabular font-semibold">{k.n}</span>
                      <span className="text-muted-foreground">{k.label}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <p className="mt-5 w-fit rounded-full border border-dashed px-3 py-1 text-xs text-muted-foreground">
              Same {total} bills the rules were fixed on. The fresh test is the shadow week: new bills, and nothing goes out from the tool.
            </p>

            <Tabs defaultValue="differ" className="mt-5">
              <TabsList className="h-auto flex-wrap group-data-horizontal/tabs:h-auto">
                <TabsTrigger value="differ">{differ} still differ</TabsTrigger>
                <TabsTrigger value="all">All {log.entries.length} misses</TabsTrigger>
                <TabsTrigger value="source">Where they came from</TabsTrigger>
              </TabsList>
              <TabsContent value="differ">
                <ol className="space-y-3">
                  {ordered
                    .filter((e) => e.differsBecause)
                    .map((e, idx) => (
                      <MissItem key={`${e.invoice}-${idx}`} e={e} />
                    ))}
                </ol>
              </TabsContent>
              <TabsContent value="all">
                <ul className="divide-y rounded-lg border">
                  {ordered.map((e, idx) => (
                    <MissRow key={`${e.invoice}-${idx}`} e={e} />
                  ))}
                </ul>
              </TabsContent>
              <TabsContent value="source">
                <ul className="divide-y rounded-lg border text-sm" aria-label="Where every miss came from">
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
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {cooTests.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="leading-snug">The COO&apos;s two tests</CardTitle>
            <CardDescription>
              Her words: &ldquo;nobody has been chased who&apos;d paid or had a complaint open.&rdquo; Her real test is that both stay at 0 for
              a month.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {cooTests.map((v) => (
              <div key={v.label} className="rounded-lg border p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-medium">{v.label}</p>
                  <p className={v.ok ? "tabular text-4xl leading-none font-semibold text-brand" : "tabular text-4xl leading-none font-semibold text-alert-ink"}>{v.valueA}</p>
                </div>
                {v.strictValue !== undefined && v.strictValue > 0 && (
                  <p className="mt-1 text-xs font-medium text-hold-ink">
                    Strictest reading: {v.strictValue} {v.strictValue === 1 ? "customer" : "customers"} with a pending ticket that isn&apos;t about
                    money. Maya&apos;s rule (24 Nov): a polite reminder can go once Priya has read the ticket, so they wait in Check first.
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
          <ul className="grid gap-3 sm:grid-cols-2">
            {guards.map((g) => (
              <li key={g.lead} className="rounded-lg border p-3.5">
                <g.icon className="size-5 text-brand" aria-hidden="true" />
                <p className="mt-2 text-sm font-semibold">{g.lead}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{g.rest}</p>
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
            <ol className="grid gap-3 text-sm sm:grid-cols-2">
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

      <section className="mt-8" aria-label="For reviewers">
        <h2 className="text-base font-semibold tracking-tight">For reviewers</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">The auto-send rules, every setting, where the data comes from, and the two-way checks.</p>
        <Tabs defaultValue="autosend" className="mt-3">
          <TabsList className="h-auto flex-wrap group-data-horizontal/tabs:h-auto">
            <TabsTrigger value="autosend">Auto-send</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="sources">Data sources</TabsTrigger>
            <TabsTrigger value="checks">Two-way checks</TabsTrigger>
          </TabsList>
          <TabsContent value="autosend">{results.autoSend && <TrustLadder data={results.autoSend} invoices={invoices} />}</TabsContent>
          <TabsContent value="settings">

          {results.settings && results.settings.length > 0 && (
            <Card>
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
          </TabsContent>
          <TabsContent value="sources">
          {meta.sources && meta.sources.length > 0 && (
            <Card>
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
          </TabsContent>
          <TabsContent value="checks">
          {cross.length > 0 && (
            <Card>
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
          </TabsContent>
        </Tabs>
      </section>
    </>
  );
}
