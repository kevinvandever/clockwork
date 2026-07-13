import type { Pool } from "pg";

/**
 * Ordered, append-only migrations. SQL is inlined (not read from disk) so it
 * survives tsc build + Next bundling without any file-copy step. Each entry is
 * applied once and recorded in `_migrations`; never edit an applied migration —
 * add a new one.
 */
export const MIGRATIONS: { name: string; sql: string }[] = [
  {
    name: "0001_init",
    sql: `
      -- Tenants: registry + encrypted BYO key + persona overrides.
      create table if not exists tenants (
        tenant_id          text primary key,
        display_name       text not null,
        persona_overrides  jsonb not null default '{}'::jsonb,
        encrypted_api_key  text,
        created_at         text not null,
        updated_at         text not null
      );

      -- Versioned per-robot skill text (history retained for rollback / P2-A).
      create table if not exists tenant_skills (
        tenant_id   text not null references tenants(tenant_id) on delete cascade,
        robot       text not null,
        version     integer not null,
        text        text not null,
        updated_at  text not null,
        primary key (tenant_id, robot, version)
      );

      -- Newsletter drafts (marketing robot). Tenant-scoped.
      create table if not exists newsletter_drafts (
        id                   text primary key,
        tenant_id            text not null,
        input                jsonb not null,
        resolved_source_text text,
        headline             text not null,
        body                 text not null,
        word_count           integer not null,
        editor_notes         jsonb not null default '[]'::jsonb,
        status               text not null,
        refusal_reason       text,
        disposition          text,
        story_submitted_at   text not null,
        draft_ready_at       text
      );
      create index if not exists newsletter_drafts_tenant_idx
        on newsletter_drafts (tenant_id);

      -- agentfolio users.
      create table if not exists af_users (
        id         text primary key,
        tenant_id  text not null,
        role       text not null,
        name       text not null,
        email      text not null
      );
      create index if not exists af_users_tenant_idx on af_users (tenant_id);

      -- agentfolio boards.
      create table if not exists af_boards (
        id         text primary key,
        tenant_id  text not null,
        agent_id   text not null,
        client_id  text,
        title      text not null,
        created_at text not null
      );
      create index if not exists af_boards_tenant_idx on af_boards (tenant_id);

      -- agentfolio properties.
      create table if not exists af_properties (
        id             text primary key,
        tenant_id      text not null,
        board_id       text not null,
        address        text not null,
        stage          text not null,
        added_by       text not null,
        created_at     text not null,
        agent_private  jsonb,
        public_records jsonb,
        handoff        jsonb
      );
      create index if not exists af_properties_tenant_board_idx
        on af_properties (tenant_id, board_id);

      -- agentfolio tours.
      create table if not exists af_tours (
        id           text primary key,
        tenant_id    text not null,
        property_id  text not null,
        scheduled_at text not null,
        note         text
      );
      create index if not exists af_tours_tenant_prop_idx
        on af_tours (tenant_id, property_id);

      -- agentfolio notes (shared or agent_private).
      create table if not exists af_notes (
        id          text primary key,
        tenant_id   text not null,
        property_id text not null,
        author_id   text not null,
        visibility  text not null,
        body        text not null,
        created_at  text not null
      );
      create index if not exists af_notes_tenant_prop_idx
        on af_notes (tenant_id, property_id);

      -- agentfolio comments (client-visible).
      create table if not exists af_comments (
        id          text primary key,
        tenant_id   text not null,
        property_id text not null,
        author_id   text not null,
        body        text not null,
        created_at  text not null
      );
      create index if not exists af_comments_tenant_prop_idx
        on af_comments (tenant_id, property_id);

      -- Internal cross-robot activity feed (Chief of Staff reads it).
      create table if not exists activity_log (
        id         text primary key,
        seq        bigserial,
        tenant_id  text not null,
        robot      text not null,
        action     text not null,
        contact_id text,
        subject_id text,
        outcome    text,
        detail     text,
        at         text not null
      );
      create index if not exists activity_log_tenant_idx
        on activity_log (tenant_id, at);
    `,
  },
];

/**
 * Apply any unapplied migrations in order, each in its own transaction, and
 * record them in `_migrations`. Idempotent — safe to run on every boot.
 */
export async function migrate(pool: Pool): Promise<string[]> {
  await pool.query(
    `create table if not exists _migrations (
       name text primary key,
       applied_at timestamptz not null default now()
     )`,
  );
  const { rows } = await pool.query<{ name: string }>(
    `select name from _migrations`,
  );
  const applied = new Set(rows.map((r) => r.name));

  const ran: string[] = [];
  for (const m of MIGRATIONS) {
    if (applied.has(m.name)) continue;
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(m.sql);
      await client.query(`insert into _migrations(name) values ($1)`, [m.name]);
      await client.query("commit");
      ran.push(m.name);
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  }
  return ran;
}
