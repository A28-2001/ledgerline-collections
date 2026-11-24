import { ArrowUpRight, Bot } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { CopyButton } from "@/components/shared/copy-button";
import { formatDate, results } from "@/lib/data";

export const metadata: Metadata = { title: "Morning message" };

export default function SummaryPage() {
  const { morningSummary: s, meta } = results;
  const plain = [
    s.title,
    "",
    s.text,
    ...s.bullets.map((b) => `• ${b}`),
    ...(s.link ? ["", `Open today's list: ${s.link}`] : []),
  ].join("\n");

  return (
    <>
      <PageHeader
        title="Morning message"
        description="Every working day, one short Slack message each, copied from here until the Slack connection is approved. The rest is in the app."
        actions={<CopyButton text={plain} label="Copy message" variant="default" size="default" />}
      />

      <div className="mx-auto max-w-xl">
        <div className="rounded-2xl border bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b px-5 py-3.5">
            <span className="grid size-9 place-items-center rounded-full bg-foreground text-background">
              <Bot className="size-4.5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Collections check</p>
              <p className="text-xs text-muted-foreground">
                to {s.routing?.[0]?.to ?? "Finance team"} · {formatDate(meta.asOf)}
              </p>
            </div>
          </div>
          <div className="space-y-3 px-5 py-5 text-sm leading-relaxed">
            <p>{s.text}</p>
            {s.bullets.length > 0 ? (
              <ul className="space-y-1.5">
                {s.bullets.map((b, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">Nothing needs you today.</p>
            )}
            <Link
              href="/"
              className="inline-flex items-center gap-1 pt-1 text-sm font-medium underline decoration-border underline-offset-4 hover:decoration-foreground"
            >
              Open today&apos;s list
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">Nothing has been sent. Priya approves everything in the app.</p>

        {s.routing && s.routing.length > 1 && (
          <section className="mt-8" aria-label="Everyone else">
            <h2 className="text-base font-semibold tracking-tight">Everyone else gets one short message too</h2>
            <ul className="mt-3 space-y-2.5">
              {s.routing.slice(1).map((r) => (
                <li key={r.to} className="rounded-xl border bg-card p-4 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">
                      {r.to} <span className="font-normal text-muted-foreground">· {r.role}</span>
                    </p>
                    <CopyButton
                      text={[r.intro ?? "", ...r.lines.map((l) => `• ${l}`), ...((r.more ?? 0) > 0 ? [`and ${r.more} more`] : []), ...(r.link ? ["", r.link] : [])]
                        .filter((x, i) => x !== "" || i > 0)
                        .join("\n")}
                      label="Copy"
                    />
                  </div>
                  {r.intro && <p className="mt-1 leading-relaxed">{r.intro}</p>}
                  {r.lines.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5 text-muted-foreground">
                      {r.lines.map((l, i) => (
                        <li key={i}>{l}</li>
                      ))}
                      {(r.more ?? 0) > 0 && <li>and {r.more} more in the app</li>}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {s.cover && <p className="mt-6 text-xs leading-relaxed text-muted-foreground">{s.cover}</p>}
      </div>
    </>
  );
}
