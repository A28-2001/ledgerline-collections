import type { Metadata } from "next";
import { StoryScroll, type Chapter, type StoryData } from "@/components/story/story-scroll";
import { CAUSE_META, formatDate, formatMoney, formatMonth, results, VERDICT_META, VERDICTS } from "@/lib/data";

export const metadata: Metadata = { title: "The story" };

const pct = (n: number) => `${Math.round(n * 100)}%`;
const fmt = (n: number) => n.toLocaleString("en-US");

// Every number on this page is read from results.json, so it always matches the other pages.
export default function StoryPage() {
  const { summary, meta, invoices, trend, proof } = results;
  const asOf = formatDate(meta.asOf);
  const rows = (name: string) => meta.files.find((f) => f.name === name)?.rows ?? 0;

  const last = trend[trend.length - 1];
  const highest = trend.every((t) => t.overdueAmount <= last.overdueAmount);
  const tk = summary.tickets;
  const disputed = summary.byCause.find((c) => c.cause === "wrong_bill");
  const count = (v: string) => invoices.filter((i) => i.verdict === v).length;
  const wait = invoices.filter((i) => i.verdict === "hold" && i.headline.startsWith("Too early")).length;

  const firstPass = proof.reviewLog?.summary.match(/(\d+) of \d+ agreed \((\d+)%\)/);
  const firstAgreed = firstPass ? Number(firstPass[1]) : null;
  const acc = proof.accuracy;
  const entries = proof.reviewLog?.entries ?? [];
  const checks = proof.verifiedNumbers.filter((v) => /but chased/i.test(v.label));
  const checksTotal = checks.reduce((s, v) => s + v.valueA, 0);

  const data: StoryData = {
    totalText: formatMoney(summary.overdueAmount),
    trend: trend.map((t) => ({ month: formatMonth(t.month), amount: t.overdueAmount })),
    sources: [
      { name: "QuickBooks", detail: `${fmt(invoices.length)} overdue bills`, locked: false },
      { name: "Bank and Stripe", detail: `${fmt(summary.unmatchedPayments ?? 0)} payments not yet matched to a bill`, locked: false },
      { name: "Zendesk", detail: tk ? `${fmt(tk.fromOverdue)} tickets from customers who owe money` : `${fmt(rows("tickets.csv"))} tickets`, locked: true },
      { name: "Contracts", detail: "What each customer agreed to pay", locked: false },
    ],
    causes: summary.byCause.map((c) => ({
      key: c.cause,
      label: CAUSE_META[c.cause].label,
      color: CAUSE_META[c.cause].color,
      amount: c.amount,
      amountText: formatMoney(c.amount),
      count: c.count,
      share: c.amount / summary.overdueAmount,
    })),
    verdicts: VERDICTS.map((v) => ({
      key: v,
      label: VERDICT_META[v].label,
      count: count(v),
      amountText: formatMoney(summary.byVerdict[v].amount),
    })),
    review: {
      total: acc?.sampleSize ?? invoices.length,
      firstAgreed,
      nowAgreed: acc?.agreed ?? null,
      keptWhy: (() => {
        const t = entries.find((e) => e.status === "deliberate")?.change.replace(/^Kept on purpose:\s*/i, "");
        return t ? t.charAt(0).toUpperCase() + t.slice(1) : null;
      })(),
    },
    checks: checks.map((c) => ({ label: c.label.replace(/\s*\(.*\)$/, ""), value: c.valueA })),
  };

  const chapters: Chapter[] = [
    {
      id: "problem",
      kicker: "The problem",
      number: formatMoney(summary.overdueAmount),
      numberNote: `overdue, across ${summary.overdueCount} bills`,
      text: [
        highest
          ? `The highest month-end in the last ${trend.length} months: ${pct(last.overdueShare)} of what customers owe.`
          : `That's ${pct(last.overdueShare)} of what customers owe.`,
        "Finance chases it by hand: about 16 hours a week across the team.",
      ],
      source: "QuickBooks AR aging; trend from invoices and payments; processes.md (FIN-1)",
    },
    {
      id: "wall",
      kicker: "The wall",
      number: fmt(tk?.fromOverdue ?? rows("tickets.csv")),
      numberNote: tk ? "support tickets from customers who owe money, and finance can't open any" : "support tickets finance can't open",
      text: [
        "Finance has no access to Zendesk, where complaints live, so before chasing they ask around.",
        "Miss one, and a reminder lands on a customer who is waiting for a fix.",
      ],
      source: "Zendesk export (tickets.csv); tool_stack.md; processes.md (FIN-1)",
    },
    {
      id: "finding",
      kicker: "The finding",
      number: disputed ? formatMoney(disputed.amount) : "—",
      numberNote: disputed ? `${pct(disputed.amount / summary.overdueAmount)} of the overdue money is disputed` : "",
      text: [
        disputed
          ? `${disputed.count} bills are disputed in support tickets that name the exact invoice: wrong seats, a missing discount, a fee meant to be waived.`
          : "",
        "A reminder on any of them chases someone who is waiting for a corrected bill.",
      ].filter(Boolean),
      source: "Tickets matched to bills in this run (Why overdue page)",
    },
    {
      id: "answer",
      kicker: "The answer",
      number: `${count("send")} of ${invoices.length}`,
      numberNote: "bills get a polite email today",
      text: [
        "Five questions decide each bill, and Priya approves every email in one click.",
        tk
          ? `Rules read the ticket tags today. Once legal approves an AI vendor, AI also reads the text, because ${tk.relevantUntagged} of the ${tk.relevant} tickets that matter have no tag.`
          : "",
        `The rest go to a person: ${count("hold")} holds${wait ? ` (${wait} just too early)` : ""}, ${count("call")} calls and ${count("paid")} probably paid.`,
      ].filter(Boolean),
      source: `This run, all ${invoices.length} bills (Today and How it works pages)`,
    },
    {
      id: "misses",
      kicker: "The misses",
      number: firstAgreed !== null && acc ? `${firstAgreed} of ${acc.sampleSize}` : "—",
      numberNote: "matched an independent review on the first pass",
      text: [
        `The reviewer, a separate AI model, never saw the tool's answers, and a person checked every disagreement. Each rule error became a new rule${acc ? `: ${acc.agreed} of ${acc.sampleSize} agree now` : ""}.`,
        "That's on the same bills, not fresh data, so the shadow week is the real test.",
      ],
      source: "Review log (How sure are we page)",
    },
    {
      id: "monday",
      kicker: "Monday",
      number: fmt(checksTotal),
      numberNote: "reminders to anyone who had paid or had a complaint open",
      text: [
        "The COO's two tests, both at 0 in this run. Earlier versions would have chased 4 customers with a complaint open; each became a rule.",
        "Monday starts a shadow week on exports: the tool runs beside Priya, and nothing is sent without a person.",
      ],
      source: "Checks on the How sure are we page; plan agreed with the COO",
    },
  ];

  return <StoryScroll chapters={chapters} data={data} asOf={asOf} />;
}
