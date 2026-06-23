import { describe, it, expect, vi } from "vitest";
import { resolveAllPersonas } from "@clockwork/config";
import { ClaudeBriefWriter, DEFAULT_MODEL, buildPrompt } from "./claude.js";
import type { OversightSummary } from "./oversight.js";

const persona = resolveAllPersonas().chiefOfStaff;

const summary: OversightSummary = {
  tenantId: "t1",
  window: { since: "a", until: "b" },
  totalEvents: 2,
  byRobot: { Dave: { total: 1, byAction: { newsletter_sent: 1 } } },
  recent: [],
};

function fakeFetch(text: string, ok = true): typeof fetch {
  return vi.fn(async () =>
    new Response(JSON.stringify({ content: [{ type: "text", text }] }), {
      status: ok ? 200 : 500,
    }),
  ) as unknown as typeof fetch;
}

describe("buildPrompt", () => {
  it("includes the persona and the summary JSON, prepending skill text", () => {
    const prompt = buildPrompt(summary, persona, "JOE SKILL: be crisp");
    expect(prompt).toContain("Linda");
    expect(prompt).toContain("totalEvents");
    expect(prompt.startsWith("JOE SKILL: be crisp")).toBe(true);
  });
});

describe("ClaudeBriefWriter", () => {
  it("parses a Headline line", async () => {
    const writer = new ClaudeBriefWriter({
      apiKey: "sk-test",
      model: "claude-test",
      fetchImpl: fakeFetch("Headline: Steady day\n\nTwo sends went out."),
    });
    const brief = await writer.write(summary, persona);
    expect(brief.headline).toBe("Steady day");
    expect(brief.body).toContain("Two sends");
  });

  it("defaults the model and throws on API error", async () => {
    const okFetch = fakeFetch("Headline: Hi\n\nBody");
    await new ClaudeBriefWriter({ apiKey: "sk-test", fetchImpl: okFetch }).write(
      summary,
      persona,
    );
    const init = (okFetch as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string).model).toBe(DEFAULT_MODEL);

    const bad = new ClaudeBriefWriter({
      apiKey: "sk-test",
      fetchImpl: fakeFetch("x", false),
    });
    await expect(bad.write(summary, persona)).rejects.toThrow(
      /claude_request_failed/,
    );
  });
});
