import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AgentfolioService,
  InMemoryAgentfolioStore,
  type AgentfolioStore,
  type Actor,
} from "@clockwork/agentfolio-core";
import { StubRecordsProvider } from "@clockwork/records";
import { InMemoryActivityLog, type ActivityLog } from "@clockwork/activity-log";
import { ActivityLogEventSink } from "@clockwork/agentfolio-connect";
import {
  InMemoryTenantStore,
  SecretCipher,
  provisionTenant,
  type TenantStore,
} from "@clockwork/tenants";
import {
  hasDatabase,
  getPool,
  migrate,
  PostgresTenantStore,
  PostgresAgentfolioStore,
  PostgresActivityLog,
} from "@clockwork/db";

export const DEMO_TENANT = "tenant-demo";

/**
 * Master secret for encrypting tenant API keys at rest. Required in production
 * (env KEY_ENCRYPTION_SECRET). Dev-only fallback keeps local `pnpm dev` working
 * without configuration — never rely on it in a deployed environment.
 */
function getEncryptionSecret(): string {
  return (
    process.env.KEY_ENCRYPTION_SECRET ??
    "dev-only-encryption-secret-do-not-use-in-prod"
  );
}

/** Best-effort read of a skill template from the repo `skills/` dir. */
function loadSkillTemplate(file: string): string | undefined {
  const candidates = [
    resolve(process.cwd(), "../../skills", file),
    resolve(process.cwd(), "skills", file),
  ];
  for (const path of candidates) {
    try {
      return readFileSync(path, "utf-8");
    } catch {
      // try next
    }
  }
  return undefined;
}

export interface AppContext {
  store: AgentfolioStore;
  service: AgentfolioService;
  activityLog: ActivityLog;
  tenantStore: TenantStore;
  /** True when backed by Postgres (DATABASE_URL set); false = in-memory. */
  usingDatabase: boolean;
  agentId: string;
  clientId: string;
  boardId: string;
}

interface SeedIds {
  agentId: string;
  clientId: string;
  boardId: string;
}

/**
 * Build the stores + service and seed the demo data once.
 *
 * Backend selection: Postgres when DATABASE_URL is set (durable, survives
 * restarts — the Railway path), otherwise in-memory (local dev + tests). The
 * demo seed is idempotent so it survives Postgres restarts without duplicating.
 * The demo tenant's Anthropic key is never seeded — BYO via Settings.
 */
export async function createApp(): Promise<AppContext> {
  const usingDatabase = hasDatabase();
  const cipher = new SecretCipher(getEncryptionSecret());

  let store: AgentfolioStore;
  let activityLog: ActivityLog;
  let tenantStore: TenantStore;

  if (usingDatabase) {
    const pool = getPool();
    await migrate(pool);
    store = new PostgresAgentfolioStore(pool);
    activityLog = new PostgresActivityLog(pool);
    tenantStore = new PostgresTenantStore(pool, cipher);
  } else {
    store = new InMemoryAgentfolioStore();
    activityLog = new InMemoryActivityLog();
    tenantStore = new InMemoryTenantStore(cipher);
  }

  const service = new AgentfolioService(store, {
    recordsProvider: new StubRecordsProvider(),
    // Connected: board actions feed the shared activity log (Chief of Staff).
    eventSink: new ActivityLogEventSink(activityLog),
  });

  // Provision the demo tenant (skills seeded; API key stays unset — BYO).
  if (!(await tenantStore.getTenant(DEMO_TENANT))) {
    await provisionTenant(tenantStore, {
      tenantId: DEMO_TENANT,
      displayName: "Demo Practice",
      skills: {
        marketing: loadSkillTemplate("newsletter-draft.md"),
        clientCare: loadSkillTemplate("sal-method.md"),
      },
    });
  }

  // Reuse an existing seed (Postgres, across restarts) or create it fresh.
  const existing = usingDatabase ? await findExistingSeed() : null;
  const ids = existing ?? (await runDemoSeed(service, store));

  return {
    store,
    service,
    activityLog,
    tenantStore,
    usingDatabase,
    ...ids,
  };
}

/**
 * Look for an already-seeded demo agent + client + board (Postgres path). Returns
 * null if the seed is absent or incomplete, in which case it gets created.
 */
async function findExistingSeed(): Promise<SeedIds | null> {
  const pool = getPool();
  const { rows: users } = await pool.query<{ id: string; role: string }>(
    `select id, role from af_users where tenant_id = $1`,
    [DEMO_TENANT],
  );
  const agent = users.find((u) => u.role === "agent");
  const client = users.find((u) => u.role === "client");
  if (!agent || !client) return null;

  const { rows: boards } = await pool.query<{ id: string }>(
    `select id from af_boards where tenant_id = $1 order by created_at limit 1`,
    [DEMO_TENANT],
  );
  if (boards.length === 0) return null;

  return { agentId: agent.id, clientId: client.id, boardId: boards[0].id };
}

/** Seed the demo agent, client, board, and sample properties. */
async function runDemoSeed(
  service: AgentfolioService,
  store: AgentfolioStore,
): Promise<SeedIds> {
  const joe = await store.createUser({
    tenantId: DEMO_TENANT,
    role: "agent",
    name: "Joe",
    email: "joe@demo.com",
  });
  const cal = await store.createUser({
    tenantId: DEMO_TENANT,
    role: "client",
    name: "Cal Client",
    email: "cal@demo.com",
  });

  const agent: Actor = {
    userId: joe.id,
    tenantId: DEMO_TENANT,
    role: "agent",
  };
  const board = await service.createBoard(agent, {
    title: "Cal's Home Search",
    clientId: cal.id,
  });

  const p1 = await service.addProperty(agent, board.id, {
    address: "12 Maple St",
    agentPrivate: {
      strategy: "Seller relocating — room to negotiate",
      sellerMotivation: "relocation",
    },
  });
  await service.moveStage(agent, p1.id, "touring");
  await service.addNote(agent, p1.id, {
    body: "Great light, kitchen needs updating.",
    visibility: "shared",
  });
  await service.addNote(agent, p1.id, {
    body: "Seller is motivated — open ~8% under ask.",
    visibility: "agent_private",
  });

  const p2 = await service.addProperty(agent, board.id, {
    address: "88 Birch Ln",
  });
  await service.addComment(agent, p2.id, {
    body: "What did you think of the backyard?",
  });

  return { agentId: joe.id, clientId: cal.id, boardId: board.id };
}

const globalForApp = globalThis as unknown as {
  __agentfolioApp?: Promise<AppContext>;
};

/** Process-wide singleton (cached promise so the seed runs once). */
export function getApp(): Promise<AppContext> {
  if (!globalForApp.__agentfolioApp) {
    globalForApp.__agentfolioApp = createApp();
  }
  return globalForApp.__agentfolioApp;
}

/** Convenience accessor for the tenant registry. */
export async function getTenantStore(): Promise<TenantStore> {
  return (await getApp()).tenantStore;
}
