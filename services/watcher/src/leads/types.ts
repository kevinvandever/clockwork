// The lead-handler contract now lives in @clockwork/pipeline (the Pipeline robot).
// Re-exported here so the intake code keeps importing from one place.
export type { LeadHandler, ReceivedLead } from "@clockwork/pipeline";

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
