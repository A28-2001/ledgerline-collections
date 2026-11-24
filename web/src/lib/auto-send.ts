"use client";

import { useState } from "react";
import type { Invoice } from "@/lib/types";

const CAP_KEY = "collections-check:auto-send-cap";

// "Small" is a setting Priya changes herself (COO, 24 Nov): start at the pipeline's default
// (under $5,000), keep her choice on this device. Storage errors fall back to the default.
export function useAutoSendCap(defaultCap: number | null): [number | null, (v: number | null) => void] {
  const [cap, setCap] = useState<number | null>(() => {
    if (typeof window === "undefined") return defaultCap;
    try {
      const saved = window.localStorage.getItem(CAP_KEY);
      return saved === null ? defaultCap : Number(saved);
    } catch {
      return defaultCap;
    }
  });
  const save = (v: number | null) => {
    setCap(v);
    try {
      if (v === null) window.localStorage.removeItem(CAP_KEY);
      else window.localStorage.setItem(CAP_KEY, String(v));
    } catch {
      /* ignore */
    }
  };
  return [cap, save];
}

export function couldAutoSend(inv: Invoice, cap: number | null): boolean {
  return Boolean(inv.autoSend?.eligible) && cap !== null && inv.amount < cap;
}
