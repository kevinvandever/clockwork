"use client";

import { useFormStatus } from "react-dom";

/**
 * Submit button that reflects the parent form's pending state. Drafting fires a
 * real Claude call that can take many seconds, so without this the button looks
 * frozen. Shows a disabled "…" label while the server action runs.
 */
export function SubmitButton({
  children,
  pendingText,
  variant = "primary",
}: {
  children: React.ReactNode;
  pendingText: string;
  variant?: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();
  const base =
    "rounded-md px-4 py-2 text-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-70";
  const style =
    variant === "primary"
      ? "bg-zinc-900 text-white"
      : "border border-zinc-300 text-zinc-800 hover:bg-zinc-50";
  return (
    <button type="submit" disabled={pending} className={`${base} ${style}`}>
      {pending ? pendingText : children}
    </button>
  );
}
