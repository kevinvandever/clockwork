import { describe, it, expect, vi } from "vitest";
import { ClaudeMarketingDrafter, DEFAULT_MODEL, parseSkillOutput } from "./claude.js";

// --- Helpers ---

/** Builds a fake Anthropic response wrapping the given text. */
function fakeAnthropicResponse(text: string, status = 200): typeof fetch {
  return vi.fn(async () =>
    new Response(
      JSON.stringify({ content: [{ type: "text", text }] }),
      { status },
    ),
  ) as unknown as typeof fetch;
}

/** A realistic successful skill output (newsletter draft in expected markdown). */
const SUCCESSFUL_OUTPUT = `# 1849 Greek Revival on Bank Street Trades at $70M

_The discount is the story — and the math underneath it._

Lady Gaga's purchase of a West Village townhouse made every headline last week. The headlines were wrong. The building is the story.

The property at high-teens Bank Street is an 1849 Greek Revival — one of the earliest remaining examples on the block, with original proportions intact through a ground-up restoration in 2019. Five floors, ~8,200 square feet, 25-foot wide, rear garden, full cellar. The last trade was $52M in 2017.

At $70M, the current trade represents a 35% premium over the 2017 basis — but lands 12% below the $79.5M ask. That discount-to-ask is the signal, not the celebrity.

Here is why: the $79.5M ask priced to a 2022 trophy-market comp set that no longer holds. Three comparable West Village wide-lots have traded at 10-18% discounts to ask in the past 14 months. The $70M close tracks the corrected comp band — the buyer got market, not a deal. The seller got out above basis after seven years, which in this rate environment is a win most owners would take.

The broader read: Bank Street between Bleecker and West 4th now holds three trades above $50M in seven years. That is not a price-per-foot story — it's a scarcity story. There are perhaps six remaining wide-lot Greek Revivals on this stretch, and none are coming to market soon. At these levels, inventory compresses further.

---

**Word count:** 487

**Editor's notes** _(for Joe — strip before publishing)_:
- Restoration date (2019) sourced from listing history; verify with DOB permits
- The $79.5M ask figure is from StreetEasy; confirm it wasn't quietly adjusted before closing
- Alternative angle considered: restoration-cost economics (what the 2019 gut-reno actually cost vs. trade profit) — rejected because the comp-correction story is sharper and more portable`;

/** A realistic refusal output (skill says input is too thin). */
const REFUSAL_OUTPUT = `I'd need more to produce a real draft here. What you've shared is a one-line headline — "Celebrity buys West Village townhouse" — with no article body, no price, no building specifics, and no operator notes from you.

To write something with genuine portable value for your townhouse audience, I need at least one of:
- The full article text (paste it in)
- Your own notes on what you see in the deal — comp logic, price signal, restoration angle, anything an operator notices that a journalist wouldn't

Send me either and I'll draft the piece.`;

// --- Unit tests ---

describe("parseSkillOutput", () => {
  it("parses a successful draft into headline, body, wordCount, and editorNotes", () => {
    const result = parseSkillOutput(SUCCESSFUL_OUTPUT);
    expect(result.status).toBe("ready");
    expect(result.headline).toBe(
      "1849 Greek Revival on Bank Street Trades at $70M",
    );
    expect(result.body).toContain("Lady Gaga");
    expect(result.body).toContain("scarcity story");
    // Should NOT contain the word-count metadata or editor's notes in the body
    expect(result.body).not.toContain("**Word count:**");
    expect(result.body).not.toContain("**Editor's notes**");
    expect(result.wordCount).toBe(487);
    expect(result.editorNotes).toHaveLength(3);
    expect(result.editorNotes[0]).toContain("Restoration date");
    expect(result.editorNotes[2]).toContain("Alternative angle");
    expect(result.refusalReason).toBeUndefined();
  });

  it("detects a refusal (no # heading) and returns status refused", () => {
    const result = parseSkillOutput(REFUSAL_OUTPUT);
    expect(result.status).toBe("refused");
    expect(result.headline).toBe("");
    expect(result.body).toBe("");
    expect(result.wordCount).toBe(0);
    expect(result.editorNotes).toEqual([]);
    expect(result.refusalReason).toContain("I'd need more");
  });

  it("computes wordCount from body when **Word count:** line is absent", () => {
    const minimal = "# Simple Headline\n\nThis is a short body with ten total words here.";
    const result = parseSkillOutput(minimal);
    expect(result.status).toBe("ready");
    expect(result.headline).toBe("Simple Headline");
    expect(result.wordCount).toBeGreaterThan(0);
    // Actual count of "This is a short body with ten total words here."
    expect(result.wordCount).toBe(10);
  });
});

describe("ClaudeMarketingDrafter", () => {
  it("constructs with the expected options and defaults the model", () => {
    const drafter = new ClaudeMarketingDrafter({
      apiKey: "sk-test",
      skillInstructions: "test skill",
    });
    expect(drafter).toBeDefined();
    expect(DEFAULT_MODEL).toBe("claude-sonnet-4-5");
  });

  it("sends skill instructions as system message and parses a successful draft", async () => {
    const fetchImpl = fakeAnthropicResponse(SUCCESSFUL_OUTPUT);
    const drafter = new ClaudeMarketingDrafter({
      apiKey: "sk-test-key",
      skillInstructions: "You are the newsletter drafter.",
      fetchImpl,
    });

    const result = await drafter.draftNewsletter({ kind: "text", value: "Article body here" });

    expect(result.status).toBe("ready");
    expect(result.headline).toBe("1849 Greek Revival on Bank Street Trades at $70M");
    expect(result.body).toContain("Lady Gaga");
    expect(result.wordCount).toBe(487);
    expect(result.editorNotes.length).toBeGreaterThan(0);

    // Verify the fetch was called with correct structure
    const call = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe("https://api.anthropic.com/v1/messages");
    const init = call[1] as RequestInit;
    const body = JSON.parse(init.body as string);
    expect(body.system).toBe("You are the newsletter drafter.");
    expect(body.messages[0].role).toBe("user");
    expect(body.messages[0].content).toContain("Article body here");
    expect(init.headers).toHaveProperty("x-api-key", "sk-test-key");
  });

  it("returns status refused when the model refuses (no headline)", async () => {
    const fetchImpl = fakeAnthropicResponse(REFUSAL_OUTPUT);
    const drafter = new ClaudeMarketingDrafter({
      apiKey: "sk-test",
      fetchImpl,
    });

    const result = await drafter.draftNewsletter({ kind: "text", value: "Celebrity buys house" });

    expect(result.status).toBe("refused");
    expect(result.headline).toBe("");
    expect(result.body).toBe("");
    expect(result.wordCount).toBe(0);
    expect(result.refusalReason).toContain("I'd need more");
  });

  it("throws on non-ok response with the status code", async () => {
    const fetchImpl = fakeAnthropicResponse("", 500);
    const drafter = new ClaudeMarketingDrafter({
      apiKey: "sk-test",
      fetchImpl,
    });

    await expect(
      drafter.draftNewsletter({ kind: "text", value: "test" }),
    ).rejects.toThrow(/claude_request_failed: 500/);
  });

  it("throws a recognizable rate-limit error on 429", async () => {
    const fetchImpl = fakeAnthropicResponse("", 429);
    const drafter = new ClaudeMarketingDrafter({
      apiKey: "sk-test",
      fetchImpl,
    });

    await expect(
      drafter.draftNewsletter({ kind: "text", value: "test" }),
    ).rejects.toThrow(/claude_rate_limited: 429/);
  });

  it("does not include system field when skillInstructions is absent", async () => {
    const fetchImpl = fakeAnthropicResponse(SUCCESSFUL_OUTPUT);
    const drafter = new ClaudeMarketingDrafter({
      apiKey: "sk-test",
      fetchImpl,
    });

    await drafter.draftNewsletter({ kind: "url", value: "https://example.com/story" });

    const call = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse((call[1] as RequestInit).body as string);
    expect(body.system).toBeUndefined();
    expect(body.messages[0].content).toContain("Story URL");
    expect(body.messages[0].content).toContain("https://example.com/story");
  });

  it("labels user message appropriately for each input kind", async () => {
    const fetchImpl = fakeAnthropicResponse(SUCCESSFUL_OUTPUT);
    const drafter = new ClaudeMarketingDrafter({
      apiKey: "sk-test",
      fetchImpl,
    });

    await drafter.draftNewsletter({ kind: "notes", value: "My operator notes" });

    const call = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse((call[1] as RequestInit).body as string);
    expect(body.messages[0].content).toContain("Notes:");
    expect(body.messages[0].content).toContain("My operator notes");
  });
});
