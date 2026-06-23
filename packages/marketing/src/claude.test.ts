import { describe, it, expect, vi } from "vitest";
import { resolveAllPersonas } from "@clockwork/config";
import { AI_DISCLOSURE } from "@clockwork/connector-core";
import { ClaudeMarketingDrafter, DEFAULT_MODEL, buildPrompt } from "./claude.js";

const marketing = resolveAllPersonas().marketing;

function fakeFetch(text: string, ok = true): typeof fetch {
  return vi.fn(async () =>
    new Response(JSON.stringify({ content: [{ type: "text", text }] }), {
      status: ok ? 200 : 500,
    }),
  ) as unknown as typeof fetch;
}

describe("buildPrompt", () => {
  it("includes the persona and prepends skill instructions when present", () => {
    const prompt = buildPrompt(
      { persona: marketing, context: "spring", audienceSize: 3 },
      "JOE SKILL: keep it folksy",
    );
    expect(prompt).toContain("Dave");
    expect(prompt).toContain("spring");
    expect(prompt.startsWith("JOE SKILL: keep it folksy")).toBe(true);
  });
});

describe("ClaudeMarketingDrafter", () => {
  it("parses a Subject: line and ensures disclosure", async () => {
    const drafter = new ClaudeMarketingDrafter({
      apiKey: "sk-test",
      model: "claude-test",
      fetchImpl: fakeFetch("Subject: Spring Market\n\nThings are heating up."),
    });
    const draft = await drafter.draftNewsletter({
      persona: marketing,
      audienceSize: 4,
    });
    expect(draft.subject).toBe("Spring Market");
    expect(draft.body).toContain("heating up");
    expect(draft.body).toContain(AI_DISCLOSURE);
  });

  it("falls back to a default subject when none is provided", async () => {
    const drafter = new ClaudeMarketingDrafter({
      apiKey: "sk-test",
      fetchImpl: fakeFetch("Just a body, no subject line."),
    });
    const draft = await drafter.draftNewsletter({
      persona: marketing,
      audienceSize: 1,
    });
    expect(draft.subject).toBe("Your local market update");
  });

  it("throws on an API error", async () => {
    const drafter = new ClaudeMarketingDrafter({
      apiKey: "sk-test",
      fetchImpl: fakeFetch("x", false),
    });
    await expect(
      drafter.draftNewsletter({ persona: marketing, audienceSize: 1 }),
    ).rejects.toThrow(/claude_request_failed/);
  });

  it("defaults the model when none is given", async () => {
    const fetchImpl = fakeFetch("Subject: Hi\n\nBody");
    const drafter = new ClaudeMarketingDrafter({ apiKey: "sk-test", fetchImpl });
    await drafter.draftNewsletter({ persona: marketing, audienceSize: 1 });
    const init = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string).model).toBe(DEFAULT_MODEL);
  });
});
