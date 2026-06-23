import type { ResolvedPersona } from "@clockwork/config";
import type { OversightSummary } from "./oversight.js";

export interface Brief {
  headline: string;
  body: string;
}

/**
 * Writes the daily synthesis brief in the Chief of Staff persona's voice. The
 * brief is internal (for the agent), so it carries no AI disclosure — unlike
 * client-facing messages. Stub (default) + env-gated Claude.
 */
export interface BriefWriter {
  write(summary: OversightSummary, persona: ResolvedPersona): Promise<Brief>;
}
