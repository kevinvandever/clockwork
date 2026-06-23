export type {
  MarketingDrafter,
  NewsletterDraft,
  NewsletterInput,
} from "./drafter.js";
export { StubMarketingDrafter } from "./stub.js";
export {
  ClaudeMarketingDrafter,
  DEFAULT_MODEL,
  buildPrompt,
  type ClaudeMarketingOptions,
} from "./claude.js";
export {
  runMarketingNewsletter,
  type RunMarketingDeps,
  type MarketingRunResult,
} from "./run.js";
