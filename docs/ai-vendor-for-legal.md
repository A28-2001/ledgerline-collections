# AI provider: note for legal

Asked for by Maya Lindqvist (COO), 23 Nov 2026. Checked 23 Nov 2026; legal should read the source pages themselves.

## What the tool sends, and when

- **Today (default):** nothing. The tool reads tickets with tags, status and simple rules on Ledgerline's own systems ("no-vendor mode").
- **If switched on:** for each support ticket from a customer with an overdue bill, the ticket's subject and up to 1,500 characters of its text go to the AI provider, after card numbers, bank details, emails and phone numbers are masked. Two short classification calls per ticket. No customer list, invoice file or ledger leaves.
- **Reminder rewrites:** only the invoice facts (customer name, invoice number, amount, due date, days late) and the draft text. No ticket content.

## Recommended: Amazon Bedrock, in Ledgerline's existing AWS account

AWS is already a Ledgerline vendor (docs/tool_stack.md: hosting). Legal to confirm the existing AWS agreement and data processing terms cover Amazon Bedrock.

- AWS's generative AI security guidance states that Bedrock doesn't use prompts and completions to train any AWS models and doesn't distribute them to third parties: [AWS SRA for AI](https://docs.aws.amazon.com/prescriptive-guidance/latest/security-reference-architecture-generative-ai/gen-ai-sra.html).
- The Bedrock User Guide says model providers have no access to customer prompts and completions: [Data protection](https://docs.aws.amazon.com/bedrock/latest/userguide/data-protection.html).
- Caveat: for some models, prompts and completions are retained inside AWS for up to 30 days for review. Pick a model without that requirement: [Data retention](https://docs.aws.amazon.com/bedrock/latest/userguide/data-retention.html).

## Used in the demo: Groq (a new vendor, so it needs a DPA first)

- Groq says it doesn't retain inference data by default, keeps troubleshooting or abuse logs for up to 30 days, and offers Zero Data Retention: [Your Data in GroqCloud](https://console.groq.com/docs/your-data).
- A data processing addendum is published: [Groq DPA](https://console.groq.com/docs/legal/customer-data-processing-addendum).

## Hosting

The tool's screens show ticket excerpts, so in production it should run inside Ledgerline's AWS too, not on the demo host. The demo runs on Vercel with the challenge's fictional data.
