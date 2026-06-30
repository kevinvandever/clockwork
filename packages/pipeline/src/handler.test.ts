import { describe, it, expect } from "vitest";
import { resolveAllPersonas } from "@clockwork/config";
import { MockCrmConnector } from "@clockwork/connector-core";
import { InMemoryActivityLog } from "@clockwork/activity-log";
import { createPipelineHandler, type TenantContext } from "./handler.js";
import { StubResponder } from "./respond/stub.js";
import type { ReceivedLead } from "./types.js";

function setup() {
  const connector = new MockCrmConnector("tenant-a");
  const activityLog = new InMemoryActivityLog();
  const ctx: TenantContext = {
    connector,
    pipelinePersona: resolveAllPersonas().pipeline,
  };
  const handler = createPipelineHandler({
    activityLog,
    responder: new StubResponder(),
    resolveTenant: (t) => (t === "tenant-a" ? ctx : undefined),
  });
  return { connector, activityLog, handler };
}

function received(): ReceivedLead {
  return {
    tenantId: "tenant-a",
    dedupKey: "tenant-a:m1",
    lead: {
      source: "email",
      email: "jane@example.com",
      name: "Jane",
      message: "tour please",
      receivedAt: "2026-01-01T00:00:00.000Z",
    },
  };
}

describe("createPipelineHandler", () => {
  it("creates a contact, sends an AI-disclosed reply, and logs activity", async () => {
    const { connector, activityLog, handler } = setup();
    await handler(received());

    expect(connector.getContacts()).toHaveLength(1);
    const sent = connector.getSentMessages();
    expect(sent).toHaveLength(1);
    expect(sent[0]?.aiDisclosed).toBe(true);
    expect(sent[0]?.body).toContain("Josh 2");

    const activity = await activityLog.query({ tenantId: "tenant-a" });
    expect(activity).toHaveLength(1);
    expect(activity[0]?.action).toBe("instant_response_sent");
  });

  it("skips sending when the lead has no email or phone", async () => {
    const { connector, activityLog, handler } = setup();
    const r = received();
    r.lead = { ...r.lead, email: undefined, phone: undefined };
    await handler(r);

    expect(connector.getSentMessages()).toHaveLength(0);
    const activity = await activityLog.query({ tenantId: "tenant-a" });
    expect(activity[0]?.action).toBe("instant_response_skipped");
  });

  it("throws when no tenant context is registered", async () => {
    const { handler } = setup();
    const r = received();
    r.tenantId = "tenant-unknown";
    await expect(handler(r)).rejects.toThrow(/no_tenant_context/);
  });
});
