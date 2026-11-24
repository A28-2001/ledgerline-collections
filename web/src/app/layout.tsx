import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { formatDate, formatDateTime, results } from "@/lib/data";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `Collections check · ${results.meta.companyName}`,
    template: `%s · Collections check`,
  },
  description:
    "Every morning: which overdue bills to chase, which to hold and why, with the evidence. A person approves everything.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const { meta } = results;
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-background">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider delayDuration={200}>
            <AppShell
              companyName={meta.companyName}
              dataSource={meta.dataSource}
              asOf={formatDate(meta.asOf)}
              generatedAt={formatDateTime(meta.generatedAt)}
            >
              {children}
            </AppShell>
            <Toaster position="bottom-right" />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
