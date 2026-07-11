import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  InMemoryNewsletterDraftStore,
  NewsletterOrchestrator,
  ClaudeMarketingDrafter,
  StubMarketingDrafter,
  type NewsletterDraftStore,
} from "@clockwork/marketing";

/**
 * Load the newsletter-draft skill instructions from the filesystem.
 * Same pattern as install/skills.ts — read once at startup.
 */
function loadSkillInstructions(): string {
  // Resolve relative to repo root (two levels up from apps/agentfolio/)
  const skillPath = resolve(
    process.cwd(),
    "../../skills/newsletter-draft.md",
  );
  try {
    return readFileSync(skillPath, "utf-8");
  } catch {
    // Fallback: try from CWD (if running from repo root)
    try {
      return readFileSync(
        resolve(process.cwd(), "skills/newsletter-draft.md"),
        "utf-8",
      );
    } catch {
      return "";
    }
  }
}

// --- Singleton caching (same pattern as lib/app.ts) ---

const globalForNewsletter = globalThis as unknown as {
  __newsletterStore?: InMemoryNewsletterDraftStore;
  __skillInstructions?: string;
};

/** Process-wide singleton store for newsletter drafts. */
export function getNewsletterStore(): NewsletterDraftStore {
  if (!globalForNewsletter.__newsletterStore) {
    globalForNewsletter.__newsletterStore = new InMemoryNewsletterDraftStore();
  }
  return globalForNewsletter.__newsletterStore;
}

/** Load skill instructions (cached). */
function getSkillInstructions(): string {
  if (globalForNewsletter.__skillInstructions === undefined) {
    globalForNewsletter.__skillInstructions = loadSkillInstructions();
  }
  return globalForNewsletter.__skillInstructions;
}

/**
 * Create a NewsletterOrchestrator with the appropriate drafter.
 * Uses ClaudeMarketingDrafter when ANTHROPIC_API_KEY is set, StubMarketingDrafter otherwise.
 */
export function getOrchestrator(): NewsletterOrchestrator {
  const store = getNewsletterStore();
  const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
  const skillInstructions = getSkillInstructions();

  const drafter =
    apiKey.trim() !== ""
      ? new ClaudeMarketingDrafter({ apiKey, skillInstructions })
      : new StubMarketingDrafter();

  return new NewsletterOrchestrator({ store, drafter });
}
