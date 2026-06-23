import { describe, it, expect } from "vitest";
import { StubRecordsProvider } from "./stub.js";

describe("StubRecordsProvider", () => {
  it("returns deterministic records for an address", async () => {
    const provider = new StubRecordsProvider();
    const a = await provider.lookup("12 Maple St");
    const b = await provider.lookup("12 Maple St");
    expect(a).not.toBeNull();
    expect(a).toEqual(b ? { ...b, pulledAt: a?.pulledAt } : b);
    expect(a?.owner).toContain("record owner");
    expect(typeof a?.assessedValue).toBe("number");
    expect(a?.source).toBe("stub");
  });

  it("returns null for a blank address", async () => {
    expect(await new StubRecordsProvider().lookup("   ")).toBeNull();
  });

  it("differs by address", async () => {
    const provider = new StubRecordsProvider();
    const a = await provider.lookup("12 Maple St");
    const b = await provider.lookup("88 Birch Ln");
    expect(a?.assessedValue).not.toBe(b?.assessedValue);
  });
});
