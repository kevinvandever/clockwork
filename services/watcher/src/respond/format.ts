import type { Lead } from "@clockwork/connector-core";

/** Human-readable AI disclosure appended to every drafted reply. */
export const AI_DISCLOSURE = "This message was drafted with AI assistance.";

/** Derive a subject line from the lead's message, with a sensible fallback. */
export function subjectFor(lead: Lead): string {
  if (lead.message) {
    const t = lead.message.replace(/\s+/g, " ").trim();
    return `Re: ${t.length > 60 ? `${t.slice(0, 59)}…` : t}`;
  }
  return "Thanks for reaching out";
}

/** Ensure the body carries the AI disclosure exactly once. */
export function ensureDisclosure(body: string): string {
  return body.includes(AI_DISCLOSURE)
    ? body.trim()
    : `${body.trim()}\n\n${AI_DISCLOSURE}`;
}
