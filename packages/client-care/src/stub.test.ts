import { describe, it, expect } from "vitest";
import { resolveAllPersonas } from "@clockwork/config";
import { AI_DISCLOSURE, type Contact } from "@clockwork/connector-core";
import { StubClientCareDrafter } from "./stub.js";

const persona = resolveAllPersonas().clientCare; // "Stephanie"
const contact: Contact = {
  id: "c1",
  tenantId: "t1",
  email: "amy@example.com",
  name: "Amy",
};

describe("StubClientCareDrafter", () => {
  it("greets by name, signs off as the persona, includes disclosure", async () => {
    const draft = await new StubClientCareDrafter().draftTouch({
      persona,
      contact,
      reason: "rotation",
    });
    expect(draft.body).toContain("Hi Amy,");
    expect(draft.body).toContain("Stephanie");
    expect(draft.body).toContain(AI_DISCLOSURE);
  });

  it("uses a reason-specific subject", async () => {
    const birthday = await new StubClientCareDrafter().draftTouch({
      persona,
      contact,
      reason: "birthday",
    });
    expect(birthday.subject.toLowerCase()).toContain("birthday");

    const rotation = await new StubClientCareDrafter().draftTouch({
      persona,
      contact,
      reason: "rotation",
    });
    expect(rotation.subject).toBe("Just checking in");
  });
});
