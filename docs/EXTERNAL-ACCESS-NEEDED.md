# External Access Needed (and When)

What real-world access/credentials the project needs, and the point at which each
becomes necessary. Until then, the corresponding piece is stubbed behind an interface
so development and demos continue without it.

| # | What you'll need | Needed for | When (task) | Status |
|---|------------------|-----------|-------------|--------|
| 1 | **Anthropic API key** (Claude), per tenant | Real Claude drafting (newsletter, and later the other robots) | **Now** for the live Newsletter slice | **BYO** — the agent enters it in agentfolio **Settings** (encrypted at rest, bound to their tenant). Not an env var |
| 2 | **Joe's Claude Cowork skills** (the 4 working skills + the robot logic/voice) | Real persona voice for Marketing / Client Care / Chief of Staff, and the eventual Cowork install | **Tasks 7-9** to model the voice; **Task 14** for the real install | Black-box; not yet accessed |
| 3 | **A real CRM sandbox** + API credentials | Live-validate the Rechat adapter (endpoints + outbound-send capability) | Roadmap **Later** (not needed for the Newsletter or Speed-to-Lead slices) | Pending Joe's CRM choice + creds. Adapter built + fake-fetch tested; mock CRM in use |
| 4 | **Microsoft 365 mailbox access via an Entra app registration** — tenant ID, client ID, client secret, Graph `Mail.Read` + `Mail.ReadWrite` (admin-consented), scoped to Joe's mailbox. **NOT his password.** | Real inbox lead source for the watcher (replaces the shared-secret `/inbound`) | Roadmap **Next** — the **Speed-to-Lead** slice | Awaiting Joe / his IT admin. **First confirm who administers his 365** (brokerage IT vs. own tenant). Full request: `.kiro/specs/speed-to-lead/OUTLOOK-ACCESS-REQUEST.md`. Shared-secret intake in use until then |
| 5 | **Railway account** + managed Postgres | Provision hosting and durable storage (activity log, dedup, agentfolio data, tenant registry) | When we deploy / need durability | In-memory now. Deploy also needs three agentfolio env secrets: `SESSION_SECRET`, `AGENT_PASSWORD`, `KEY_ENCRYPTION_SECRET` (each `openssl rand -base64 32`) |
| 6 | **Public-records / MLS access** (ACRIS first) | agentfolio's auto records pull and the MLS-gated robots | **Task 11** (ACRIS), later for MLS | Not yet wired |

## Action for Kevin (by slice)

- **Now — Newsletter Draft (live):** Joe brings his **Anthropic API key** (his Claude,
  his billing) and enters it in agentfolio **Settings** — no env var, no Microsoft, no CRM.
  Skill text is seeded from `skills/` and editable in Settings. For the deployment itself,
  set `SESSION_SECRET`, `AGENT_PASSWORD`, and `KEY_ENCRYPTION_SECRET` on the host.
- **Next — Speed-to-Lead:** (a) Joe **authors a Pipeline lead-response skill** (none exists
  yet), and (b) the **Microsoft Entra app registration** in row 4 — confirm his 365 admin
  situation early, it has the longest lead time. Forwardable request:
  `.kiro/specs/speed-to-lead/OUTLOOK-ACCESS-REQUEST.md`.
- **Later:** Joe's **CRM choice + credentials** (Rechat live validation); **Railway + Postgres**
  when we host + need durability.

**Security note:** never store Joe's password; authenticate only via the app registration /
tokens. Rotate any password already shared.

This file is updated as items are provided or new needs appear.
