import type { PersonaOverrides, RobotKey } from "@clockwork/config";

/**
 * One version of a per-robot skill (Joe's / the client's skill text). Versions
 * are retained so an agent can roll back and so the future self-improving-skills
 * loop (docs/DECISIONS.md D22) has history to work from.
 */
export interface SkillVersion {
  /** 1-based, monotonically increasing per robot. */
  version: number;
  text: string;
  updatedAt: string;
}

/**
 * A tenant (a real-estate agent's install). Holds everything that is
 * per-tenant: the encrypted Anthropic API key, versioned skill text per robot,
 * and persona name overrides. `tenantId` is the primary key, so cross-tenant
 * reads are not expressible (you fetch exactly one tenant by id).
 */
export interface TenantRecord {
  tenantId: string;
  displayName: string;
  personaOverrides: PersonaOverrides;
  /**
   * The Anthropic API key, AES-256-GCM encrypted at rest. Undefined until the
   * agent sets it in settings. Never returned to the browser.
   */
  encryptedApiKey?: string;
  /** Per-robot skill text, versioned. Latest version is the last element. */
  skills: Partial<Record<RobotKey, SkillVersion[]>>;
  createdAt: string;
  updatedAt: string;
}

export type TenantErrorCode = "invalid_input" | "not_found" | "already_exists";

/** Local typed error (kept package-local per docs/DECISIONS.md D7). */
export class TenantError extends Error {
  readonly code: TenantErrorCode;

  constructor(code: TenantErrorCode, message: string) {
    super(message);
    this.name = "TenantError";
    this.code = code;
  }
}

export interface CreateTenantInput {
  /** Optional explicit id; generated when omitted. */
  tenantId?: string;
  displayName: string;
  personaOverrides?: PersonaOverrides;
}

/**
 * The tenant registry. Admin-provisioned (Clockwork is agent-installed, not
 * self-serve). Secret handling lives behind this seam: `setApiKey` encrypts and
 * `getApiKey` decrypts, so callers never touch ciphertext or the master secret.
 *
 * In-memory now; a Postgres-backed implementation replaces this behind the same
 * interface once Railway is provisioned (docs/DECISIONS.md D6).
 */
export interface TenantStore {
  createTenant(input: CreateTenantInput): Promise<TenantRecord>;
  getTenant(tenantId: string): Promise<TenantRecord | undefined>;
  /** Admin/provisioning use only — not called from tenant-scoped request paths. */
  listTenants(): Promise<TenantRecord[]>;

  /** Encrypt and store the tenant's Anthropic API key. */
  setApiKey(tenantId: string, plaintextKey: string): Promise<void>;
  /** Decrypt and return the tenant's API key (server-side only). */
  getApiKey(tenantId: string): Promise<string | undefined>;
  /** Whether a key is set — safe for the browser (no secret material). */
  hasApiKey(tenantId: string): Promise<boolean>;

  setPersonaOverrides(
    tenantId: string,
    overrides: PersonaOverrides,
  ): Promise<TenantRecord>;

  /** Append a new skill version; returns the created version. */
  setSkill(
    tenantId: string,
    robot: RobotKey,
    text: string,
  ): Promise<SkillVersion>;
  /** Latest skill version for a robot, if any. */
  getSkill(
    tenantId: string,
    robot: RobotKey,
  ): Promise<SkillVersion | undefined>;
  /** Full version history (oldest → newest). */
  getSkillHistory(tenantId: string, robot: RobotKey): Promise<SkillVersion[]>;
}
