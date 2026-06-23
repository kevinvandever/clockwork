import { describe, it, expect } from "vitest";
import type { Actor } from "@clockwork/agentfolio-core";
import { createApp, DEMO_TENANT } from "./app";

describe("createApp seed", () => {
  it("seeds an agent, a client, and a board with properties", async () => {
    const app = await createApp();
    expect(app.agentId).toBeTruthy();
    expect(app.clientId).toBeTruthy();

    const agent: Actor = {
      userId: app.agentId,
      tenantId: DEMO_TENANT,
      role: "agent",
    };
    const props = await app.service.listProperties(agent, app.boardId);
    expect(props.length).toBeGreaterThanOrEqual(2);
  });

  it("hides agent-private data from the seeded client", async () => {
    const app = await createApp();
    const client: Actor = {
      userId: app.clientId,
      tenantId: DEMO_TENANT,
      role: "client",
    };
    const props = await app.service.listProperties(client, app.boardId);
    expect(props.every((p) => p.agentPrivate === undefined)).toBe(true);
    expect(JSON.stringify(props)).not.toContain("relocation");
  });
});
