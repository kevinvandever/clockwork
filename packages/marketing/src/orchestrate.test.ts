import { describe, it, expect, vi } from "vitest";
import { NewsletterOrchestrator } from "./orchestrate.js";
import { ClaudeMarketingDrafter } from "./claude.js";
import { InMemoryNewsletterDraftStore } from "./store.js";
import { StubMarketingDrafter } from "./stub.js";
import type { MarketingDrafter, StoryInput, NewsletterDraft } from "./drafter.js";

/** A drafter that always refuses (input too thin). */
class RefusingDrafter implements MarketingDrafter {
  async draftNewsletter(_input: StoryInput): Promise<NewsletterDraft> {
    return {
      headline: "",
      body: "",
      wordCount: 0,
      editorNotes: [],
      status: "refused",
      refusalReason: "Input too thin — send me the article body or your notes.",
    };
  }
}

/** A drafter that throws a generic error. */
class ErrorDrafter implements MarketingDrafter {
  async draftNewsletter(_input: StoryInput): Promise<NewsletterDraft> {
    throw new Error("claude_request_failed: 500");
  }
}

/** A drafter that throws a rate-limit error. */
class RateLimitedDrafter implements MarketingDrafter {
  async draftNewsletter(_input: StoryInput): Promise<NewsletterDraft> {
    throw new Error("claude_rate_limited: 429");
  }
}

function makeOrchestrator(
  drafter: MarketingDrafter = new StubMarketingDrafter(),
  fetchImpl?: typeof fetch,
) {
  const store = new InMemoryNewsletterDraftStore();
  const orch = new NewsletterOrchestrator({ store, drafter, fetchImpl });
  return { store, orch };
}

describe("NewsletterOrchestrator", () => {
  const tenantId = "tenant-joe";
  const apiKey = "sk-ant-test-key";

  describe("missing key", () => {
    it("returns missing_key when apiKey is undefined", async () => {
      const { orch } = makeOrchestrator();
      const result = await orch.submit(tenantId, { kind: "text", value: "story" });
      expect(result).toEqual({ status: "missing_key" });
    });

    it("returns missing_key when apiKey is empty string", async () => {
      const { orch } = makeOrchestrator();
      const result = await orch.submit(tenantId, { kind: "text", value: "story" }, "");
      expect(result).toEqual({ status: "missing_key" });
    });

    it("returns missing_key when apiKey is whitespace", async () => {
      const { orch } = makeOrchestrator();
      const result = await orch.submit(tenantId, { kind: "text", value: "story" }, "   ");
      expect(result).toEqual({ status: "missing_key" });
    });
  });

  describe("ready path (text input)", () => {
    it("resolves text, drafts, persists with timestamps", async () => {
      const { orch, store } = makeOrchestrator();
      const input: StoryInput = { kind: "text", value: "A great local market story." };
      const result = await orch.submit(tenantId, input, apiKey);

      expect(result.status).toBe("ready");
      if (result.status !== "ready") return;

      expect(result.record.tenantId).toBe(tenantId);
      expect(result.record.input).toEqual(input);
      expect(result.record.resolvedSourceText).toBe(input.value);
      expect(result.record.headline).toBeTruthy();
      expect(result.record.body).toBeTruthy();
      expect(result.record.wordCount).toBeGreaterThan(0);
      expect(result.record.status).toBe("ready");
      expect(result.record.storySubmittedAt).toBeTruthy();
      expect(result.record.draftReadyAt).toBeTruthy();

      // Verify it's in the store
      const listed = await store.list(tenantId);
      expect(listed).toHaveLength(1);
      expect(listed[0]!.id).toBe(result.record.id);
    });

    it("sets storySubmittedAt before draftReadyAt", async () => {
      const { orch } = makeOrchestrator();
      const result = await orch.submit(
        tenantId,
        { kind: "notes", value: "Just some quick notes about a listing." },
        apiKey,
      );

      expect(result.status).toBe("ready");
      if (result.status !== "ready") return;

      const submitted = new Date(result.record.storySubmittedAt).getTime();
      const ready = new Date(result.record.draftReadyAt!).getTime();
      expect(ready).toBeGreaterThanOrEqual(submitted);
    });
  });

  describe("URL resolution → drafter receives resolved text", () => {
    it("fetches URL, passes resolved text as text-kind to drafter", async () => {
      const draftFn = vi.fn<(input: StoryInput) => Promise<NewsletterDraft>>();
      draftFn.mockResolvedValue({
        headline: "From URL",
        body: "Article body from URL",
        wordCount: 4,
        editorNotes: ["check source"],
        status: "ready",
      });

      const spyDrafter: MarketingDrafter = { draftNewsletter: draftFn };

      const fakeFetch = vi.fn<typeof fetch>().mockResolvedValue(
        new Response("<html><body><p>Fetched article content here.</p></body></html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
      );

      const store = new InMemoryNewsletterDraftStore();
      const orch = new NewsletterOrchestrator({
        store,
        drafter: spyDrafter,
        fetchImpl: fakeFetch,
      });

      const result = await orch.submit(
        tenantId,
        { kind: "url", value: "https://example.com/article" },
        apiKey,
      );

      expect(result.status).toBe("ready");
      // The drafter should receive kind: "text" with the extracted article text
      expect(draftFn).toHaveBeenCalledOnce();
      const calledWith = draftFn.mock.calls[0]![0];
      expect(calledWith.kind).toBe("text");
      expect(calledWith.value).toContain("Fetched article content here.");

      if (result.status !== "ready") return;
      // Record stores the original URL input + resolvedSourceText
      expect(result.record.input.kind).toBe("url");
      expect(result.record.resolvedSourceText).toContain("Fetched article content here.");
    });
  });

  describe("URL needs_paste", () => {
    it("returns needs_paste when URL fetch fails, nothing stored", async () => {
      const fakeFetch = vi.fn<typeof fetch>().mockRejectedValue(
        new Error("Network error"),
      );

      const { orch, store } = makeOrchestrator(new StubMarketingDrafter(), fakeFetch);
      const result = await orch.submit(
        tenantId,
        { kind: "url", value: "https://broken.example.com" },
        apiKey,
      );

      expect(result.status).toBe("needs_paste");
      if (result.status !== "needs_paste") return;
      expect(result.reason).toContain("paste");

      // Nothing persisted (no record to store yet)
      const listed = await store.list(tenantId);
      expect(listed).toHaveLength(0);
    });
  });

  describe("refusal path", () => {
    it("returns refused with record when drafter refuses", async () => {
      const { orch, store } = makeOrchestrator(new RefusingDrafter());
      const result = await orch.submit(
        tenantId,
        { kind: "text", value: "Just a headline" },
        apiKey,
      );

      expect(result.status).toBe("refused");
      if (result.status !== "refused") return;

      expect(result.record.status).toBe("refused");
      expect(result.record.refusalReason).toContain("too thin");
      expect(result.record.storySubmittedAt).toBeTruthy();
      expect(result.record.draftReadyAt).toBeTruthy();

      // Persisted
      const listed = await store.list(tenantId);
      expect(listed).toHaveLength(1);
    });
  });

  describe("model error", () => {
    it("catches generic error and returns error result with record", async () => {
      const { orch, store } = makeOrchestrator(new ErrorDrafter());
      const input: StoryInput = { kind: "text", value: "A good story that errors." };
      const result = await orch.submit(tenantId, input, apiKey);

      expect(result.status).toBe("error");
      if (result.status !== "error") return;

      expect(result.error).toContain("claude_request_failed");
      expect(result.record).toBeDefined();
      expect(result.record!.status).toBe("error");
      expect(result.record!.input).toEqual(input);
      expect(result.record!.storySubmittedAt).toBeTruthy();

      // Story preserved in store
      const listed = await store.list(tenantId);
      expect(listed).toHaveLength(1);
    });
  });

  describe("rate-limit", () => {
    it("catches rate-limit error and returns error with 'rate_limited'", async () => {
      const { orch } = makeOrchestrator(new RateLimitedDrafter());
      const result = await orch.submit(
        tenantId,
        { kind: "text", value: "Story that hits rate limit." },
        apiKey,
      );

      expect(result.status).toBe("error");
      if (result.status !== "error") return;

      expect(result.error).toBe("rate_limited");
      expect(result.record).toBeDefined();
      expect(result.record!.status).toBe("error");
    });
  });

  describe("timeout (simulated via thrown error)", () => {
    it("treats a timeout error the same as a model error", async () => {
      const timeoutDrafter: MarketingDrafter = {
        async draftNewsletter(_input: StoryInput): Promise<NewsletterDraft> {
          throw new Error("Request timed out");
        },
      };

      const { orch } = makeOrchestrator(timeoutDrafter);
      const result = await orch.submit(
        tenantId,
        { kind: "notes", value: "Some notes." },
        apiKey,
      );

      expect(result.status).toBe("error");
      if (result.status !== "error") return;
      expect(result.error).toContain("timed out");
      expect(result.record).toBeDefined();
    });
  });
});


describe("Skill_Instructions wiring (Requirement 2)", () => {
  const tenantId = "tenant-joe";
  const apiKey = "sk-ant-joe-real-key";
  const SKILL_TEXT = "You are Joe's newsletter skill. Write in his voice, property-first.";

  /** Fake Anthropic response that returns a parseable draft. */
  function fakeClaudeResponse(): typeof fetch {
    const text = [
      "# Test Headline From Skill",
      "",
      "Body paragraph produced by the skill instructions.",
      "",
      "---",
      "",
      "**Word count:** 7",
      "",
      "**Editor's notes** _(for Joe — strip before publishing)_:",
      "- Verified via test",
    ].join("\n");

    return vi.fn(async () =>
      new Response(
        JSON.stringify({ content: [{ type: "text", text }] }),
        { status: 200 },
      ),
    ) as unknown as typeof fetch;
  }

  it("orchestration passes skill instructions to the model as the system message", async () => {
    const claudeFetch = fakeClaudeResponse();

    // Construct a real ClaudeMarketingDrafter with skill instructions
    const drafter = new ClaudeMarketingDrafter({
      apiKey,
      skillInstructions: SKILL_TEXT,
      fetchImpl: claudeFetch,
    });

    const store = new InMemoryNewsletterDraftStore();
    const orch = new NewsletterOrchestrator({ store, drafter });

    const result = await orch.submit(
      tenantId,
      { kind: "text", value: "A story about a local listing flip." },
      apiKey,
    );

    // The orchestrator should produce a ready draft
    expect(result.status).toBe("ready");

    // Verify the Claude API was called with the skill text as the system message
    const call = (claudeFetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call).toBeDefined();
    const [url, init] = call as [string, RequestInit];
    expect(url).toBe("https://api.anthropic.com/v1/messages");

    const body = JSON.parse(init.body as string);
    // KEY ASSERTION: the system field IS the loaded skill text, not a generic prompt
    expect(body.system).toBe(SKILL_TEXT);
    // The user message contains the story
    expect(body.messages[0].content).toContain("A story about a local listing flip.");
  });

  it("without skill instructions, system field is absent (no generic fallback)", async () => {
    const claudeFetch = fakeClaudeResponse();

    // Construct without skillInstructions — verifies no generic prompt is injected
    const drafter = new ClaudeMarketingDrafter({
      apiKey,
      fetchImpl: claudeFetch,
    });

    const store = new InMemoryNewsletterDraftStore();
    const orch = new NewsletterOrchestrator({ store, drafter });

    const result = await orch.submit(
      tenantId,
      { kind: "notes", value: "Quick notes about a deal." },
      apiKey,
    );

    expect(result.status).toBe("ready");

    const call = (claudeFetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse((call[1] as RequestInit).body as string);
    // No system field when skill instructions are not provided
    expect(body.system).toBeUndefined();
  });
});


describe("Disposition + timestamps (Requirement 4 — north-star instrumentation)", () => {
  const tenantId = "tenant-joe";
  const apiKey = "sk-ant-test-key";

  it("full flow: submit → timestamps present → disposition persists → timestamps unchanged", async () => {
    const store = new InMemoryNewsletterDraftStore();
    const drafter = new StubMarketingDrafter();
    const orch = new NewsletterOrchestrator({ store, drafter });

    // 1. Submit a story and get a draft
    const result = await orch.submit(
      tenantId,
      { kind: "text", value: "A story about a local listing flip in Brooklyn." },
      apiKey,
    );

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;

    const record = result.record;

    // 2. Verify timestamps are ISO strings
    expect(record.storySubmittedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/,
    );
    expect(record.draftReadyAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/,
    );

    // 3. No disposition yet
    expect(record.disposition).toBeUndefined();

    // 4. Set disposition to "published-as-is" and verify persistence
    const updated = await store.updateDisposition(
      tenantId,
      record.id,
      "published-as-is",
    );
    expect(updated).toBeDefined();
    expect(updated!.disposition).toBe("published-as-is");

    // 5. Timestamps are preserved through the disposition update
    expect(updated!.storySubmittedAt).toBe(record.storySubmittedAt);
    expect(updated!.draftReadyAt).toBe(record.draftReadyAt);

    // 6. Change disposition to "edited" — still preserves timestamps
    const edited = await store.updateDisposition(tenantId, record.id, "edited");
    expect(edited).toBeDefined();
    expect(edited!.disposition).toBe("edited");
    expect(edited!.storySubmittedAt).toBe(record.storySubmittedAt);
    expect(edited!.draftReadyAt).toBe(record.draftReadyAt);

    // 7. Re-read from store to confirm persistence
    const fetched = await store.get(tenantId, record.id);
    expect(fetched).toBeDefined();
    expect(fetched!.disposition).toBe("edited");
    expect(fetched!.storySubmittedAt).toBe(record.storySubmittedAt);
    expect(fetched!.draftReadyAt).toBe(record.draftReadyAt);
  });

  it("disposition of 'discarded' persists correctly", async () => {
    const store = new InMemoryNewsletterDraftStore();
    const drafter = new StubMarketingDrafter();
    const orch = new NewsletterOrchestrator({ store, drafter });

    const result = await orch.submit(
      tenantId,
      { kind: "notes", value: "Quick notes about a neighborhood event." },
      apiKey,
    );

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;

    const updated = await store.updateDisposition(
      tenantId,
      result.record.id,
      "discarded",
    );
    expect(updated).toBeDefined();
    expect(updated!.disposition).toBe("discarded");
    expect(updated!.storySubmittedAt).toBeTruthy();
    expect(updated!.draftReadyAt).toBeTruthy();
  });
});
