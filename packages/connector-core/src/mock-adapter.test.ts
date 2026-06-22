import { describe, it, expect } from "vitest";
import { MockCrmConnector } from "./mock-adapter.js";
import { runCrmConnectorContract } from "./contract.js";

// The mock must satisfy the shared connector contract.
runCrmConnectorContract(
  "MockCrmConnector",
  (tenantId) => new MockCrmConnector(tenantId),
);

describe("MockCrmConnector helpers", () => {
  it("seeds leads that fetchNewLeads drains", async () => {
    const crm = new MockCrmConnector("t1");
    crm.seedLeads({
      source: "email",
      email: "a@b.com",
      receivedAt: new Date().toISOString(),
    });
    expect(await crm.fetchNewLeads()).toHaveLength(1);
    expect(await crm.fetchNewLeads()).toHaveLength(0);
  });

  it("records sent messages for inspection", async () => {
    const crm = new MockCrmConnector("t1");
    await crm.sendMessage({ to: "a@b.com", body: "hi", aiDisclosed: true });
    const sent = crm.getSentMessages();
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe("a@b.com");
    expect(sent[0]?.tenantId).toBe("t1");
  });

  it("records activity events", async () => {
    const crm = new MockCrmConnector("t1");
    await crm.logActivity({
      robot: "marketing",
      action: "newsletter_sent",
      at: new Date().toISOString(),
    });
    expect(crm.getActivity()).toHaveLength(1);
  });

  it("requires a tenantId", () => {
    expect(() => new MockCrmConnector("")).toThrow();
  });
});
