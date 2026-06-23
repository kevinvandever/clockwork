import { resolveAllPersonas } from "@clockwork/config";
import { MockCrmConnector } from "@clockwork/connector-core";
import { InMemoryActivityLog } from "@clockwork/activity-log";
import { runMarketingNewsletter } from "./run.js";
import { StubMarketingDrafter } from "./stub.js";

/** On-demand Marketing run against a seeded mock sphere (local demo). */
async function main(): Promise<void> {
  const tenantId = "tenant-joe";
  const connector = new MockCrmConnector(tenantId);
  await connector.createContact({ email: "amy@example.com", name: "Amy", segment: "sphere" });
  await connector.createContact({ email: "ben@example.com", name: "Ben", segment: "sphere" });
  await connector.createContact({ phone: "212-555-0000", name: "No Email", segment: "sphere" });
  await connector.createContact({ email: "lead@example.com", name: "Fresh Lead", segment: "lead" });

  const activityLog = new InMemoryActivityLog();
  const persona = resolveAllPersonas().marketing;

  const result = await runMarketingNewsletter({
    tenantId,
    connector,
    persona,
    drafter: new StubMarketingDrafter(),
    activityLog,
    context: "spring market update",
    segment: "sphere",
  });

  console.log(
    `[marketing] ${persona.name} sent to ${result.sentCount}/${result.recipientCount} sphere contacts`,
  );
  console.log(`Subject: ${result.draft.subject}`);
  console.log("---");
  console.log(result.draft.body);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
