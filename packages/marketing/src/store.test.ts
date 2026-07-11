import { describe, it, expect } from "vitest";
import { InMemoryNewsletterDraftStore } from "./store.js";
import type { NewsletterDraftRecord } from "./store.js";

function makeStore(): InMemoryNewsletterDraftStore {
  return new InMemoryNewsletterDraftStore();
}

function sampleInput(): Omit<NewsletterDraftRecord, "id" | "tenantId"> {
  return {
    input: { kind: "url", value: "https://example.com/story" },
    headline: "Test Headline",
    body: "This is the body of the newsletter draft.",
    wordCount: 8,
    editorNotes: ["Check the quote attribution."],
    status: "ready",
    storySubmittedAt: "2026-01-15T10:00:00.000Z",
    draftReadyAt: "2026-01-15T10:00:05.000Z",
  };
}

describe("InMemoryNewsletterDraftStore.create", () => {
  it("stores and returns a record with a generated id and correct tenantId", async () => {
    const store = makeStore();
    const rec = await store.create("tenant-a", sampleInput());

    expect(rec.id).toBeTruthy();
    expect(rec.tenantId).toBe("tenant-a");
    expect(rec.headline).toBe("Test Headline");
    expect(rec.body).toBe("This is the body of the newsletter draft.");
    expect(rec.wordCount).toBe(8);
    expect(rec.editorNotes).toEqual(["Check the quote attribution."]);
    expect(rec.status).toBe("ready");
    expect(rec.storySubmittedAt).toBe("2026-01-15T10:00:00.000Z");
    expect(rec.draftReadyAt).toBe("2026-01-15T10:00:05.000Z");
  });

  it("generates unique ids for each record", async () => {
    const store = makeStore();
    const rec1 = await store.create("tenant-a", sampleInput());
    const rec2 = await store.create("tenant-a", sampleInput());
    expect(rec1.id).not.toBe(rec2.id);
  });
});

describe("InMemoryNewsletterDraftStore.get", () => {
  it("retrieves a record by tenantId and id", async () => {
    const store = makeStore();
    const created = await store.create("tenant-a", sampleInput());
    const fetched = await store.get("tenant-a", created.id);

    expect(fetched).toEqual(created);
  });

  it("returns undefined for a non-existent id", async () => {
    const store = makeStore();
    const fetched = await store.get("tenant-a", "no-such-id");
    expect(fetched).toBeUndefined();
  });

  it("returns undefined when querying with the wrong tenantId", async () => {
    const store = makeStore();
    const created = await store.create("tenant-a", sampleInput());
    const fetched = await store.get("tenant-b", created.id);
    expect(fetched).toBeUndefined();
  });
});

describe("InMemoryNewsletterDraftStore.list", () => {
  it("returns all records for a tenantId", async () => {
    const store = makeStore();
    await store.create("tenant-a", sampleInput());
    await store.create("tenant-a", { ...sampleInput(), headline: "Second" });

    const results = await store.list("tenant-a");
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.tenantId === "tenant-a")).toBe(true);
  });

  it("returns an empty array for a tenantId with no records", async () => {
    const store = makeStore();
    await store.create("tenant-a", sampleInput());

    const results = await store.list("tenant-b");
    expect(results).toEqual([]);
  });
});

describe("InMemoryNewsletterDraftStore — tenant isolation", () => {
  it("records created for tenant A are not visible to tenant B", async () => {
    const store = makeStore();
    const recA = await store.create("tenant-a", sampleInput());
    await store.create("tenant-b", { ...sampleInput(), headline: "B's draft" });

    // list isolation
    const listA = await store.list("tenant-a");
    const listB = await store.list("tenant-b");
    expect(listA).toHaveLength(1);
    expect(listB).toHaveLength(1);
    expect(listA[0]!.tenantId).toBe("tenant-a");
    expect(listB[0]!.tenantId).toBe("tenant-b");

    // get isolation
    expect(await store.get("tenant-b", recA.id)).toBeUndefined();
  });
});

describe("InMemoryNewsletterDraftStore.updateDisposition", () => {
  it("updates the disposition and returns the record", async () => {
    const store = makeStore();
    const created = await store.create("tenant-a", sampleInput());

    const updated = await store.updateDisposition(
      "tenant-a",
      created.id,
      "published-as-is",
    );

    expect(updated).toBeDefined();
    expect(updated!.disposition).toBe("published-as-is");
    expect(updated!.id).toBe(created.id);
  });

  it("returns undefined when the tenantId does not match", async () => {
    const store = makeStore();
    const created = await store.create("tenant-a", sampleInput());

    const result = await store.updateDisposition(
      "tenant-b",
      created.id,
      "edited",
    );
    expect(result).toBeUndefined();
  });

  it("returns undefined for a non-existent id", async () => {
    const store = makeStore();
    const result = await store.updateDisposition(
      "tenant-a",
      "no-such-id",
      "discarded",
    );
    expect(result).toBeUndefined();
  });
});
