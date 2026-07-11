import type {
  MarketingDrafter,
  NewsletterDraft,
  StoryInput,
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

/**
 * Parse the skill's markdown output into the structured NewsletterDraft fields.
 *
 * Expected shape from the skill:
 *   # [Headline]
 *   [body paragraphs]
 *   ---
 *   **Word count:** N
 *   **Editor's notes** _(for Joe — strip before publishing)_:
 *   - [note 1]
 *   - [note 2]
 */
export function parseSkillOutput(text: string): NewsletterDraft {
  const trimmed = text.trim();

  // Detect refusal: no `# ` heading means the skill refused to draft.
  const headlineMatch = trimmed.match(/^#\s+(.+)$/m);
  if (!headlineMatch) {
    return {
      headline: "",
      body: "",
      wordCount: 0,
      editorNotes: [],
      status: "refused",
      refusalReason: trimmed,
    };
  }

  const headline = headlineMatch[1].trim();
  const headlineIndex = trimmed.indexOf(headlineMatch[0]);
  const afterHeadline = trimmed.slice(headlineIndex + headlineMatch[0].length);

  // Extract editor's notes (bullets after the **Editor's notes** header)
  const editorNotesMatch = afterHeadline.match(
    /\*\*Editor['']s notes\*\*[^\n]*:\s*\n([\s\S]*?)$/i,
  );
  const editorNotes: string[] = [];
  if (editorNotesMatch) {
    const bullets = editorNotesMatch[1].trim().split("\n");
    for (const bullet of bullets) {
      const cleaned = bullet.replace(/^[-*]\s*/, "").trim();
      if (cleaned) editorNotes.push(cleaned);
    }
  }

  // Extract word count from **Word count:** N line
  const wordCountMatch = afterHeadline.match(/\*\*Word count:\*\*\s*(\d+)/i);

  // Body is everything between the headline and the word-count/editor-notes markers.
  // Remove the dek (italic line right after headline) from body extraction — include it.
  let bodyText = afterHeadline;

  // Strip from the horizontal rule or word-count line onward
  const hrIndex = bodyText.indexOf("\n---");
  const wordCountLineIndex = bodyText.search(/\n\*\*Word count:\*\*/i);
  const editorNotesLineIndex = bodyText.search(
    /\n\*\*Editor['']s notes\*\*/i,
  );

  // Find the earliest "metadata" boundary
  const boundaries = [hrIndex, wordCountLineIndex, editorNotesLineIndex]
    .filter((i) => i >= 0);
  if (boundaries.length > 0) {
    const cutoff = Math.min(...boundaries);
    bodyText = bodyText.slice(0, cutoff);
  }

  const body = bodyText.trim();
  const wordCount = wordCountMatch
    ? parseInt(wordCountMatch[1], 10)
    : body.split(/\s+/).filter(Boolean).length;

  return {
    headline,
    body,
    wordCount,
    editorNotes,
    status: "ready",
  };
}

/**
 * Real Claude newsletter drafter. Activated only when an API key is present.
 * Sends Joe's skill instructions as the system message and the story as the
 * user message. Parses the structured markdown output or detects a refusal.
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

  async draftNewsletter(input: StoryInput): Promise<NewsletterDraft> {
    const userMessage = this.buildUserMessage(input);

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: 4096,
      messages: [{ role: "user", content: userMessage }],
    };

    // Use skill instructions as the system message when available
    if (this.skillInstructions) {
      body.system = this.skillInstructions;
    }

    const res = await this.fetchImpl("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      if (res.status === 429) {
        throw new Error("claude_rate_limited: 429");
      }
      throw new Error(`claude_request_failed: ${res.status}`);
    }

    const data = (await res.json()) as AnthropicResponse;
    const text = (data.content ?? [])
      .map((c) => c.text ?? "")
      .join("")
      .trim();

    return parseSkillOutput(text);
  }

  private buildUserMessage(input: StoryInput): string {
    const kindLabel =
      input.kind === "url"
        ? "Story URL"
        : input.kind === "text"
          ? "Article text"
          : "Notes";
    return `Draft a newsletter piece from the following anchor story.\n\n${kindLabel}:\n${input.value}`;
  }
}
