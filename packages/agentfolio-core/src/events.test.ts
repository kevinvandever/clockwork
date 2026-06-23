import { describe, it, expect } from "vitest";
import { InMemoryAgentfolioStore } from "./store.js";
import { AgentfolioService, type Actor } from "./service.js";
import type { AgentfolioEvent, AgentfolioEventSink } from "./types.js";

class CapturingSink implements AgentfolioEventSink {
  events: AgentfolioEvent[] = [];
  async record(event: AgentfolioEvent): Promise<void> {
    this.events.push(event);
  }
}

class ThrowingSink implements AgentfolioEventSink {
  async record(): Promise<void> {
    throw new Error("sink down");
  }
}

async function setup(sink?: AgentfolioEventSink) {
  const store = new InMemoryAgentfolioStore();
  const service = new AgentfolioService(store, { eventSink: sink });
  const agentUser = await store.createUser({
    tenantId: "t1",
    role: "agent",
    name: "A",
    email: "a@x.com",
  });
  const agent: Actor = { userId: agentUser.id, tenantId: "t1", role: "agent" };
  const client: Actor = { userId: "c1", tenantId: "t1", role: "client" };
  const board = await service.createBoard(agent, { title: "B", clientId: "c1" });
  return { service, agent, client, boardId: board.id };
}

describe("agentfolio events", () => {
  it("emits property_added, stage_changed, and handoff_initiated", async () => {
    const sink = new CapturingSink();
    const { service, agent, boardId } = await setup(sink);
    const prop = await service.addProperty(agent, boardId, { address: "1 A St" });
    await service.moveStage(agent, prop.id, "offer");
    await service.initiateHandoff(agent, prop.id);

    expect(sink.events.map((e) => e.type)).toEqual([
      "property_added",
      "stage_changed",
      "handoff_initiated",
    ]);
    expect(sink.events.every((e) => e.propertyId === prop.id)).toBe(true);
    expect(sink.events.every((e) => e.tenantId === "t1")).toBe(true);
  });

  it("does not break the action when the sink throws", async () => {
    const { service, agent, boardId } = await setup(new ThrowingSink());
    const prop = await service.addProperty(agent, boardId, { address: "1 A St" });
    expect(prop.address).toBe("1 A St");
  });
});

describe("initiateHandoff", () => {
  it("marks the property and is agent-only", async () => {
    const { service, agent, client, boardId } = await setup();
    const prop = await service.addProperty(agent, boardId, { address: "1 A St" });
    const handed = await service.initiateHandoff(agent, prop.id);
    expect(handed.handoff?.initiatedBy).toBe(agent.userId);

    await expect(
      service.initiateHandoff(client, prop.id),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("exposes handoff in both agent and client views", async () => {
    const { service, agent, client, boardId } = await setup();
    const prop = await service.addProperty(agent, boardId, { address: "1 A St" });
    await service.initiateHandoff(agent, prop.id);

    const clientView = await service.listProperties(client, boardId);
    expect(clientView[0].handoff).toBeTruthy();
  });
});
