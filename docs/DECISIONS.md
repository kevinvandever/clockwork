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
