import { describe, it, expect } from "vitest";
import { resolveClientConfig } from "./config.js";

describe("client config", () => {
  it("resolves personas with roster defaults", () => {
    const resolved = resolveClientConfig({
      tenantId: "t1",
      displayName: "Acme Realty",
    });
    expect(resolved.tenantId).toBe("t1");
    expect(resolved.displayName).toBe("Acme Realty");
    expect(resolved.personas.clientCare.name).toBe("Stephanie");
  });

  it("applies per-tenant persona overrides", () => {
    const resolved = resolveClientConfig({
      tenantId: "t2",
      displayName: "Beta Group",
      personaOverrides: { chiefOfStaff: "Morgan" },
    });
    expect(resolved.personas.chiefOfStaff.name).toBe("Morgan");
    expect(resolved.personas.pipeline.name).toBe("Josh 2");
  });
});
