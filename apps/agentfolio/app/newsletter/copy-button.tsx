"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: some environments don't support clipboard API
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded border border-zinc-300 px-2 py-0.5 text-xs text-zinc-600 hover:bg-zinc-50"
    >
      {copied ? "Copied" : "Copy draft"}
    </button>
  );
}
