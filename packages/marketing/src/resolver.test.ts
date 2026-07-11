import { describe, it, expect } from "vitest";
import { resolveStory } from "./resolver.js";
import type { StoryInput } from "./drafter.js";

/** Helper: create a mock fetch that returns the given HTML with status 200. */
function mockFetch(html: string, status = 200): typeof fetch {
  return async () =>
    new Response(html, {
      status,
      headers: { "Content-Type": "text/html" },
    });
}

/** Helper: create a mock fetch that throws a network error. */
function throwingFetch(): typeof fetch {
  return async () => {
    throw new Error("Network error");
  };
}

describe("resolveStory", () => {
  describe("text/notes passthrough", () => {
    it("returns resolved for text input", async () => {
      const input: StoryInput = { kind: "text", value: "Some article body" };
      const result = await resolveStory(input);
      expect(result).toEqual({ status: "resolved", text: "Some article body" });
    });

    it("returns resolved for notes input", async () => {
      const input: StoryInput = {
        kind: "notes",
        value: "My quick notes on the market",
      };
      const result = await resolveStory(input);
      expect(result).toEqual({
        status: "resolved",
        text: "My quick notes on the market",
      });
    });
  });

  describe("URL success", () => {
    it("fetches and extracts text from HTML", async () => {
      const html = `
        <html>
          <head><title>Test</title></head>
          <body>
            <h1>Market Update</h1>
            <p>The spring market is heating up in Brooklyn.</p>
          </body>
        </html>
      `;
      const input: StoryInput = {
        kind: "url",
        value: "https://example.com/article",
      };
      const result = await resolveStory(input, { fetchImpl: mockFetch(html) });

      expect(result.status).toBe("resolved");
      if (result.status === "resolved") {
        expect(result.text).toContain("Market Update");
        expect(result.text).toContain(
          "The spring market is heating up in Brooklyn.",
        );
      }
    });

    it("strips script and style tags from extracted text", async () => {
      const html = `
        <html>
          <body>
            <script>var x = 1;</script>
            <style>.foo { color: red; }</style>
            <p>Only this text should remain.</p>
          </body>
        </html>
      `;
      const input: StoryInput = {
        kind: "url",
        value: "https://example.com/article",
      };
      const result = await resolveStory(input, { fetchImpl: mockFetch(html) });

      expect(result.status).toBe("resolved");
      if (result.status === "resolved") {
        expect(result.text).toContain("Only this text should remain.");
        expect(result.text).not.toContain("var x = 1");
        expect(result.text).not.toContain("color: red");
      }
    });
  });

  describe("URL failure → needs_paste", () => {
    it("returns needs_paste on non-200 status", async () => {
      const input: StoryInput = {
        kind: "url",
        value: "https://example.com/paywalled",
      };
      const result = await resolveStory(input, {
        fetchImpl: mockFetch("Forbidden", 403),
      });

      expect(result.status).toBe("needs_paste");
      if (result.status === "needs_paste") {
        expect(result.reason).toContain("HTTP 403");
        expect(result.reason).toContain("paste");
      }
    });

    it("returns needs_paste on network error", async () => {
      const input: StoryInput = {
        kind: "url",
        value: "https://unreachable.example.com",
      };
      const result = await resolveStory(input, {
        fetchImpl: throwingFetch(),
      });

      expect(result.status).toBe("needs_paste");
      if (result.status === "needs_paste") {
        expect(result.reason).toContain("network error");
        expect(result.reason).toContain("paste");
      }
    });
  });

  describe("oversize → needs_paste", () => {
    it("returns needs_paste when text input exceeds maxLength", async () => {
      const input: StoryInput = { kind: "text", value: "a".repeat(100) };
      const result = await resolveStory(input, { maxLength: 50 });

      expect(result.status).toBe("needs_paste");
      if (result.status === "needs_paste") {
        expect(result.reason).toContain("exceeds maximum length");
      }
    });

    it("returns needs_paste when fetched URL text exceeds maxLength", async () => {
      const longBody = "word ".repeat(20_000);
      const html = `<html><body><p>${longBody}</p></body></html>`;
      const input: StoryInput = {
        kind: "url",
        value: "https://example.com/long",
      };
      const result = await resolveStory(input, {
        fetchImpl: mockFetch(html),
        maxLength: 100,
      });

      expect(result.status).toBe("needs_paste");
      if (result.status === "needs_paste") {
        expect(result.reason).toContain("exceeds maximum length");
      }
    });

    it("returns needs_paste when notes input exceeds maxLength", async () => {
      const input: StoryInput = { kind: "notes", value: "x".repeat(200) };
      const result = await resolveStory(input, { maxLength: 100 });

      expect(result.status).toBe("needs_paste");
      if (result.status === "needs_paste") {
        expect(result.reason).toContain("exceeds maximum length");
      }
    });
  });
});
