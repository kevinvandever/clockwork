import type { Lead } from "@clockwork/connector-core";

/** A parsed, tenant-scoped lead handed to the Pipeline handler. */
export interface ReceivedLead {
  tenantId: string;
  lead: Lead;
  /** Stable key used upstream to drop duplicate deliveries. */
  dedupKey: string;
}

/** Consumes a received lead (the Pipeline instant-response handler). */
export type LeadHandler = (received: ReceivedLead) => Promise<void>;
