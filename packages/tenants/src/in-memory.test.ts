import { describe, it, expect, beforeEach } from "vitest";
import { SecretCipher } from "./crypto.js";
import { InMemoryTenantStore } from "./in-memory.js";
import { TenantError } from "./types.js";

function makeStore(): InMemoryTenantStore {
  return new InMemoryTenantStore(new SecretCipher("master-secret-for-tests"));
}

describe("InMemoryTenantStore — create/get", () => {
  let store: InMemoryTenantStore;
  beforeEach(() => {
    store = makeStore();
  });

  it("creates a tenant with a generated id and defaults", async () => {
    const t = await store.createTenant({ displayName: "Joe's Practice" });
    expect(t.tenantId).toMatch(/^tenant_/);
    expect(t.displayName).toBe("Joe's Practice");
    expect(t.personaOverrides).toEqual({});
    expect(t.skills).toEqual({});
    expect(t.encryptedApiKey).toBeUndefined();
  });

  it("honors an explicit tenantId", async () => {
    const t = await store.createTenant({
      tenantId: "tenant-joe",
      displayName: "Joe",
    });
    expect(t.tenantId).toBe("tenant-joe");
  });

  it("rejects a blank displayName", async () => {
    await expect(store.createTenant({ displayName: "  " })).rejects.toThrow(
      TenantError,
    );
  });

  it("rejects a duplicate tenantId", async () => {
    await store.createTenant({ tenantId: "dup", displayName: "One" });
    await expect(
      store.createTenant({ tenantId: "dup", displayName: "Two" }),
    ).rejects.toThrow(/already exists/);
  });

  it("getTenant returns undefined for unknown id", async () => {
    expect(await store.getTenant("nope")).toBeUndefined();
  });

  it("returns copies, not internal references (no external mutation)", async () => {
    const t = await store.createTenant({ tenantId: "t1", displayName: "T1" });
    t.displayName = "hacked";
    const fresh = await store.getTenant("t1");
    expect(fresh!.displayName).toBe("T1");
  });
});

describe("InMemoryTenantStore — API key (encrypted at rest)", () => {
  let store: InMemoryTenantStore;
  beforeEach(async () => {
    store = makeStore();
    await store.createTenant({ tenantId: "t1", displayName: "T1" });
  });

  it("stores the key encrypted and returns it decrypted", async () => {
    await store.setApiKey("t1", "sk-ant-secret");
    const rec = await store.getTenant("t1");
    expect(rec!.encryptedApiKey).toBeDefined();
    expect(rec!.encryptedApiKey).not.toContain("sk-ant-secret");
    expect(await store.getApiKey("t1")).toBe("sk-ant-secret");
  });

  it("hasApiKey reflects whether a key is set", async () => {
    expect(await store.hasApiKey("t1")).toBe(false);
    await store.setApiKey("t1", "sk-ant-secret");
    expect(await store.hasApiKey("t1")).toBe(true);
  });

  it("getApiKey returns undefined when unset", async () => {
    expect(await store.getApiKey("t1")).toBeUndefined();
  });

  it("clearApiKey removes a set key (and is a no-op when none)", async () => {
    await store.clearApiKey("t1"); // no-op, no throw
    await store.setApiKey("t1", "sk-ant-secret");
    expect(await store.hasApiKey("t1")).toBe(true);
    await store.clearApiKey("t1");
    expect(await store.hasApiKey("t1")).toBe(false);
    expect(await store.getApiKey("t1")).toBeUndefined();
  });

  it("trims and rejects an empty key", async () => {
    await expect(store.setApiKey("t1", "   ")).rejects.toThrow(TenantError);
    await store.setApiKey("t1", "  sk-trimmed  ");
    expect(await store.getApiKey("t1")).toBe("sk-trimmed");
  });

  it("throws not_found for unknown tenant", async () => {
    await expect(store.setApiKey("ghost", "k")).rejects.toThrow(/not found/);
  });
});

describe("InMemoryTenantStore — persona overrides", () => {
  it("sets and returns persona overrides", async () => {
    const store = makeStore();
    await store.createTenant({ tenantId: "t1", displayName: "T1" });
    const updated = await store.setPersonaOverrides("t1", {
      marketing: "Marcus",
      chiefOfStaff: "Lily",
    });
    expect(updated.personaOverrides.marketing).toBe("Marcus");
    expect(updated.personaOverrides.chiefOfStaff).toBe("Lily");
  });
});

describe("InMemoryTenantStore — versioned skills", () => {
  let store: InMemoryTenantStore;
  beforeEach(async () => {
    store = makeStore();
    await store.createTenant({ tenantId: "t1", displayName: "T1" });
  });

  it("returns undefined when no skill is set", async () => {
    expect(await store.getSkill("t1", "marketing")).toBeUndefined();
    expect(await store.getSkillHistory("t1", "marketing")).toEqual([]);
  });

  it("appends versions and returns the latest", async () => {
    const v1 = await store.setSkill("t1", "marketing", "first version");
    expect(v1.version).toBe(1);
    const v2 = await store.setSkill("t1", "marketing", "second version");
    expect(v2.version).toBe(2);

    const latest = await store.getSkill("t1", "marketing");
    expect(latest!.version).toBe(2);
    expect(latest!.text).toBe("second version");

    const history = await store.getSkillHistory("t1", "marketing");
    expect(history.map((h) => h.version)).toEqual([1, 2]);
    expect(history[0].text).toBe("first version");
  });

  it("keeps skills separate per robot", async () => {
    await store.setSkill("t1", "marketing", "marketing skill");
    await store.setSkill("t1", "clientCare", "care skill");
    expect((await store.getSkill("t1", "marketing"))!.text).toBe(
      "marketing skill",
    );
    expect((await store.getSkill("t1", "clientCare"))!.text).toBe(
      "care skill",
    );
  });
});

describe("InMemoryTenantStore — tenant isolation", () => {
  it("keeps keys and skills scoped to their tenant", async () => {
    const store = makeStore();
    await store.createTenant({ tenantId: "a", displayName: "A" });
    await store.createTenant({ tenantId: "b", displayName: "B" });

    await store.setApiKey("a", "sk-a");
    await store.setSkill("a", "marketing", "a-skill");

    // Tenant B sees none of A's data
    expect(await store.getApiKey("b")).toBeUndefined();
    expect(await store.hasApiKey("b")).toBe(false);
    expect(await store.getSkill("b", "marketing")).toBeUndefined();

    // And A is intact
    expect(await store.getApiKey("a")).toBe("sk-a");
    expect((await store.getSkill("a", "marketing"))!.text).toBe("a-skill");
  });
});
