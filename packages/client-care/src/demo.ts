import { resolveAllPersonas } from "@clockwork/config";
import { MockCrmConnector } from "@clockwork/connector-core";
import { InMemoryActivityLog } from "@clockwork/activity-log";
import { runClientCare } from "./run.js";
import { StubClientCareDrafter } from "./stub.js";
import { homeValueReportStatus } from "./report.js";

/** On-demand Client Care run against a seeded mock sphere (local demo). */
async function main(): Promise<void> {
  const tenantId = "tenant-joe";
  const today = new Date("2026-06-23T00:00:00.000Z");
  const connector = new MockCrmConnector(tenantId);

  // Birthday today.
  await connector.createContact({
    email: "amy@example.com",
    name: "Amy",
    segment: "sphere",
    importantDates: [{ label: "birthday", month: 6, day: 23 }],
  });
  // Stale — due for rotation.
  await connector.createContact({
    email: "ben@example.com",
    name: "Ben",
    segment: "sphere",
    lastContactedAt: "2026-01-01T00:00:00.000Z",
  });
  // Recently contacted — no touch.
  await connector.createContact({
    email: "cara@example.com",
    name: "Cara",
    segment: "sphere",
    lastContactedAt: "2026-06-20T00:00:00.000Z",
  });

  const activityLog = new InMemoryActivityLog();
  const persona = resolveAllPersonas().clientCare;

  const result = await runClientCare({
    tenantId,
    connector,
    persona,
    drafter: new StubClientCareDrafter(),
    activityLog,
    segment: "sphere",
    today,
  });

  console.log(
    `[client-care] ${persona.name}: ${result.sentCount} touches sent (${result.dueCount} due)`,
  );
  for (const t of result.touches) {
    console.log(`  - ${t.contactId}: ${t.reason} (sent=${t.sent})`);
  }
  const report = homeValueReportStatus();
  console.log(`home value report available: ${report.available} (${report.reason})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
