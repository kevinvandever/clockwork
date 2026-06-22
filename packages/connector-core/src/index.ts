/**
 * CRM-agnostic connector core.
 *
 * This file establishes the normalized interface shape that thin per-CRM adapters
 * will implement. The real implementation plus a mock adapter land in Task 3; the
 * types below are the contract the rest of the system codes against in the
 * meantime so nothing depends on a specific CRM.
 */

export interface Contact {
  id: string;
  email?: string;
  phone?: string;
  name?: string;
}

export interface OutboundMessage {
  to: string;
  subject?: string;
  body: string;
}

export interface Lead {
  /** Where the lead came from (email watcher, CRM webhook, etc.). */
  source: string;
  email?: string;
  phone?: string;
  name?: string;
  message?: string;
  /** ISO-8601 timestamp. */
  receivedAt: string;
}

export interface ActivityEvent {
  /** Resolved persona name or robot key that performed the action. */
  robot: string;
  action: string;
  contactId?: string;
  outcome?: string;
  /** ISO-8601 timestamp. */
  at: string;
}

/**
 * Normalized CRM interface. Sending always goes through the client's own CRM, so
 * `sendMessage` hands a draft to the CRM's delivery, inheriting its compliance.
 * Adapters (mock + real) implement this in Task 3.
 */
export interface CrmConnector {
  createContact(contact: Omit<Contact, "id">): Promise<Contact>;
  findContact(query: { email?: string; phone?: string }): Promise<Contact | null>;
  sendMessage(message: OutboundMessage): Promise<void>;
  fetchNewLeads(): Promise<Lead[]>;
  logActivity(event: ActivityEvent): Promise<void>;
}

/** Marker the workspace can assert against until Task 3 fills this in. */
export const CONNECTOR_CORE_PLACEHOLDER = true;
