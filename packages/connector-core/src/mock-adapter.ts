import {
  ConnectorError,
  type ActivityEvent,
  type Contact,
  type ContactInput,
  type ContactListQuery,
  type ContactQuery,
  type CrmConnector,
  type Lead,
  type OutboundMessage,
  type SendResult,
} from "./types.js";

export interface SentMessage extends OutboundMessage {
  id: string;
  tenantId: string;
  sentAt: string;
}

/**
 * In-memory CRM connector for tests and local dogfooding. Bound to one tenant;
 * every record it stores is tagged with that tenant so isolation is testable.
 * Exposes seed/inspect helpers (outside the CrmConnector interface) so later
 * tasks can drive leads in and assert on what was "sent".
 */
export class MockCrmConnector implements CrmConnector {
  readonly tenantId: string;

  private readonly contacts: Contact[] = [];
  private leads: Lead[] = [];
  private readonly sent: SentMessage[] = [];
  private readonly activity: ActivityEvent[] = [];
  private seq = 0;

  constructor(tenantId: string) {
    if (!tenantId) {
      throw new ConnectorError("invalid_input", "tenantId is required");
    }
    this.tenantId = tenantId;
  }

  private nextId(prefix: string): string {
    this.seq += 1;
    return `${prefix}_${this.tenantId}_${this.seq}`;
  }

  async createContact(input: ContactInput): Promise<Contact> {
    if (!input.email && !input.phone) {
      throw new ConnectorError(
        "invalid_input",
        "a contact needs at least an email or phone",
      );
    }
    const contact: Contact = {
      id: this.nextId("contact"),
      tenantId: this.tenantId,
      ...input,
    };
    this.contacts.push(contact);
    return contact;
  }

  async findContact(query: ContactQuery): Promise<Contact | null> {
    return (
      this.contacts.find(
        (c) =>
          (query.email !== undefined && c.email === query.email) ||
          (query.phone !== undefined && c.phone === query.phone),
      ) ?? null
    );
  }

  async listContacts(query?: ContactListQuery): Promise<Contact[]> {
    if (query?.segment !== undefined) {
      return this.contacts.filter((c) => c.segment === query.segment);
    }
    return [...this.contacts];
  }

  async sendMessage(message: OutboundMessage): Promise<SendResult> {
    if (!message.aiDisclosed) {
      throw new ConnectorError(
        "send_blocked",
        "message must disclose AI assistance before sending",
      );
    }
    if (!message.to || !message.body) {
      throw new ConnectorError(
        "invalid_input",
        "message requires `to` and `body`",
      );
    }
    const record: SentMessage = {
      ...message,
      id: this.nextId("msg"),
      tenantId: this.tenantId,
      sentAt: new Date().toISOString(),
    };
    this.sent.push(record);
    return { id: record.id, status: "sent" };
  }

  async fetchNewLeads(): Promise<Lead[]> {
    const out = this.leads;
    this.leads = [];
    return out;
  }

  async logActivity(event: ActivityEvent): Promise<void> {
    this.activity.push(event);
  }

  // --- test / inspection helpers (not part of CrmConnector) ---

  /** Seed leads that the next fetchNewLeads() will drain. */
  seedLeads(...leads: Lead[]): void {
    this.leads.push(...leads);
  }

  /** Messages that were "sent" through this connector. */
  getSentMessages(): readonly SentMessage[] {
    return [...this.sent];
  }

  /** Recorded activity events. */
  getActivity(): readonly ActivityEvent[] {
    return [...this.activity];
  }

  /** Contacts stored for this tenant. */
  getContacts(): readonly Contact[] {
    return [...this.contacts];
  }
}
