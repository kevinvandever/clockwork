import type { ResolvedPersona } from "@clockwork/config";

export interface NewsletterDraft {
  subject: string;
  body: string;
}

export interface NewsletterInput {
  persona: ResolvedPersona;
  /** Optional topic/notes to steer the newsletter. */
  context?: string;
  audienceSize: number;
}

/**
 * Drafts a sphere newsletter in the Marketing persona's voice. Implementations:
 *  - StubMarketingDrafter: deterministic/offline (default; tests + no-key demo)
 *  - ClaudeMarketingDrafter: real Anthropic API, env-gated. Joe's newsletter skill
 *    text slots in as `skillInstructions` when we have it.
 */
export interface MarketingDrafter {
  draftNewsletter(input: NewsletterInput): Promise<NewsletterDraft>;
}
