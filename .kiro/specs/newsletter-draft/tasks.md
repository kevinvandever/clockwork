# Implementation Plan

- [x] 1. Reshape the marketing drafter to a single-anchor-story newsletter contract
  - In `@clockwork/marketing`, introduce `StoryInput` (`{ kind: "url" | "text" | "notes"; value: string }`) and a `NewsletterDraft` result (`{ headline, body, wordCount, editorNotes: string[], status: "ready" | "refused", refusalReason? }`)
  - Retire the bulk sphere path (`runMarketingNewsletter` per-recipient send, audience-based `NewsletterInput`); the skill drafts one piece, it does not send
  - Update the `MarketingDrafter` interface and `StubMarketingDrafter` to the one-story contract; word count reflects the actual body
  - Unit tests: stub returns headline/body/wordCount/editorNotes; retiring the send path breaks nothing else
  - _Requirements: 1, 2_

- [x] 2. Implement the Claude newsletter drafter with output parsing and refusal
  - Update `ClaudeMarketingDrafter` to `{ apiKey, model?, skillInstructions?, fetchImpl? }`; send Skill_Instructions + resolved story; parse the model response into headline/body/wordCount/editorNotes
  - Detect the skill's clean refusal (thin input / celebrity-as-backdrop) and return `status: "refused"` with a reason — distinct from a thrown error
  - Unit tests with an injected fetch: successful parse, refusal parse, and the no-API-key guard (no stub fallback)
  - _Requirements: 1, 2, 3_

- [x] 3. Build the Story_Resolver
  - New module: resolve a `StoryInput` to source text — URL → fetch + extract article text (injected fetch); `text`/`notes` → passthrough; enforce a max-length cap
  - On URL fetch failure, return a typed "needs paste" outcome; never fabricate content
  - Unit tests: URL success, URL failure → needs-paste, oversize → trim signal, text/notes passthrough
  - _Requirements: 1_

- [x] 4. Create the tenant-tagged NewsletterDraft store
  - `NewsletterDraftStore` interface + `InMemoryNewsletterDraftStore`; record `{ id, tenantId, input, resolvedSourceText?, headline, body, wordCount, editorNotes, status, refusalReason?, disposition?, storySubmittedAt, draftReadyAt? }`
  - `tenantId` required on create/get/list so cross-tenant reads are not expressible
  - Unit tests: create/get/list, tenant isolation, disposition update
  - _Requirements: 4_

- [x] 5. Implement the draft orchestration service
  - Compose resolver + drafter + store: `submit(tenantId, storyInput)` → record `storySubmittedAt` → resolve → draft via Claude (injected API key) → parse → persist `status` ready/refused + `draftReadyAt`
  - Surface error / timeout / rate-limit / missing-key as typed results; preserve the submitted story on failure
  - Unit tests (fake fetch): ready path, refusal path, URL-needs-paste, model error, timeout, rate-limit, missing key
  - _Requirements: 1, 2, 3, 5_

- [x] 6. Wire Skill_Instructions loading
  - Load `skills/newsletter-draft.md` (reuse the `loadSkills` pattern from `@clockwork/install`) and pass it as the drafting instructions into orchestration
  - Unit test: orchestration passes the loaded skill text to the drafter (not a generic prompt)
  - _Requirements: 2_

- [x] 7. Add the agentfolio `/newsletter` route with all states
  - New server-rendered route in `apps/agentfolio`: empty (paste-story form), loading, draft view (headline / body / word count / editor notes + one-click copy), refusal (guidance, not error), error (retry with story preserved)
  - Server actions `submitStory` and `setDisposition` call orchestration/store server-side only (never expose the API key or store to the client)
  - _Requirements: 1, 3, 4, 5_

- [x] 8. Capture disposition and timestamps
  - Disposition controls (`published-as-is` / `edited` / `discarded`) persist through the store with `storySubmittedAt` / `draftReadyAt`
  - Unit test: disposition persists and timestamps are recorded (north-star instrumentation)
  - _Requirements: 4_

- [x] 9. Gate the route behind real auth
  - Replace the demo unsigned cookie for this route with a real single-user agent login; deny unauthenticated requests and redirect to login; resolve the actor server-side before any draft/resolve/disposition action
  - Access-control test: unauthenticated blocked; authenticated agent allowed
  - _Requirements: 6_

- [x] 10. End-to-end wiring and verification
  - Wire route → orchestration → Claude drafter (Joe's key) → store; confirm build → lint → typecheck → test all green and CI passes
  - E2E test (fake fetch): story submitted → draft ready → disposition recorded
  - _Requirements: 1, 2, 3, 4, 5, 6_
