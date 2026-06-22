import type { ResolvedPersona } from "@clockwork/config";
import type { Lead } from "@clockwork/connector-core";
import { AI_DISCLOSURE, subjectFor } from "./format.js";
import type { DraftedReply, LeadResponder } from "./types.js";

/**
 * Deterministic, offline responder. Default everywhere so tests are hermetic and the
 * demo runs with zero credentials. Uses the resolved persona name in the signature.
 */
export class StubResponder implements LeadResponder {
  async draft(lead: Lead, persona: ResolvedPersona): Promise<DraftedReply> {
    const who = lead.name ?? "there";
    const body = [
      `Hi ${who},`,
      "",
      "Thanks for reaching out — I'd love to help with your search. " +
        "What's a good time for a quick call?",
      "",
      "Best,",
      persona.name,
      "",
      AI_DISCLOSURE,
    ].join("\n");
    return { subject: subjectFor(lead), body };
  }
}
