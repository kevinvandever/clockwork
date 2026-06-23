import type { Lead } from "@clockwork/connector-core";

// Disclosure wording lives in connector-core (single source) and is re-exported
// here so the existing responder imports keep working.
export { AI_DISCLOSURE, ensureDisclosure } from "@clockwork/connector-core";

/** Derive a subject line from the lead's message, with a sensible fallback. */
export function subjectFor(lead: Lead): string {
  if (lead.message) {
    const t = lead.message.replace(/\s+/g, " ").trim();
    return `Re: ${t.length > 60 ? `${t.slice(0, 59)}…` : t}`;
  }
  return "Thanks for reaching out";
}
