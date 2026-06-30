import { describe, it, expect, vi } from "vitest";
import { resolveAllPersonas } from "@clockwork/config";
import type { Lead } from "@clockwork/connector-core";
import { ClaudeResponder, DEFAULT_MODEL, buildPrompt } from "./claude.js";
import { AI_DISCLOSURE } from "./format.js";

const pipeline = resolveAllPersonas().pipeline;

const lead: Lead = {
  source: "zillow",
  email: "jane@example.com",
  name: "Jane",
  message: "Tour request",
  receivedAt: "2026-01-01T00:00:00.000Z",
};

function fakeFetch(text: string, ok = true): typeof fetch {
  return vi.fn(async () =>
    new Response(JSON.stringify({ content: [{ type: "text", text }] }), {
      status: ok ? 200 : 500,
    }),
  ) as unknown as typeof fetch;
}

describe("buildPrompt", () => {
  it("includes the persona name and lead details, prepending skill text", () => {
    const prompt = buildPrompt(lead, pipeline, "JOE SKILL: be warm");
    expect(prompt).toContain("Josh 2");
    expect(prompt).toContain("zillow");
    expect(prompt).toContain("Tour request");
    expect(prompt.startsWith("JOE SKILL: be warm")).toBe(true);
  });
});

describe("ClaudeResponder", () => {
  it("calls the API with the model + key and returns a disclosed draft", async () => {
    const fetchImpl = fakeFetch("Hi Jane, happy to help. — Josh 2");
    const responder = new ClaudeResponder({
      apiKey: "sk-test",
      model: "claude-test",
      fetchImpl,
    });
    const draft = await responder.draft(lead, pipeline);

    expect(draft.body).toContain("happy to help");
    expect(draft.body).toContain(AI_DISCLOSURE);
    expect(draft.subject).toContain("Re:");

    const call = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe("https://api.anthropic.com/v1/messages");
    const init = call[1] as RequestInit;
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe("sk-test");
    expect(JSON.parse(init.body as string).model).toBe("claude-test");
  });

  it("falls back to the default model and throws on API error", async () => {
    const okFetch = fakeFetch("ok");
    await new ClaudeResponder({ apiKey: "sk-test", fetchImpl: okFetch }).draft(
      lead,
      pipeline,
    );
    const init = (okFetch as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string).model).toBe(DEFAULT_MODEL);

    const bad = new ClaudeResponder({
      apiKey: "sk-test",
      fetchImpl: fakeFetch("nope", false),
    });
    await expect(bad.draft(lead, pipeline)).rejects.toThrow(/claude_request_failed/);
  });
});
