import { describe, it, expect } from "vitest";
import { InMemoryActivityLog } from "@clockwork/activity-log";
import { buildOversight } from "./oversight.js";

async function seed(): Promise<InMemoryActivityLog> {
  const log = new InMemoryActivityLog();
  await log.append({ tenantId: "t1", robot: "Josh 2", action: "instant_response_sent", at: "2026-06-23T09:00:00.000Z" });
  await log.append({ tenantId: "t1", robot: "Josh 2", action: "instant_response_sent", at: "2026-06-23T10:00:00.000Z" });
  await log.append({ tenantId: "t1", robot: "Dave", action: "newsletter_sent", at: "2026-06-23T11:00:00.000Z" });
  await log.append({ tenantId: "t2", robot: "Dave", action: "newsletter_sent", at: "2026-06-23T11:00:00.000Z" });
  return log;
}

const window = { since: "2026-06-23T00:00:00.000Z", until: "2026-06-23T23:59:59.000Z" };

describe("buildOversight", () => {
  it("rolls up per robot and per action for the tenant", async () => {
    const log = await seed();
    const o = await buildOversight(log, { tenantId: "t1", ...window });
    expect(o.totalEvents).toBe(3);
    expect(o.byRobot["Josh 2"].total).toBe(2);
    expect(o.byRobot["Josh 2"].byAction.instant_response_sent).toBe(2);
    expect(o.byRobot.Dave.total).toBe(1);
    expect(o.byRobot.t2).toBeUndefined();
  });

  it("isolates tenants", async () => {
    const log = await seed();
    const o = await buildOversight(log, { tenantId: "t2", ...window });
    expect(o.totalEvents).toBe(1);
    expect(Object.keys(o.byRobot)).toEqual(["Dave"]);
  });

  it("returns recent events newest-first, limited", async () => {
    const log = await seed();
    const o = await buildOversight(log, { tenantId: "t1", ...window, recentLimit: 2 });
    expect(o.recent).toHaveLength(2);
    expect(o.recent[0].at >= o.recent[1].at).toBe(true);
  });

  it("handles an empty window", async () => {
    const log = await seed();
    const o = await buildOversight(log, {
      tenantId: "t1",
      since: "2020-01-01T00:00:00.000Z",
      until: "2020-01-02T00:00:00.000Z",
    });
    expect(o.totalEvents).toBe(0);
    expect(o.byRobot).toEqual({});
  });
});
