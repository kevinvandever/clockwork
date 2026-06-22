import { describe, it, expect } from "vitest";
import { resolveAllPersonas } from "@clockwork/config";
import type { Lead } from "@clockwork/connector-core";
import { StubResponder } from "./stub.js";
import { AI_DISCLOSURE } from "./format.js";

const pipeline = resolveAllPersonas().pipeline; // "Josh 2"

function lead(overrides: Partial<Lead> = {}): Lead {
  return {
    source: "email",
    email: "jane@example.com",
    name: "Jane",
    message: "Interested in a tour of 123 Main St",
    receivedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("StubResponder", () => {
  it("greets the lead by name and signs off as the persona", async () => {
    const draft = await new StubResponder().draft(lead(), pipeline);
    expect(draft.body).toContain("Hi Jane,");
    expect(draft.body).toContain("Josh 2");
  });

  it("always includes the AI disclosure", async () => {
    const draft = await new StubResponder().draft(lead(), pipeline);
    expect(draft.body).toContain(AI_DISCLOSURE);
  });

  it("derives the subject from the message and falls back when absent", async () => {
    const withMsg = await new StubResponder().draft(lead(), pipeline);
    expect(withMsg.subject).toContain("Re:");
    const noMsg = await new StubResponder().draft(
      lead({ message: undefined }),
      pipeline,
    );
    expect(noMsg.subject).toBe("Thanks for reaching out");
  });

  it("uses a neutral greeting when the lead has no name", async () => {
    const draft = await new StubResponder().draft(lead({ name: undefined }), pipeline);
    expect(draft.body).toContain("Hi there,");
  });
});
