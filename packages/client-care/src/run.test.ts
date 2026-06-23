import { describe, it, expect } from "vitest";
import { resolveAllPersonas } from "@clockwork/config";
import {
  MockCrmConnector,
  type Contact,
  type CrmConnector,
} from "@clockwork/connector-core";
import { InMemoryActivityLog } from "@clockwork/activity-log";
import { runClientCare } from "./run.js";
import { StubClientCareDrafter } from "./stub.js";
import { homeValueReportStatus } from "./report.js";

const today = new Date("2026-06-23T00:00:00.000Z");
const persona = resolveAllPersonas().clientCare;

async function seeded(): Promise<MockCrmConnector> {
  const crm = new MockCrmConnector("tenant-joe");
  await crm.createContact({
    email: "amy@example.com",
    name: "Amy",
    segment: "sphere",
    importantDates: [{ label: "birthday", month: 6, day: 23 }],
  });
  await crm.createContact({
    email: "ben@example.com",
    name: "Ben",
    segment: "sphere",
    lastContactedAt: "2026-01-01T00:00:00.000Z",
  });
  await crm.createContact({
    email: "cara@example.com",
    name: "Cara",
    segment: "sphere",
    lastContactedAt: "2026-06-20T00:00:00.000Z",
  });
  return crm;
}

describe("runClientCare", () => {
  it("sends a touch per due contact and logs each", async () => {
    const connector = await seeded();
    const activityLog = new InMemoryActivityLog();

    const result = await runClientCare({
      tenantId: "tenant-joe",
      connector,
      persona,
      drafter: new StubClientCareDrafter(),
      activityLog,
      segment: "sphere",
      today,
    });

    // Amy (birthday) + Ben (rotation) due; Cara recently contacted.
    expect(result.dueCount).toBe(2);
    expect(result.sentCount).toBe(2);

    const sent = connector.getSentMessages();
    expect(sent).toHaveLength(2);
    expect(sent.every((m) => m.aiDisclosed)).toBe(true);

    const activity = await activityLog.query({ tenantId: "tenant-joe" });
    expect(activity.filter((a) => a.action === "care_touch_sent")).toHaveLength(2);
    expect(activity.some((a) => a.outcome === "birthday")).toBe(true);
    expect(activity.every((a) => a.robot === "Stephanie")).toBe(true);
  });

  it("skips (and logs) a due contact that has no channel", async () => {
    const activityLog = new InMemoryActivityLog();
    const ghost: Contact = {
      id: "ghost",
      tenantId: "tenant-joe",
      name: "Ghost",
      segment: "sphere",
      // no email, no phone, no lastContactedAt -> due for rotation, unreachable
    };
    let sends = 0;
    const connector: CrmConnector = {
      tenantId: "tenant-joe",
      createContact: async () => ghost,
      findContact: async () => null,
      listContacts: async () => [ghost],
      sendMessage: async () => {
        sends += 1;
        return { id: "m", status: "sent" };
      },
      fetchNewLeads: async () => [],
      logActivity: async () => undefined,
    };

    const result = await runClientCare({
      tenantId: "tenant-joe",
      connector,
      persona,
      drafter: new StubClientCareDrafter(),
      activityLog,
      today,
    });

    expect(result.dueCount).toBe(1);
    expect(result.sentCount).toBe(0);
    expect(sends).toBe(0);
    const activity = await activityLog.query({ tenantId: "tenant-joe" });
    expect(activity[0]?.action).toBe("care_touch_skipped");
    expect(activity[0]?.outcome).toBe("no_channel");
  });
});

describe("homeValueReportStatus", () => {
  it("is explicitly unavailable (records-gated)", () => {
    const status = homeValueReportStatus();
    expect(status.available).toBe(false);
    expect(status.reason).toMatch(/records access/i);
  });
});
