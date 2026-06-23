import { describe, it, expect } from "vitest";
import { resolveAllPersonas } from "@clockwork/config";
import { MockCrmConnector } from "@clockwork/connector-core";
import { InMemoryActivityLog } from "@clockwork/activity-log";
import { runMarketingNewsletter } from "./run.js";
import { StubMarketingDrafter } from "./stub.js";

async function seededConnector(): Promise<MockCrmConnector> {
  const crm = new MockCrmConnector("tenant-joe");
  await crm.createContact({ email: "amy@example.com", name: "Amy", segment: "sphere" });
  await crm.createContact({ email: "ben@example.com", name: "Ben", segment: "sphere" });
  await crm.createContact({ phone: "212-555-0000", name: "NoEmail", segment: "sphere" });
  await crm.createContact({ email: "lead@example.com", segment: "lead" });
  return crm;
}

describe("runMarketingNewsletter", () => {
  it("sends to sphere contacts with an email and logs a summary", async () => {
    const connector = await seededConnector();
    const activityLog = new InMemoryActivityLog();
    const persona = resolveAllPersonas().marketing;

    const result = await runMarketingNewsletter({
      tenantId: "tenant-joe",
      connector,
      persona,
      drafter: new StubMarketingDrafter(),
      activityLog,
      context: "spring update",
      segment: "sphere",
    });

    // sphere has 3 contacts; one has no email
    expect(result.recipientCount).toBe(3);
    expect(result.sentCount).toBe(2);

    const sent = connector.getSentMessages();
    expect(sent).toHaveLength(2);
    expect(sent.every((m) => m.aiDisclosed)).toBe(true);
    expect(sent.every((m) => m.consentBasis === "existing_relationship")).toBe(true);

    const activity = await activityLog.query({ tenantId: "tenant-joe" });
    expect(activity).toHaveLength(1);
    expect(activity[0]?.robot).toBe("Dave");
    expect(activity[0]?.action).toBe("newsletter_sent");
    expect(activity[0]?.outcome).toBe("2");
  });

  it("targets all contacts when no segment is given", async () => {
    const connector = await seededConnector();
    const result = await runMarketingNewsletter({
      tenantId: "tenant-joe",
      connector,
      persona: resolveAllPersonas().marketing,
      drafter: new StubMarketingDrafter(),
      activityLog: new InMemoryActivityLog(),
    });
    expect(result.recipientCount).toBe(4);
    expect(result.sentCount).toBe(3); // three have email
  });
});
