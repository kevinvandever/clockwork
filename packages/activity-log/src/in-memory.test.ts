import { describe, it, expect } from "vitest";
import { InMemoryActivityLog } from "./in-memory.js";

function makeLog(): InMemoryActivityLog {
  return new InMemoryActivityLog();
}

describe("InMemoryActivityLog.append", () => {
  it("returns a record with an id and a timestamp", async () => {
    const log = makeLog();
    const rec = await log.append({
      tenantId: "t1",
      robot: "pipeline",
      action: "responded",
    });
    expect(rec.id).toBeTruthy();
    expect(rec.at).toBeTruthy();
    expect(rec.tenantId).toBe("t1");
  });

  it("defaults `at` to now but honors a provided timestamp", async () => {
    const log = makeLog();
    const rec = await log.append({
      tenantId: "t1",
      robot: "marketing",
      action: "newsletter_sent",
      at: "2026-01-01T00:00:00.000Z",
    });
    expect(rec.at).toBe("2026-01-01T00:00:00.000Z");
  });

  it("requires tenantId, robot, and action", async () => {
    const log = makeLog();
    await expect(
      log.append({ tenantId: "", robot: "x", action: "y" }),
    ).rejects.toMatchObject({ code: "invalid_input" });
    await expect(
      log.append({ tenantId: "t1", robot: "", action: "y" }),
    ).rejects.toMatchObject({ code: "invalid_input" });
  });
});

describe("InMemoryActivityLog.query", () => {
  async function seed(): Promise<InMemoryActivityLog> {
    const log = makeLog();
    await log.append({
      tenantId: "t1",
      robot: "pipeline",
      action: "responded",
      at: "2026-01-01T00:00:00.000Z",
    });
    await log.append({
      tenantId: "t1",
      robot: "marketing",
      action: "newsletter_sent",
      at: "2026-01-02T00:00:00.000Z",
    });
    await log.append({
      tenantId: "t1",
      robot: "pipeline",
      action: "booked",
      at: "2026-01-03T00:00:00.000Z",
    });
    await log.append({
      tenantId: "t2",
      robot: "pipeline",
      action: "responded",
      at: "2026-01-02T00:00:00.000Z",
    });
    return log;
  }

  it("requires a tenantId", async () => {
    const log = await seed();
    await expect(log.query({ tenantId: "" })).rejects.toMatchObject({
      code: "invalid_input",
    });
  });

  it("isolates tenants", async () => {
    const log = await seed();
    const t1 = await log.query({ tenantId: "t1" });
    const t2 = await log.query({ tenantId: "t2" });
    expect(t1).toHaveLength(3);
    expect(t2).toHaveLength(1);
    expect(t1.every((r) => r.tenantId === "t1")).toBe(true);
  });

  it("filters by robot", async () => {
    const log = await seed();
    const res = await log.query({ tenantId: "t1", robot: "pipeline" });
    expect(res).toHaveLength(2);
    expect(res.every((r) => r.robot === "pipeline")).toBe(true);
  });

  it("filters by an inclusive time window", async () => {
    const log = await seed();
    const res = await log.query({
      tenantId: "t1",
      since: "2026-01-02T00:00:00.000Z",
      until: "2026-01-03T00:00:00.000Z",
    });
    expect(res.map((r) => r.action)).toEqual(["newsletter_sent", "booked"]);
  });

  it("returns chronological order by default and newest-first when asked", async () => {
    const log = await seed();
    const chrono = await log.query({ tenantId: "t1" });
    expect(chrono.map((r) => r.action)).toEqual([
      "responded",
      "newsletter_sent",
      "booked",
    ]);
    const newest = await log.query({ tenantId: "t1", newestFirst: true });
    expect(newest.map((r) => r.action)).toEqual([
      "booked",
      "newsletter_sent",
      "responded",
    ]);
  });

  it("applies a limit (and rejects a negative one)", async () => {
    const log = await seed();
    const latestTwo = await log.query({
      tenantId: "t1",
      newestFirst: true,
      limit: 2,
    });
    expect(latestTwo.map((r) => r.action)).toEqual(["booked", "newsletter_sent"]);
    await expect(
      log.query({ tenantId: "t1", limit: -1 }),
    ).rejects.toMatchObject({ code: "invalid_input" });
  });
});
