// Contract between the Python pipeline (writes results.json) and the Next.js app (reads it).
// The pipeline writes web/src/data/results.json. Every field the app shows comes from here.
// Change this file first, then both sides.

export type Verdict = "send" | "hold" | "paid" | "call";
// Why a bill is overdue (the "Why overdue" view).
export type Cause = "unhappy" | "paid" | "wrong_bill" | "card_failed" | "simply_late";
export type Confidence = "high" | "medium" | "low";
export type Tone = "standard" | "soft" | "card_update" | "none";

export interface Evidence {
  id: string; // unique within the invoice, e.g. "ticket:T-1042"
  kind: "ticket" | "payment" | "contract" | "invoice" | "contact" | "policy";
  file: string; // source file, e.g. "tickets.csv"
  recordId: string; // id in that file
  date?: string; // ISO date
  title: string; // one line
  detail?: string; // longer text, e.g. ticket excerpt
  status?: string; // e.g. "open", "failed"
}

export interface Reason {
  text: string; // plain English
  evidenceIds: string[]; // ids in Invoice.evidence
  policyRef?: string; // e.g. "collections_policy.md §3"
}

export interface AgreementVote {
  judge: string; // e.g. "rules", "llama-3.1-8b-instant (prompt A)"
  answer: string;
}

export interface Invoice {
  id: string;
  customerId: string | null; // null = not matched to a customer
  customerName: string;
  amount: number; // amount still due
  currency: string;
  issueDate: string;
  dueDate: string;
  daysOverdue: number;
  agingBucket: "1-30" | "31-60" | "61-90" | "90+";
  verdict: Verdict;
  cause: Cause;
  confidence: Confidence;
  headline: string; // one-line "why", shown in the list
  reasons: Reason[];
  evidence: Evidence[];
  policyRef?: string;
  needsReview: boolean; // judges disagreed or customer match is weak
  reviewReason?: string;
  agreement?: { agree: boolean; votes: AgreementVote[] };
  hold?: { owner: string; ownerRole: string; deadline: string; action: string };
  draft?: { to: string; subject: string; body: string; tone: Tone; combinedWith?: string };
  reminderStage?: string; // e.g. "Second reminder"
  autoSend?: { eligible: boolean; why: string; permanent: boolean }; // Maya's trust ladder
}

export interface CustomerAlias {
  system: string; // e.g. "ar_aging.csv"
  name: string;
  matchedBy: "exact_id" | "exact_name" | "fuzzy" | "ai" | "unmatched";
  score: number; // 0..1
}

export interface Customer {
  id: string;
  name: string;
  segment?: string;
  plan?: string;
  arr?: number;
  accountManager?: string;
  billingContact?: string;
  renewalDate?: string;
  aliases: CustomerAlias[];
  invoiceIds: string[]; // overdue invoices in this run
  tickets: Evidence[];
  payments: Evidence[];
  contracts: Evidence[];
}

export interface CauseSlice {
  cause: Cause;
  label: string;
  amount: number;
  count: number;
}

export interface TrendPoint {
  month: string; // "2026-03"
  overdueAmount: number; // overdue at month end
  overdueShare: number; // overdue / open receivables, 0..1
  billingTickets: number | null; // null when tickets don't cover that month
}

export interface VerifiedNumber {
  label: string;
  methodA: string;
  valueA: number;
  methodB: string;
  valueB: number;
  ok: boolean; // the two methods agree (within tolerance)
  note?: string;
  unit?: "money" | "count";
  group?: "cross" | "coo" | "internal"; // a two-way cross-check, one of the COO's two tests, or a consistency check
  strictValue?: number; // the COO's complaint test under the strictest reading (any open or pending ticket)
}

export interface Failure {
  invoiceId: string;
  toolSaid: Verdict;
  truth: Verdict;
  why: string;
}

export interface Results {
  meta: {
    generatedAt: string; // ISO datetime
    asOf: string; // ISO date the run is "as of"
    dataSource: "sample" | "real";
    companyName: string;
    files: { name: string; rows: number }[];
    aiMode: "groq" | "rules_only";
    notes: string[]; // e.g. "Failed card payments not recorded, check skipped"
    sources?: { name: string; what: string; how: string; signOff: string; status: string }[];
  };
  summary: {
    overdueAmount: number;
    overdueCount: number;
    byVerdict: Record<Verdict, { count: number; amount: number }>;
    byCause: CauseSlice[];
    shouldNotChaseAmount: number; // paid + hold
    headline: string;
    // all tickets / from customers who owe money / the ones that matter to collections / of those, with no tag
    tickets?: { all: number; fromOverdue: number; relevant: number; relevantUntagged: number; fromOverdueUntagged?: number } | null;
    unmatchedPayments?: number | null;
  };
  invoices: Invoice[];
  customers: Record<string, Customer>;
  trend: TrendPoint[];
  trendMarkers: { month: string; label: string }[];
  proof: {
    matchRate: number; // 0..1
    matchBreakdown: { method: string; count: number }[];
    accuracy: { sampleSize: number; agreed: number; rate: number; labelledBy: string } | null;
    agreementRate: number | null; // share of AI judgments where judges agreed
    verifiedNumbers: VerifiedNumber[];
    failures: Failure[];
    runtimeSeconds: number;
    reviewLog?: {
      summary: string;
      entries: { invoice: string; customer: string; amount: number; toolSaid: string; shouldBe: string; foundBy: string; why: string; change: string; status: "fixed" | "deliberate" | "open" }[];
    } | null;
  };
  morningSummary: {
    title: string;
    bullets: string[];
    text: string;
    link?: string; // the app, for everything beyond the short message
    detail?: string[]; // the longer version, kept for reference
    routing?: {
      to: string;
      role: string;
      channel: string;
      cc: string | null;
      lines: string[];
      by: string | null;
      intro?: string;
      more?: number; // bills not listed in the message; they're in the app
      link?: string;
    }[];
    cover?: string;
  };
  settings?: { name: string; value: string; who: string; source: string }[];
  monthOne?: {
    source: string;
    measures: { label: string; today: number | null; todayText: string; target: string }[];
    timeSaved: string;
  };
  autoSend?: {
    on: boolean;
    daysOnRecord: number;
    daysNeeded: number;
    maxAmount: number | null;
    eligibleCount: number;
    eligibleAmount: number;
    permanentCount: number;
    rule: string;
  };
}
