import { describe, it, expect } from "vitest";
import type { Contact } from "@clockwork/connector-core";
import {
  computeDueTouches,
  daysUntilNextOccurrence,
  needsRotation,
  upcomingDate,
} from "./due.js";

const today = new Date("2026-06-20T00:00:00.000Z");

function contact(overrides: Partial<Contact> = {}): Contact {
  return { id: "c1", tenantId: "t1", email: "x@y.com", ...overrides };
}

describe("daysUntilNextOccurrence", () => {
  it("is 0 for today and rolls to next year when past", () => {
    expect(daysUntilNextOccurrence(6, 20, today)).toBe(0);
    expect(daysUntilNextOccurrence(6, 23, today)).toBe(3);
    expect(daysUntilNextOccurrence(6, 19, today)).toBe(364); // already passed
  });
});

describe("needsRotation", () => {
  it("is true with no last-contacted date", () => {
    expect(needsRotation(contact(), today, 90)).toBe(true);
  });
  it("respects the rotation window", () => {
    expect(
      needsRotation(contact({ lastContactedAt: "2026-06-01T00:00:00Z" }), today, 90),
    ).toBe(false);
    expect(
      needsRotation(contact({ lastContactedAt: "2026-01-01T00:00:00Z" }), today, 90),
    ).toBe(true);
  });
});

describe("upcomingDate", () => {
  it("returns a label only within the lookahead window", () => {
    const c = contact({ importantDates: [{ label: "birthday", month: 6, day: 23 }] });
    expect(upcomingDate(c, today, 7)).toBe("birthday");
    expect(upcomingDate(c, today, 2)).toBeNull();
  });
});

describe("computeDueTouches", () => {
  it("prioritizes a key date over rotation and skips contacts with neither", () => {
    const contacts: Contact[] = [
      contact({
        id: "birthday-soon",
        lastContactedAt: "2026-06-19T00:00:00Z", // not due for rotation
        importantDates: [{ label: "birthday", month: 6, day: 23 }],
      }),
      contact({ id: "stale", lastContactedAt: "2026-01-01T00:00:00Z" }),
      contact({ id: "fresh", lastContactedAt: "2026-06-18T00:00:00Z" }),
    ];
    const touches = computeDueTouches(contacts, {
      today,
      rotationDays: 90,
      lookaheadDays: 7,
    });
    expect(touches).toHaveLength(2);
    expect(touches.find((t) => t.contact.id === "birthday-soon")?.reason).toBe(
      "birthday",
    );
    expect(touches.find((t) => t.contact.id === "stale")?.reason).toBe("rotation");
    expect(touches.find((t) => t.contact.id === "fresh")).toBeUndefined();
  });
});
