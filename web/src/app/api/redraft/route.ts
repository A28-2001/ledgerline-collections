import { results } from "@/lib/data";
import type { Tone } from "@/lib/types";

// Live AI is used for one thing only: rewording a draft a person will read before approving.
// Every verdict is computed ahead of time by the pipeline, so the app works with no key at all.

const TONES: Tone[] = ["standard", "soft", "card_update"];
const TONE_GUIDE: Record<string, string> = {
  standard: "Friendly, brief and professional. A plain payment reminder.",
  soft: "Warm and understanding, a gentle reminder with no pressure. Only acknowledge an open request if the current draft already mentions one; never suggest a dispute or discussion that the draft doesn't mention.",
  card_update: "Explain that the card on file failed and ask them to update it. Do not ask for payment any other way.",
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (process.env.AI_REDRAFT !== "on") {
    return json({ error: "AI redraft is switched off until legal approves an AI vendor." }, 403);
  }
  let payload: { invoiceId?: unknown; tone?: unknown; instruction?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Send JSON: { invoiceId, tone, instruction? }." }, 400);
  }

  const invoiceId = typeof payload.invoiceId === "string" ? payload.invoiceId : "";
  const tone = TONES.includes(payload.tone as Tone) ? (payload.tone as Tone) : "standard";
  const instruction = typeof payload.instruction === "string" ? payload.instruction.slice(0, 200) : "";

  const invoice = results.invoices.find((i) => i.id === invoiceId);
  if (!invoice) return json({ error: "That invoice isn't in today's run." }, 404);
  if (!invoice.draft || invoice.draft.tone === "none") {
    return json({ error: "This bill has no email draft to reword." }, 400);
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return json({ error: "AI redraft is switched off (no AI key set on the server). The original draft still works." }, 503);
  }
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

  const facts = {
    company: results.meta.companyName,
    customer: invoice.customerName,
    invoiceId: invoice.id,
    amount: new Intl.NumberFormat("en-US", { style: "currency", currency: invoice.currency }).format(invoice.amount),
    dueDate: invoice.dueDate,
    daysOverdue: invoice.daysOverdue,
    reminderStage: invoice.reminderStage ?? null,
  };

  const system = [
    "You reword accounts-receivable emails for a B2B software company's finance team.",
    "Keep every fact exactly as given: amounts, dates, invoice numbers, names. Never invent new facts.",
    "Never threaten, never mention late fees, collections agencies or legal action, never offer discounts or credits.",
    "Never mention support tickets, complaints, disputes, internal checks or AI, and add no facts that are not already in the current draft.",
    "Keep it under 130 words. Sign off as the company's finance team.",
    'Reply with JSON only: {"subject": string, "body": string}.',
  ].join(" ");

  const user = [
    `Tone: ${TONE_GUIDE[tone]}`,
    instruction ? `Extra instruction from the finance team: ${instruction}` : "",
    `Facts: ${JSON.stringify(facts)}`,
    `Current draft subject: ${invoice.draft.subject}`,
    `Current draft body:\n${invoice.draft.body}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: 1200, // gpt-oss reasons before answering; leave room for both
        ...(model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" } : {}),
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const status = res.status === 429 ? 429 : 502;
      const reason =
        res.status === 429
          ? "The AI service is busy (rate limit). Try again in a minute."
          : res.status === 401 || res.status === 403
            ? "The AI key was rejected. Check GROQ_API_KEY on the server."
            : res.status === 404
              ? "The AI model isn't available. Check GROQ_MODEL on the server."
              : `The AI service returned an error (${res.status}).`;
      return json({ error: reason }, status);
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content ?? "";
    let parsed: { subject?: unknown; body?: unknown } = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { body: content };
    }
    const body = typeof parsed.body === "string" ? parsed.body.trim() : "";
    if (!body) return json({ error: "The AI reply was empty. The original draft still works." }, 502);
    const subject = typeof parsed.subject === "string" && parsed.subject.trim() ? parsed.subject.trim() : invoice.draft.subject;
    // Guard: a customer email must never reveal internal context. If the rewrite mentions
    // something the original draft didn't, keep the original and say why.
    const original = `${invoice.draft.subject} ${invoice.draft.body}`.toLowerCase();
    const leaked = ["ticket", "complaint", "dispute", "discussion", "escalat", " ai ", "internal", "flagged"].filter(
      (w) => ` ${subject} ${body} `.toLowerCase().includes(w) && !original.includes(w.trim()),
    );
    // Maya: anything that reads like a threat without a person checking it gets the tool switched off.
    const THREATS = ["suspend", "suspension", "collections agency", "collection agency", "legal action", "final notice", "late fee", "costs of collection", "court"];
    const threat = THREATS.filter((w) => ` ${subject} ${body} `.toLowerCase().includes(w));
    if (threat.length) {
      return json({ error: "The AI rewrite sounded like a threat, so the original draft was kept. Threats need the VP Finance's sign-off." }, 422);
    }
    if (leaked.length) {
      return json({ error: "The AI rewrite mentioned internal details, so the original draft was kept. Try again or edit by hand." }, 422);
    }
    return json({ subject, body, model });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return json({ error: aborted ? "The AI service took too long. Try again." : "Couldn't reach the AI service." }, 504);
  } finally {
    clearTimeout(timer);
  }
}
