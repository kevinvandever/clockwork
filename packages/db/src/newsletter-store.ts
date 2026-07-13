import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type {
  NewsletterDraftRecord,
  NewsletterDraftStore,
  StoryInput,
} from "@clockwork/marketing";

type Disposition = NonNullable<NewsletterDraftRecord["disposition"]>;

interface DraftRow {
  id: string;
  tenant_id: string;
  input: StoryInput;
  resolved_source_text: string | null;
  headline: string;
  body: string;
  word_count: number;
  editor_notes: string[];
  status: NewsletterDraftRecord["status"];
  refusal_reason: string | null;
  disposition: Disposition | null;
  story_submitted_at: string;
  draft_ready_at: string | null;
}

function toRecord(row: DraftRow): NewsletterDraftRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    input: row.input,
    resolvedSourceText: row.resolved_source_text ?? undefined,
    headline: row.headline,
    body: row.body,
    wordCount: row.word_count,
    editorNotes: row.editor_notes ?? [],
    status: row.status,
    refusalReason: row.refusal_reason ?? undefined,
    disposition: row.disposition ?? undefined,
    storySubmittedAt: row.story_submitted_at,
    draftReadyAt: row.draft_ready_at ?? undefined,
  };
}

/** Postgres-backed newsletter draft store. Tenant-scoped on every operation. */
export class PostgresNewsletterDraftStore implements NewsletterDraftStore {
  constructor(private readonly pool: Pool) {}

  async create(
    tenantId: string,
    record: Omit<NewsletterDraftRecord, "id" | "tenantId">,
  ): Promise<NewsletterDraftRecord> {
    const id = randomUUID();
    const { rows } = await this.pool.query<DraftRow>(
      `insert into newsletter_drafts
         (id, tenant_id, input, resolved_source_text, headline, body,
          word_count, editor_notes, status, refusal_reason, disposition,
          story_submitted_at, draft_ready_at)
       values
         ($1, $2, $3::jsonb, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13)
       returning *`,
      [
        id,
        tenantId,
        JSON.stringify(record.input),
        record.resolvedSourceText ?? null,
        record.headline,
        record.body,
        record.wordCount,
        JSON.stringify(record.editorNotes ?? []),
        record.status,
        record.refusalReason ?? null,
        record.disposition ?? null,
        record.storySubmittedAt,
        record.draftReadyAt ?? null,
      ],
    );
    return toRecord(rows[0]);
  }

  async get(
    tenantId: string,
    id: string,
  ): Promise<NewsletterDraftRecord | undefined> {
    const { rows } = await this.pool.query<DraftRow>(
      `select * from newsletter_drafts where tenant_id = $1 and id = $2`,
      [tenantId, id],
    );
    return rows.length ? toRecord(rows[0]) : undefined;
  }

  async list(tenantId: string): Promise<NewsletterDraftRecord[]> {
    const { rows } = await this.pool.query<DraftRow>(
      `select * from newsletter_drafts where tenant_id = $1
        order by story_submitted_at`,
      [tenantId],
    );
    return rows.map(toRecord);
  }

  async updateDisposition(
    tenantId: string,
    id: string,
    disposition: Disposition,
  ): Promise<NewsletterDraftRecord | undefined> {
    const { rows } = await this.pool.query<DraftRow>(
      `update newsletter_drafts set disposition = $3
        where tenant_id = $1 and id = $2
       returning *`,
      [tenantId, id, disposition],
    );
    return rows.length ? toRecord(rows[0]) : undefined;
  }
}
