import {
  AgentfolioService,
  InMemoryAgentfolioStore,
  type Actor,
} from "@clockwork/agentfolio-core";
import { StubRecordsProvider } from "@clockwork/records";

export const DEMO_TENANT = "tenant-demo";

export interface AppContext {
  store: InMemoryAgentfolioStore;
  service: AgentfolioService;
  agentId: string;
  clientId: string;
  boardId: string;
}

/**
 * Build the in-memory store + service and seed demo data once. In-memory only —
 * resets on restart, which is fine for the prototype (docs/DECISIONS.md D6).
 */
export async function createApp(): Promise<AppContext> {
  const store = new InMemoryAgentfolioStore();
  const service = new AgentfolioService(store, {
    recordsProvider: new StubRecordsProvider(),
  });

  const dana = await store.createUser({
    tenantId: DEMO_TENANT,
    role: "agent",
    name: "Dana Agent",
    email: "dana@demo.com",
  });
  const cal = await store.createUser({
    tenantId: DEMO_TENANT,
    role: "client",
    name: "Cal Client",
    email: "cal@demo.com",
  });

  const agent: Actor = {
    userId: dana.id,
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
    agentId: dana.id,
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
