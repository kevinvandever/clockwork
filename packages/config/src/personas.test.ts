import { describe, it, expect } from "vitest";
import {
  DEFAULT_PERSONAS,
  ROBOT_KEYS,
  resolveAllPersonas,
  resolvePersonaName,
} from "./personas.js";

describe("persona registry", () => {
  it("defaults to Joe's roster when there is no override", () => {
    expect(resolvePersonaName("pipeline")).toBe("Josh 2");
    expect(resolvePersonaName("chiefOfStaff")).toBe("Linda");
    expect(resolvePersonaName("transaction")).toBe("Trush");
  });

  it("lets a client override win", () => {
    expect(resolvePersonaName("pipeline", { pipeline: "Alex" })).toBe("Alex");
  });

  it("ignores blank/whitespace overrides and falls back to the default", () => {
    expect(resolvePersonaName("marketing", { marketing: "   " })).toBe("Dave");
    expect(resolvePersonaName("marketing", { marketing: "" })).toBe("Dave");
  });

  it("trims override values", () => {
    expect(resolvePersonaName("buyers", { buyers: "  Bianca  " })).toBe("Bianca");
  });

  it("resolves every robot, applying overrides where present", () => {
    const all = resolveAllPersonas({ buyers: "Bianca" });
    expect(all.buyers.name).toBe("Bianca");
    expect(all.marketing.name).toBe("Dave");
    expect(Object.keys(all)).toHaveLength(ROBOT_KEYS.length);
    expect(all.transaction.role).toBe(DEFAULT_PERSONAS.transaction.role);
  });
});
