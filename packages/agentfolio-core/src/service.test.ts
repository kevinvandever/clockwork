import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryAgentfolioStore } from "./store.js";
import { AgentfolioService, type Actor } from "./service.js";

interface Fixture {
  service: AgentfolioService;
  agent: Actor;
  client: Actor;
  stranger: Actor;
  otherTenant: Actor;
  boardId: string;
}

async function fixture(): Promise<Fixture> {
  const store = new InMemoryAgentfolioStore();
  const service = new AgentfolioService(store);

  const agentUser = await store.createUser({
    tenantId: "t1",
    role: "agent",
    name: "Dana Agent",
    email: "dana@x.com",
  });
  const clientUser = await store.createUser({
    tenantId: "t1",
    role: "client",
    name: "Cal Client",
    email: "cal@x.com",
  });

  const agent: Actor = { userId: agentUser.id, tenantId: "t1", role: "agent" };
  const client: Actor = { userId: clientUser.id, tenantId: "t1", role: "client" };
  const stranger: Actor = { userId: "user_999", tenantId: "t1", role: "client" };
  const otherTenant: Actor = { userId: "user_1", tenantId: "t2", role: "agent" };

  const board = await service.createBoard(agent, {
    title: "Cal's search",
    clientId: clientUser.id,
  });

  return { service, agent, client, stranger, otherTenant, boardId: board.id };
}

describe("board access", () => {
  let f: Fixture;
  beforeEach(async () => {
    f = await fixture();
  });

  it("lets a client create a board be rejected (agent only)", async () => {
    await expect(
      f.service.createBoard(f.client, { title: "nope" }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("lets both the agent and client read the board", async () => {
    await expect(f.service.getBoard(f.agent, f.boardId)).resolves.toBeTruthy();
    await expect(f.service.getBoard(f.client, f.boardId)).resolves.toBeTruthy();
  });

  it("blocks a non-member (forbidden) and cross-tenant (not_found)", async () => {
    await expect(
      f.service.getBoard(f.stranger, f.boardId),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      f.service.getBoard(f.otherTenant, f.boardId),
    ).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("properties, stages, and the agent-private view", () => {
  let f: Fixture;
  beforeEach(async () => {
    f = await fixture();
  });

  it("lets a client add a property but not set agent-private info", async () => {
    const view = await f.service.addProperty(f.client, f.boardId, {
      address: "123 Main St",
    });
    expect(view.stage).toBe("new");
    expect(view.agentPrivate).toBeUndefined();

    await expect(
      f.service.addProperty(f.client, f.boardId, {
        address: "9 Sneaky Rd",
        agentPrivate: { strategy: "lowball" },
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("never exposes agent-private data in the client view", async () => {
    await f.service.addProperty(f.agent, f.boardId, {
      address: "5 Oak Ave",
      agentPrivate: { strategy: "seller is motivated", sellerMotivation: "divorce" },
    });

    const agentView = await f.service.listProperties(f.agent, f.boardId);
    expect(agentView[0].agentPrivate?.strategy).toBe("seller is motivated");

    const clientView = await f.service.listProperties(f.client, f.boardId);
    expect(clientView[0].agentPrivate).toBeUndefined();
    expect(JSON.stringify(clientView)).not.toContain("divorce");
  });

  it("lets only the agent move a property's stage", async () => {
    const p = await f.service.addProperty(f.agent, f.boardId, {
      address: "5 Oak Ave",
    });
    const moved = await f.service.moveStage(f.agent, p.id, "touring");
    expect(moved.stage).toBe("touring");

    await expect(
      f.service.moveStage(f.client, p.id, "offer"),
    ).rejects.toMatchObject({ code: "forbidden" });
  });
});

describe("notes and comments", () => {
  let f: Fixture;
  let propertyId: string;
  beforeEach(async () => {
    f = await fixture();
    const p = await f.service.addProperty(f.agent, f.boardId, {
      address: "5 Oak Ave",
    });
    propertyId = p.id;
  });

  it("hides agent-private notes from the client", async () => {
    await f.service.addNote(f.agent, propertyId, {
      body: "shared FYI",
      visibility: "shared",
    });
    await f.service.addNote(f.agent, propertyId, {
      body: "internal: push for a quick close",
      visibility: "agent_private",
    });

    expect(await f.service.listNotes(f.agent, propertyId)).toHaveLength(2);
    const clientNotes = await f.service.listNotes(f.client, propertyId);
    expect(clientNotes).toHaveLength(1);
    expect(clientNotes[0].visibility).toBe("shared");
  });

  it("prevents a client from writing an agent-private note", async () => {
    await expect(
      f.service.addNote(f.client, propertyId, {
        body: "sneaky",
        visibility: "agent_private",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("lets both members comment", async () => {
    await f.service.addComment(f.agent, propertyId, { body: "thoughts?" });
    await f.service.addComment(f.client, propertyId, { body: "love it" });
    expect(await f.service.listComments(f.client, propertyId)).toHaveLength(2);
  });
});
