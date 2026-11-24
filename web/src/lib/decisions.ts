"use client";

import { useCallback, useSyncExternalStore } from "react";
import { results } from "@/lib/data";
import type { Verdict } from "@/lib/types";

// What a person decided about an invoice in this browser. Stored in localStorage only;
// the page works the same when storage is blocked (decisions just don't survive a reload).
export type Decision = {
  status: "approved" | "overridden";
  verdict: Verdict; // the verdict the person approved (their own when overridden)
  reason?: string; // required when overridden
  at: string; // ISO time of the decision
};
export type Decisions = Record<string, Decision>;

// One list per data date: re-running the same morning's data keeps the decisions already made.
const KEY = `collections-check:decisions:${results.meta.asOf}`;
const EMPTY: Decisions = {};
const listeners = new Set<() => void>();
let cache: Decisions | null = null;

function read(): Decisions {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    cache = parsed && typeof parsed === "object" ? (parsed as Decisions) : {};
  } catch {
    cache = {};
  }
  return cache;
}

function write(next: Decisions) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage blocked (private window, previews): keep the in-memory copy.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDecisions() {
  const decisions = useSyncExternalStore(subscribe, read, () => EMPTY);

  const approve = useCallback((items: { id: string; verdict: Verdict }[]) => {
    const now = new Date().toISOString();
    const next = { ...read() };
    for (const { id, verdict } of items) next[id] = { status: "approved", verdict, at: now };
    write(next);
  }, []);

  const override = useCallback((id: string, verdict: Verdict, reason: string) => {
    write({ ...read(), [id]: { status: "overridden", verdict, reason, at: new Date().toISOString() } });
  }, []);

  const undo = useCallback((id: string) => {
    const next = { ...read() };
    delete next[id];
    write(next);
  }, []);

  return { decisions, approve, override, undo };
}
