import { describe, it, expect } from "vitest";
import { resolveAllPersonas } from "@clockwork/config";
import { AI_DISCLOSURE } from "@clockwork/connector-core";
import { StubMarketingDrafter } from "./stub.js";

const marketing = resolveAllPersonas().marketing; // "Dave"

describe("StubMarketingDrafter", () => {
  it("signs off as the persona and includes the disclosure", async () => {
    const draft = await new StubMarketingDrafter().draftNewsletter({
      persona: marketing,
      audienceSize: 10,
    });
    expect(draft.body).toContain("Dave");
    expect(draft.body).toContain(AI_DISCLOSURE);
    expect(draft.subject.length).toBeGreaterThan(0);
  });

  it("uses the provided context in the subject", async () => {
    const draft = await new StubMarketingDrafter().draftNewsletter({
      persona: marketing,
      context: "spring market update",
      audienceSize: 5,
    });
    expect(draft.subject.toLowerCase()).toContain("spring market update");
  });
});
