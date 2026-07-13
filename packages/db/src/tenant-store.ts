import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type { PersonaOverrides, RobotKey } from "@clockwork/config";
import {
  SecretCipher,
  TenantError,
  type CreateTenantInput,
  type SkillVersion,
  type TenantRecord,
  type TenantStore,
} from "@clockwork/tenants";

interface TenantRow {
  tenant_id: string;
  display_name: string;
  persona_overrides: PersonaOverrides;
  encrypted_api_key: string | null;
  created_at: string;
  updated_at: string;
}

interface SkillRow {
  robot: string;
  version: number;
  text: string;
  updated_at: string;
}

/**
 * Postgres-backed tenant registry. Same contract as InMemoryTenantStore: the
 * API key is AES-256-GCM encrypted with the tenantId bound as AAD, skills are
 * versioned, and tenantId is the primary key so cross-tenant reads aren't
 * expressible.
 */
export class PostgresTenantStore implements TenantStore {
  constructor(
    private readonly pool: Pool,
    private readonly cipher: SecretCipher,
  ) {}

  private async loadSkills(
    tenantId: string,
  ): Promise<Partial<Record<RobotKey, SkillVersion[]>>> {
    const { rows } = await this.pool.query<SkillRow>(
      `select robot, version, text, updated_at
         from tenant_skills where tenant_id = $1
        order by robot, version`,
      [tenantId],
    );
    const skills: Partial<Record<RobotKey, SkillVersion[]>> = {};
    for (const r of rows) {
      const key = r.robot as RobotKey;
      (skills[key] ??= []).push({
        version: r.version,
        text: r.text,
        updatedAt: r.updated_at,
      });
    }
    return skills;
  }

  private async toRecord(row: TenantRow): Promise<TenantRecord> {
    return {
      tenantId: row.tenant_id,
      displayName: row.display_name,
      personaOverrides: row.persona_overrides ?? {},
      encryptedApiKey: row.encrypted_api_key ?? undefined,
      skills: await this.loadSkills(row.tenant_id),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private async requireRow(tenantId: string): Promise<TenantRow> {
    const { rows } = await this.pool.query<TenantRow>(
      `select * from tenants where tenant_id = $1`,
      [tenantId],
    );
    if (rows.length === 0) {
      throw new TenantError("not_found", `tenant not found: ${tenantId}`);
    }
    return rows[0];
  }

  async createTenant(input: CreateTenantInput): Promise<TenantRecord> {
    if (!input.displayName || input.displayName.trim() === "") {
      throw new TenantError("invalid_input", "displayName is required");
    }
    const tenantId = input.tenantId ?? `tenant_${randomUUID()}`;
    const now = new Date().toISOString();
    try {
      await this.pool.query(
        `insert into tenants
           (tenant_id, display_name, persona_overrides, created_at, updated_at)
         values ($1, $2, $3::jsonb, $4, $5)`,
        [
          tenantId,
          input.displayName.trim(),
          JSON.stringify(input.personaOverrides ?? {}),
          now,
          now,
        ],
      );
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code?: string }).code === "23505"
      ) {
        throw new TenantError(
          "already_exists",
          `tenant already exists: ${tenantId}`,
        );
      }
      throw err;
    }
    return this.toRecord(await this.requireRow(tenantId));
  }

  async getTenant(tenantId: string): Promise<TenantRecord | undefined> {
    const { rows } = await this.pool.query<TenantRow>(
      `select * from tenants where tenant_id = $1`,
      [tenantId],
    );
    if (rows.length === 0) return undefined;
    return this.toRecord(rows[0]);
  }

  async listTenants(): Promise<TenantRecord[]> {
    const { rows } = await this.pool.query<TenantRow>(
      `select * from tenants order by created_at`,
    );
    return Promise.all(rows.map((r) => this.toRecord(r)));
  }

  async setApiKey(tenantId: string, plaintextKey: string): Promise<void> {
    await this.requireRow(tenantId);
    if (!plaintextKey || plaintextKey.trim() === "") {
      throw new TenantError("invalid_input", "API key must not be empty");
    }
    // Bind tenantId as AAD so a ciphertext can't be replayed across tenants.
    const enc = this.cipher.encrypt(plaintextKey.trim(), tenantId);
    await this.pool.query(
      `update tenants set encrypted_api_key = $2, updated_at = $3 where tenant_id = $1`,
      [tenantId, enc, new Date().toISOString()],
    );
  }

  async getApiKey(tenantId: string): Promise<string | undefined> {
    const row = await this.requireRow(tenantId);
    if (!row.encrypted_api_key) return undefined;
    return this.cipher.decrypt(row.encrypted_api_key, tenantId);
  }

  async hasApiKey(tenantId: string): Promise<boolean> {
    const row = await this.requireRow(tenantId);
    return Boolean(row.encrypted_api_key);
  }

  async clearApiKey(tenantId: string): Promise<void> {
    await this.requireRow(tenantId);
    await this.pool.query(
      `update tenants set encrypted_api_key = null, updated_at = $2 where tenant_id = $1`,
      [tenantId, new Date().toISOString()],
    );
  }

  async setPersonaOverrides(
    tenantId: string,
    overrides: PersonaOverrides,
  ): Promise<TenantRecord> {
    await this.requireRow(tenantId);
    await this.pool.query(
      `update tenants set persona_overrides = $2::jsonb, updated_at = $3 where tenant_id = $1`,
      [tenantId, JSON.stringify(overrides ?? {}), new Date().toISOString()],
    );
    return this.toRecord(await this.requireRow(tenantId));
  }

  async setSkill(
    tenantId: string,
    robot: RobotKey,
    text: string,
  ): Promise<SkillVersion> {
    await this.requireRow(tenantId);
    const now = new Date().toISOString();
    // Next version = current max + 1, computed atomically in one statement.
    const { rows } = await this.pool.query<SkillRow>(
      `insert into tenant_skills (tenant_id, robot, version, text, updated_at)
       values (
         $1, $2,
         coalesce((select max(version) from tenant_skills where tenant_id = $1 and robot = $2), 0) + 1,
         $3, $4
       )
       returning robot, version, text, updated_at`,
      [tenantId, robot, text, now],
    );
    const r = rows[0];
    await this.pool.query(
      `update tenants set updated_at = $2 where tenant_id = $1`,
      [tenantId, now],
    );
    return { version: r.version, text: r.text, updatedAt: r.updated_at };
  }

  async getSkill(
    tenantId: string,
    robot: RobotKey,
  ): Promise<SkillVersion | undefined> {
    const { rows } = await this.pool.query<SkillRow>(
      `select robot, version, text, updated_at
         from tenant_skills where tenant_id = $1 and robot = $2
        order by version desc limit 1`,
      [tenantId, robot],
    );
    if (rows.length === 0) return undefined;
    const r = rows[0];
    return { version: r.version, text: r.text, updatedAt: r.updated_at };
  }

  async getSkillHistory(
    tenantId: string,
    robot: RobotKey,
  ): Promise<SkillVersion[]> {
    const { rows } = await this.pool.query<SkillRow>(
      `select robot, version, text, updated_at
         from tenant_skills where tenant_id = $1 and robot = $2
        order by version`,
      [tenantId, robot],
    );
    return rows.map((r) => ({
      version: r.version,
      text: r.text,
      updatedAt: r.updated_at,
    }));
  }
}
