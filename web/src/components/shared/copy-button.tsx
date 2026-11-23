"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyButton({
  text,
  label = "Copy",
  variant = "outline",
  size = "sm",
}: {
  text: string;
  label?: string;
  variant?: "outline" | "ghost" | "secondary" | "default";
  size?: "sm" | "default" | "xs";
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy. Select the text and copy it by hand.");
    }
  }

  return (
    <Button variant={variant} size={size} onClick={copy}>
      {copied ? <Check /> : <Copy />}
      {copied ? "Copied" : label}
    </Button>
  );
}
