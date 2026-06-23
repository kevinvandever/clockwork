import { describe, it, expect } from "vitest";
import { InMemoryAgentfolioStore } from "./store.js";
import { AgentfolioService, type Actor } from "./service.js";
import type { PublicRecords, RecordsProvider } from "./types.js";

const records: PublicRecords = { owner: "Test Owner", source: "test" };

class OkProvider implements RecordsProvider {
  calls = 0;
  async lookup(): Promise<PublicRecords | null> {
    this.calls += 1;
    return records;
  }
}

class ThrowingProvider implements RecordsProvider {
  async lookup(): Promise<PublicRecords | null> {
    throw new Error("upstream down");
  }
}

async function setup(provider?: RecordsProvider) {
  const store = new InMemoryAgentfolioStore();
  const service = new AgentfolioService(store, { recordsProvider: provider });
  const agentUser = await store.createUser({
    tenantId: "t1",
    role: "agent",
    name: "A",
    email: "a@x.com",
  });
  const agent: Actor = { userId: agentUser.id, tenantId: "t1", role: "agent" };
  const board = await service.createBoard(agent, { title: "B" });
  return { service, agent, boardId: board.id };
}

describe("records auto-pull on add", () => {
  it("populates publicRecords when a provider is configured", async () => {
    const { service, agent, boardId } = await setup(new OkProvider());
    const view = await service.addProperty(agent, boardId, { address: "1 A St" });
    expect(view.publicRecords?.owner).toBe("Test Owner");
  });

  it("still adds the property when the provider throws", async () => {
    const { service, agent, boardId } = await setup(new ThrowingProvider());
    const view = await service.addProperty(agent, boardId, { address: "1 A St" });
    expect(view.address).toBe("1 A St");
    expect(view.publicRecords).toBeUndefined();
  });

  it("leaves records empty when no provider is configured", async () => {
    const { service, agent, boardId } = await setup();
    const view = await service.addProperty(agent, boardId, { address: "1 A St" });
    expect(view.publicRecords).toBeUndefined();
  });
});

describe("refreshRecords", () => {
  it("re-pulls records (agent only)", async () => {
    const provider = new OkProvider();
    const { service, agent, boardId } = await setup(provider);
    const created = await service.addProperty(agent, boardId, { address: "1 A St" });
    const callsAfterAdd = provider.calls;
    const refreshed = await service.refreshRecords(agent, created.id);
    expect(refreshed.publicRecords?.owner).toBe("Test Owner");
    expect(provider.calls).toBe(callsAfterAdd + 1);
  });

  it("forbids a client from refreshing records", async () => {
    const provider = new OkProvider();
    const { service, agent, boardId } = await setup(provider);
    const created = await service.addProperty(agent, boardId, { address: "1 A St" });
    const client: Actor = { userId: "u_client", tenantId: "t1", role: "client" };
    await expect(
      service.refreshRecords(client, created.id),
    ).rejects.toMatchObject({ code: "forbidden" });
  });
});
