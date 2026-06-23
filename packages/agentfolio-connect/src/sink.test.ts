import { describe, it, expect } from "vitest";
import { InMemoryActivityLog } from "@clockwork/activity-log";
import {
  AgentfolioService,
  InMemoryAgentfolioStore,
  type Actor,
} from "@clockwork/agentfolio-core";
import { ActivityLogEventSink } from "./sink.js";

async function connectedService() {
  const activityLog = new InMemoryActivityLog();
  const store = new InMemoryAgentfolioStore();
  const service = new AgentfolioService(store, {
    eventSink: new ActivityLogEventSink(activityLog),
  });
  const agentUser = await store.createUser({
    tenantId: "t1",
    role: "agent",
    name: "A",
    email: "a@x.com",
  });
  const agent: Actor = { userId: agentUser.id, tenantId: "t1", role: "agent" };
  const board = await service.createBoard(agent, { title: "B" });
  return { activityLog, service, agent, boardId: board.id };
}

describe("ActivityLogEventSink", () => {
  it("writes agentfolio actions into the activity log under the agentfolio label", async () => {
    const { activityLog, service, agent, boardId } = await connectedService();

    const prop = await service.addProperty(agent, boardId, { address: "1 A St" });
    await service.moveStage(agent, prop.id, "offer");
    await service.initiateHandoff(agent, prop.id);

    const events = await activityLog.query({ tenantId: "t1" });
    const actions = events.map((e) => e.action);
    expect(actions).toContain("property_added");
    expect(actions).toContain("stage_changed");
    expect(actions).toContain("handoff_initiated");
    expect(events.every((e) => e.robot === "agentfolio")).toBe(true);
    expect(events.every((e) => e.subjectId === prop.id)).toBe(true);
  });
});
