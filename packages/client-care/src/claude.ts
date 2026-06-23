import { ensureDisclosure } from "@clockwork/connector-core";
import type { CareDraft, CareTouchInput, ClientCareDrafter } from "./drafter.js";

/** Overridable via ANTHROPIC_MODEL. */
export const DEFAULT_MODEL = "claude-sonnet-4-5";

export interface ClaudeClientCareOptions {
  apiKey: string;
  model?: string;
  /** Joe's Client Care skill text, used as instructions when present. */
  skillInstructions?: string;
  fetchImpl?: typeof fetch;
}

interface AnthropicResponse {
  content?: { type: string; text?: string }[];
}

export function buildPrompt(
  input: CareTouchInput,
  skillInstructions?: string,
): string {
  const { persona, contact, reason } = input;
  const base = [
    `You are ${persona.name}, the ${persona.role} voice for a real estate agent.`,
    `Write a short, warm, personal note to ${contact.name ?? "a past client"}`,
    `for this reason: ${reason}. Keep it under 90 words, genuine, no hard sell.`,
    'Start the first line with "Subject: <subject>", a blank line, then the body.',
    `Sign off as ${persona.name}.`,
  ].join("\n");
  return skillInstructions ? `${skillInstructions}\n\n---\n\n${base}` : base;
}

function parseTouch(text: string): CareDraft {
  const lines = text.split("\n");
  const first = (lines[0] ?? "").trim();
  if (/^subject:/i.test(first)) {
    const subject =
      first.replace(/^subject:\s*/i, "").trim() || "Thinking of you";
    return {
      subject,
      body: ensureDisclosure(lines.slice(1).join("\n").trim()),
    };
  }
  return { subject: "Thinking of you", body: ensureDisclosure(text) };
}

/** Real Claude Client Care drafter; activated only when an API key is present. */
export class ClaudeClientCareDrafter implements ClientCareDrafter {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly skillInstructions?: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: ClaudeClientCareOptions) {
    this.apiKey = opts.apiKey;
    this.model = opts.model && opts.model.trim() !== "" ? opts.model : DEFAULT_MODEL;
    this.skillInstructions = opts.skillInstructions;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async draftTouch(input: CareTouchInput): Promise<CareDraft> {
    const res = await this.fetchImpl("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 500,
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
    return parseTouch(text);
  }
}
