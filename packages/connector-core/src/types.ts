/**
 * CRM-agnostic connector contract.
 *
 * Sending always goes through the client's own CRM, so `sendMessage` hands a draft
 * to the CRM's delivery and inherits its compliance. Disclosure/consent is carried
 * on the message itself so the connector can refuse to send anything that isn't
 * marked AI-disclosed.
 */

export interface Contact {
  id: string;
  tenantId: string;
  email?: string;
  phone?: string;
  name?: string;
}

export interface ContactInput {
  email?: string;
  phone?: string;
  name?: string;
}

export interface ContactQuery {
  email?: string;
  phone?: string;
}

export interface OutboundMessage {
  to: string;
  subject?: string;
  body: string;
  /** Whether the message discloses it was AI-assisted. Must be true to send. */
  aiDisclosed: boolean;
  /** Optional basis for contacting (e.g. "existing_client", "opt_in"). */
  consentBasis?: string;
}

export interface SendResult {
  id: string;
  status: "sent" | "queued";
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

export type ConnectorErrorCode =
  | "not_found"
  | "invalid_input"
  | "send_blocked"
  | "adapter_error";

/** Typed error so callers can branch on `code` instead of parsing messages. */
export class ConnectorError extends Error {
  readonly code: ConnectorErrorCode;

  constructor(code: ConnectorErrorCode, message: string) {
    super(message);
    this.name = "ConnectorError";
    this.code = code;
  }
}

/**
 * Normalized CRM interface. Thin adapters implement this per CRM; a connector
 * instance is always bound to a single tenant.
 */
export interface CrmConnector {
  readonly tenantId: string;
  createContact(contact: ContactInput): Promise<Contact>;
  findContact(query: ContactQuery): Promise<Contact | null>;
  sendMessage(message: OutboundMessage): Promise<SendResult>;
  fetchNewLeads(): Promise<Lead[]>;
  logActivity(event: ActivityEvent): Promise<void>;
}
