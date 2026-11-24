import { ArrowDown, ArrowRight, Database, ShieldCheck, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { formatDate, results } from "@/lib/data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "How it works" };

const fmt = (n: number) => n.toLocaleString("en-US");

export default function HowPage() {
  const { invoices, meta, summary } = results;
  const tk = summary.tickets;
  const up = results.proof.aiUplift;
  const count = (v: string) => invoices.filter((i) => i.verdict === v).length;
  const wait = invoices.filter((i) => i.verdict === "hold" && i.headline.startsWith("Too early")).length;
  const rows = (name: string) => meta.files.find((f) => f.name === name)?.rows ?? 0;
  const unmatchedPayments = summary.unmatchedPayments ?? 0;
  const calls = invoices.filter((i) => i.verdict === "call");
  const allCards = calls.length > 0 && calls.every((i) => i.cause === "card_failed");

  const sources = [
    { name: "QuickBooks", detail: `${fmt(invoices.length)} overdue bills (AR aging)` },
    { name: "Bank and Stripe", detail: `${unmatchedPayments} payments not yet matched to a bill` },
    {
      name: "Zendesk",
      detail: tk
        ? `${fmt(rows("tickets.csv"))} tickets, ${fmt(tk.fromOverdue)} from customers who owe money; excerpts masked`
        : `${fmt(rows("tickets.csv"))} tickets, excerpts masked`,
    },
    { name: "Contracts and contacts", detail: `${fmt(rows("contracts.csv"))} contract terms, ${fmt(rows("contacts.csv"))} contacts` },
  ];

  const steps = [
    { q: "Already paid?", hint: "An unmatched payment fits the bill, by its memo or by name and amount", answer: "Probably paid", n: count("paid"),
      who: "Marcus matches it within 2 working days; Priya is copied", tone: "paid" },
    { q: "A reason not to talk about money?", hint: "They dispute the bill, a ticket is still open, they threatened a chargeback or a regulator, we owe them a refund, or a payment could pay either of two bills",
      answer: "Hold", n: count("hold") - wait, who: "Priya fixes disputes within 5 working days. Account managers get 3 days on open tickets; Marcus gets 2 on an unclear payment", tone: "hold" },
    { q: "Under 7 days late?", hint: "The policy's first reminder goes at day 7", answer: "Wait", n: wait, who: `Comes back on day 7 if still unpaid. Other pages count it with the holds (${count("hold")} in all)`, tone: "wait" },
    { q: "45+ days late, or already calling them?", hint: "The 45-day email threatens suspension, so a person phones instead. One conversation per customer",
      answer: "Call", n: count("call"), who: `Priya calls, with the customer's tickets in front of her${allCards ? ". Today they're all failed cards: ask for a new card" : ""}`, tone: "call" },
    { q: "None of the above", hint: "Nothing blocks a reminder", answer: "Send a reminder", n: count("send"),
      who: "Priya approves them in one click. Approving doesn't send; nothing goes out on its own", tone: "send" },
  ];

  const toneClass: Record<string, string> = {
    paid: "border-paid bg-paid-soft",
    hold: "border-hold bg-hold-soft",
    wait: "border-border bg-muted/50",
    call: "border-call bg-call-soft",
    send: "border-send bg-send-soft",
  };

  return (
    <>
      <PageHeader
        title="How it works"
        description={`One process: Ledgerline's collections (FIN-1), owned by Priya Nair, the AR Specialist. Every morning each overdue bill gets five questions, in order. Data as of ${formatDate(meta.asOf)}.`}
      />

      <section aria-label="Sources">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Database className="size-4 text-muted-foreground" aria-hidden="true" />
          Every morning, from four sources (read-only)
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {sources.map((s) => (
            <div key={s.name} className="rounded-lg border bg-card p-3">
              <p className="text-sm font-semibold">{s.name}</p>
              <p className="tabular mt-0.5 text-xs text-muted-foreground">{s.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="my-3 flex justify-center text-muted-foreground" aria-hidden="true">
        <ArrowDown className="size-5" />
      </div>

      <section aria-label="Five questions">
        <p className="text-sm font-medium">Five questions, in order, for each bill. The first &ldquo;yes&rdquo; decides.</p>
        <ol className="mt-2 space-y-2">
          {steps.map((s, idx) => (
            <li key={s.q} className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
              <div className="rounded-lg border bg-card p-3">
                <p className="text-sm font-semibold">
                  {idx + 1}. {s.q}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{s.hint}</p>
              </div>
              <div className="hidden items-center text-muted-foreground sm:flex" aria-hidden="true">
                <span className="mr-1 text-[11px]">{idx < 4 ? "yes" : ""}</span>
                <ArrowRight className="size-4" />
              </div>
              <div className={cn("rounded-lg border-l-4 border p-3", toneClass[s.tone])}>
                <p className="text-sm font-semibold">
                  {s.answer} <span className="tabular font-normal text-muted-foreground">· {s.n} today</span>
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{s.who}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-5 rounded-lg border bg-card p-4" aria-label="Always a person">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="size-4 text-muted-foreground" aria-hidden="true" />
          Always a person
        </p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Top-50 accounts, disputed or probably-paid bills, anything firmer than a friendly nudge, and every phone call. Nothing is sent
          without a person. These lines come from the COO: chasing someone who has paid, someone with an open complaint, a top-50 account or
          anything that reads like a threat would get the tool switched off.
        </p>
      </section>

      <section className="mt-4 rounded-lg border bg-card p-4" aria-label="What AI does">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4 text-muted-foreground" aria-hidden="true" />
          What AI does, and what it doesn&apos;t
        </p>
        <div className="mt-3 grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">AI as the auditor</p>
            <p className="mt-1 leading-relaxed">
              A separate AI model reviewed all 54 bills without the tool&apos;s answers. Its first pass disagreed on 8: 5 rule errors (fixed),
              2 judgment calls I changed for Maya to confirm, and 1 kept on purpose. Proposed: run it weekly once legal approves a vendor.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">AI reading tickets</p>
            <p className="mt-1 leading-relaxed">
              Two models from different families read the masked text; if they disagree, a person decides.
              {up && up.cacheMisses === 0 && (
                <>
                  {" "}
                  Measured on these {up.bills} bills: it changed {up.verdictsChanged.length === 0 ? "no answers" : `${up.verdictsChanged.length} answers`}{" "}
                  and moved {up.checkFirstChanged} bills in or out of Check first.
                </>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Why rules aren&apos;t enough</p>
            <p className="mt-1 leading-relaxed">
              {tk
                ? `${tk.fromOverdueUntagged ?? tk.relevantUntagged} of the ${tk.fromOverdue} tickets from customers who owe money have no tag, and tags can be wrong (a timer bug was tagged How-to). Rules catch a dispute when it quotes the invoice number; AI is for the complaints that don't.`
                : "Tags are often missing or wrong. Only reading the text catches those."}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          At Ledgerline today, no AI touches customer data until legal approves a vendor (Amazon Bedrock, in the existing AWS account, is
          proposed). Never AI: the decision to send. AI redraft is switched off until legal approves a vendor.
        </p>
      </section>

      <section className="mt-4 grid gap-3 text-sm sm:grid-cols-3" aria-label="Processes">
        <div className="rounded-lg border p-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase">The process</p>
          <p className="mt-1 font-medium">FIN-1 Collections</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Owner: Priya Nair. About 16 hours a week across the team today.</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Touches, where collections needs it</p>
          <p className="mt-1 font-medium">FIN-2 Cash application</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Unmatched payments go to Marcus so nobody chases a paid bill.</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Touches, where collections needs it</p>
          <p className="mt-1 font-medium">FIN-6 Billing errors</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Disputed bills go to Priya to correct before anyone asks for money.</p>
        </div>
      </section>
    </>
  );
}
