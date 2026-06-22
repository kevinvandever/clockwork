import { describe, it, expect } from "vitest";
import {
  deriveSource,
  extractEmail,
  extractName,
  extractPhone,
  parseLeadEmail,
} from "./parse.js";

describe("field extraction", () => {
  it("extracts an email from a from-header or free text", () => {
    expect(extractEmail("Jane Buyer <jane@example.com>")).toBe("jane@example.com");
    expect(extractEmail(undefined, "reach me at BOB@Foo.com please")).toBe(
      "bob@foo.com",
    );
    expect(extractEmail("no address here")).toBeUndefined();
  });

  it("extracts a phone number from text", () => {
    expect(extractPhone("call (212) 555-1234 today")).toBe("(212) 555-1234");
    expect(extractPhone("+1 415.555.9999")).toBe("+1 415.555.9999");
    expect(extractPhone("no digits")).toBeUndefined();
  });

  it("pulls a display name but not a bare address", () => {
    expect(extractName('"Jane Buyer" <jane@example.com>')).toBe("Jane Buyer");
    expect(extractName("jane@example.com")).toBeUndefined();
  });

  it("derives a source from the sender domain", () => {
    expect(deriveSource("lead@reply.zillow.com")).toBe("zillow");
    expect(deriveSource("x@realtor.com")).toBe("realtor");
    expect(deriveSource("someone@gmail.com")).toBe("email");
    expect(deriveSource(undefined)).toBe("email");
  });
});

describe("parseLeadEmail", () => {
  it("parses a structured lead email", () => {
    const lead = parseLeadEmail({
      from: "Jane Buyer <jane@example.com>",
      subject: "Interested in 123 Main St",
      text: "Hi, I'd like a tour. Call me at 212-555-1234.",
      receivedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(lead).toMatchObject({
      source: "email",
      email: "jane@example.com",
      phone: "212-555-1234",
      name: "Jane Buyer",
      receivedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(lead.message).toContain("tour");
  });

  it("falls back to the subject for the message and defaults receivedAt", () => {
    const lead = parseLeadEmail({
      from: "buyer@homes.com",
      subject: "New lead",
    });
    expect(lead.source).toBe("homes");
    expect(lead.message).toBe("New lead");
    expect(lead.receivedAt).toBeTruthy();
  });
});
