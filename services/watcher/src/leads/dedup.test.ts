import { describe, it, expect } from "vitest";
import { dedupKeyFor, InMemoryDedup } from "./dedup.js";

describe("dedupKeyFor", () => {
  it("uses the provider messageId when present, scoped per tenant", () => {
    const a = dedupKeyFor("t1", { from: "x@y.com", messageId: "abc" });
    const b = dedupKeyFor("t2", { from: "x@y.com", messageId: "abc" });
    expect(a).toBe("t1:abc");
    expect(b).toBe("t2:abc");
    expect(a).not.toBe(b);
  });

  it("hashes from+subject+receivedAt when there is no messageId", () => {
    const email = { from: "x@y.com", subject: "Hi", receivedAt: "2026-01-01" };
    const k1 = dedupKeyFor("t1", email);
    const k2 = dedupKeyFor("t1", email);
    const k3 = dedupKeyFor("t1", { ...email, subject: "Different" });
    expect(k1).toBe(k2);
    expect(k1).not.toBe(k3);
    expect(k1.startsWith("t1:")).toBe(true);
  });
});

describe("InMemoryDedup", () => {
  it("marks a key new once, then reports it seen", () => {
    const dedup = new InMemoryDedup();
    expect(dedup.markIfNew("k")).toBe(true);
    expect(dedup.markIfNew("k")).toBe(false);
    expect(dedup.has("k")).toBe(true);
    expect(dedup.has("other")).toBe(false);
  });
});
