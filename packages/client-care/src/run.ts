import type { ActivityLog } from "@clockwork/activity-log";
import type { ResolvedPersona } from "@clockwork/config";
import type { CrmConnector } from "@clockwork/connector-core";
import { computeDueTouches, type DueTouchOptions } from "./due.js";
import type { ClientCareDrafter } from "./drafter.js";

export interface RunClientCareDeps extends DueTouchOptions {
  tenantId: string;
  connector: CrmConnector;
  persona: ResolvedPersona;
  drafter: ClientCareDrafter;
  activityLog: ActivityLog;
  /** CRM segment to consider (e.g. "sphere"). Omit for all contacts. */
  segment?: string;
}

export interface CareTouchResult {
  contactId: string;
  reason: string;
  sent: boolean;
}

export interface ClientCareRunResult {
  dueCount: number;
  sentCount: number;
  touches: CareTouchResult[];
}

/**
 * Run the Client Care robot once: fetch the sphere, compute due touches (rotation +
 * upcoming key dates), draft + send a personal note per touch (AI-disclosed), and
 * record one activity entry per touch. Cadence is a Cowork scheduled task in the
 * real install (D15-style); triggered on demand here.
 */
export async function runClientCare(
  deps: RunClientCareDeps,
): Promise<ClientCareRunResult> {
  const {
    tenantId,
    connector,
    persona,
    drafter,
    activityLog,
    segment,
    today,
    rotationDays,
    lookaheadDays,
  } = deps;

  const contacts = await connector.listContacts(
    segment ? { segment } : undefined,
  );
  const due = computeDueTouches(contacts, { today, rotationDays, lookaheadDays });

  const touches: CareTouchResult[] = [];
  let sentCount = 0;

  for (const { contact, reason } of due) {
    const to = contact.email ?? contact.phone ?? "";
    if (!to) {
      touches.push({ contactId: contact.id, reason, sent: false });
      await activityLog.append({
        tenantId,
        robot: persona.name,
        action: "care_touch_skipped",
        contactId: contact.id,
        outcome: "no_channel",
        detail: `reason=${reason}`,
        at: new Date().toISOString(),
      });
      continue;
    }

    const draft = await drafter.draftTouch({ persona, contact, reason });
    await connector.sendMessage({
      to,
      subject: draft.subject,
      body: draft.body,
      aiDisclosed: true,
      consentBasis: "existing_relationship",
    });
    sentCount += 1;
    touches.push({ contactId: contact.id, reason, sent: true });
    await activityLog.append({
      tenantId,
      robot: persona.name,
      action: "care_touch_sent",
      contactId: contact.id,
      outcome: reason,
      detail: `reason=${reason}`,
      at: new Date().toISOString(),
    });
  }

  return { dueCount: due.length, sentCount, touches };
}
