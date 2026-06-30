import { describe, it, expect } from "vitest";
import { MockCrmConnector } from "@clockwork/connector-core";
import { RechatConnector } from "@clockwork/crm-rechat";
import { createConnector } from "./connector.js";

describe("createConnector", () => {
  it("returns a mock connector for type 'mock'", () => {
    const c = createConnector("t1", { type: "mock" });
    expect(c).toBeInstanceOf(MockCrmConnector);
    expect(c.tenantId).toBe("t1");
  });

  it("returns a Rechat connector for type 'rechat'", () => {
    const c = createConnector("t1", { type: "rechat", accessToken: "tok" });
    expect(c).toBeInstanceOf(RechatConnector);
    expect(c.tenantId).toBe("t1");
  });
});
