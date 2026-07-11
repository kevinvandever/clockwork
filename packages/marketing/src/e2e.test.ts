import { describe, it, expect, vi } from "vitest";
import { InMemoryNewsletterDraftStore } from "./store.js";
import { ClaudeMarketingDrafter } from "./claude.js";
import { NewsletterOrchestrator } from "./orchestrate.js";

/**
 * End-to-end integration tests exercising the full newsletter pipeline
 * from story submission through drafting to disposition, using fake fetch
 * (no real API calls).
 *
 * Validates Requirements: 1, 2, 3, 4, 5, 6
 */
describe("Newsletter E2E (fake fetch)", () => {
  const tenantId = "tenant-joe";
  const apiKey = "sk-ant-joe-real-key";
  const SKILL_TEXT =
    "You are Joe's newsletter-draft skill. Write property-first, in his voice.";

  /** Returns a fake fetch that simulates a successful Claude response. */
  function fakeClaudeSuccess(): typeof fetch {
    const text = [
      "# Brooklyn Heights Just Got Interesting",
      "",
      "*A quick take on what this week's flip means for your block.*",
      "",
      "A three-story brownstone on Pierrepont just closed at fifteen percent above ask",
      "after six days on market. That is not a typo. The buyer waived inspection and",
      "brought cash, which tells you everything about where demand sits right now for",
      "the Heights. If you own on that corridor, your basis just shifted. The comparables",
      "board will reflect it within the week. For buyers still circling, the message is",
      "clear: hesitation has a price, and it is going up. I will say this every time —",
      "the floor is not the ceiling, and the window is not permanent. If you want to",
      "talk positioning, I am one reply away.",
      "",
      "---",
      "",
      "**Word count:** 120",
      "",
      "**Editor's notes** _(for Joe — strip before publishing)_:",
      "- Verify the Pierrepont close price and days-on-market from MLS",
      "- Confirm cash/waived-inspection detail with listing agent",
      "- The 15% above ask figure needs sourcing",
    ].join("\n");

    return vi.fn(async () =>
      new Response(JSON.stringify({ content: [{ type: "text", text }] }), {
        status: 200,
      }),
    ) as unknown as typeof fetch;
  }

  /** Returns a fake fetch that simulates a refusal (no # heading). */
  function fakeClaudeRefusal(): typeof fetch {
    const text = [
      "I need more to work with here. A headline alone doesn't give me enough",
      "substance to build a property-first take your audience would trust.",
      "Send me the article body or your own notes on why this matters for",
      "the neighborhood, and I'll draft something worth publishing.",
    ].join("\n");

    return vi.fn(async () =>
      new Response(JSON.stringify({ content: [{ type: "text", text }] }), {
        status: 200,
      }),
    ) as unknown as typeof fetch;
  }

  it("story submitted → draft ready → disposition recorded", async () => {
    // 1. Setup with fake Claude response
    const store = new InMemoryNewsletterDraftStore();
    const fakeFetch = fakeClaudeSuccess();
    const drafter = new ClaudeMarketingDrafter({
      apiKey,
      skillInstructions: SKILL_TEXT,
      fetchImpl: fakeFetch,
    });
    const orchestrator = new NewsletterOrchestrator({ store, drafter });

    // 2. Submit a text story
    const input = {
      kind: "text" as const,
      value:
        "A brownstone on Pierrepont in Brooklyn Heights just flipped for 15% above ask in 6 days, all cash, waived inspection.",
    };
    const result = await orchestrator.submit(tenantId, input, apiKey);

    // 3. Verify ready result with correct fields
    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;

    const record = result.record;
    expect(record.tenantId).toBe(tenantId);
    expect(record.input).toEqual(input);
    expect(record.headline).toBe("Brooklyn Heights Just Got Interesting");
    expect(record.body).toBeTruthy();
    expect(record.wordCount).toBeGreaterThan(0);
    expect(record.editorNotes.length).toBeGreaterThan(0);
    expect(record.status).toBe("ready");

    // Timestamps are set
    expect(record.storySubmittedAt).toBeTruthy();
    expect(record.draftReadyAt).toBeTruthy();
    const submitted = new Date(record.storySubmittedAt).getTime();
    const ready = new Date(record.draftReadyAt!).getTime();
    expect(ready).toBeGreaterThanOrEqual(submitted);

    // 4. Verify the record is in the store
    const stored = await store.get(tenantId, record.id);
    expect(stored).toBeDefined();
    expect(stored!.headline).toBe(record.headline);
    expect(stored!.body).toBe(record.body);

    // 5. Set disposition
    const updated = await store.updateDisposition(
      tenantId,
      record.id,
      "published-as-is",
    );
    expect(updated).toBeDefined();
    expect(updated!.disposition).toBe("published-as-is");

    // 6. Read back → disposition persisted, timestamps preserved
    const final = await store.get(tenantId, record.id);
    expect(final).toBeDefined();
    expect(final!.disposition).toBe("published-as-is");
    expect(final!.storySubmittedAt).toBe(record.storySubmittedAt);
    expect(final!.draftReadyAt).toBe(record.draftReadyAt);

    // 7. Verify Claude was called correctly (skill as system message)
    const call = (fakeFetch as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0];
    const [url, init] = call as [string, RequestInit];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    const body = JSON.parse(init.body as string);
    expect(body.system).toBe(SKILL_TEXT);
    expect(body.messages[0].content).toContain("brownstone on Pierrepont");
  });

  it("thin story → refusal → guidance", async () => {
    // 1. Setup with refusal response (no # heading in output)
    const store = new InMemoryNewsletterDraftStore();
    const fakeFetch = fakeClaudeRefusal();
    const drafter = new ClaudeMarketingDrafter({
      apiKey,
      skillInstructions: SKILL_TEXT,
      fetchImpl: fakeFetch,
    });
    const orchestrator = new NewsletterOrchestrator({ store, drafter });

    // 2. Submit a thin story
    const input = { kind: "text" as const, value: "Breaking news headline" };
    const result = await orchestrator.submit(tenantId, input, apiKey);

    // 3. Verify refused status with reason
    expect(result.status).toBe("refused");
    if (result.status !== "refused") return;

    const record = result.record;
    expect(record.status).toBe("refused");
    expect(record.refusalReason).toBeTruthy();
    expect(record.refusalReason).toContain("need more to work with");
    expect(record.headline).toBe("");
    expect(record.body).toBe("");
    expect(record.wordCount).toBe(0);

    // Timestamps are still recorded
    expect(record.storySubmittedAt).toBeTruthy();
    expect(record.draftReadyAt).toBeTruthy();

    // Record is persisted in the store
    const stored = await store.get(tenantId, record.id);
    expect(stored).toBeDefined();
    expect(stored!.status).toBe("refused");
    expect(stored!.refusalReason).toBe(record.refusalReason);
  });
});
