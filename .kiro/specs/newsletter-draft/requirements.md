# Requirements — Newsletter Draft (live, on-demand)

> Source spec authored by Pax (PM persona). This document is the source of truth for *what* gets built and *why*. The design doc covers *how*. Kiro generates tasks from these two.
>
> **Productionizing slice #1.** First prototype→live capability for the Clockwork dogfood install (Joe). Uses Joe's real `newsletter-draft` skill (`skills/newsletter-draft.md`). Reshapes the existing `@clockwork/marketing` prototype, does not add net-new robots.

## 1. Problem & context

**The problem:** Joe already has a strong newsletter skill — one anchor story becomes a tight, voice-y 400–700 word piece he ships to his townhouse audience. But it only runs by hand inside his Cowork, and our prototype's Marketing robot does the *wrong thing* (bulk per-contact sphere sends with a generic stub draft). Joe has no fast, repeatable way to turn "here's today's story" into a publish-ready draft *in his own voice*.

**Who has it:** Joe — the real-estate agent, first dogfood customer and the centered end-user. He finds/receives a story worth a take and wants a draft he can review and publish himself, in minutes, that sounds like him.

**Why now:** It's the lowest-dependency of Joe's four real skills (no inbox, no CRM, no MLS gate, no client PII, no auto-send), so it's the fastest honest path to Joe using Clockwork on his real work — and it corrects a prototype mismatch rather than building something new.

## 2. Goals & success

**North-star metric:** **draft acceptance** — the share of generated drafts Joe publishes with only light edits (proxy for "this sounds like me and is usable"). Target for a successful dogfood: a majority published as-is or lightly edited.

**Secondary signals:**
- Time from story submitted → draft ready (target: seconds, not minutes).
- Pieces published per week (adoption — is he actually using it).

**Non-goals:**
- Bulk / per-contact sphere sends (that was the prototype's mistake; not what the newsletter skill does).
- Auto-publishing or auto-sending. Joe reviews and ships every piece himself.
- Sourcing the story (that's the `townhouse-stories` skill — the *next* slice, and it feeds this one).
- Any other robot, the CRM, the inbox, or agentfolio's buyer board.

## 3. Scope

| In v1 | Not now (deferred) |
| --- | --- |
| Submit one anchor story (URL, pasted article text, or free-form notes) | Auto-sourcing stories — *`townhouse-stories`, next slice* |
| Draft one 400–700 word piece using Joe's real newsletter skill as instructions | Bulk sphere sends — *not what this skill does; corrects prototype* |
| Draft produced via Claude using **Joe's own API key** (on-model: his Claude) | Running the draft through Cowork — *latency/mechanism; API path is on-model* |
| Draft rendered for review: headline, body, word count, editor's notes | Auto-publish to a newsletter platform — *he ships manually; platform is a parked decision* |
| Joe marks a disposition (published-as-is / edited / discarded) | Voice self-improvement from those edits — *P2-A, deferred* |
| Clean refusal when input is too thin (per the skill's own rule) | `brain.md` / reference-file voice enrichment — *nice-to-have; skill is self-contained* |
| A real login gate for Joe (protects his API key; deployed surface) | Multi-user / other agents — *dogfood is Joe only* |

## 4. User stories & acceptance criteria

### Story 1 — Turn a story into a draft
**As** Joe, **I want** to submit one story and get a publish-ready newsletter draft, **so that** I can ship a piece in minutes instead of writing from scratch.

**Acceptance criteria:**
- WHEN Joe submits a story as a URL, pasted article text, or free-form notes THEN the system SHALL produce a single draft using his `newsletter-draft` skill as the drafting instructions.
- WHEN a draft is produced THEN the system SHALL return a property-first headline, the body, the word count, and the skill's "editor's notes" (flagged inferences / facts to verify).
- WHEN a draft is produced THEN the body SHALL fall within the skill's 400–700 word discipline, and the displayed word count SHALL reflect the actual body.
- WHEN Joe submits a URL THEN the system SHALL attempt to retrieve the article text to draft from; IF retrieval fails THEN the system SHALL tell Joe and let him paste the text instead (no fabricated content).

### Story 2 — It sounds like Joe
**As** Joe, **I want** the draft in my own voice, **so that** I can publish it with light edits and trust it in front of my audience.

**Acceptance criteria:**
- WHEN the system drafts THEN it SHALL use Joe's real skill text (from `skills/`) as the model instructions, not a generic prompt.
- WHEN the system calls the model THEN it SHALL authenticate with **Joe's own Anthropic API key** (his Claude, his billing), configured as a secret — never hardcoded.
- IF no API key is configured THEN the system SHALL show a clear setup message and SHALL NOT fall back to a generic stub for a live draft.

### Story 3 — Refuse thin input cleanly
**As** Joe, **I want** the tool to tell me when a story is too thin, **so that** it never manufactures authority and embarrasses me.

**Acceptance criteria:**
- IF the input is too thin to support a real take (e.g., a headline with no body or notes) THEN the system SHALL return the skill's clean refusal with what it needs (article body or Joe's notes), and SHALL NOT produce a fabricated draft.
- IF the anchor is a celebrity-with-property-as-backdrop (per the skill's refusal rules) THEN the system SHALL surface that and ask for a property-first angle.

### Story 4 — Review, capture disposition, reuse
**As** Joe, **I want** to review the draft, copy it out, and record what I did with it, **so that** I can publish it and so we learn whether the tool is working.

**Acceptance criteria:**
- WHEN a draft is shown THEN Joe SHALL be able to copy the full draft in one action.
- WHEN Joe finishes with a draft THEN he SHALL be able to mark it `published-as-is`, `edited`, or `discarded`.
- WHEN a disposition is recorded THEN the system SHALL persist it with the draft and timestamps (`story_submitted_at`, `draft_ready_at`, `disposition`) so acceptance can be measured. *(This capture is also the seed corpus for the P2-A voice feature — deferred, but the data starts accruing now.)*

### Story 5 — Failure is graceful
**As** Joe, **I want** clear behavior when the AI call fails, **so that** a hiccup never leaves me stuck or staring at a broken screen.

**Acceptance criteria:**
- WHEN the model call errors or times out THEN the system SHALL show a plain-language error and offer a retry, preserving Joe's submitted story.
- IF the model is rate-limited THEN the system SHALL surface that specifically and let Joe retry shortly.

## 5. Constraints & assumptions

- **Stack / platform:** Reshape the existing `@clockwork/marketing` package (reuse `ClaudeMarketingDrafter` + `skillInstructions`; drop the bulk-send/sphere flow). Surface on the existing Next.js/Tailwind app shell. Draft store tenant-tagged; in-memory acceptable for the very first run, Postgres when hosted (see design).
- **Riskiest assumption:** the draft is good enough that Joe publishes it with only light edits. If the voice is off, he stops trusting it and the slice fails. Mitigation: his real skill text drives it; disposition capture tells us fast if it's not landing.
- **Out-of-scope dependencies (Joe's surface — owned by Joe, not built here):** Joe's **Anthropic API key**; optionally his `brain.md` voice + the skill's reference files (nice-to-have, not blocking — the `SKILL.md` is self-contained). The `newsletter-draft` skill text is already in the repo.

## 6. Open questions

- [ ] *(Non-blocking)* Where does Joe's tool surface live long-term — a gated route in the agentfolio app (fastest now) or a separate lightweight "agent console"? v1 decides for speed (design §6); the clean product-boundary split is a **Later** roadmap item, not a blocker.
