import { describe, it, expect } from "vitest";
import { createInstall } from "./install.js";

function install() {
  return createInstall({
    tenantId: "tenant-joe",
    displayName: "Joe's Practice",
    crm: { type: "mock" },
  });
}

describe("createInstall (stub mode)", () => {
  it("wires the Pipeline handler to send + log", async () => {
    const app = install();
    expect(app.usingClaude).toBe(false);
    await app.handleLead({
      tenantId: "tenant-joe",
      dedupKey: "k1",
      lead: {
        source: "zillow",
        email: "jane@example.com",
        name: "Jane",
        message: "tour",
        receivedAt: "2026-01-01T00:00:00.000Z",
      },
    });
    const activity = await app.activityLog.query({ tenantId: "tenant-joe" });
    expect(activity.some((a) => a.action === "instant_response_sent")).toBe(true);
  });

  it("runs Marketing against the sphere", async () => {
    const app = install();
    await app.connector.createContact({ email: "a@x.com", segment: "sphere" });
    await app.connector.createContact({ email: "b@x.com", segment: "sphere" });
    const result = await app.runMarketing({ segment: "sphere" });
    expect(result.sentCount).toBe(2);
  });

  it("connects agentfolio into the same activity log", async () => {
    const app = install();
    const agent = await app.agentfolioStore.createUser({
      tenantId: "tenant-joe",
      role: "agent",
      name: "Dana",
      email: "dana@x.com",
    });
    const actor = { userId: agent.id, tenantId: "tenant-joe", role: "agent" as const };
    const board = await app.agentfolio.createBoard(actor, { title: "B" });
    await app.agentfolio.addProperty(actor, board.id, { address: "1 A St" });

    const activity = await app.activityLog.query({ tenantId: "tenant-joe" });
    expect(activity.some((a) => a.robot === "agentfolio")).toBe(true);
  });

  it("Chief of Staff brief sees the day's activity", async () => {
    const app = install();
    await app.handleLead({
      tenantId: "tenant-joe",
      dedupKey: "k1",
      lead: {
        source: "email",
        email: "jane@example.com",
        name: "Jane",
        receivedAt: "2026-01-01T00:00:00.000Z",
      },
    });
    const { oversight, brief } = await app.runChiefOfStaff();
    expect(oversight.totalEvents).toBeGreaterThan(0);
    expect(brief.headline).toContain("Linda");
  });

  it("honors persona overrides", () => {
    const app = createInstall({
      tenantId: "t",
      displayName: "T",
      crm: { type: "mock" },
      personaOverrides: { pipeline: "Alex" },
    });
    expect(app.config.personas.pipeline.name).toBe("Alex");
  });
});
