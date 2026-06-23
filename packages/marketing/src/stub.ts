import { AI_DISCLOSURE } from "@clockwork/connector-core";
import type {
  MarketingDrafter,
  NewsletterDraft,
  NewsletterInput,
} from "./drafter.js";

/**
 * Deterministic newsletter drafter. Default everywhere so tests are hermetic and the
 * demo runs without credentials. Uses the resolved persona name in the sign-off.
 */
export class StubMarketingDrafter implements MarketingDrafter {
  async draftNewsletter({
    persona,
    context,
  }: NewsletterInput): Promise<NewsletterDraft> {
    const topic = context?.trim() || "this month's local market update";
    const subject = `${capitalize(topic)} from your agent`;
    const body = [
      "Hi there,",
      "",
      `A quick note with ${topic}. Inventory, pricing, and what it means if ` +
        "you're thinking about a move this season.",
      "",
      "Reply anytime if you'd like to talk through your options — always happy to help.",
      "",
      "Best,",
      persona.name,
      "",
      AI_DISCLOSURE,
    ].join("\n");
    return { subject, body };
  }
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}
