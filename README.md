# Clockwork

Monorepo for the Clockwork product: Claude-as-engine robots wired to a client's own
CRM/MLS/data, an always-on email speed-to-lead watcher, shared per-client config, and
**agentfolio** (a separately-sold buyer/seller web app).

See [`docs/CLOCKWORK-FIRST-BUILD-PLAN.md`](docs/CLOCKWORK-FIRST-BUILD-PLAN.md) for the
build plan and [`docs/TASK-01-AGENTFOLIO-HOSTING-RECOMMENDATION.md`](docs/TASK-01-AGENTFOLIO-HOSTING-RECOMMENDATION.md)
for the hosting decision.

## Layout

```
packages/
  config/          @clockwork/config — per-client config + renamable persona registry
  connector-core/  @clockwork/connector-core — CRM-agnostic interface (impl in Task 3)
services/
  watcher/         @clockwork/watcher — always-on email speed-to-lead service (Task 5)
apps/
  agentfolio/      buyer/seller web app (Task 10)
docs/              brief, plan, and decision memos
```

## Develop

```bash
pnpm install      # install all workspace deps
pnpm lint         # eslint across the repo
pnpm typecheck    # tsc --noEmit per package
pnpm test         # vitest per package
pnpm build        # tsc build per package
```

Requires Node >= 20 and pnpm 10.

## Hosting

Target: Railway (managed Postgres + always-on services + cron), per the Task 1
recommendation. The watcher and agentfolio co-locate in one hosted footprint.
