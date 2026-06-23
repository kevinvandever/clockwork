import { resolveAllPersonas } from "@clockwork/config";
import { InMemoryActivityLog } from "@clockwork/activity-log";
import { runChiefOfStaff } from "./run.js";
import { StubBriefWriter } from "./stub.js";

/** Seed a day of multi-robot activity, then run Linda's brief (local demo). */
async function main(): Promise<void> {
  const tenantId = "tenant-joe";
  const now = new Date("2026-06-23T17:00:00.000Z");
  const log = new InMemoryActivityLog();

  const earlier = (h: number): string =>
    new Date(now.getTime() - h * 3_600_000).toISOString();

  await log.append({ tenantId, robot: "Josh 2", action: "instant_response_sent", outcome: "sent", at: earlier(6) });
  await log.append({ tenantId, robot: "Josh 2", action: "instant_response_sent", outcome: "sent", at: earlier(5) });
  await log.append({ tenantId, robot: "Dave", action: "newsletter_sent", outcome: "42", at: earlier(4) });
  await log.append({ tenantId, robot: "Stephanie", action: "care_touch_sent", outcome: "birthday", at: earlier(2) });
  await log.append({ tenantId, robot: "Stephanie", action: "care_touch_sent", outcome: "rotation", at: earlier(1) });

  const persona = resolveAllPersonas().chiefOfStaff;
  const { oversight, brief } = await runChiefOfStaff({
    tenantId,
    activityLog: log,
    persona,
    writer: new StubBriefWriter(),
    now,
  });

  console.log("=== Oversight dashboard ===");
  console.log(`window: ${oversight.window.since} → ${oversight.window.until}`);
  console.log(`total events: ${oversight.totalEvents}`);
  for (const [robot, rollup] of Object.entries(oversight.byRobot)) {
    console.log(`  ${robot}: ${rollup.total} (${JSON.stringify(rollup.byAction)})`);
  }
  console.log("");
  console.log("=== Brief ===");
  console.log(brief.headline);
  console.log(brief.body);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
