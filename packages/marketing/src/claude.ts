import { ensureDisclosure } from "@clockwork/connector-core";
import type {
  MarketingDrafter,
  NewsletterDraft,
  NewsletterInput,
} from "./drafter.js";

/** Overridable via ANTHROPIC_MODEL (ids change over time). */
export const DEFAULT_MODEL = "claude-sonnet-4-5";

export interface ClaudeMarketingOptions {
  apiKey: string;
  model?: string;
  /** Joe's newsletter skill text, used as the system instructions when present. */
  skillInstructions?: string;
  /** Injectable for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

interface AnthropicResponse {
  content?: { type: string; text?: string }[];
}

export function buildPrompt(
  input: NewsletterInput,
  skillInstructions?: string,
): string {
  const { persona, context, audienceSize } = input;
  const base = [
    `You are ${persona.name}, the ${persona.role} voice for a real estate agent.`,
    "Write a short, warm sphere newsletter (under 200 words). Start the first line",
    'with "Subject: <subject line>", then a blank line, then the body. Sign off as',
    `${persona.name}. Audience size: ${audienceSize}. Topic/notes: ${context ?? "general local market update"}.`,
  ].join("\n");
  return skillInstructions ? `${skillInstructions}\n\n---\n\n${base}` : base;
}

function parseNewsletter(text: string): NewsletterDraft {
  const lines = text.split("\n");
  const first = (lines[0] ?? "").trim();
  if (/^subject:/i.test(first)) {
    const subject = first.replace(/^subject:\s*/i, "").trim() || "Your local market update";
    return { subject, body: ensureDisclosure(lines.slice(1).join("\n").trim()) };
  }
  return { subject: "Your local market update", body: ensureDisclosure(text) };
}

/**
 * Real Claude newsletter drafter. Activated only when an API key is present.
 * The network path is unit-tested via an injected fetch.
 */
export class ClaudeMarketingDrafter implements MarketingDrafter {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly skillInstructions?: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: ClaudeMarketingOptions) {
    this.apiKey = opts.apiKey;
    this.model = opts.model && opts.model.trim() !== "" ? opts.model : DEFAULT_MODEL;
    this.skillInstructions = opts.skillInstructions;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async draftNewsletter(input: NewsletterInput): Promise<NewsletterDraft> {
    const res = await this.fetchImpl("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 800,
        messages: [
          { role: "user", content: buildPrompt(input, this.skillInstructions) },
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
    return parseNewsletter(text);
  }
}
