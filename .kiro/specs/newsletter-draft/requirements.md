# Requirements Document — Newsletter Draft (live, on-demand)

## Introduction

> Source spec authored by Pax (PM persona). This document is the source of truth for *what* gets built and *why*. The design doc covers *how*. Kiro generates tasks from these two.
>
> **Productionizing slice #1.** First prototype→live capability for the Clockwork dogfood install (Joe). Uses Joe's real `newsletter-draft` skill (`skills/newsletter-draft.md`). Reshapes the existing `@clockwork/marketing` prototype; it does not add net-new robots.

### Problem & context

**The problem:** Joe already has a strong newsletter skill — one anchor story becomes a tight, voice-y 400–700 word piece he ships to his townhouse audience. But it only runs by hand inside his Cowork, and our prototype's Marketing robot does the *wrong thing* (bulk per-contact sphere sends with a generic stub draft). Joe has no fast, repeatable way to turn "here's today's story" into a publish-ready draft *in his own voice*.

**Who has it:** Joe — the real-estate agent, first dogfood customer and the centered end-user. He finds/receives a story worth a take and wants a draft he can review and publish himself, in minutes, that sounds like him.

**Why now:** It's the lowest-dependency of Joe's four real skills (no inbox, no CRM, no MLS gate, no client PII, no auto-send), so it's the fastest honest path to Joe using Clockwork on his real work — and it corrects a prototype mismatch rather than building something new.

### Goals & success

**North-star metric — draft acceptance:** the share of generated drafts Joe publishes with only light edits (proxy for "this sounds like me and is usable"). Target for a successful dogfood: a majority published as-is or lightly edited.

**Secondary signals:**
- Time from story submitted → draft ready (target: seconds, not minutes).
- Pieces published per week (adoption — is he actually using it).

### Scope

| In v1 | Not now (deferred) |
| --- | --- |
| Submit one anchor story (URL, pasted article text, or free-form notes) | Auto-sourcing stories — *`townhouse-stories`, next slice* |
| Draft one 400–700 word piece using Joe's real newsletter skill as instructions | Bulk sphere sends — *not what this skill does; corrects prototype* |
| Draft produced via Claude using **Joe's own API key** (on-model: his Claude) | Running the draft through Cowork — *latency/mechanism; API path is on-model* |
| Draft rendered for review: headline, body, word count, editor's notes | Auto-publish to a newsletter platform — *he ships manually; platform is a parked decision* |
| Joe marks a disposition (published-as-is / edited / discarded) | Voice self-improvement from those edits — *P2-A, deferred* |
| Clean refusal when input is too thin (per the skill's own rule) | `brain.md` / reference-file voice enrichment — *nice-to-have; skill is self-contained* |
| A real login gate for Joe (protects his API key; deployed surface) | Multi-user / other agents — *dogfood is Joe only* |

### Non-goals

- Bulk / per-contact sphere sends (that was the prototype's mistake; not what the newsletter skill does).
- Auto-publishing or auto-sending. Joe reviews and ships every piece himself.
- Sourcing the story (that's the `townhouse-stories` skill — the *next* slice, and it feeds this one).
- Any other robot, the CRM, the inbox, or agentfolio's buyer board.

### Constraints & assumptions

- **Stack / platform:** Reshape the existing `@clockwork/marketing` package (reuse `ClaudeMarketingDrafter` + `skillInstructions`; drop the bulk-send/sphere flow). Surface on the existing Next.js/Tailwind app shell. Draft store tenant-tagged; in-memory acceptable for the very first run, Postgres when hosted (see design).
- **Riskiest assumption:** the draft is good enough that Joe publishes it with only light edits. If the voice is off, he stops trusting it and the slice fails. Mitigation: his real skill text drives it; disposition capture tells us fast if it's not landing.
- **Out-of-scope dependencies (Joe's surface — owned by Joe, not built here):** Joe's **Anthropic API key**; optionally his `brain.md` voice + the skill's reference files (nice-to-have, not blocking — the `SKILL.md` is self-contained). The `newsletter-draft` skill text is already in the repo.
- **Compliance:** drafts are output Joe publishes himself; disclosed-AI/consent discipline is honored structurally where applicable (this feature produces drafts, not sends).

### Open questions

- [ ] *(Non-blocking)* Where does Joe's tool surface live long-term — a gated route in the agentfolio app (fastest now) or a separate lightweight "agent console"? v1 decides for speed (design §6); the clean product-boundary split is a **Later** roadmap item, not a blocker.

## Glossary

- **Newsletter_System**: The reshaped `@clockwork/marketing` capability plus the agentfolio `/newsletter` surface that turns one anchor story into a publish-ready draft.
- **Anchor_Story**: The single source input for a draft — a URL, pasted article text, or free-form notes.
- **Skill_Instructions**: The text of `skills/newsletter-draft.md`, loaded and passed to the model as drafting instructions.
- **Draft**: The generated output — property-first headline, body, word count, and editor's notes.
- **Editor_Notes**: The skill's flagged inferences and facts-to-verify, attached to a draft for Joe.
- **Disposition**: Joe's recorded outcome for a draft — `published-as-is`, `edited`, or `discarded`.
- **Refusal**: A clean, guidance-shaped response (not an error) when input is too thin or off-model per the skill's own rules.
- **Story_Resolver**: The component that turns an `Anchor_Story` into source text (fetch URL text; use pasted text/notes directly).

## Requirements

### Requirement 1: Turn a story into a draft

**User Story:** As Joe, I want to submit one story and get a publish-ready newsletter draft, so that I can ship a piece in minutes instead of writing from scratch.

#### Acceptance Criteria

1. WHEN Joe submits an Anchor_Story as a URL, pasted article text, or free-form notes, THE Newsletter_System SHALL produce a single Draft using the `newsletter-draft` Skill_Instructions as the drafting instructions.
2. WHEN a Draft is produced, THE Newsletter_System SHALL return a property-first headline, the body, the word count, and the Editor_Notes.
3. WHEN a Draft is produced, THE Newsletter_System SHALL set the displayed word count to the actual word count of the returned body.
4. WHEN Joe submits a URL, THE Story_Resolver SHALL attempt to retrieve the article text to draft from.
5. IF URL retrieval fails, THEN THE Newsletter_System SHALL inform Joe and allow him to paste the article text instead, without fabricating content.

### Requirement 2: It sounds like Joe

**User Story:** As Joe, I want the draft in my own voice, so that I can publish it with light edits and trust it in front of my audience.

#### Acceptance Criteria

1. WHEN the Newsletter_System drafts, THE Newsletter_System SHALL use the `newsletter-draft` Skill_Instructions loaded from `skills/` as the model instructions rather than a generic prompt.
2. WHEN the Newsletter_System calls the model, THE Newsletter_System SHALL authenticate with Joe's own Anthropic API key supplied as a secret.
3. IF no Anthropic API key is configured, THEN THE Newsletter_System SHALL display a setup message and SHALL NOT fall back to a generic stub draft.

### Requirement 3: Refuse thin input cleanly

**User Story:** As Joe, I want the tool to tell me when a story is too thin, so that it never manufactures authority and embarrasses me.

#### Acceptance Criteria

1. IF the Anchor_Story is too thin to support a real take (for example, a headline with no body or notes), THEN THE Newsletter_System SHALL return the skill's clean Refusal stating what it needs (article body or Joe's notes) and SHALL NOT produce a fabricated Draft.
2. IF the Anchor_Story is a celebrity-with-property-as-backdrop per the skill's refusal rules, THEN THE Newsletter_System SHALL surface a Refusal that asks for a property-first angle.
3. WHEN the Newsletter_System returns a Refusal, THE Newsletter_System SHALL record the outcome as a refusal state distinct from an error state.

### Requirement 4: Review, capture disposition, reuse

**User Story:** As Joe, I want to review the draft, copy it out, and record what I did with it, so that I can publish it and so we learn whether the tool is working.

#### Acceptance Criteria

1. WHEN a Draft is shown, THE Newsletter_System SHALL allow Joe to copy the full Draft in one action.
2. WHEN Joe finishes with a Draft, THE Newsletter_System SHALL allow Joe to mark the Disposition as `published-as-is`, `edited`, or `discarded`.
3. WHEN a Disposition is recorded, THE Newsletter_System SHALL persist the Disposition with the Draft and the timestamps `story_submitted_at` and `draft_ready_at`.
4. THE Newsletter_System SHALL persist every Draft record tagged with a `tenantId` so that cross-tenant reads are not expressible.

### Requirement 5: Failure is graceful

**User Story:** As Joe, I want clear behavior when the AI call fails, so that a hiccup never leaves me stuck or staring at a broken screen.

#### Acceptance Criteria

1. WHEN the model call errors or times out, THE Newsletter_System SHALL show a plain-language error message and offer a retry while preserving Joe's submitted Anchor_Story.
2. IF the model is rate-limited, THEN THE Newsletter_System SHALL surface a rate-limit-specific message and allow Joe to retry.

### Requirement 6: Access is gated for Joe

**User Story:** As Joe, I want the deployed tool to require login, so that my paid Anthropic API key is not exposed to an open, abusable page.

#### Acceptance Criteria

1. WHERE the Newsletter_System is deployed as a route in the agentfolio app, THE Newsletter_System SHALL require an authenticated actor to access the route.
2. IF an unauthenticated request reaches the newsletter route, THEN THE Newsletter_System SHALL deny access and redirect the request to the login surface.
3. THE Newsletter_System SHALL resolve the authenticated actor server-side before performing any draft, resolve, or disposition action.
