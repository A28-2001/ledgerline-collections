"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const emptySubscribe = () => () => {};
const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Auto", icon: Monitor },
] as const;

function useMountedTheme() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  return { current: mounted ? (theme ?? "system") : "system", setTheme, mounted };
}

// A clear choice: Light, Dark or Auto (follows the device). The choice is remembered in this browser.
export function ThemeSwitch({ className }: { className?: string }) {
  const { current, setTheme } = useMountedTheme();
  return (
    <div role="radiogroup" aria-label="Colour theme" className={cn("flex rounded-lg border p-0.5", className)}>
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const on = current === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setTheme(value)}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
              on ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

// Compact version for the phone header: one tap switches between light and dark.
export function ThemeToggle() {
  const { current, setTheme, mounted } = useMountedTheme();
  const isDark =
    current === "dark" || (current === "system" && mounted && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const next = isDark ? "light" : "dark";
  const Icon = isDark ? Sun : Moon;
  const label = `Switch to ${next} mode`;
  return (
    <Button variant="ghost" size="icon-sm" onClick={() => setTheme(next)} aria-label={label} title={label}>
      <Icon />
    </Button>
  );
}
