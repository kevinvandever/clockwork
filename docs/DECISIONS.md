# Decision Log

Running log of notable decisions, why we made them, and what should make us revisit.
Newest at the bottom. Lightweight by design — one entry per real decision.

---

### D1 — Host agentfolio + the watcher ourselves on Railway (single multi-tenant app)

- **Context:** Task 1 (§5 of the build brief). agentfolio is a real web app and tensions with "we don't run the client's runtime."
- **Decision:** We host, as one multi-tenant app on Railway (managed Postgres + always-on services + cron). Keep hosted data low-sensitivity (board + public records); CRM/MLS data stays client-side.
- **Why:** Deploy-to-client gives us responsibility without control; we're already hosting the watcher; Railway matches Kevin's stack and offloads ops.
- **Revisit when:** scale or a client contract forces dedicated/isolated infra, or hosted data sensitivity rises.

### D2 — Monorepo: pnpm workspaces + TypeScript + vitest, Railway target

- **Context:** Task 2 scaffold.
- **Decision:** Single `clockwork` monorepo; packages `config`, `connector-core`, `activity-log`; service `watcher`; app `agentfolio`. ESLint flat config, shared tsconfig, GitHub Actions CI (lint/typecheck/test/build).
- **Why:** Shared packages (connector contract, config) are reused across services; one place to build/test.
- **Revisit when:** a package needs independent release/versioning, or build times warrant splitting repos.

### D3 — Renamable personas via a central registry

- **Context:** Task 2, per Kevin's request.
- **Decision:** `@clockwork/config` holds Joe's roster as defaults with per-tenant overrides; all consumers resolve names through it. No hardcoded persona names.
- **Why:** Clients can rename robots; names surface in drafts, the activity log, and the dashboard.
- **Revisit when:** personas need per-channel names or richer persona attributes beyond a display name.

### D4 — AI disclosure/consent carried on the outbound message

- **Context:** Task 3 connector contract.
- **Decision:** `OutboundMessage` carries `aiDisclosed` (required true to send) and optional `consentBasis`; the connector throws `send_blocked` if disclosure is missing.
- **Why:** Make the compliance posture structural rather than an afterthought in Task 6.
- **Revisit when:** legal/counsel defines concrete disclosure/consent rules, or a CRM handles disclosure itself.

### D5 — Two distinct activity concepts

- **Context:** Task 4 vs the connector's `logActivity`.
- **Decision:** `connector.logActivity` writes a note to the **CRM's own contact timeline**; `@clockwork/activity-log` is our **internal cross-robot feed** that powers the Chief of Staff. Separate stores, separate audiences.
- **Why:** Avoids the two overlapping; each has a clear job.
- **Revisit when:** we decide the CRM timeline should mirror the internal feed (or vice versa).

### D6 — Activity log is in-memory now, Postgres later

- **Context:** Task 4.
- **Decision:** Ship `InMemoryActivityLog` behind an `ActivityLog` interface now; add a Postgres-backed implementation when we provision Railway (with Task 10's data layer or Task 14 packaging).
- **Why:** Keeps Task 4 demoable with no infra; swapping to Postgres touches one file.
- **Revisit when:** we provision Railway/Postgres, or need durability across restarts for a real demo/install.

### D7 — Keep error types local for now (no shared core package yet)

- **Context:** Task 4 (the `ConnectorError` code pattern is now wanted in a second package).
- **Decision:** Keep a local error type in `activity-log`; do not extract a shared `@clockwork/core` yet.
- **Why:** Avoid premature abstraction; extract only when a third use appears.
- **Revisit when:** a third package needs the same error/primitive — then extract `@clockwork/core`.

### D8 — Connector interface will change when a real CRM lands

- **Context:** Task 3 / Task 13.
- **Decision:** Treat the current `CrmConnector` contract as provisional; expect field/semantic changes when the first real CRM adapter is built.
- **Why:** We're CRM-agnostic by design; the contract tests localize the churn.
- **Revisit when:** Task 13 (first real CRM adapter) — update the contract + tests in one place.

### D9 — Lead dedup is in-memory now; durable later

- **Context:** Task 5 watcher intake. Push delivery retries, so duplicate inbound emails must be dropped.
- **Decision:** Use an in-memory seen-set (`InMemoryDedup`) keyed by messageId (or a hash of from+subject+receivedAt), scoped per tenant. Durable dedup (Postgres) replaces it behind the same shape later.
- **Why:** Keeps Task 5 demoable with no infra; matches the activity-log posture (D6).
- **Revisit when:** we provision Postgres, or run more than one watcher instance (a shared store is needed for cross-instance dedup).

### D10 — HTTP intake endpoint is the first (and universal) lead source

- **Context:** Task 5. Choosing how the watcher receives leads.
- **Decision:** First lead source is an authenticated `POST /inbound` endpoint on the watcher. Gmail push, Microsoft Graph notifications, email-forwarding, and the CRM-webhook fallback all converge by POSTing to it; provider-specific subscription wiring (OAuth + Pub/Sub/Graph) is a thin adapter deferred to real-inbox time. Auth is a per-tenant shared-secret token now; provider signature verification (e.g. Google OIDC) deferred.
- **Why:** One normalization path every source feeds; fully testable now without OAuth; realizes the "lead source is an abstraction" requirement.
- **Revisit when:** we wire a real inbox (add the provider adapter + signature verification).

### D11 — Lead drafting behind a LeadResponder interface (stub default, Claude env-gated)

- **Context:** Task 6 instant-response. We need drafting that demos without credentials but can use real Claude.
- **Decision:** `LeadResponder` interface with `StubResponder` (deterministic, offline, the default + used in all tests) and `ClaudeResponder` (real Anthropic API via fetch, activated only when `ANTHROPIC_API_KEY` is set). Default model `claude-sonnet-4-5`, overridable via `ANTHROPIC_MODEL`.
- **Why:** Hermetic tests, zero-credential demo, real Claude is a one-env-var flip with no code change.
- **Revisit when:** we polish prompt engineering, add human-in-the-loop approval, or pin a specific model for an install.

### D12 — Prototype watcher runtime is single-process, per-tenant mock connectors

- **Context:** Task 6 wiring. Intake supports multiple tenants (token→tenant), and the handler needs per-tenant resources.
- **Decision:** The watcher builds one `MockCrmConnector` + resolved persona per configured tenant in-process, with a shared (tenant-tagged) in-memory activity log. A durable, multi-tenant runtime registry is deferred to real infra.
- **Why:** Keeps the demo honest about multi-tenancy without building a runtime tenant registry now.
- **Revisit when:** real CRM adapters (Task 13) and Postgres land, or the watcher runs as more than one instance.

### D13 — Connector contract extended with listContacts + Contact.segment

- **Context:** Task 7. Marketing needs to fetch the sphere; the sphere lives in the CRM.
- **Decision:** Added `listContacts(query?: { segment? })` to `CrmConnector` and an optional `segment` field to `Contact`/`ContactInput`. Mock + contract suite updated.
- **Why:** The connector is the right owner of CRM reads; expected contract evolution (D8).
- **Revisit when:** the first real CRM adapter (Task 13) — segments may map to CRM tags/lists differently.

### D14 — AI disclosure text centralized in connector-core

- **Context:** Task 7. Disclosure now needed by Pipeline (watcher) and Marketing.
- **Decision:** `AI_DISCLOSURE` + `ensureDisclosure` live in `@clockwork/connector-core` (which owns the disclosure gate); the watcher re-exports them. No duplicated wording.
- **Why:** One source of compliance wording across all robots.
- **Revisit when:** counsel defines exact disclosure language, or per-channel disclosure is needed.

### D15 — Marketing cadence is on-demand in the prototype

- **Context:** Task 7. Real robots run on a Cowork scheduled task.
- **Decision:** `runMarketingNewsletter` is a plain function triggered on demand (a demo CLI); real cadence/scheduling is a Cowork scheduled task at install time.
- **Why:** Keeps the robot demoable now without building a scheduler.
- **Revisit when:** Task 14 packaging / wiring real Cowork scheduled tasks.

### D16 — Connector Contact extended with lastContactedAt + importantDates

- **Context:** Task 8. Client Care needs rotation timing and key dates, which live in the CRM.
- **Decision:** Added optional `lastContactedAt?: string` and `importantDates?: ImportantDate[]` (`{ label, month, day }`, recurring annually) to `Contact`/`ContactInput`.
- **Why:** CRM-owned data the connector should expose; mirrors the listContacts/segment evolution (D13).
- **Revisit when:** the first real CRM adapter (Task 13) — field mapping may differ; non-annual dates may need a richer shape.

### D17 — Home value report stubbed as explicitly unavailable

- **Context:** Task 8. The report is records-gated (ties to agentfolio seller-watch / records access).
- **Decision:** `homeValueReportStatus()` returns `{ available: false, reason }`; not invoked in the send loop. Callers branch on availability.
- **Why:** Makes the deferral explicit and testable rather than silent.
- **Revisit when:** Task 11 (ACRIS/records) and the seller-watch land.

### D18 — Chief of Staff synthesizes feeds; internal brief carries no disclosure

- **Context:** Task 9. Linda produces a daily brief + oversight from the activity log.
- **Decision:** Split into `buildOversight` (deterministic dashboard data) + `BriefWriter` (prose, stub/Claude). The brief is internal (agent-facing), so it carries NO AI disclosure (unlike client-facing sends). Linda reads feeds and reports; she does not orchestrate/trigger the other robots (deferred). "Daily" is a configurable look-back window (default 24h) from a reference `now`.
- **Why:** Keeps facts and prose separable/testable; matches "synthesis native; needs feeds" from the plan.
- **Revisit when:** we add real orchestration (Linda triggering robots) or a visual dashboard UI.

### D19 — Task 10 split into core (10a) + Next.js UI (10b); access control in a tested core

- **Context:** Task 10 (agentfolio buyer board) is large and security-sensitive.
- **Decision:** Split into `@clockwork/agentfolio-core` (10a: domain, in-memory store, `AgentfolioService` with tenant/membership/role enforcement + role-shaped views, fully vitest-tested) and `apps/agentfolio` (10b: thin Next.js UI). Access rules: agent = full control; client = view shared + add properties/comments; stage changes and agent-private notes are agent-only. Missing/cross-tenant resources return `not_found` (no existence leak); in-tenant non-members get `forbidden`.
- **Why:** Keeps the security logic unit-tested without the UI; small increments.
- **Revisit when:** real auth (10b uses lightweight session) and Postgres (store interface swap) land.

### D20 — Public records behind a RecordsProvider; PLUTO-style slice now, ACRIS deeds later

- **Context:** Task 11. Auto-pull public records when a property is added.
- **Decision:** `RecordsProvider` interface in agentfolio-core; implementations in `@clockwork/records` — `StubRecordsProvider` (deterministic default) + `NycOpenDataRecordsProvider` (env-gated Socrata by address, injected fetch). The service auto-pulls best-effort on add (failure never blocks the add) and exposes agent-only `refreshRecords`. The real provider pulls owner + assessed value by address (PLUTO-style); true ACRIS deeds/mortgages (BBL-keyed) + address→BBL geocoding are deferred.
- **Why:** Address-friendly records now without a geocoding rabbit hole; same agnostic-core/adapter pattern; `PublicRecords` shape has room to grow.
- **Revisit when:** we need deeds/mortgages (add BBL resolution + ACRIS datasets) or other markets/MLS.

### D21 — agentfolio connectable via an event sink; bridge in @clockwork/agentfolio-connect

- **Context:** Task 12. Tie agentfolio's board actions into the robot side (Linda's brief) without coupling the packages.
- **Decision:** agentfolio-core defines `AgentfolioEvent` + `AgentfolioEventSink` (default `NoopEventSink`) and emits best-effort on add/stage/handoff. `@clockwork/agentfolio-connect` provides `ActivityLogEventSink` (depends on agentfolio-core + activity-log) that writes events under the robot label `"agentfolio"` with `subjectId = propertyId`. Linda's existing brief picks them up with no Chief-of-Staff changes. Handoff = `initiateHandoff` (agent-only) sets `property.handoff` + emits `handoff_initiated`; the transaction room / Trush robot are stubbed.
- **Why:** agentfolio stays standalone-sellable (noop sink) and core stays free of an activity-log dependency; the bridge is the "connectable" boundary. Label `"agentfolio"` keeps provenance accurate vs. impersonating a persona.
- **Revisit when:** the Transaction robot (Trush) / real transaction room is built, or events need persona attribution.

### D22 — Phase 2 direction: self-improving skills/voice (agent-approved, continuous + periodic review)

- **Context:** Joe call. A capability to enhance/modify each robot's skill + voice over time from the client's real work.
- **Decision (direction, not yet built):** Build on the existing `skillInstructions` seam — a future `@clockwork/skills` package with a versioned per-tenant/per-robot `SkillProfile` store + a stub/Claude `SkillSynthesizer`. Train continuously from sent/approved work, but require **human-in-the-loop approval** before a change goes live. The **real-estate-agent client approves**; Joe approves only when dogfooding. Versioned with diffs + rollback; AI disclosure stays structural.
- **Why:** Strong product feature; amplifies Joe's curation (the moat) rather than replacing it; avoids unreviewed voice drift.
- **Revisit when:** Phase 2 kickoff — resolve the "continuous training vs. periodic approval" staging (candidate profile + diff-for-approval on a cadence/threshold). Needs a design note.

### D23 — Phase 2 direction: agentfolio is the agent's home with a derived todo list

- **Context:** Joe call. agentfolio should be clean/easy and show the agent a todo list.
- **Decision (direction):** Todo list lives in agentfolio, fed by the same data Linda reads (Client Care due touches, leads to review, offers awaiting handoff, drafts pending approval). Plus a dedicated UX/styling pass.
- **Why:** The actionable cousin of the Chief of Staff brief; reuses the connect layer/activity feed.
- **Revisit when:** Phase 2; needs a design note.
