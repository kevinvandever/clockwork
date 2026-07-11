import type { StoryInput } from "./drafter.js";

/** The result of resolving a StoryInput to source text. */
export type ResolveResult =
  | { status: "resolved"; text: string }
  | { status: "needs_paste"; reason: string };

/** Options for resolveStory. */
export interface ResolveOptions {
  /** Injected fetch implementation (defaults to global fetch). */
  fetchImpl?: typeof fetch;
  /** Maximum character length for resolved text. Defaults to 50000. */
  maxLength?: number;
}

const DEFAULT_MAX_LENGTH = 50_000;

/**
 * Strip HTML tags and decode basic entities to extract text content.
 * Intentionally simple — no readability parser needed for v1.
 */
function extractTextFromHtml(html: string): string {
  // Remove script and style blocks entirely
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, "");
  // Replace block-level elements with newlines
  text = text.replace(/<\/(p|div|h[1-6]|li|tr|br\s*\/?)>/gi, "\n");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  // Strip remaining tags
  text = text.replace(/<[^>]+>/g, "");
  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
  // Collapse whitespace and trim
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

/**
 * Resolve a StoryInput to source text suitable for drafting.
 *
 * - `text` / `notes` → passthrough
 * - `url` → fetch + extract article text (using injected or global fetch)
 * - On URL fetch failure, returns a typed "needs_paste" outcome (never fabricates)
 * - Enforces a max-length cap; oversized input → needs_paste
 */
export async function resolveStory(
  input: StoryInput,
  opts?: ResolveOptions,
): Promise<ResolveResult> {
  const maxLength = opts?.maxLength ?? DEFAULT_MAX_LENGTH;

  if (input.kind === "text" || input.kind === "notes") {
    if (input.value.length > maxLength) {
      return {
        status: "needs_paste",
        reason:
          "Input exceeds maximum length. Please paste only the article body.",
      };
    }
    return { status: "resolved", text: input.value };
  }

  // kind === "url"
  const fetchFn = opts?.fetchImpl ?? fetch;

  let response: Response;
  try {
    response = await fetchFn(input.value);
  } catch {
    return {
      status: "needs_paste",
      reason: `Failed to fetch URL: network error. Please paste the article text instead.`,
    };
  }

  if (!response.ok) {
    return {
      status: "needs_paste",
      reason: `Failed to fetch URL: HTTP ${response.status}. Please paste the article text instead.`,
    };
  }

  const html = await response.text();
  const text = extractTextFromHtml(html);

  if (text.length > maxLength) {
    return {
      status: "needs_paste",
      reason:
        "Input exceeds maximum length. Please paste only the article body.",
    };
  }

  return { status: "resolved", text };
}
