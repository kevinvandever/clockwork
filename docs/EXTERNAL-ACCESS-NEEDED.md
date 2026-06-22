# External Access Needed (and When)

What real-world access/credentials the project needs, and the point at which each
becomes necessary. Until then, the corresponding piece is stubbed behind an interface
so development and demos continue without it.

| # | What you'll need | Needed for | When (task) | Status |
|---|------------------|-----------|-------------|--------|
| 1 | **Anthropic API key** (Claude) | Flip the Pipeline instant-response from the deterministic stub to a real Claude draft | **Task 6** — optional for the demo; needed to show *real* AI drafting | Not yet provided |
| 2 | **Joe's Claude Cowork skills** (the 4 working skills + the robot logic/voice) | Real persona voice for Marketing / Client Care / Chief of Staff, and the eventual Cowork install | **Tasks 7-9** to model the voice; **Task 14** for the real install | Black-box; not yet accessed |
| 3 | **A real CRM sandbox** (e.g. Rechat or first client's CRM) + API credentials | Build the first real CRM adapter and run flows against it | **Task 13** | Mock CRM in use |
| 4 | **A real inbox** (Gmail/Outlook) + OAuth, or an email-forwarding/CRM webhook | Provider-native lead source feeding `POST /inbound`; signature verification | Real install (post-prototype) | Shared-secret HTTP intake in use |
| 5 | **Railway account** + managed Postgres | Provision hosting and durable storage (activity log, dedup, agentfolio data) | When we deploy / need durability (around Task 10 data layer or Task 14) | In-memory now |
| 6 | **Public-records / MLS access** (ACRIS first) | agentfolio's auto records pull and the MLS-gated robots | **Task 11** (ACRIS), later for MLS | Not yet wired |

## Action for Kevin

- **Soonest:** an **Anthropic API key** if you want the Joe demo to show real Claude
  drafting (Task 6). The demo also works with the stub if you'd rather wait.
- **Before Tasks 7-9 feel "real":** a way to capture **Joe's skill voice/prompts** —
  even exported text of his current skills is enough to model the personas.

This file is updated as items are provided or new needs appear.
