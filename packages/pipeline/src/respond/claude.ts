import type { ResolvedPersona } from "@clockwork/config";
import type { Lead } from "@clockwork/connector-core";
import { ensureDisclosure, subjectFor } from "./format.js";
import type { DraftedReply, LeadResponder } from "./types.js";

/**
 * Default Sonnet model. Overridable via the ANTHROPIC_MODEL env var (model ids
 * change over time; env override avoids code changes).
 */
export const DEFAULT_MODEL = "claude-sonnet-4-5";

export interface ClaudeResponderOptions {
  apiKey: string;
  model?: string;
  /** Joe's Pipeline skill text, used as instructions when present. */
  skillInstructions?: string;
  /** Injectable for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

interface AnthropicResponse {
  content?: { type: string; text?: string }[];
}

export function buildPrompt(
  lead: Lead,
  persona: ResolvedPersona,
  skillInstructions?: string,
): string {
  const base = [
    `You are ${persona.name}, a real estate agent's ${persona.role} assistant.`,
    "Write a brief, warm, professional reply to a new lead. Aim to build rapport",
    "and propose a quick call. Keep it under 120 words. Sign off as",
    `${persona.name}. Do not invent specifics you weren't given.`,
    "",
    `Lead source: ${lead.source}`,
    `Lead name: ${lead.name ?? "(unknown)"}`,
    `Lead message: ${lead.message ?? "(none)"}`,
  ].join("\n");
  return skillInstructions ? `${skillInstructions}\n\n---\n\n${base}` : base;
}

/**
 * Real Claude drafter. Activated only when an API key is present (see the install
 * wiring). The network path is unit-tested via an injected fetch.
 */
export class ClaudeResponder implements LeadResponder {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly skillInstructions?: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: ClaudeResponderOptions) {
    this.apiKey = opts.apiKey;
    this.model = opts.model && opts.model.trim() !== "" ? opts.model : DEFAULT_MODEL;
    this.skillInstructions = opts.skillInstructions;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async draft(lead: Lead, persona: ResolvedPersona): Promise<DraftedReply> {
    const res = await this.fetchImpl("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 600,
        messages: [
          {
            role: "user",
            content: buildPrompt(lead, persona, this.skillInstructions),
          },
        ],
      }),
    });

    if (!res.ok) {
      throw new Error(`claude_request_failed: ${res.status}`);
    }

    const data = (await res.json()) as AnthropicResponse;
    const text = (data.content ?? [])
      .map((c) => c.text ?? "")
      .join("")
      .trim();

    return { subject: subjectFor(lead), body: ensureDisclosure(text) };
  }
}
