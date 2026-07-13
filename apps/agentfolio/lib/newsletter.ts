import {
  InMemoryNewsletterDraftStore,
  NewsletterOrchestrator,
  ClaudeMarketingDrafter,
  type NewsletterDraftStore,
} from "@clockwork/marketing";
import { hasDatabase, getPool, PostgresNewsletterDraftStore } from "@clockwork/db";
import { getTenantStore } from "./app";

// --- Singleton caching (same pattern as lib/app.ts) ---

const globalForNewsletter = globalThis as unknown as {
  __newsletterStore?: NewsletterDraftStore;
};

/**
 * Process-wide singleton store for newsletter drafts. Postgres when DATABASE_URL
 * is set (matches the app's tenant/agentfolio backend), otherwise in-memory.
 */
export function getNewsletterStore(): NewsletterDraftStore {
  if (!globalForNewsletter.__newsletterStore) {
    globalForNewsletter.__newsletterStore = hasDatabase()
      ? new PostgresNewsletterDraftStore(getPool())
      : new InMemoryNewsletterDraftStore();
  }
  return globalForNewsletter.__newsletterStore;
}

/** A tenant-scoped orchestrator plus the resolved key used to drive it. */
export interface ResolvedOrchestrator {
  orchestrator: NewsletterOrchestrator;
  apiKey: string;
}

/**
 * Resolve a newsletter orchestrator for one tenant (BYO — no fallbacks).
 *
 * The Anthropic API key and the marketing skill text both come from the tenant
 * registry. If the tenant hasn't set their key yet, returns null so the caller
 * can show the setup-needed state — there is deliberately no shared env key, no
 * filesystem skill, and no stub fallback in this path.
 */
export async function getOrchestrator(
  tenantId: string,
): Promise<ResolvedOrchestrator | null> {
  const tenantStore = await getTenantStore();

  const apiKey = await tenantStore.getApiKey(tenantId);
  if (!apiKey || apiKey.trim() === "") {
    return null;
  }

  const skill = await tenantStore.getSkill(tenantId, "marketing");
  const drafter = new ClaudeMarketingDrafter({
    apiKey,
    skillInstructions: skill?.text,
  });

  return {
    orchestrator: new NewsletterOrchestrator({
      store: getNewsletterStore(),
      drafter,
    }),
    apiKey,
  };
}
