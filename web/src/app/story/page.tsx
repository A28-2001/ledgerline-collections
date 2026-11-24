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
  const strict = proof.verifiedNumbers.find((v) => v.label.startsWith("Complaint open"))?.strictValue ?? 0;
  const allMine = invoices.filter((i) => i.verdict === "hold" && i.cause === "wrong_bill" && i.hold?.ownerRole.startsWith("Finance")).length;
  const decisions = (() => {
    // the same count as the Today page: one per customer and reason in Check first, plus one per step
    const groups = new Set(invoices.filter((i) => i.needsReview).map((i) => `${i.customerId ?? i.customerName}|${i.verdict}|${i.reviewReason ?? ""}`));
    const steps = new Set(invoices.filter((i) => !i.needsReview && !(i.verdict === "hold" && i.cause === "wrong_bill")).map((i) => i.verdict));
    return groups.size + steps.size;
  })();
  const maybePaid = invoices.filter((i) => i.verdict === "hold" && i.cause === "paid");

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
    causes: (() => {
      const d = summary.byCause.find((c) => c.cause === "wrong_bill");
      const restAmount = summary.overdueAmount - (d?.amount ?? 0);
      const restCount = summary.overdueCount - (d?.count ?? 0);
      return [
        ...(d
          ? [{ key: "wrong_bill", label: CAUSE_META.wrong_bill.label, color: CAUSE_META.wrong_bill.color, amount: d.amount, amountText: formatMoney(d.amount), count: d.count, share: d.amount / summary.overdueAmount }]
          : []),
        { key: "rest", label: "Every other reason", color: "var(--muted-foreground)", amount: restAmount, amountText: formatMoney(restAmount), count: restCount, share: restAmount / summary.overdueAmount },
      ];
    })(),
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
      differs: entries.filter((e) => e.differsBecause).map((e) => ({ customer: e.customer, text: e.differsBecause ?? "" })),
    },
    checks: checks.map((c) => ({ label: c.label.replace(/\s*\(.*\)$/, ""), value: c.valueA })),
    heldMaybePaid: maybePaid.length
      ? { count: maybePaid.length, amountText: formatMoney(maybePaid.reduce((s, i) => s + i.amount, 0)) }
      : null,
    example: (() => {
      // The disputed bill that has waited longest, with a ticket marked solved: the clearest case of the finding.
      const pick = invoices
        .filter((i) => i.cause === "wrong_bill" && /marked solved/i.test(i.headline))
        .sort((a, b) => b.daysOverdue - a.daysOverdue)[0];
      const t = pick?.evidence.find((e) => e.kind === "ticket" && e.detail);
      if (!pick || !t?.detail) return null;
      const sentences = t.detail.split(/(?<=[.!?])\s+/);
      const hits = sentences.filter((x) => x.includes(pick.id) || /correct|resend|refund|waive|wrong/i.test(x));
      const picked = (hits.length ? hits : sentences).slice(0, 2);
      const adjacent = picked.length < 2 || sentences.indexOf(picked[1]) === sentences.indexOf(picked[0]) + 1;
      let quote = picked.join(adjacent ? " " : " … ").replace(/\s+/g, " ").trim();
      if (quote.length > 200) quote = quote.slice(0, 197).replace(/\s+\S*$/, "") + "…";
      return {
        customer: pick.customerName,
        invoice: pick.id,
        amountText: formatMoney(pick.amount),
        days: pick.daysOverdue,
        quote,
        status: `ticket marked ${t.status || "solved"}`,
        href: pick.customerId ? `/customers/${pick.customerId}` : "/",
      };
    })(),
  };

  const chapters: Chapter[] = [
    {
      id: "problem",
      kicker: "The problem",
      number: formatMoney(summary.overdueAmount),
      numberNote: `overdue, across ${summary.overdueCount} bills`,
      text: [
        highest
          ? `The **highest overdue total** of any month-end in the last ${trend.length} months. It's ${pct(last.overdueShare)} of what customers owe.`
          : `That's ${pct(last.overdueShare)} of what customers owe.`,
        "Finance chases it by hand: about 16 hours a week across the team.",
      ],
      source: "QuickBooks AR aging; trend from invoices and payments; Ledgerline's process notes (FIN-1)",
    },
    {
      id: "wall",
      kicker: "The wall",
      number: fmt(tk?.fromOverdue ?? rows("tickets.csv")),
      numberNote: tk ? "support tickets from customers who owe money, and finance can't open any" : "support tickets finance can't open",
      text: [
        "Finance has **no access to Zendesk**, where the complaints live, so a reminder can reach a customer who is waiting for a fix.",
      ],
      source: "Zendesk export; Ledgerline's tool list and process notes (FIN-1)",
    },
    {
      id: "finding",
      kicker: "The finding",
      number: disputed ? formatMoney(disputed.amount) : "—",
      numberNote: disputed ? `${pct(disputed.amount / summary.overdueAmount)} of the overdue money is disputed` : "",
      text: [
        disputed
          ? `${disputed.count} bills are disputed in support tickets that **name the exact invoice**: wrong seats, a missing discount, a fee meant to be waived.`
          : "",
        "A reminder on any of them chases someone who is waiting for a corrected bill.",
      ].filter(Boolean),
      source: "Tickets matched to bills in this run (Why overdue page)",
    },
    {
      id: "answer",
      kicker: "The answer",
      number: fmt(decisions),
      numberNote: `decisions sort the morning, built to take about 5 minutes. Then ${allMine} disputes to fix, oldest first: the day's work.`,
      text: [
        "Five questions decide each bill, in order: already paid? a reason to hold? under 7 days late? 45+ days late? nothing in the way? The first yes gives the answer.",
        `**${formatMoney(summary.shouldNotChaseAmount)} isn't chased today.** ${count("send")} bills get a reminder once Priya approves.`,
      ],
      source: `This run, all ${invoices.length} bills (Today and How it works pages)`,
    },
    {
      id: "misses",
      kicker: "The AI check",
      number: firstAgreed !== null && acc ? `${firstAgreed} of ${acc.sampleSize}` : "—",
      numberNote: "bills agreed with an independent AI review on the first pass",
      text: [
        `**Each disagreement became a fix or a question for Maya**${acc ? `: ${acc.agreed} of ${acc.sampleSize} agree now` : ""}. The shadow week is the real test.`,
      ],
      source: "Review log (How sure are we page)",
    },
    {
      id: "monday",
      kicker: "Monday",
      number: fmt(checksTotal),
      numberNote: "customers chased who had paid or had a complaint open",
      text: [
        strict
          ? `**${strict} customers** with a pending ticket that isn't about money wait in Check first until Maya confirms.`
          : "Both of the COO's tests read 0.",
      ],
      source: "Checks on the How sure are we page; plan agreed with the COO",
    },
  ];

  return <StoryScroll chapters={chapters} data={data} asOf={asOf} />;
}
