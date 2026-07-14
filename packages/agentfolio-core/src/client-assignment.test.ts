import { describe, it, expect } from "vitest";
import { InMemoryAgentfolioStore } from "./store.js";
import { AgentfolioService, type Actor } from "./service.js";

async function setup() {
  const store = new InMemoryAgentfolioStore();
  const service = new AgentfolioService(store);
  const agentUser = await store.createUser({
    tenantId: "t1",
    role: "agent",
    name: "Joe",
    email: "joe@demo.com",
  });
  const agent: Actor = { userId: agentUser.id, tenantId: "t1", role: "agent" };
  return { store, service, agent };
}

describe("client assignment", () => {
  it("creates a client and ties a board to them", async () => {
    const { service, agent } = await setup();
    const client = await service.createClient(agent, {
      name: "Cal",
      email: "cal@demo.com",
    });
    expect(client.role).toBe("client");
    expect(client.tenantId).toBe("t1");

    const board = await service.createBoard(agent, {
      title: "Cal's Search",
      clientId: client.id,
    });
    expect(board.clientId).toBe(client.id);

    // The client can see the board they're assigned to.
    const clientActor: Actor = {
      userId: client.id,
      tenantId: "t1",
      role: "client",
    };
    const seen = await service.listMyBoards(clientActor);
    expect(seen.map((b) => b.id)).toContain(board.id);
  });

  it("dedupes clients by email within the tenant (case-insensitive)", async () => {
    const { service, agent } = await setup();
    const a = await service.createClient(agent, {
      name: "Cal",
      email: "cal@demo.com",
    });
    const b = await service.createClient(agent, {
      name: "Cal Again",
      email: "CAL@demo.com",
    });
    expect(b.id).toBe(a.id);
    expect(await service.listClients(agent)).toHaveLength(1);
  });

  it("rejects blank name/email", async () => {
    const { service, agent } = await setup();
    await expect(
      service.createClient(agent, { name: "  ", email: "x@y.com" }),
    ).rejects.toThrow(/required/);
  });

  it("is agent-only", async () => {
    const { service } = await setup();
    const clientActor: Actor = {
      userId: "u_client",
      tenantId: "t1",
      role: "client",
    };
    await expect(
      service.createClient(clientActor, { name: "X", email: "x@y.com" }),
    ).rejects.toThrow(/agent role required/);
    await expect(service.listClients(clientActor)).rejects.toThrow(
      /agent role required/,
    );
  });

  it("keeps clients isolated across tenants", async () => {
    const { store, service, agent } = await setup();
    await service.createClient(agent, { name: "Cal", email: "cal@demo.com" });

    const otherAgentUser = await store.createUser({
      tenantId: "t2",
      role: "agent",
      name: "Ann",
      email: "ann@other.com",
    });
    const otherAgent: Actor = {
      userId: otherAgentUser.id,
      tenantId: "t2",
      role: "agent",
    };
    expect(await service.listClients(otherAgent)).toHaveLength(0);
  });
});
