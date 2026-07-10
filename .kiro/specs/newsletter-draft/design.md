# Design — Newsletter Draft (live, on-demand)

> Companion to the requirements doc. This covers *how* it works: data, flows, states, and the decisions a builder would otherwise have to invent. Kiro reads this alongside requirements to generate tasks.

## 1. Overview

Joe opens a simple page, pastes a story (URL, article text, or notes), and gets one publish-ready draft in his voice — headline, body, word count, editor's notes — which he reviews, copies, and marks as published/edited/discarded. Under the hood this **reshapes the existing `@clockwork/marketing` package**: keep `ClaudeMarketingDrafter` (which already accepts `skillInstructions`), swap the input from "sphere + context" to "one anchor story," drop the per-contact send entirely, and drive the model with Joe's real `newsletter-draft` skill and **his own Anthropic API key**. On-demand only — no watcher, no schedule, no CRM, no auto-send.

## 2. Data model

One tenant-tagged entity. Deliberately small.

| Entity | Key fields | Notes / relationships |
| --- | --- | --- |
| `NewsletterDraft` | `id`, `tenantId`, `input: { kind: "url"\|"text"\|"notes", value }`, `resolvedSourceText?`, `headline`, `body`, `wordCount`, `editorNotes: string[]`, `status: "drafting"\|"ready"\|"refused"\|"error"`, `refusalReason?`, `disposition?: "published"\|"edited"\|"discarded"`, `storySubmittedAt`, `draftReadyAt?` | Belongs to one tenant. `resolvedSourceText` is the fetched/pasted article the draft was built from (for provenance + the editor's-notes verification). |

Persistence: reuse the project's store-interface pattern — in-memory is acceptable for the very first local run; a Postgres-backed implementation when the tool is hosted (same seam as the rest of the system). `tenantId` required on every read/write (cross-tenant reads inexpressible), even though the dogfood is single-tenant.

## 3. Roles & permissions

| Role | Can do | Cannot do |
| --- | --- | --- |
| Joe (agent) | Submit a story, view/copy the draft, set disposition, view his past drafts | — |

Single-role tool. **No client-facing side** — the newsletter is public output Joe publishes himself, so there is no agent-private/client split here (unlike agentfolio). But the surface is deployed and calls Joe's paid API, so it needs a **real login gate** (see §6), not the demo cookie.

## 4. Primary user flow

1. Joe opens the newsletter tool → sees an empty state with one input (paste a URL / article text / notes) and a "Draft it" action.
2. Joe submits → system records `storySubmittedAt`, resolves the source (fetch URL text, or use pasted text/notes) → status `drafting`.
3. System builds the model prompt = Joe's `newsletter-draft` skill text (as instructions) + the resolved story → calls Claude with Joe's API key.
4. System parses the response into headline / body / word count / editor's notes → status `ready`, records `draftReadyAt`.
5. Joe reviews the draft (word count + editor's notes visible), copies it out in one click, publishes it himself.
6. Joe marks disposition (`published-as-is` / `edited` / `discarded`). Recorded against the draft.

## 5. States to handle

- **Empty state:** no draft yet — a single clear "paste your story" input with a one-line hint on the three accepted input kinds.
- **Loading state:** "Drafting in your voice…" while the model call is in flight; Joe's submitted story stays visible.
- **Error state:** model error/timeout → plain-language message + Retry, submitted story preserved. Rate-limited → says so specifically. No API key configured → setup message (how to add the key), no stub fallback.
- **Refusal state (distinct from error):** input too thin / celebrity-backdrop → the skill's clean refusal shown as guidance ("send me the article body or your notes"), not an error.
- **First-run:** same as empty, plus a one-line note that this uses his newsletter skill + his Claude key.

## 6. Key decisions & tradeoffs

- **Decision:** Reshape `@clockwork/marketing`, don't rebuild. **Why:** `ClaudeMarketingDrafter` + `skillInstructions` already exists; we change input shape and drop bulk-send. **Tradeoff:** leaves a now-unused sphere-send path in the package — mark it deprecated/removed so the package matches Joe's real skill and doesn't mislead later.
- **Decision:** Draft via the **Anthropic API using Joe's own key**, not his Cowork session. **Why:** on-model (his Claude, his skill, his billing; we're the thin wrapper) and the only mechanism that returns a draft programmatically in seconds. **Tradeoff:** we author the prompt assembly around his skill text rather than executing the skill inside Cowork; if Cowork later exposes programmatic skill invocation, revisit.
- **Decision:** **Drafts-only; Joe publishes manually.** **Why:** matches the skill ("draft, never send") and sidesteps the parked "which newsletter platform" decision. **Tradeoff:** no delivery automation in v1 — acceptable, publishing is one copy-paste.
- **Decision:** v1 surface = a **gated route in the existing agentfolio Next.js app**. **Why:** fastest usable path — Tailwind, deploy, and an auth pattern already exist; Joe gets a real page, not a terminal. **Tradeoff:** agentfolio is the "sold-separately buyer app," so hosting Joe's internal tool there muddies the product boundary. Accept for dogfood speed; **split into a dedicated "agent console" is a Later roadmap item.**
- **Decision:** **Real login gate for Joe** replaces the demo unsigned cookie *for this deployed tool*. **Why:** it's on the internet and spends his paid API budget; an open page is abuse-exposed. **Tradeoff:** a little auth work now — but it's the same hardening agentfolio needs anyway, started here at minimum viable (single-user).
- **Decision:** Capture disposition + timestamps from day one. **Why:** it's the north-star instrument *and* the seed corpus for P2-A voice-improvement. **Tradeoff:** one extra click for Joe — worth it; it's how we know the slice worked.

## 7. Edge cases & error handling

- **Thin input** → skill's clean refusal (ask for body/notes); never fabricate. Status `refused`, not `error`.
- **Paywalled URL** → per the skill, note the paywall and draft from the visible gist / ask Joe to paste; don't invent body details.
- **URL fetch fails / non-article page** → tell Joe, offer the paste path.
- **Oversized paste** → cap input length; if exceeded, ask Joe to trim to the article body.
- **Draft lands outside 400–700 words** → still show it, surface the word count prominently; the skill self-polices, but we don't silently hide a miss.
- **Model timeout / rate limit / API error** → graceful message + retry, story preserved (Story 5).
- **Missing API key** → setup guidance, no stub fallback (Story 2).

## 8. Multi-perspective review notes

- **UX:** Clean — the primary flow is one obvious action (paste → Draft it → review/copy). Watch two things: make the **refusal state feel like helpful guidance, not failure**, and make the **word count + editor's notes visible without hunting** (they're the trust signals that make Joe hit publish).
- **Technical:** Two real bits of work behind the simple screen — **parsing the model output** reliably into headline/body/word-count/editor-notes (define a clear output contract in the prompt), and **URL→article-text retrieval** (fetch + readability; flaky, so the paste fallback is mandatory, not optional). API key handling is a secret, not config. The store seam and tenant-tagging are already established patterns — low risk.
- **Executive:** Cheapest thing that proves the bet: does Joe *publish* the drafts? The disposition capture is the whole measurement — if published-as-is/edited dominates, the voice works and we extend the pattern to his other skills; if discarded dominates, we fix voice before building anything else. Minimal cost, direct read on the core assumption.
