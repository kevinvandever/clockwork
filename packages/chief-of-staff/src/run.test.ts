import { describe, it, expect } from "vitest";
import { resolveAllPersonas } from "@clockwork/config";
import { InMemoryActivityLog } from "@clockwork/activity-log";
import { runChiefOfStaff } from "./run.js";
import { StubBriefWriter } from "./stub.js";

const persona = resolveAllPersonas().chiefOfStaff; // "Linda"
const now = new Date("2026-06-23T17:00:00.000Z");

async function seededLog(): Promise<InMemoryActivityLog> {
  const log = new InMemoryActivityLog();
  const ago = (h: number): string => new Date(now.getTime() - h * 3_600_000).toISOString();
  await log.append({ tenantId: "tenant-joe", robot: "Josh 2", action: "instant_response_sent", at: ago(5) });
  await log.append({ tenantId: "tenant-joe", robot: "Dave", action: "newsletter_sent", at: ago(3) });
  // Outside the 24h window — should be excluded.
  await log.append({ tenantId: "tenant-joe", robot: "Dave", action: "newsletter_sent", at: ago(48) });
  return log;
}

describe("runChiefOfStaff", () => {
  it("summarizes the window and writes a brief", async () => {
    const log = await seededLog();
    const { oversight, brief } = await runChiefOfStaff({
      tenantId: "tenant-joe",
      activityLog: log,
      persona,
      writer: new StubBriefWriter(),
      now,
    });

    expect(oversight.totalEvents).toBe(2); // the 48h-ago event is excluded
    expect(brief.headline).toContain("Linda");
    expect(brief.body).toContain("Josh 2");
    expect(brief.body).toContain("Dave");
  });

  it("records that the brief ran (without counting itself)", async () => {
    const log = await seededLog();
    await runChiefOfStaff({
      tenantId: "tenant-joe",
      activityLog: log,
      persona,
      writer: new StubBriefWriter(),
      now,
    });
    const all = await log.query({ tenantId: "tenant-joe" });
    const linda = all.filter((e) => e.action === "daily_brief_generated");
    expect(linda).toHaveLength(1);
    expect(linda[0].robot).toBe("Linda");
    expect(linda[0].outcome).toBe("2");
  });
});
