import type { Lead } from "@clockwork/connector-core";
import type { InboundEmail } from "./types.js";

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
// North-American-ish phone, tolerant of separators.
const PHONE_RE = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;

/** Extract an email address from a `from` header or free text. */
export function extractEmail(...candidates: (string | undefined)[]): string | undefined {
  for (const c of candidates) {
    const m = c?.match(EMAIL_RE);
    if (m) {
      return m[0].toLowerCase();
    }
  }
  return undefined;
}

/** Extract a phone number from free text. */
export function extractPhone(text: string | undefined): string | undefined {
  const m = text?.match(PHONE_RE);
  return m ? m[0].trim() : undefined;
}

/** Pull a display name out of a `from` header like `Jane Buyer <jane@x.com>`. */
export function extractName(from: string): string | undefined {
  const display = from.split("<")[0]?.trim().replace(/^"|"$/g, "");
  if (display && !display.includes("@")) {
    return display;
  }
  return undefined;
}

/** Best-effort lead source from the sender's domain. */
export function deriveSource(email: string | undefined): string {
  if (!email) {
    return "email";
  }
  const domain = email.split("@")[1] ?? "";
  if (domain.includes("zillow")) return "zillow";
  if (domain.includes("realtor")) return "realtor";
  if (domain.includes("homes")) return "homes";
  return "email";
}

/**
 * Parse a normalized inbound email payload into a `Lead`. Generic, best-effort
 * extraction; vendor-specific parsers can be layered in later by trying them
 * before this fallback.
 */
export function parseLeadEmail(email: InboundEmail): Lead {
  const address = extractEmail(email.from, email.text);
  const phone = extractPhone(email.text);
  const name = extractName(email.from);
  const message = email.text?.trim() || email.subject?.trim();

  return {
    source: deriveSource(address),
    email: address,
    phone,
    name,
    message,
    receivedAt: email.receivedAt ?? new Date().toISOString(),
  };
}
