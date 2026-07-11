# Per-Client Install Checklist

The "sell-the-setup" runbook. Clockwork is a done-for-you install: one per-client
config wires the four robots + agentfolio against the client's own CRM/data. This is
the front-door audit + setup steps. Today most externals run on stand-ins (see
`docs/EXTERNAL-ACCESS-NEEDED.md`); each line notes the swap.

## 1. Front-door audit (gather)

- [ ] Client + brokerage name (→ `displayName`), stable `tenantId`.
- [ ] Persona names — keep Joe's roster or rename per client (`personaOverrides`).
- [ ] CRM: which one, and API credentials. (Adapter today: `mock`; first real: Rechat.)
- [ ] Inbox for speed-to-lead: Gmail/Outlook, or a CRM lead webhook.
- [ ] MLS/records access per market (agentfolio records; ACRIS for NYC).
- [ ] Joe's skill text per robot (voice) — `skills/*.md`.
- [ ] Anthropic API key (real Claude drafting) — optional for demo, required live.

## 2. Configure the install

Fill an `InstallConfig` (see `@clockwork/install`):

```ts
createInstall({
  tenantId: "client-123",
  displayName: "Acme Realty",
  personaOverrides: { pipeline: "Alex" },      // optional
  crm: { type: "rechat", accessToken: "…" },    // or { type: "mock" }
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  skills: loadSkills(),                          // Joe's skills/*.md
});
```

## 3. Wire the lead source

- [ ] Point the client's inbox / CRM lead webhook at the watcher `POST /inbound`.
- [ ] Issue a per-tenant intake token (`INTAKE_TOKENS`). *(Real install: provider-native
      verification — Microsoft Graph / Gmail push — replaces the shared secret.)*

## 4. Verify the install (smoke test)

- [ ] Send a test lead → Pipeline replies, logged in the activity feed.
- [ ] Trigger Marketing → newsletter sent to the sphere.
- [ ] Run Client Care → due touches sent.
- [ ] agentfolio: create a board, add a property (records populate), hand off.
- [ ] Chief of Staff brief shows all of the above (robots + agentfolio).

The unified demo (`pnpm --filter @clockwork/install demo`) runs this whole sequence
on stand-ins and is the template for the real smoke test.

## 5. Deploy (when hosting)

- [ ] Watcher + agentfolio on Railway; managed Postgres for the durable stores.
- [ ] Platform env vars (agentfolio): `SESSION_SECRET` (signs login cookies),
      `AGENT_PASSWORD` (the agent's login), `KEY_ENCRYPTION_SECRET` (encrypts
      per-tenant Anthropic keys at rest). Generate each with
      `openssl rand -base64 32`.
- [ ] Per-client secrets (CRM token, intake tokens) in the platform. The tenant's
      **Anthropic key is BYO** — the agent enters it in agentfolio **Settings**
      (stored encrypted); it is not an env var.

## 6. Provision the tenant (agentfolio, multi-tenant)

Clockwork is admin-provisioned (not self-serve). Per agent:

- [ ] Provision a tenant (`provisionTenant` in `@clockwork/tenants`): `displayName`,
      optional `personaOverrides`, and seed skill text from `skills/*.md`.
- [ ] Create the agent's user + set `AGENT_PASSWORD`.
- [ ] Have the agent log in and paste their **Anthropic API key** in **Settings**
      (encrypted at rest, bound to their `tenantId`). They can also rename robots
      and edit skills there.

## Stand-ins → real (swap map)

| Piece | Stand-in now | Real (swap) |
|-------|--------------|-------------|
| CRM | `MockCrmConnector` | `RechatConnector` (config flip) |
| Drafting | Stub responders | Claude (per-tenant BYO key via Settings) |
| Lead source | shared-secret `/inbound` | Outlook/Gmail (Graph/push) |
| Stores | in-memory | Postgres on Railway |
| Tenant registry | `InMemoryTenantStore` | `PostgresTenantStore` (same interface) |
| Records | Stub provider | NYC Open Data / ACRIS (`acris-property-pull.md` blueprint) |
| Auth (agentfolio) | HMAC-signed cookie + password | richer auth (Auth.js/Clerk) if multi-user per tenant |
