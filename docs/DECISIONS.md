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
