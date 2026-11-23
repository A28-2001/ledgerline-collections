"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const emptySubscribe = () => () => {};

// Cycles light → dark → system. Renders a stable placeholder until mounted to avoid a hydration mismatch.
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const current = mounted ? (theme ?? "system") : "system";
  const next = current === "light" ? "dark" : current === "dark" ? "system" : "light";
  const Icon = current === "light" ? Sun : current === "dark" ? Moon : Monitor;
  const label = `Theme: ${current}. Switch to ${next}.`;

  return (
    <Button variant="ghost" size="icon-sm" onClick={() => setTheme(next)} aria-label={label} title={label}>
      <Icon />
    </Button>
  );
}
