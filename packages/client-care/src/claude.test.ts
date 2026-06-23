import { describe, it, expect, vi } from "vitest";
import { resolveAllPersonas } from "@clockwork/config";
import { AI_DISCLOSURE, type Contact } from "@clockwork/connector-core";
import { ClaudeClientCareDrafter, DEFAULT_MODEL, buildPrompt } from "./claude.js";

const persona = resolveAllPersonas().clientCare;
const contact: Contact = { id: "c1", tenantId: "t1", email: "a@b.com", name: "Amy" };

function fakeFetch(text: string, ok = true): typeof fetch {
  return vi.fn(async () =>
    new Response(JSON.stringify({ content: [{ type: "text", text }] }), {
      status: ok ? 200 : 500,
    }),
  ) as unknown as typeof fetch;
}

describe("buildPrompt", () => {
  it("names the persona, contact, and reason and prepends skill text", () => {
    const prompt = buildPrompt(
      { persona, contact, reason: "birthday" },
      "JOE SKILL: be heartfelt",
    );
    expect(prompt).toContain("Stephanie");
    expect(prompt).toContain("Amy");
    expect(prompt).toContain("birthday");
    expect(prompt.startsWith("JOE SKILL: be heartfelt")).toBe(true);
  });
});

describe("ClaudeClientCareDrafter", () => {
  it("parses a Subject line and ensures disclosure", async () => {
    const drafter = new ClaudeClientCareDrafter({
      apiKey: "sk-test",
      model: "claude-test",
      fetchImpl: fakeFetch("Subject: Happy Birthday Amy\n\nHope it's a great one."),
    });
    const draft = await drafter.draftTouch({ persona, contact, reason: "birthday" });
    expect(draft.subject).toBe("Happy Birthday Amy");
    expect(draft.body).toContain("great one");
    expect(draft.body).toContain(AI_DISCLOSURE);
  });

  it("defaults the model and throws on API error", async () => {
    const okFetch = fakeFetch("Subject: Hi\n\nBody");
    const ok = new ClaudeClientCareDrafter({ apiKey: "sk-test", fetchImpl: okFetch });
    await ok.draftTouch({ persona, contact, reason: "rotation" });
    const init = (okFetch as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string).model).toBe(DEFAULT_MODEL);

    const bad = new ClaudeClientCareDrafter({
      apiKey: "sk-test",
      fetchImpl: fakeFetch("x", false),
    });
    await expect(
      bad.draftTouch({ persona, contact, reason: "rotation" }),
    ).rejects.toThrow(/claude_request_failed/);
  });
});
