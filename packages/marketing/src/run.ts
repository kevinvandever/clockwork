import type { ActivityLog } from "@clockwork/activity-log";
import type { ResolvedPersona } from "@clockwork/config";
import type { CrmConnector } from "@clockwork/connector-core";
import type { MarketingDrafter, NewsletterDraft } from "./drafter.js";

export interface RunMarketingDeps {
  tenantId: string;
  connector: CrmConnector;
  persona: ResolvedPersona;
  drafter: MarketingDrafter;
  activityLog: ActivityLog;
  /** Optional topic/notes for the newsletter. */
  context?: string;
  /** Optional CRM segment to target (e.g. "sphere"). Omit for all contacts. */
  segment?: string;
}

export interface MarketingRunResult {
  recipientCount: number;
  sentCount: number;
  draft: NewsletterDraft;
}

/**
 * Run the Marketing robot once: fetch the sphere, draft a newsletter, send it to
 * every contact with an email (AI-disclosed), and record a summary activity entry.
 * Cadence is handled by a Cowork scheduled task in the real install; here it is
 * triggered on demand — see docs/DECISIONS.md.
 */
export async function runMarketingNewsletter(
  deps: RunMarketingDeps,
): Promise<MarketingRunResult> {
  const { tenantId, connector, persona, drafter, activityLog, context, segment } =
    deps;

  const recipients = await connector.listContacts(
    segment ? { segment } : undefined,
  );
  const draft = await drafter.draftNewsletter({
    persona,
    context,
    audienceSize: recipients.length,
  });

  let sentCount = 0;
  for (const contact of recipients) {
    if (!contact.email) {
      continue;
    }
    await connector.sendMessage({
      to: contact.email,
      subject: draft.subject,
      body: draft.body,
      aiDisclosed: true,
      consentBasis: "existing_relationship",
    });
    sentCount += 1;
  }

  await activityLog.append({
    tenantId,
    robot: persona.name,
    action: "newsletter_sent",
    outcome: String(sentCount),
    detail: `recipients=${recipients.length} segment=${segment ?? "all"}`,
    at: new Date().toISOString(),
  });

  return { recipientCount: recipients.length, sentCount, draft };
}
