import { describe, it, expect } from "vitest";
import { resolveAllPersonas } from "@clockwork/config";
import { MockCrmConnector } from "@clockwork/connector-core";
import { InMemoryActivityLog } from "@clockwork/activity-log";
import type { WatcherConfig } from "./config.js";
import { createPipelineHandler, type TenantContext } from "./handler.js";
import { LeadIntake } from "./leads/intake.js";
import { StubResponder } from "./respond/stub.js";

/**
 * End-to-end speed-to-lead loop: an authenticated inbound email flows through
 * intake → parse → dedup → the Pipeline handler → drafted reply "sent" via the
 * mock CRM and recorded in the activity log.
 */
describe("speed-to-lead end-to-end", () => {
  function build() {
    const config: WatcherConfig = {
      port: 0,
      intakeTokens: { "demo-secret": "tenant-joe" },
    };
    const connector = new MockCrmConnector("tenant-joe");
    const activityLog = new InMemoryActivityLog();
    const ctx: TenantContext = {
      connector,
      pipelinePersona: resolveAllPersonas().pipeline,
    };
    const handler = createPipelineHandler({
      activityLog,
      responder: new StubResponder(),
      resolveTenant: (t) => (t === "tenant-joe" ? ctx : undefined),
    });
    const intake = new LeadIntake(config, handler);
    return { intake, connector, activityLog };
  }

  it("turns an inbound lead email into a sent, logged instant response", async () => {
    const { intake, connector, activityLog } = build();

    const result = await intake.process("demo-secret", {
      from: "Jane Buyer <jane@example.com>",
      subject: "Interested in 123 Main St",
      text: "Please call me at 212-555-1234",
      messageId: "m1",
    });
    expect(result.status).toBe("accepted");

    const sent = connector.getSentMessages();
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe("jane@example.com");
    expect(sent[0]?.aiDisclosed).toBe(true);
    expect(sent[0]?.body).toContain("Josh 2");

    const activity = await activityLog.query({ tenantId: "tenant-joe" });
    expect(activity).toHaveLength(1);
    expect(activity[0]?.action).toBe("instant_response_sent");
  });

  it("does not respond twice to a duplicate delivery", async () => {
    const { intake, connector } = build();
    const payload = { from: "jane@example.com", messageId: "m1" };
    expect((await intake.process("demo-secret", payload)).status).toBe("accepted");
    expect((await intake.process("demo-secret", payload)).status).toBe("duplicate");
    expect(connector.getSentMessages()).toHaveLength(1);
  });
});
