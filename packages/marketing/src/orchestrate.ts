import type { MarketingDrafter, StoryInput } from "./drafter.js";
import type { NewsletterDraftRecord, NewsletterDraftStore } from "./store.js";
import { resolveStory } from "./resolver.js";

/**
 * Discriminated union for the result of submitting a story to the orchestrator.
 */
export type SubmitResult =
  | { status: "ready"; record: NewsletterDraftRecord }
  | { status: "refused"; record: NewsletterDraftRecord }
  | { status: "needs_paste"; reason: string }
  | { status: "error"; error: string; record?: NewsletterDraftRecord }
  | { status: "missing_key" };

/** Dependencies injected into the orchestrator. */
export interface OrchestratorDeps {
  store: NewsletterDraftStore;
  drafter: MarketingDrafter;
  /** Injected fetch for URL resolution; defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /** Max character length for resolved source text. */
  maxLength?: number;
}

/**
 * Orchestrates the newsletter draft pipeline:
 *   submit story → resolve source → draft via Claude → persist record.
 *
 * Surfaces every failure mode as a typed SubmitResult rather than throwing.
 */
export class NewsletterOrchestrator {
  private readonly store: NewsletterDraftStore;
  private readonly drafter: MarketingDrafter;
  private readonly fetchImpl?: typeof fetch;
  private readonly maxLength?: number;

  constructor(deps: OrchestratorDeps) {
    this.store = deps.store;
    this.drafter = deps.drafter;
    this.fetchImpl = deps.fetchImpl;
    this.maxLength = deps.maxLength;
  }

  /**
   * Submit a story for drafting.
   *
   * @param tenantId - tenant scope for persistence
   * @param input - the anchor story (URL, text, or notes)
   * @param apiKey - Joe's Anthropic API key; missing → early return
   */
  async submit(
    tenantId: string,
    input: StoryInput,
    apiKey?: string,
  ): Promise<SubmitResult> {
    // 1. Guard: no API key
    if (!apiKey || apiKey.trim() === "") {
      return { status: "missing_key" };
    }

    // 2. Record submission timestamp
    const storySubmittedAt = new Date().toISOString();

    // 3. Resolve source text (URL → fetched article; text/notes → passthrough)
    const resolved = await resolveStory(input, {
      fetchImpl: this.fetchImpl,
      maxLength: this.maxLength,
    });

    if (resolved.status === "needs_paste") {
      return { status: "needs_paste", reason: resolved.reason };
    }

    // 4. For URL inputs, pass the resolved text to the drafter as a text input
    const drafterInput: StoryInput =
      input.kind === "url"
        ? { kind: "text", value: resolved.text }
        : input;

    // 5. Draft via the injected drafter (wraps Claude)
    let draft;
    try {
      draft = await this.drafter.draftNewsletter(drafterInput);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : String(err);

      // Persist the submitted story so Joe doesn't lose it on failure
      const errorRecord = await this.store.create(tenantId, {
        input,
        resolvedSourceText: resolved.text,
        headline: "",
        body: "",
        wordCount: 0,
        editorNotes: [],
        status: "error",
        storySubmittedAt,
      });

      if (message.includes("rate_limited") || message.includes("429")) {
        return { status: "error", error: "rate_limited", record: errorRecord };
      }
      return { status: "error", error: message, record: errorRecord };
    }

    // 6. Persist the draft record
    const record = await this.store.create(tenantId, {
      input,
      resolvedSourceText: resolved.text,
      headline: draft.headline,
      body: draft.body,
      wordCount: draft.wordCount,
      editorNotes: draft.editorNotes,
      status: draft.status,
      refusalReason: draft.refusalReason,
      storySubmittedAt,
      draftReadyAt: new Date().toISOString(),
    });

    if (draft.status === "refused") {
      return { status: "refused", record };
    }

    return { status: "ready", record };
  }
}
