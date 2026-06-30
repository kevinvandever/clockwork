import {
  ConnectorError,
  type Contact,
  type ContactInput,
  type ContactListQuery,
  type ContactQuery,
  type CrmConnector,
  type ActivityEvent,
  type Lead,
  type OutboundMessage,
  type SendResult,
} from "@clockwork/connector-core";

/**
 * Rechat CRM adapter — Joe's proof environment.
 *
 * Shaped against Rechat's documented API (OAuth2 auth, contacts, lead capture;
 * docs.api.rechat.com). The endpoint paths/payloads below follow the documented
 * structure but are **unverified against a live tenant** — they're confirmed when
 * Joe provides OAuth2 credentials (see docs/DECISIONS.md D24). Two paths are not
 * yet confirmable and fail loudly rather than guess:
 *   - `sendMessage`: whether Rechat sends outbound email/SMS via API is unconfirmed.
 *   - `fetchNewLeads`: Rechat is webhook-first (Lead Capture API → our /inbound),
 *     so polling returns empty by design.
 *
 * `tenantId` is our concept; a Rechat token maps to one brokerage, so we tag
 * records with the configured tenantId for parity with the rest of the system.
 */
export interface RechatConnectorOptions {
  tenantId: string;
  /** OAuth2 access token (acquisition deferred to live wiring). */
  accessToken: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

interface RechatContactResponse {
  data?: { id?: string };
  id?: string;
}

const DEFAULT_BASE = "https://api.rechat.com";

export class RechatConnector implements CrmConnector {
  readonly tenantId: string;
  private readonly accessToken: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: RechatConnectorOptions) {
    if (!opts.tenantId) {
      throw new ConnectorError("invalid_input", "tenantId is required");
    }
    if (!opts.accessToken) {
      throw new ConnectorError("invalid_input", "accessToken is required");
    }
    this.tenantId = opts.tenantId;
    this.accessToken = opts.accessToken;
    this.baseUrl = opts.baseUrl ?? DEFAULT_BASE;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  private async request(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<Response> {
    return this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.accessToken}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  async createContact(input: ContactInput): Promise<Contact> {
    if (!input.email && !input.phone) {
      throw new ConnectorError(
        "invalid_input",
        "a contact needs at least an email or phone",
      );
    }
    const res = await this.request("POST", "/contacts", {
      emails: input.email ? [input.email] : [],
      phone_numbers: input.phone ? [input.phone] : [],
      name: input.name,
    });
    if (!res.ok) {
      throw new ConnectorError("adapter_error", `rechat createContact: ${res.status}`);
    }
    const json = (await res.json()) as RechatContactResponse;
    const id = json.data?.id ?? json.id;
    if (!id) {
      throw new ConnectorError("adapter_error", "rechat createContact: no id in response");
    }
    return { id, tenantId: this.tenantId, ...input };
  }

  async findContact(query: ContactQuery): Promise<Contact | null> {
    const term = query.email ?? query.phone;
    if (!term) {
      return null;
    }
    const res = await this.request(
      "GET",
      `/contacts/search?q=${encodeURIComponent(term)}`,
    );
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      throw new ConnectorError("adapter_error", `rechat findContact: ${res.status}`);
    }
    const json = (await res.json()) as { data?: { id?: string }[] };
    const hit = json.data?.[0];
    if (!hit?.id) {
      return null;
    }
    return { id: hit.id, tenantId: this.tenantId, ...query };
  }

  async listContacts(query?: ContactListQuery): Promise<Contact[]> {
    const path = query?.segment
      ? `/contacts?list=${encodeURIComponent(query.segment)}`
      : "/contacts";
    const res = await this.request("GET", path);
    if (!res.ok) {
      throw new ConnectorError("adapter_error", `rechat listContacts: ${res.status}`);
    }
    const json = (await res.json()) as {
      data?: { id?: string; email?: string; name?: string }[];
    };
    return (json.data ?? [])
      .filter((c): c is { id: string } => typeof c.id === "string")
      .map((c) => ({ id: c.id, tenantId: this.tenantId }));
  }

  async sendMessage(message: OutboundMessage): Promise<SendResult> {
    // Compliance gate stays structural across every adapter.
    if (!message.aiDisclosed) {
      throw new ConnectorError(
        "send_blocked",
        "message must disclose AI assistance before sending",
      );
    }
    // Honest stop: outbound send via the Rechat API is unconfirmed. Verify the
    // capability/endpoint with live credentials before enabling (D24).
    throw new ConnectorError(
      "adapter_error",
      "rechat outbound send not yet verified — confirm the API with credentials",
    );
  }

  async fetchNewLeads(): Promise<Lead[]> {
    // Webhook-first: Rechat's Lead Capture API POSTs to the watcher's /inbound.
    return [];
  }

  async logActivity(event: ActivityEvent): Promise<void> {
    // Best-effort write to the contact timeline; never block the caller.
    if (!event.contactId) {
      return;
    }
    try {
      await this.request("POST", `/contacts/${event.contactId}/timeline`, {
        type: "note",
        text: `${event.robot}: ${event.action}${event.outcome ? ` (${event.outcome})` : ""}`,
      });
    } catch {
      // unverified endpoint; swallow until confirmed live
    }
  }
}
