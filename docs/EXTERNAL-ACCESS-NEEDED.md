# External Access Needed (and When)

What real-world access/credentials the project needs, and the point at which each
becomes necessary. Until then, the corresponding piece is stubbed behind an interface
so development and demos continue without it.

| # | What you'll need | Needed for | When (task) | Status |
|---|------------------|-----------|-------------|--------|
| 1 | **Anthropic API key** (Claude) | Flip the Pipeline instant-response from the deterministic stub to a real Claude draft | **Task 6** — optional for the demo; needed to show *real* AI drafting | Not yet provided |
| 2 | **Joe's Claude Cowork skills** (the 4 working skills + the robot logic/voice) | Real persona voice for Marketing / Client Care / Chief of Staff, and the eventual Cowork install | **Tasks 7-9** to model the voice; **Task 14** for the real install | Black-box; not yet accessed |
| 3 | **A real CRM sandbox** + API credentials | Build the first real CRM adapter and run flows against it | **Task 13** | **Joe is choosing the CRM + sending credentials — expected early next week.** Mock CRM in use until then |
| 4 | **Joe's Microsoft Outlook credentials** (Graph OAuth) | Real provider-native lead source feeding `POST /inbound` (replaces the shared-secret HTTP intake) | Task 13 / real install | **Joe sending Outlook creds — expected early next week.** Shared-secret HTTP intake in use until then |
| 5 | **Railway account** + managed Postgres | Provision hosting and durable storage (activity log, dedup, agentfolio data) | When we deploy / need durability (around Task 10 data layer or Task 14) | In-memory now |
| 6 | **Public-records / MLS access** (ACRIS first) | agentfolio's auto records pull and the MLS-gated robots | **Task 11** (ACRIS), later for MLS | Not yet wired |

## Action for Kevin

- **Coming early next week (from Joe):** the **CRM choice + API credentials** (unblocks
  Task 13) and his **Microsoft Outlook credentials** (real inbox for the watcher).
- **Soonest (optional):** an **Anthropic API key** if you want the Joe demo to show real
  Claude drafting (Task 6). The demo also works with the stub.
- **Before Tasks 7-9 feel "real":** a way to capture **Joe's skill voice/prompts** —
  even exported text of his current skills is enough to model the personas (and seeds
  the Phase 2 self-improving-skills feature).

This file is updated as items are provided or new needs appear.
