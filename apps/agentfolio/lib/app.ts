import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AgentfolioService,
  InMemoryAgentfolioStore,
  type Actor,
} from "@clockwork/agentfolio-core";
import { StubRecordsProvider } from "@clockwork/records";
import { InMemoryActivityLog } from "@clockwork/activity-log";
import { ActivityLogEventSink } from "@clockwork/agentfolio-connect";
import {
  InMemoryTenantStore,
  SecretCipher,
  provisionTenant,
  type TenantStore,
} from "@clockwork/tenants";

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
  store: InMemoryAgentfolioStore;
  service: AgentfolioService;
  activityLog: InMemoryActivityLog;
  tenantStore: TenantStore;
  agentId: string;
  clientId: string;
  boardId: string;
}

/**
 * Build the in-memory stores + service and seed demo data once. In-memory only —
 * resets on restart, which is fine for the prototype (docs/DECISIONS.md D6).
 *
 * Multi-tenant: the tenant registry is provisioned here (admin-provisioned model,
 * not self-serve). The demo tenant is seeded with the marketing skill template;
 * the Anthropic API key is intentionally NOT seeded — the agent supplies their
 * own via settings (BYO).
 */
export async function createApp(): Promise<AppContext> {
  const store = new InMemoryAgentfolioStore();
  const activityLog = new InMemoryActivityLog();
  const service = new AgentfolioService(store, {
    recordsProvider: new StubRecordsProvider(),
    // Connected: board actions feed the shared activity log (Chief of Staff).
    eventSink: new ActivityLogEventSink(activityLog),
  });

  // --- Tenant registry (encrypted secrets + versioned skills + persona names) ---
  const tenantStore = new InMemoryTenantStore(
    new SecretCipher(getEncryptionSecret()),
  );
  await provisionTenant(tenantStore, {
    tenantId: DEMO_TENANT,
    displayName: "Demo Practice",
    skills: {
      // Seed Joe's marketing skill from the template; BYO key stays unset.
      marketing: loadSkillTemplate("newsletter-draft.md"),
      clientCare: loadSkillTemplate("sal-method.md"),
    },
  });

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

  return {
    store,
    service,
    activityLog,
    tenantStore,
    agentId: joe.id,
    clientId: cal.id,
    boardId: board.id,
  };
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
