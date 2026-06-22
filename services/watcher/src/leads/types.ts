import type { Lead } from "@clockwork/connector-core";

/** Normalized inbound email payload accepted by the intake endpoint. */
export interface InboundEmail {
  /** Provider message id, used for dedup when present. */
  messageId?: string;
  /** Sender, e.g. `"Jane Buyer <jane@example.com>"` or a bare address. */
  from: string;
  subject?: string;
  text?: string;
  /** ISO-8601; defaults to now when absent. */
  receivedAt?: string;
}

/** A parsed, tenant-scoped lead ready to hand to a handler. */
export interface ReceivedLead {
  tenantId: string;
  lead: Lead;
  /** Stable key used to drop duplicate deliveries. */
  dedupKey: string;
}

/** Consumes a received lead. Task 5 logs it; Task 6 drafts + sends. */
export type LeadHandler = (received: ReceivedLead) => Promise<void>;
