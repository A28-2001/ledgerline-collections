import { Bot } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { CopyButton } from "@/components/shared/copy-button";
import { formatDate, results } from "@/lib/data";

export const metadata: Metadata = { title: "Morning message" };

export default function SummaryPage() {
  const { morningSummary: s, meta } = results;
  const plain = [s.title, "", s.text, "", ...s.bullets.map((b) => `• ${b}`)].join("\n");

  return (
    <>
      <PageHeader
        title="Morning message"
        description="What the finance team reads first thing, in chat or email: what to approve, what's on hold, and who to call."
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
                to {s.routing?.[0]?.to ?? "Finance team"}{s.routing?.[0]?.cc ? `, copy to ${s.routing[0].cc}` : ""} · data as of {formatDate(meta.asOf)}
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

        {s.routing && s.routing.length > 1 && (
          <section className="mt-8" aria-label="Who gets what this morning">
            <h2 className="text-lg font-semibold tracking-tight">Who gets what this morning</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              One Slack direct message per person, once a day, never a channel post. Timings are the COO&apos;s starting point, for the VP Finance to confirm.
            </p>
            <ul className="mt-4 space-y-3">
              {s.routing.slice(1).map((r) => (
                <li key={r.to} className="rounded-xl border bg-card p-4 text-sm">
                  <p className="font-semibold">
                    To {r.to} <span className="font-normal text-muted-foreground">· {r.role} · {r.channel}{r.cc ? ` · copy to ${r.cc}` : ""}</span>
                  </p>
                  {r.intro && <p className="mt-1.5 leading-relaxed">{r.intro}</p>}
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    {r.lines.map((l, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground" aria-hidden="true" />
                        <span>{l}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
