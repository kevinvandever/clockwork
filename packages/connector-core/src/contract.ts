import { describe, it, expect } from "vitest";
import type { CrmConnector } from "./types.js";

/**
 * Reusable contract suite. The mock adapter (now) and any real CRM adapter
 * (Task 13) call this with a factory that returns a fresh connector bound to the
 * given tenant, so every adapter is held to identical behavior.
 */
export function runCrmConnectorContract(
  adapterName: string,
  makeConnector: (tenantId: string) => CrmConnector,
): void {
  describe(`CrmConnector contract: ${adapterName}`, () => {
    it("creates and finds a contact within the tenant", async () => {
      const crm = makeConnector("tenant-a");
      const created = await crm.createContact({
        email: "lead@example.com",
        name: "Lead",
      });
      expect(created.id).toBeTruthy();
      expect(created.tenantId).toBe("tenant-a");

      const found = await crm.findContact({ email: "lead@example.com" });
      expect(found?.id).toBe(created.id);
    });

    it("returns null when a contact is not found", async () => {
      const crm = makeConnector("tenant-a");
      expect(await crm.findContact({ email: "nobody@example.com" })).toBeNull();
    });

    it("lists contacts, optionally filtered by segment", async () => {
      const crm = makeConnector("tenant-a");
      await crm.createContact({ email: "a@x.com", segment: "sphere" });
      await crm.createContact({ email: "b@x.com", segment: "sphere" });
      await crm.createContact({ email: "c@x.com", segment: "lead" });
      expect(await crm.listContacts()).toHaveLength(3);
      const sphere = await crm.listContacts({ segment: "sphere" });
      expect(sphere).toHaveLength(2);
      expect(sphere.every((c) => c.segment === "sphere")).toBe(true);
    });

    it("rejects a contact with neither email nor phone", async () => {
      const crm = makeConnector("tenant-a");
      await expect(
        crm.createContact({ name: "No Channel" }),
      ).rejects.toMatchObject({ code: "invalid_input" });
    });

    it("sends a disclosed message and reports a result", async () => {
      const crm = makeConnector("tenant-a");
      const res = await crm.sendMessage({
        to: "lead@example.com",
        body: "Hi there",
        aiDisclosed: true,
      });
      expect(res.id).toBeTruthy();
      expect(res.status).toBe("sent");
    });

    it("blocks sending when AI is not disclosed", async () => {
      const crm = makeConnector("tenant-a");
      await expect(
        crm.sendMessage({ to: "x@example.com", body: "hi", aiDisclosed: false }),
      ).rejects.toMatchObject({ code: "send_blocked" });
    });

    it("fetches new leads as an array", async () => {
      const crm = makeConnector("tenant-a");
      const leads = await crm.fetchNewLeads();
      expect(Array.isArray(leads)).toBe(true);
    });

    it("logs activity without throwing", async () => {
      const crm = makeConnector("tenant-a");
      await expect(
        crm.logActivity({
          robot: "pipeline",
          action: "responded",
          at: new Date().toISOString(),
        }),
      ).resolves.toBeUndefined();
    });

    it("keeps tenants isolated", async () => {
      const a = makeConnector("tenant-a");
      const b = makeConnector("tenant-b");
      const created = await a.createContact({ email: "shared@example.com" });
      expect(created.tenantId).toBe("tenant-a");
      expect(await b.findContact({ email: "shared@example.com" })).toBeNull();
    });
  });
}
