import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import pg from "pg";
import type { Pool } from "pg";
import { SecretCipher } from "@clockwork/tenants";
import { migrate } from "./migrate.js";
import { PostgresTenantStore } from "./tenant-store.js";
import { PostgresNewsletterDraftStore } from "./newsletter-store.js";
import { PostgresAgentfolioStore } from "./agentfolio-store.js";
import { PostgresActivityLog } from "./activity-log.js";

const TEST_URL = process.env.TEST_DATABASE_URL;
const run = TEST_URL ? describe : describe.skip;

const { Pool } = pg;

run("Postgres stores (integration)", () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: TEST_URL });
    await migrate(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query(
      `truncate tenants, tenant_skills, newsletter_drafts, af_users,
        af_boards, af_properties, af_tours, af_notes, af_comments, activity_log
        restart identity cascade`,
    );
  });

  describe("PostgresTenantStore", () => {
    const cipher = new SecretCipher("test-master-secret");
    const store = () => new PostgresTenantStore(pool, cipher);

    it("creates a tenant and round-trips an encrypted API key (AAD)", async () => {
      const s = store();
      await s.createTenant({ tenantId: "t1", displayName: "T1" });
      expect(await s.hasApiKey("t1")).toBe(false);

      await s.setApiKey("t1", "sk-ant-secret");
      expect(await s.hasApiKey("t1")).toBe(true);
      expect(await s.getApiKey("t1")).toBe("sk-ant-secret");

      // Stored ciphertext must not contain the plaintext.
      const { rows } = await pool.query(
        `select encrypted_api_key from tenants where tenant_id = 't1'`,
      );
      expect(rows[0].encrypted_api_key).not.toContain("sk-ant-secret");
    });

    it("rejects duplicate tenantId with already_exists", async () => {
      const s = store();
      await s.createTenant({ tenantId: "dup", displayName: "One" });
      await expect(
        s.createTenant({ tenantId: "dup", displayName: "Two" }),
      ).rejects.toThrow(/already exists/);
    });

    it("versions skills and returns latest + history", async () => {
      const s = store();
      await s.createTenant({ tenantId: "t1", displayName: "T1" });
      const v1 = await s.setSkill("t1", "marketing", "first");
      const v2 = await s.setSkill("t1", "marketing", "second");
      expect(v1.version).toBe(1);
      expect(v2.version).toBe(2);
      expect((await s.getSkill("t1", "marketing"))!.text).toBe("second");
      expect((await s.getSkillHistory("t1", "marketing")).map((h) => h.version)).toEqual([
        1, 2,
      ]);
    });

    it("persists persona overrides", async () => {
      const s = store();
      await s.createTenant({ tenantId: "t1", displayName: "T1" });
      const updated = await s.setPersonaOverrides("t1", { marketing: "Marcus" });
      expect(updated.personaOverrides.marketing).toBe("Marcus");
      expect((await s.getTenant("t1"))!.personaOverrides.marketing).toBe("Marcus");
    });

    it("isolates api keys + skills across tenants", async () => {
      const s = store();
      await s.createTenant({ tenantId: "a", displayName: "A" });
      await s.createTenant({ tenantId: "b", displayName: "B" });
      await s.setApiKey("a", "sk-a");
      await s.setSkill("a", "marketing", "a-skill");
      expect(await s.getApiKey("b")).toBeUndefined();
      expect(await s.getSkill("b", "marketing")).toBeUndefined();
      expect(await s.getApiKey("a")).toBe("sk-a");
    });
  });

  describe("PostgresNewsletterDraftStore", () => {
    const store = () => new PostgresNewsletterDraftStore(pool);
    const sample = () => ({
      input: { kind: "text" as const, value: "story" },
      headline: "H",
      body: "body words here",
      wordCount: 3,
      editorNotes: ["check it"],
      status: "ready" as const,
      storySubmittedAt: "2026-01-15T10:00:00.000Z",
      draftReadyAt: "2026-01-15T10:00:05.000Z",
    });

    it("create/get round-trips all fields", async () => {
      const s = store();
      const rec = await s.create("t1", sample());
      expect(rec.id).toBeTruthy();
      const got = await s.get("t1", rec.id);
      expect(got).toEqual(rec);
      expect(got!.editorNotes).toEqual(["check it"]);
      expect(got!.input).toEqual({ kind: "text", value: "story" });
    });

    it("list + tenant isolation + disposition update", async () => {
      const s = store();
      const a = await s.create("t1", sample());
      await s.create("t2", sample());
      expect(await s.list("t1")).toHaveLength(1);
      expect(await s.get("t2", a.id)).toBeUndefined();

      const updated = await s.updateDisposition("t1", a.id, "published-as-is");
      expect(updated!.disposition).toBe("published-as-is");
      // timestamps preserved
      expect(updated!.storySubmittedAt).toBe("2026-01-15T10:00:00.000Z");
      expect(await s.updateDisposition("t2", a.id, "edited")).toBeUndefined();
    });
  });

  describe("PostgresAgentfolioStore", () => {
    const store = () => new PostgresAgentfolioStore(pool);

    it("seeds users/boards/properties and hides nothing at the store layer", async () => {
      const s = store();
      const joe = await s.createUser({
        tenantId: "t1",
        role: "agent",
        name: "Joe",
        email: "joe@x.com",
      });
      const board = await s.createBoard({
        tenantId: "t1",
        agentId: joe.id,
        title: "Search",
      });
      const p = await s.addProperty({
        tenantId: "t1",
        boardId: board.id,
        address: "12 Maple",
        addedBy: joe.id,
        agentPrivate: { strategy: "motivated", sellerMotivation: "relocation" },
      });
      expect(p.stage).toBe("new");
      expect(p.agentPrivate?.strategy).toBe("motivated");

      const moved = await s.updatePropertyStage("t1", p.id, "touring");
      expect(moved.stage).toBe("touring");

      const boards = await s.listBoardsForUser("t1", joe.id);
      expect(boards).toHaveLength(1);
      const props = await s.listProperties("t1", board.id);
      expect(props).toHaveLength(1);
    });

    it("throws not_found updating a missing property", async () => {
      const s = store();
      await expect(
        s.updatePropertyStage("t1", "nope", "offer"),
      ).rejects.toThrow(/not found/);
    });

    it("isolates properties across tenants", async () => {
      const s = store();
      const u = await s.createUser({
        tenantId: "a",
        role: "agent",
        name: "A",
        email: "a@x.com",
      });
      const b = await s.createBoard({ tenantId: "a", agentId: u.id, title: "B" });
      const p = await s.addProperty({
        tenantId: "a",
        boardId: b.id,
        address: "1 St",
        addedBy: u.id,
      });
      expect(await s.getProperty("other", p.id)).toBeNull();
    });
  });

  describe("PostgresActivityLog", () => {
    const log = () => new PostgresActivityLog(pool);

    it("appends and queries chronologically with a stable tiebreak", async () => {
      const l = log();
      // Same timestamp — insertion order must be preserved via seq.
      await l.append({ tenantId: "t1", robot: "Dave", action: "a", at: "2026-01-01T00:00:00.000Z" });
      await l.append({ tenantId: "t1", robot: "Dave", action: "b", at: "2026-01-01T00:00:00.000Z" });
      const asc = await l.query({ tenantId: "t1" });
      expect(asc.map((r) => r.action)).toEqual(["a", "b"]);
      const desc = await l.query({ tenantId: "t1", newestFirst: true });
      expect(desc.map((r) => r.action)).toEqual(["b", "a"]);
    });

    it("requires tenantId and honors filters + isolation", async () => {
      const l = log();
      await l.append({ tenantId: "t1", robot: "Dave", action: "x" });
      await l.append({ tenantId: "t2", robot: "Dave", action: "y" });
      expect(await l.query({ tenantId: "t1" })).toHaveLength(1);
      await expect(
        l.query({ tenantId: "" }),
      ).rejects.toThrow(/tenantId is required/);
      await expect(
        l.append({ tenantId: "", robot: "r", action: "a" }),
      ).rejects.toThrow(/tenantId is required/);
    });
  });
});
