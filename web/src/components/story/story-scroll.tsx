"use client";

// The story page: six chapters on the left, one sticky picture on the right that changes with the chapter.
// Desktop only: the sticky picture and a gentle parallax on the background shapes (transform only).
// Phones get the chapters stacked, each with its own picture, and no parallax.
// prefers-reduced-motion turns off the parallax and the picture's fade. Nothing starts hidden.
import { ArrowDown, ArrowRight, CircleCheck, Lock, type LucideIcon, Landmark, MessageSquareText, Receipt, ScrollText } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface Chapter {
  id: string;
  kicker: string;
  number: string;
  numberNote: string;
  text: string[];
  source: string;
}

export interface StoryData {
  totalText: string;
  trend: { month: string; amount: number }[];
  sources: { name: string; detail: string; locked: boolean }[];
  causes: { key: string; label: string; color: string; amountText: string; count: number; share: number }[];
  verdicts: { key: "send" | "hold" | "paid" | "call"; label: string; count: number; amountText: string }[];
  review: { total: number; firstAgreed: number | null; nowAgreed: number | null; differs: { customer: string; text: string }[] };
  checks: { label: string; value: number }[];
  heldMaybePaid: { count: number; amountText: string } | null;
  // One real disputed bill, the way Priya sees it.
  example: { customer: string; invoice: string; amountText: string; days: number; quote: string; status: string; href: string } | null;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

function useParallax(root: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const wide = window.matchMedia("(min-width: 768px)");
    const shapes = Array.from(el.querySelectorAll<HTMLElement>("[data-speed]"));
    let frame = 0;
    const update = () => {
      frame = 0;
      const on = !reduce.matches && wide.matches;
      const y = window.scrollY;
      for (const s of shapes) s.style.transform = on ? `translate3d(0, ${(y * Number(s.dataset.speed)).toFixed(1)}px, 0)` : "";
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    reduce.addEventListener("change", update);
    wide.addEventListener("change", update);
    return () => {
      window.removeEventListener("scroll", onScroll);
      reduce.removeEventListener("change", update);
      wide.removeEventListener("change", update);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [root]);
}

function useActiveChapter(ids: string[]) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const els = ids.map((id) => document.getElementById(`ch-${id}`)).filter((e): e is HTMLElement => e !== null);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index ?? 0));
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [ids]);
  return active;
}

function Backdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 hidden overflow-hidden md:block" aria-hidden="true">
      <div
        data-speed="0.05"
        className="absolute inset-x-0 top-0 h-[180%] opacity-60"
        style={{
          backgroundImage: "repeating-linear-gradient(to bottom, transparent 0 39px, var(--border) 39px 40px)",
          maskImage: "radial-gradient(ellipse 70% 40% at 30% 18%, black, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 40% at 30% 18%, black, transparent 75%)",
        }}
      />
      <div data-speed="-0.12" className="absolute -top-24 right-[-6rem] size-[30rem] rounded-full bg-send/12 blur-3xl" />
      <div data-speed="0.1" className="absolute top-[38%] left-[-8rem] size-[22rem] rounded-full bg-brand/12 blur-3xl" />
      <div data-speed="-0.22" className="absolute top-[22%] right-[8%] size-44 rounded-full border border-send/30" />
      <div data-speed="0.16" className="absolute top-[64%] right-[30%] size-24 rounded-full border border-gold/40" />
      <div data-speed="-0.08" className="absolute top-[82%] right-[-4rem] size-[26rem] rounded-full bg-call/8 blur-3xl" />
    </div>
  );
}

/* ---------- the six pictures ---------- */

function Frame({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <figure className="rounded-2xl border bg-card/90 p-5 shadow-sm sm:p-6">
      <figcaption className="mb-4">
        <p className="text-sm font-semibold">{title}</p>
        {note && <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>}
      </figcaption>
      {children}
    </figure>
  );
}

function TrendPicture({ data }: { data: StoryData }) {
  const pts = data.trend;
  const W = 400;
  const H = 180;
  const pad = { l: 8, r: 40, t: 16, b: 26 };
  const usdK = (n: number) => `$${Math.round(n / 1000)}K`;
  const max = Math.max(700000, ...pts.map((p) => p.amount));
  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / Math.max(1, pts.length - 1);
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.amount).toFixed(1)}`).join(" ");
  const area = `${line} L${x(pts.length - 1).toFixed(1)},${H - pad.b} L${x(0).toFixed(1)},${H - pad.b} Z`;
  const lastI = pts.length - 1;
  const summary = pts.map((p) => `${p.month} ${usdK(p.amount)}`).join(", ");
  return (
    <Frame title="Overdue money at each month-end" note="Last 12 months">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Overdue money by month-end: ${summary}`}>
        <defs>
          <linearGradient id="story-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--send)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--send)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[200000, 400000, 600000].map((g) => (
          <g key={g}>
            <line x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} stroke="var(--border)" strokeDasharray="3 4" />
            <text x={W - pad.r + 6} y={y(g) + 4} fontSize="11" fill="var(--muted-foreground)">
              {usdK(g)}
            </text>
          </g>
        ))}
        <path d={area} fill="url(#story-area)" />
        <path d={line} fill="none" stroke="var(--send)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(lastI)} cy={y(pts[lastI].amount)} r="5" fill="var(--send)" stroke="var(--card)" strokeWidth="2" />
        <text x={x(lastI) - 8} y={y(pts[lastI].amount) - 10} fontSize="13" fontWeight="600" textAnchor="end" fill="var(--foreground)">
          {usdK(pts[lastI].amount)}
        </text>
        {[0, lastI]
          .filter((i, k, a) => i >= 0 && a.indexOf(i) === k)
          .map((i) => (
            <text key={i} x={x(i)} y={H - 6} fontSize="11" textAnchor={i === 0 ? "start" : i === lastI ? "end" : "middle"} fill="var(--muted-foreground)">
              {pts[i].month}
            </text>
          ))}
      </svg>
    </Frame>
  );
}

const SOURCE_ICON: Record<string, LucideIcon> = {
  QuickBooks: Receipt,
  "Bank and Stripe": Landmark,
  Zendesk: MessageSquareText,
  Contracts: ScrollText,
};

function SourcesPicture({ data }: { data: StoryData }) {
  return (
    <Frame title="Four systems, and finance can open three" note="What decides a chase is split across them">
      <ul className="grid grid-cols-2 gap-3">
        {data.sources.map((s) => {
          const Icon = SOURCE_ICON[s.name] ?? Receipt;
          return (
            <li key={s.name} className={cn("rounded-xl border p-4", s.locked ? "border-alert/45 bg-alert-soft" : "bg-background/60")}>
              <div className="flex items-center justify-between">
                <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                {s.locked && <Lock className="size-4 text-alert-ink" aria-hidden="true" />}
              </div>
              <p className="mt-3 text-sm font-semibold">{s.name}</p>
              <p className="tabular text-xs text-muted-foreground">{s.detail}</p>
              {s.locked && <p className="mt-1 text-xs font-medium text-alert-ink">Finance has no access</p>}
            </li>
          );
        })}
      </ul>
    </Frame>
  );
}

function ExampleBill({ e, color }: { e: NonNullable<StoryData["example"]>; color?: string }) {
  return (
    <div className="mt-5 rounded-xl border border-l-4 bg-background/60 p-4" style={{ borderLeftColor: color }}>
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">One of them</p>
      <p className="mt-1 text-sm font-semibold">
        {e.customer} <span className="tabular font-normal text-muted-foreground">· {e.amountText} · {e.days} days late</span>
      </p>
      <blockquote className="mt-2 border-l-2 pl-3 text-sm leading-relaxed italic">&ldquo;{e.quote}&rdquo;</blockquote>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Zendesk: <span className="font-medium text-foreground">{e.status}</span>. The bill was never corrected. The tool holds it and gives it to
        Priya to fix first.
      </p>
      <a href={e.href} className="mt-2 inline-block text-xs font-medium underline decoration-border underline-offset-4 hover:decoration-foreground">
        See the bill and the ticket
      </a>
    </div>
  );
}

function CausesPicture({ data }: { data: StoryData }) {
  return (
    <Frame title={`How much of the ${data.totalText} is disputed`} note="Share of the overdue money">
      <div className="flex h-9 w-full overflow-hidden rounded-lg" role="img" aria-label={data.causes.map((c) => `${c.label} ${pct(c.share)}`).join(", ")}>
        {data.causes.map((c) => (
          <div
            key={c.key}
            className={cn("h-full border-r-2 border-card last:border-r-0", c.key !== "wrong_bill" && "opacity-35")}
            style={{ width: `${c.share * 100}%`, background: c.color }}
          />
        ))}
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {data.causes.map((c) => (
          <li key={c.key} className={cn("flex items-center gap-2.5", c.key === "wrong_bill" ? "font-semibold" : "text-muted-foreground")}>
            <span className={cn("size-2.5 shrink-0 rounded-sm", c.key !== "wrong_bill" && "opacity-50")} style={{ background: c.color }} aria-hidden="true" />
            <span className="min-w-0 flex-1 leading-tight">{c.label}</span>
            <span className="tabular shrink-0">{c.amountText}</span>
            <span className="tabular w-10 shrink-0 text-right">{pct(c.share)}</span>
          </li>
        ))}
      </ul>
      {data.example && <ExampleBill e={data.example} color={data.causes.find((c) => c.key === "wrong_bill")?.color} />}
    </Frame>
  );
}

const DOT: Record<StoryData["verdicts"][number]["key"], string> = {
  send: "bg-send",
  hold: "bg-hold",
  paid: "bg-paid",
  call: "bg-call",
};

function AnswerPicture({ data }: { data: StoryData }) {
  const total = data.verdicts.reduce((s, v) => s + v.count, 0);
  return (
    <Frame title={`${total} bills, four answers`} note="One dot per bill">
      <ul className="space-y-4">
        {data.verdicts.map((v) => (
          <li key={v.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{v.label}</span>
              <span className="tabular text-muted-foreground">
                {v.count} · {v.amountText}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1" aria-hidden="true">
              {Array.from({ length: v.count }, (_, i) => (
                <span key={i} className={cn("size-3 rounded-full", DOT[v.key])} />
              ))}
            </div>
          </li>
        ))}
      </ul>
      {data.heldMaybePaid && (
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Hold includes {data.heldMaybePaid.count === 1 ? "1 bill" : `${data.heldMaybePaid.count} bills`} ({data.heldMaybePaid.amountText}) that a
          payment may cover: Marcus confirms which bill it pays.
        </p>
      )}
    </Frame>
  );
}

function ReviewPicture({ data }: { data: StoryData }) {
  const r = data.review;
  const bars = [
    { label: "First pass", n: r.firstAgreed, note: "against an independent review" },
    { label: "After the fixes", n: r.nowAgreed, note: "same bills, not fresh data" },
  ];
  return (
    <Frame
      title="How often the tool agreed with the review"
      note={`All ${r.total} bills, reviewed by a separate AI model that never saw the tool's answers; a person checked every disagreement`}
    >
      <ul className="space-y-4">
        {bars.map((b) =>
          b.n === null ? null : (
            <li key={b.label}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">{b.label}</span>
                <span className="tabular text-muted-foreground">
                  {b.n} of {r.total} · {pct(b.n / r.total)}
                </span>
              </div>
              <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-send" style={{ width: `${(b.n / r.total) * 100}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{b.note}</p>
            </li>
          ),
        )}
      </ul>
      {r.nowAgreed !== null && r.total - r.nowAgreed > 0 && (
        <div className="mt-5 rounded-xl border bg-background/60 p-4 text-sm">
          <p className="font-semibold">
            {r.total - r.nowAgreed} still {r.total - r.nowAgreed === 1 ? "differs" : "differ"}, on purpose
          </p>
          {r.differs.length > 0 && (
            <ul className="mt-1 space-y-1 text-xs leading-relaxed text-muted-foreground">
              {r.differs.map((d) => (
                <li key={d.customer}>
                  <span className="font-medium text-foreground">{d.customer}:</span> {d.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <Link
        href="/proof"
        className="mt-4 inline-flex items-center gap-1.5 rounded text-sm font-medium text-send-ink outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        Every miss and the rule it led to
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </Frame>
  );
}

function MondayPicture({ data }: { data: StoryData }) {
  return (
    <Frame title="The COO's two tests" note="Either one above 0 would get the tool switched off">
      <ul className="grid gap-3 sm:grid-cols-2">
        {data.checks.map((c) => (
          <li key={c.label} className="rounded-xl border border-paid/40 bg-paid-soft p-4">
            <CircleCheck className="size-5 text-paid-ink" aria-hidden="true" />
            <p className="tabular mt-2 text-3xl font-semibold">{c.value}</p>
            <p className="text-sm text-paid-ink">{c.label}</p>
          </li>
        ))}
      </ul>
      <div className="mt-5 rounded-xl border bg-background/60 p-4">
        <p className="text-sm font-semibold">Next: a shadow week</p>
        <ol className="mt-3 grid grid-cols-5 gap-1.5" aria-label="Five working days">
          {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => (
            <li key={d} className="rounded-md border border-dashed border-send/50 py-2 text-center text-xs font-medium text-send-ink">
              {d}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          The tool runs beside Priya on exports, and she checks that it agrees with her. Nothing is sent without a person.
        </p>
      </div>
    </Frame>
  );
}

const PICTURES = [TrendPicture, SourcesPicture, CausesPicture, AnswerPicture, ReviewPicture, MondayPicture];

function Picture({ index, data }: { index: number; data: StoryData }) {
  const P = PICTURES[index] ?? TrendPicture;
  return <P data={data} />;
}

/* ---------- the page ---------- */

export function StoryScroll({ chapters, data, asOf }: { chapters: Chapter[]; data: StoryData; asOf: string }) {
  const root = useRef<HTMLDivElement>(null);
  const [ids] = useState(() => chapters.map((c) => c.id));
  const active = useActiveChapter(ids);
  useParallax(root);

  return (
    <div ref={root} className="relative isolate">
      <Backdrop />

      <header className="flex min-h-[56vh] flex-col justify-center pb-10 lg:min-h-[70vh]">
        <p className="text-xs font-semibold tracking-[0.16em] text-send-ink uppercase">Ledgerline · Collections (FIN-1)</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
          Should we chase this invoice today?
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
          Six short chapters. Every number comes from the same run as the rest of the tool, as of {asOf}.
        </p>
        <a
          href={`#ch-${chapters[0].id}`}
          className="mt-8 inline-flex w-fit items-center gap-2 rounded-md text-sm font-medium outline-none hover:text-send-ink focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Start reading
          <ArrowDown className="size-4 motion-safe:animate-bounce" aria-hidden="true" />
        </a>
      </header>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14">
        <ol className="space-y-4 lg:space-y-0">
          {chapters.map((ch, i) => (
            <li key={ch.id}>
              <section
                id={`ch-${ch.id}`}
                data-index={i}
                aria-labelledby={`ch-${ch.id}-title`}
                className="scroll-mt-20 border-t py-10 lg:flex lg:min-h-[82vh] lg:items-center lg:border-t-0 lg:py-0"
              >
                <div className="w-full">
                  <h2 id={`ch-${ch.id}-title`} className="flex items-center gap-3 text-xs font-semibold tracking-[0.16em] uppercase">
                    <span className="tabular text-send-ink">{String(i + 1).padStart(2, "0")}</span>
                    <span className="h-px w-8 bg-brand" aria-hidden="true" />
                    <span className="text-muted-foreground">{ch.kicker}</span>
                  </h2>
                  <p className="tabular mt-4 text-5xl font-semibold tracking-tight sm:text-6xl">{ch.number}</p>
                  <p className="mt-1 text-base text-muted-foreground">{ch.numberNote}</p>
                  <div className="mt-5 max-w-md space-y-2 text-lg leading-relaxed">
                    {ch.text.map((t) => (
                      <p key={t}>
                        {t.split(/(\*\*[^*]+\*\*)/).map((part, k) =>
                          part.startsWith("**") ? (
                            <strong key={k} className="font-semibold text-foreground underline decoration-brand decoration-2 underline-offset-4">
                              {part.slice(2, -2)}
                            </strong>
                          ) : (
                            part
                          ),
                        )}
                      </p>
                    ))}
                  </div>
                  <p className="mt-5 max-w-md text-xs leading-relaxed text-muted-foreground">
                    As of {asOf} · Source: {ch.source}
                  </p>
                  <div className="mt-6 lg:hidden">
                    <Picture index={i} data={data} />
                  </div>
                </div>
              </section>
            </li>
          ))}
        </ol>

        <div className="hidden lg:block">
          <div className="sticky top-[9vh] flex h-[82vh] flex-col justify-center">
            <nav aria-label="Chapters" className="mb-4 flex items-center gap-3">
              <ol className="flex gap-1.5">
                {chapters.map((ch, i) => (
                  <li key={ch.id}>
                    <a
                      href={`#ch-${ch.id}`}
                      aria-current={i === active ? "step" : undefined}
                      className="group block rounded py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      <span
                        className={cn(
                          "block h-1 w-8 rounded-full transition-colors",
                          i === active ? "bg-send" : i < active ? "bg-foreground/35" : "bg-border group-hover:bg-foreground/25",
                        )}
                      />
                      <span className="sr-only">
                        Chapter {i + 1}: {ch.kicker}
                      </span>
                    </a>
                  </li>
                ))}
              </ol>
              <span className="tabular text-xs whitespace-nowrap text-muted-foreground">
                {String(active + 1).padStart(2, "0")} / {String(chapters.length).padStart(2, "0")} · {chapters[active]?.kicker}
              </span>
            </nav>
            <div key={active} className="story-in">
              <Picture index={active} data={data} />
            </div>
          </div>
        </div>
      </div>

      <section aria-label="Where to go next" className="mt-6 rounded-2xl border bg-card p-6 lg:mt-0">
        <p className="text-sm font-semibold">That&rsquo;s the story. The work happens on Today.</p>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Priya opens one list each morning, works through it in steps, and approves what goes out. Every suggestion shows its reason, the records
          behind it and the policy line.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Open today&rsquo;s list
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link href="/how" className="inline-flex h-9 items-center rounded-md border px-3.5 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50">
            How it works
          </Link>
          <Link href="/why" className="inline-flex h-9 items-center rounded-md border px-3.5 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50">
            Why overdue
          </Link>
        </div>
      </section>
    </div>
  );
}
