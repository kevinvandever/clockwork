import type {
  MarketingDrafter,
  NewsletterDraft,
  StoryInput,
} from "./drafter.js";

/**
 * Deterministic newsletter drafter. Default everywhere so tests are hermetic and the
 * demo runs without credentials. Returns a realistic draft shape with a real word count.
 */
export class StubMarketingDrafter implements MarketingDrafter {
  async draftNewsletter(input: StoryInput): Promise<NewsletterDraft> {
    const headline = `Stub headline for ${input.kind} story`;
    const body = [
      "The local market continues to evolve this season.",
      `Based on the provided ${input.kind}, here is a quick take on what matters`,
      "for your townhouse audience. Inventory is shifting, pricing is adjusting,",
      "and the opportunity window is real for those paying attention.",
      "",
      "Reply anytime — always happy to talk through what this means for you.",
    ].join("\n");
    const wordCount = body.split(/\s+/).filter(Boolean).length;
    const editorNotes = [
      "Verify local inventory figures before publishing.",
      "Confirm pricing trend direction with MLS data.",
    ];

    return { headline, body, wordCount, editorNotes, status: "ready" };
  }
}
