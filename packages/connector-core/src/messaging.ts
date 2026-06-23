/**
 * Outbound-message compliance helpers. Centralized here (the package that owns the
 * disclosure gate) so every robot uses identical wording — see docs/DECISIONS.md.
 */

/** Human-readable AI disclosure appended to drafted messages. */
export const AI_DISCLOSURE = "This message was drafted with AI assistance.";

/** Ensure the body carries the AI disclosure exactly once. */
export function ensureDisclosure(body: string): string {
  return body.includes(AI_DISCLOSURE)
    ? body.trim()
    : `${body.trim()}\n\n${AI_DISCLOSURE}`;
}
