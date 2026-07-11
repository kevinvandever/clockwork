import { describe, it, expect } from "vitest";
import { StubMarketingDrafter } from "./stub.js";
import type { StoryInput } from "./drafter.js";

describe("StubMarketingDrafter", () => {
  const drafter = new StubMarketingDrafter();

  it("returns a ready draft with headline, body, wordCount, and editorNotes", async () => {
    const input: StoryInput = { kind: "text", value: "article about spring market" };
    const draft = await drafter.draftNewsletter(input);

    expect(draft.status).toBe("ready");
    expect(draft.headline.length).toBeGreaterThan(0);
    expect(draft.body.length).toBeGreaterThan(0);
    expect(draft.wordCount).toBeGreaterThan(0);
    expect(draft.editorNotes.length).toBeGreaterThan(0);
    expect(draft.refusalReason).toBeUndefined();
  });

  it("wordCount reflects the actual body word count", async () => {
    const input: StoryInput = { kind: "notes", value: "market notes" };
    const draft = await drafter.draftNewsletter(input);

    const actualWords = draft.body.split(/\s+/).filter(Boolean).length;
    expect(draft.wordCount).toBe(actualWords);
  });

  it("handles each input kind", async () => {
    const kinds = ["url", "text", "notes"] as const;
    for (const kind of kinds) {
      const draft = await drafter.draftNewsletter({ kind, value: "test value" });
      expect(draft.status).toBe("ready");
      expect(draft.headline).toContain(kind);
    }
  });
});
