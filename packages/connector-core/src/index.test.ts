import { describe, it, expect } from "vitest";
import { CONNECTOR_CORE_PLACEHOLDER, type CrmConnector } from "./index.js";

describe("connector-core package", () => {
  it("is wired into the workspace (implementation arrives in Task 3)", () => {
    expect(CONNECTOR_CORE_PLACEHOLDER).toBe(true);
  });

  it("exposes a CrmConnector contract a mock can satisfy", async () => {
    const mock: CrmConnector = {
      createContact: async (c) => ({ id: "c1", ...c }),
      findContact: async () => null,
      sendMessage: async () => undefined,
      fetchNewLeads: async () => [],
      logActivity: async () => undefined,
    };
    const contact = await mock.createContact({ email: "a@b.com" });
    expect(contact.id).toBe("c1");
    expect(await mock.fetchNewLeads()).toEqual([]);
  });
});
