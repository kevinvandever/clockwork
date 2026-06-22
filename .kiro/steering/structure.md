# Repo Structure

```
clockwork/                      # monorepo root (folder may be named "agentfolio" locally)
  packages/
    config/                     # @clockwork/config
                                #   renamable persona registry (roster defaults +
                                #   per-tenant overrides) + per-client config
    connector-core/             # @clockwork/connector-core
                                #   CRM-agnostic CrmConnector contract, ConnectorError,
                                #   MockCrmConnector, reusable contract suite (./contract)
    activity-log/               # @clockwork/activity-log
                                #   internal cross-robot feed (Chief of Staff reads it);
                                #   ActivityLog interface + InMemoryActivityLog
  services/
    watcher/                    # @clockwork/watcher — always-on speed-to-lead service
                                #   GET /health, POST /inbound (auth→parse→dedup→emit)
                                #   src/leads/{parse,dedup,intake,types}.ts, src/config.ts
  apps/
    agentfolio/                 # buyer/seller web app (built in Tasks 10-12; placeholder)
  docs/                         # plan, decisions, hosting memo, external-access checklist
  .kiro/steering/               # this guidance (always loaded)
  .github/workflows/ci.yml      # CI pipeline
```

## Where things go

- **Shared domain types** that more than one package needs: today they live in the
  owning package (e.g. `Lead` in connector-core, reused by the watcher). Do NOT create
  a shared `@clockwork/core` until a third consumer appears (DECISIONS.md D7).
- **New robot wiring** (Marketing, Client Care, Chief of Staff): wire to the connector
  + activity log + persona config; treat Joe's skill logic as black-box.
- **Persistence:** in-memory implementations now, behind interfaces, with a Postgres
  implementation to be added later (DECISIONS.md D6/D9). Keep the interface seam clean.

## Multi-tenancy

Every stored record is tenant-tagged and every query/append requires a `tenantId`, so
cross-tenant reads are not expressible. Preserve this in any new store or app data model.
