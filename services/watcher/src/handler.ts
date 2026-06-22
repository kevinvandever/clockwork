import type { ResolvedPersona } from "@clockwork/config";
import type { CrmConnector } from "@clockwork/connector-core";
import type { ActivityLog } from "@clockwork/activity-log";
import type { LeadHandler, ReceivedLead } from "./leads/types.js";
import type { LeadResponder } from "./respond/types.js";

/** Per-tenant runtime resources the handler needs. */
export interface TenantContext {
  connector: CrmConnector;
  pipelinePersona: ResolvedPersona;
}

export type TenantContextResolver = (
  tenantId: string,
) => TenantContext | undefined;

export interface PipelineHandlerDeps {
  activityLog: ActivityLog;
  responder: LeadResponder;
  resolveTenant: TenantContextResolver;
}

/**
 * The Pipeline (Josh 2) instant-response handler. On each received lead it:
 *   ensure/create contact → draft a reply → send via the CRM connector
 *   (AI-disclosed) → record to the internal activity log + the CRM timeline.
 * Drafting is delegated to the injected LeadResponder (stub or Claude).
 */
export function createPipelineHandler(deps: PipelineHandlerDeps): LeadHandler {
  const { activityLog, responder, resolveTenant } = deps;

  return async (received: ReceivedLead): Promise<void> => {
    const { tenantId, lead } = received;
    const ctx = resolveTenant(tenantId);
    if (!ctx) {
      throw new Error(`no_tenant_context: ${tenantId}`);
    }
    const { connector, pipelinePersona: persona } = ctx;
    const now = (): string => new Date().toISOString();

    const to = lead.email ?? lead.phone ?? "";
    if (!to) {
      await activityLog.append({
        tenantId,
        robot: persona.name,
        action: "instant_response_skipped",
        outcome: "no_channel",
        detail: `source=${lead.source}`,
        at: now(),
      });
      return;
    }

    // Ensure a contact exists for this lead.
    let contact = await connector.findContact({
      email: lead.email,
      phone: lead.phone,
    });
    if (!contact) {
      contact = await connector.createContact({
        email: lead.email,
        phone: lead.phone,
        name: lead.name,
      });
    }

    const draft = await responder.draft(lead, persona);
    const sendResult = await connector.sendMessage({
      to,
      subject: draft.subject,
      body: draft.body,
      aiDisclosed: true,
      consentBasis: "inbound_lead",
    });

    await activityLog.append({
      tenantId,
      robot: persona.name,
      action: "instant_response_sent",
      contactId: contact.id,
      outcome: sendResult.status,
      detail: `source=${lead.source}`,
      at: now(),
    });

    // Mirror onto the CRM's own contact timeline (agent-facing).
    await connector.logActivity({
      robot: persona.name,
      action: "instant_response_sent",
      contactId: contact.id,
      outcome: sendResult.status,
      at: now(),
    });

    console.log(
      `[pipeline] ${persona.name} → ${to} (${sendResult.status}) re: "${draft.subject}"`,
    );
  };
}
