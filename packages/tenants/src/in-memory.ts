import { randomUUID } from "node:crypto";
import type { PersonaOverrides, RobotKey } from "@clockwork/config";
import { SecretCipher } from "./crypto.js";
import {
  TenantError,
  type CreateTenantInput,
  type SkillVersion,
  type TenantRecord,
  type TenantStore,
} from "./types.js";

/**
 * In-memory tenant registry. Encrypts API keys via the injected `SecretCipher`
 * so even in memory the key is never held as plaintext at rest. Resets on
 * restart — acceptable for the prototype; swapped for Postgres behind the same
 * interface once Railway is provisioned (docs/DECISIONS.md D6).
 */
export class InMemoryTenantStore implements TenantStore {
  private readonly tenants = new Map<string, TenantRecord>();
  private readonly cipher: SecretCipher;

  constructor(cipher: SecretCipher) {
    this.cipher = cipher;
  }

  private require(tenantId: string): TenantRecord {
    const t = this.tenants.get(tenantId);
    if (!t) {
      throw new TenantError("not_found", `tenant not found: ${tenantId}`);
    }
    return t;
  }

  async createTenant(input: CreateTenantInput): Promise<TenantRecord> {
    if (!input.displayName || input.displayName.trim() === "") {
      throw new TenantError("invalid_input", "displayName is required");
    }
    const tenantId = input.tenantId ?? `tenant_${randomUUID()}`;
    if (this.tenants.has(tenantId)) {
      throw new TenantError(
        "already_exists",
        `tenant already exists: ${tenantId}`,
      );
    }
    const now = new Date().toISOString();
    const record: TenantRecord = {
      tenantId,
      displayName: input.displayName.trim(),
      personaOverrides: input.personaOverrides ?? {},
      skills: {},
      createdAt: now,
      updatedAt: now,
    };
    this.tenants.set(tenantId, record);
    return structuredClone(record);
  }

  async getTenant(tenantId: string): Promise<TenantRecord | undefined> {
    const t = this.tenants.get(tenantId);
    return t ? structuredClone(t) : undefined;
  }

  async listTenants(): Promise<TenantRecord[]> {
    return Array.from(this.tenants.values()).map((t) => structuredClone(t));
  }

  async setApiKey(tenantId: string, plaintextKey: string): Promise<void> {
    const t = this.require(tenantId);
    if (!plaintextKey || plaintextKey.trim() === "") {
      throw new TenantError("invalid_input", "API key must not be empty");
    }
    // Bind the tenantId as AAD so a ciphertext can't be replayed across tenants.
    t.encryptedApiKey = this.cipher.encrypt(plaintextKey.trim(), tenantId);
    t.updatedAt = new Date().toISOString();
  }

  async getApiKey(tenantId: string): Promise<string | undefined> {
    const t = this.require(tenantId);
    if (!t.encryptedApiKey) return undefined;
    return this.cipher.decrypt(t.encryptedApiKey, tenantId);
  }

  async hasApiKey(tenantId: string): Promise<boolean> {
    return Boolean(this.require(tenantId).encryptedApiKey);
  }

  async clearApiKey(tenantId: string): Promise<void> {
    const t = this.require(tenantId);
    t.encryptedApiKey = undefined;
    t.updatedAt = new Date().toISOString();
  }

  async setPersonaOverrides(
    tenantId: string,
    overrides: PersonaOverrides,
  ): Promise<TenantRecord> {
    const t = this.require(tenantId);
    t.personaOverrides = { ...overrides };
    t.updatedAt = new Date().toISOString();
    return structuredClone(t);
  }

  async setSkill(
    tenantId: string,
    robot: RobotKey,
    text: string,
  ): Promise<SkillVersion> {
    const t = this.require(tenantId);
    const history = t.skills[robot] ?? [];
    const version: SkillVersion = {
      version: history.length + 1,
      text,
      updatedAt: new Date().toISOString(),
    };
    t.skills[robot] = [...history, version];
    t.updatedAt = version.updatedAt;
    return structuredClone(version);
  }

  async getSkill(
    tenantId: string,
    robot: RobotKey,
  ): Promise<SkillVersion | undefined> {
    const history = this.require(tenantId).skills[robot];
    if (!history || history.length === 0) return undefined;
    return structuredClone(history[history.length - 1]);
  }

  async getSkillHistory(
    tenantId: string,
    robot: RobotKey,
  ): Promise<SkillVersion[]> {
    return (this.require(tenantId).skills[robot] ?? []).map((v) =>
      structuredClone(v),
    );
  }
}
