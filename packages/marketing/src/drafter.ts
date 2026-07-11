/**
 * The single-anchor-story newsletter contract.
 *
 * The drafter accepts one story (URL, article text, or free-form notes) and
 * returns a publish-ready draft: headline, body, real word count, and
 * editor's notes. It does NOT send — Joe publishes manually.
 */

/** The anchor story Joe submits — one of three kinds. */
export interface StoryInput {
  kind: "url" | "text" | "notes";
  value: string;
}

/** The result of a draft attempt. */
export interface NewsletterDraft {
  headline: string;
  body: string;
  /** Actual word count of the body. */
  wordCount: number;
  /** Flagged inferences and facts-to-verify for Joe. */
  editorNotes: string[];
  /** "ready" when a draft was produced; "refused" when input is too thin. */
  status: "ready" | "refused";
  /** Present only when status is "refused". */
  refusalReason?: string;
}

/**
 * Drafts a single newsletter piece from one anchor story.
 *
 * Implementations:
 *  - StubMarketingDrafter: deterministic/offline (tests + no-key demo)
 *  - ClaudeMarketingDrafter: real Anthropic API (Joe's key + skill instructions)
 */
export interface MarketingDrafter {
  draftNewsletter(input: StoryInput): Promise<NewsletterDraft>;
}
