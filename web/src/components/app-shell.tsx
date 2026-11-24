"use client";

import { BarChart3, BookOpen, Building2, Inbox, Menu, MessageSquareText, ShieldCheck, TriangleAlert, Workflow } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { GlossaryButton } from "@/components/shared/info-tip";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Today", icon: Inbox },
  { href: "/why", label: "Why overdue", icon: BarChart3 },
  { href: "/customers", label: "Customers", icon: Building2 },
  { href: "/summary", label: "Morning message", icon: MessageSquareText },
  { href: "/proof", label: "How sure are we", icon: ShieldCheck },
  { href: "/how", label: "How it works", icon: Workflow },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function Brand({ companyName }: { companyName: string }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      <span className="grid size-7 place-items-center rounded-lg bg-send text-send-contrast">
        <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
          <path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-semibold tracking-tight">Collections check</span>
        <span className="text-xs text-muted-foreground">{companyName}</span>
      </span>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? "/";
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      <Link
        href="/story"
        onClick={onNavigate}
        aria-current={isActive(pathname, "/story") ? "page" : undefined}
        className={cn(
          "mb-3 flex items-center gap-2.5 rounded-md border border-hold/40 px-2.5 py-2 text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
          isActive(pathname, "/story") ? "bg-hold-soft font-medium text-foreground" : "text-foreground hover:bg-hold-soft",
        )}
      >
        <BookOpen className="size-4 text-hold-ink" aria-hidden="true" />
        <span className="flex-1">The story</span>
        <span className="text-[11px] text-muted-foreground">2 min</span>
      </Link>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
              active
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  children,
  companyName,
  dataSource,
  asOf,
  generatedAt,
}: {
  children: ReactNode;
  companyName: string;
  dataSource: "sample" | "real";
  asOf: string;
  generatedAt: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-dvh w-full">
      <aside className="dark sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-sidebar px-3 py-4 text-sidebar-foreground md:flex">
        <div className="px-1.5 pb-5">
          <Brand companyName={companyName} />
        </div>
        <NavLinks />
        <div className="mt-auto space-y-2 px-1.5 pt-4 text-xs text-muted-foreground">
          <GlossaryButton />
          <div className="flex items-center justify-between gap-2 border-t pt-3">
            <span>Data as of {asOf}</span>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/85 px-4 backdrop-blur md:hidden">
          <Brand companyName={companyName} />
          <div className="flex items-center gap-1">
            <GlossaryButton compact />
            <ThemeToggle />
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Open menu">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="px-3 py-4 data-[side=left]:w-72">
                <SheetHeader className="px-1.5 pb-2">
                  <SheetTitle className="sr-only">Menu</SheetTitle>
                  <Brand companyName={companyName} />
                </SheetHeader>
                <NavLinks onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>
        </header>

        {dataSource === "sample" && (
          <div
            role="note"
            className="flex items-center justify-center gap-2 border-b border-hold/40 bg-hold-soft px-4 py-1.5 text-center text-xs font-medium text-hold-ink"
          >
            <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
            Sample data — not real figures
          </div>
        )}

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>

        <footer className="border-t px-4 py-3 text-xs text-muted-foreground sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-x-6 gap-y-1">
            <span>
              Run generated {generatedAt} · data as of {asOf}
            </span>
            <span>Nothing is sent without a person approving it.</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
