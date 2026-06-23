import { describe, it, expect } from "vitest";
import { viewProperty, visibleNotes } from "./views.js";
import type { Note, Property } from "./types.js";

const property: Property = {
  id: "prop_1",
  tenantId: "t1",
  boardId: "board_1",
  address: "5 Oak Ave",
  stage: "new",
  addedBy: "user_1",
  createdAt: "2026-01-01T00:00:00.000Z",
  agentPrivate: { strategy: "motivated seller", sellerMotivation: "relocation" },
  publicRecords: { owner: "Jane Doe", source: "acris" },
};

describe("viewProperty", () => {
  it("includes agent-private data for agents", () => {
    const v = viewProperty(property, "agent");
    expect(v.agentPrivate?.strategy).toBe("motivated seller");
    expect(v.publicRecords?.owner).toBe("Jane Doe");
  });

  it("omits agent-private data for clients but keeps public records", () => {
    const v = viewProperty(property, "client");
    expect(v.agentPrivate).toBeUndefined();
    expect("agentPrivate" in v).toBe(false);
    expect(v.publicRecords?.owner).toBe("Jane Doe");
    expect(JSON.stringify(v)).not.toContain("relocation");
  });
});

describe("visibleNotes", () => {
  const notes: Note[] = [
    { id: "n1", tenantId: "t1", propertyId: "prop_1", authorId: "u", visibility: "shared", body: "a", createdAt: "x" },
    { id: "n2", tenantId: "t1", propertyId: "prop_1", authorId: "u", visibility: "agent_private", body: "b", createdAt: "y" },
  ];

  it("filters agent-private notes for clients", () => {
    expect(visibleNotes(notes, "agent")).toHaveLength(2);
    expect(visibleNotes(notes, "client")).toHaveLength(1);
    expect(visibleNotes(notes, "client")[0].visibility).toBe("shared");
  });
});
