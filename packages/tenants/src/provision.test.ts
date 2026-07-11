import { describe, it, expect } from "vitest";
import { SecretCipher } from "./crypto.js";
import { InMemoryTenantStore } from "./in-memory.js";
import { provisionTenant } from "./provision.js";

function makeStore(): InMemoryTenantStore {
  return new InMemoryTenantStore(new SecretCipher("master-secret-for-tests"));
}

describe("provisionTenant", () => {
  it("creates a tenant and seeds api key + skills", async () => {
    const store = makeStore();
    const tenant = await provisionTenant(store, {
      tenantId: "tenant-joe",
      displayName: "Joe's Practice",
      personaOverrides: { marketing: "Dave" },
      apiKey: "sk-ant-joe",
      skills: {
        marketing: "newsletter skill text",
        clientCare: "sal method text",
      },
    });

    expect(tenant.tenantId).toBe("tenant-joe");
    expect(tenant.displayName).toBe("Joe's Practice");
    expect(tenant.personaOverrides.marketing).toBe("Dave");

    // API key seeded (encrypted at rest, decrypts back)
    expect(await store.hasApiKey("tenant-joe")).toBe(true);
    expect(await store.getApiKey("tenant-joe")).toBe("sk-ant-joe");

    // Skills seeded as version 1
    const mk = await store.getSkill("tenant-joe", "marketing");
    expect(mk!.version).toBe(1);
    expect(mk!.text).toBe("newsletter skill text");
    expect((await store.getSkill("tenant-joe", "clientCare"))!.text).toBe(
      "sal method text",
    );
  });

  it("works without optional api key / skills", async () => {
    const store = makeStore();
    const tenant = await provisionTenant(store, {
      tenantId: "t-min",
      displayName: "Minimal",
    });
    expect(tenant.tenantId).toBe("t-min");
    expect(await store.hasApiKey("t-min")).toBe(false);
    expect(await store.getSkill("t-min", "marketing")).toBeUndefined();
  });

  it("skips blank skill text", async () => {
    const store = makeStore();
    await provisionTenant(store, {
      tenantId: "t-blank",
      displayName: "Blank Skills",
      skills: { marketing: "   " },
    });
    expect(await store.getSkill("t-blank", "marketing")).toBeUndefined();
  });
});
