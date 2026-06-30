import { describe, it, expect, vi } from "vitest";
import { RechatConnector } from "./rechat.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function connector(fetchImpl: typeof fetch): RechatConnector {
  return new RechatConnector({
    tenantId: "tenant-joe",
    accessToken: "tok-abc",
    fetchImpl,
  });
}

describe("RechatConnector", () => {
  it("requires tenantId and accessToken", () => {
    expect(
      () => new RechatConnector({ tenantId: "", accessToken: "x" }),
    ).toThrow();
    expect(
      () => new RechatConnector({ tenantId: "t", accessToken: "" }),
    ).toThrow();
  });

  it("creates a contact, sending the bearer token, and tags the tenant", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ data: { id: "rc_1" } }),
    ) as unknown as typeof fetch;
    const crm = connector(fetchImpl);
    const contact = await crm.createContact({ email: "a@b.com", name: "A" });

    expect(contact.id).toBe("rc_1");
    expect(contact.tenantId).toBe("tenant-joe");
    const init = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).authorization).toBe(
      "Bearer tok-abc",
    );
  });

  it("rejects a contact with neither email nor phone", async () => {
    const crm = connector(vi.fn() as unknown as typeof fetch);
    await expect(crm.createContact({ name: "x" })).rejects.toMatchObject({
      code: "invalid_input",
    });
  });

  it("returns null when findContact has no hit", async () => {
    const crm = connector(
      vi.fn(async () => jsonResponse({ data: [] })) as unknown as typeof fetch,
    );
    expect(await crm.findContact({ email: "none@x.com" })).toBeNull();
  });

  it("blocks an undisclosed send (compliance gate)", async () => {
    const crm = connector(vi.fn() as unknown as typeof fetch);
    await expect(
      crm.sendMessage({ to: "a@b.com", body: "hi", aiDisclosed: false }),
    ).rejects.toMatchObject({ code: "send_blocked" });
  });

  it("flags outbound send as unverified even when disclosed", async () => {
    const crm = connector(vi.fn() as unknown as typeof fetch);
    await expect(
      crm.sendMessage({ to: "a@b.com", body: "hi", aiDisclosed: true }),
    ).rejects.toMatchObject({ code: "adapter_error" });
  });

  it("treats leads as webhook-first (fetchNewLeads is empty)", async () => {
    const crm = connector(vi.fn() as unknown as typeof fetch);
    expect(await crm.fetchNewLeads()).toEqual([]);
  });

  it("logActivity is best-effort and never throws", async () => {
    const crm = connector(
      vi.fn(async () => {
        throw new Error("network");
      }) as unknown as typeof fetch,
    );
    await expect(
      crm.logActivity({ robot: "Josh 2", action: "x", contactId: "rc_1", at: "t" }),
    ).resolves.toBeUndefined();
  });
});
