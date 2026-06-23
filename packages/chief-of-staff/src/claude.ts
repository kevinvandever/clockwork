import type { ResolvedPersona } from "@clockwork/config";
import type { OversightSummary } from "./oversight.js";
import type { Brief, BriefWriter } from "./writer.js";

/** Overridable via ANTHROPIC_MODEL. */
export const DEFAULT_MODEL = "claude-sonnet-4-5";

export interface ClaudeBriefOptions {
  apiKey: string;
  model?: string;
  /** Joe's Chief of Staff skill text, used as instructions when present. */
  skillInstructions?: string;
  fetchImpl?: typeof fetch;
}

interface AnthropicResponse {
  content?: { type: string; text?: string }[];
}

export function buildPrompt(
  summary: OversightSummary,
  persona: ResolvedPersona,
  skillInstructions?: string,
): string {
  const base = [
    `You are ${persona.name}, the ${persona.role} for a real estate agent.`,
    "Write a concise daily synthesis brief from the JSON activity summary below.",
    'Start the first line with "Headline: <one line>", a blank line, then a short',
    "body: what happened, what stands out, and anything to flag. Under 150 words.",
    `Sign off as ${persona.name}.`,
    "",
    "ACTIVITY SUMMARY (JSON):",
    JSON.stringify(
      { window: summary.window, totalEvents: summary.totalEvents, byRobot: summary.byRobot },
      null,
      2,
    ),
  ].join("\n");
  return skillInstructions ? `${skillInstructions}\n\n---\n\n${base}` : base;
}

function parseBrief(text: string): Brief {
  const lines = text.split("\n");
  const first = (lines[0] ?? "").trim();
  if (/^headline:/i.test(first)) {
    const headline =
      first.replace(/^headline:\s*/i, "").trim() || "Daily brief";
    return { headline, body: lines.slice(1).join("\n").trim() };
  }
  return { headline: "Daily brief", body: text.trim() };
}

/** Real Claude brief writer; activated only when an API key is present. */
export class ClaudeBriefWriter implements BriefWriter {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly skillInstructions?: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: ClaudeBriefOptions) {
    this.apiKey = opts.apiKey;
    this.model = opts.model && opts.model.trim() !== "" ? opts.model : DEFAULT_MODEL;
    this.skillInstructions = opts.skillInstructions;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async write(
    summary: OversightSummary,
    persona: ResolvedPersona,
  ): Promise<Brief> {
    const res = await this.fetchImpl("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 700,
        messages: [
          {
            role: "user",
            content: buildPrompt(summary, persona, this.skillInstructions),
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
    return parseBrief(text);
  }
}
