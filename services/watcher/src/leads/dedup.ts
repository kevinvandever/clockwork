import { createHash } from "node:crypto";
import type { InboundEmail } from "./types.js";

/**
 * Stable dedup key for an inbound email: the provider message id when present,
 * otherwise a hash of sender + subject + receivedAt. Scoped per tenant so the
 * same forwarded message to two tenants isn't collapsed.
 */
export function dedupKeyFor(tenantId: string, email: InboundEmail): string {
  if (email.messageId) {
    return `${tenantId}:${email.messageId}`;
  }
  const basis = `${email.from}|${email.subject ?? ""}|${email.receivedAt ?? ""}`;
  const hash = createHash("sha256").update(basis).digest("hex").slice(0, 16);
  return `${tenantId}:${hash}`;
}

/**
 * In-memory dedup store. Durable dedup (Postgres) replaces this behind the same
 * shape once Railway is provisioned — see docs/DECISIONS.md D9.
 */
export class InMemoryDedup {
  private readonly seen = new Set<string>();

  /** Returns true if this key is new (and records it); false if already seen. */
  markIfNew(key: string): boolean {
    if (this.seen.has(key)) {
      return false;
    }
    this.seen.add(key);
    return true;
  }

  has(key: string): boolean {
    return this.seen.has(key);
  }
}
