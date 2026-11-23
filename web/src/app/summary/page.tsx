import { Bot } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { CopyButton } from "@/components/shared/copy-button";
import { formatDate, results } from "@/lib/data";

export const metadata: Metadata = { title: "Morning summary" };

export default function SummaryPage() {
  const { morningSummary: s, meta } = results;
  const plain = [s.title, "", s.text, "", ...s.bullets.map((b) => `• ${b}`)].join("\n");

  return (
    <>
      <PageHeader
        title="Morning summary"
        description="The message the finance team gets each morning, in chat or email. One read tells them what to approve, what's on hold, and what needs a call."
        actions={<CopyButton text={plain} label="Copy message" variant="default" size="default" />}
      />

      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b px-5 py-3.5">
            <span className="grid size-9 place-items-center rounded-full bg-foreground text-background">
              <Bot className="size-4.5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Collections check</p>
              <p className="text-xs text-muted-foreground">
                to Finance team · data as of {formatDate(meta.asOf)}
              </p>
            </div>
          </div>
          <div className="space-y-4 px-5 py-5 text-sm leading-relaxed">
            <p className="text-base font-semibold tracking-tight">{s.title}</p>
            <p>{s.text}</p>
            {s.bullets.length > 0 ? (
              <ul className="space-y-2">
                {s.bullets.map((b, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">Nothing needs attention today.</p>
            )}
          </div>
          <div className="border-t px-5 py-3 text-xs text-muted-foreground">
            Open the Today page to approve. Nothing has been sent.
          </div>
        </div>
      </div>
    </>
  );
}
