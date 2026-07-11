import type { StoryInput } from "./drafter.js";

/**
 * Persisted newsletter draft record. Tenant-tagged; cross-tenant reads
 * are inexpressible by design (every method requires a tenantId).
 */
export interface NewsletterDraftRecord {
  id: string;
  tenantId: string;
  input: StoryInput;
  resolvedSourceText?: string;
  headline: string;
  body: string;
  wordCount: number;
  editorNotes: string[];
  status: "drafting" | "ready" | "refused" | "error";
  refusalReason?: string;
  disposition?: "published-as-is" | "edited" | "discarded";
  storySubmittedAt: string;
  draftReadyAt?: string;
}

/**
 * Store interface for newsletter drafts. Every operation requires a tenantId
 * so that cross-tenant reads are not expressible.
 */
export interface NewsletterDraftStore {
  create(
    tenantId: string,
    record: Omit<NewsletterDraftRecord, "id" | "tenantId">,
  ): Promise<NewsletterDraftRecord>;

  get(tenantId: string, id: string): Promise<NewsletterDraftRecord | undefined>;

  list(tenantId: string): Promise<NewsletterDraftRecord[]>;

  updateDisposition(
    tenantId: string,
    id: string,
    disposition: NonNullable<NewsletterDraftRecord["disposition"]>,
  ): Promise<NewsletterDraftRecord | undefined>;
}

/**
 * In-memory implementation of the newsletter draft store.
 * Acceptable for the first local run; a Postgres-backed implementation
 * replaces this behind the same interface once Railway is provisioned.
 */
export class InMemoryNewsletterDraftStore implements NewsletterDraftStore {
  private readonly records: Map<string, NewsletterDraftRecord> = new Map();

  async create(
    tenantId: string,
    input: Omit<NewsletterDraftRecord, "id" | "tenantId">,
  ): Promise<NewsletterDraftRecord> {
    const id = crypto.randomUUID();
    const record: NewsletterDraftRecord = { id, tenantId, ...input };
    this.records.set(id, record);
    return record;
  }

  async get(
    tenantId: string,
    id: string,
  ): Promise<NewsletterDraftRecord | undefined> {
    const record = this.records.get(id);
    if (!record || record.tenantId !== tenantId) return undefined;
    return record;
  }

  async list(tenantId: string): Promise<NewsletterDraftRecord[]> {
    const out: NewsletterDraftRecord[] = [];
    for (const record of this.records.values()) {
      if (record.tenantId === tenantId) out.push(record);
    }
    return out;
  }

  async updateDisposition(
    tenantId: string,
    id: string,
    disposition: NonNullable<NewsletterDraftRecord["disposition"]>,
  ): Promise<NewsletterDraftRecord | undefined> {
    const record = this.records.get(id);
    if (!record || record.tenantId !== tenantId) return undefined;
    record.disposition = disposition;
    return record;
  }
}
