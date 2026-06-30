import type { ResolvedPersona } from "@clockwork/config";
import type { Lead } from "@clockwork/connector-core";

export interface DraftedReply {
  subject: string;
  body: string;
}

/**
 * Drafts an instant reply to a lead in a persona's voice. Implementations:
 *  - StubResponder: deterministic/offline (default; used in tests + the no-key demo)
 *  - ClaudeResponder: real Anthropic API call, env-gated on ANTHROPIC_API_KEY
 */
export interface LeadResponder {
  draft(lead: Lead, persona: ResolvedPersona): Promise<DraftedReply>;
}
