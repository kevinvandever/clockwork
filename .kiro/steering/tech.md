# Tech & Conventions

## Stack

- **Language:** TypeScript, ESM (`"type": "module"`), `NodeNext` module resolution.
  Relative imports use the `.js` extension (NodeNext convention) even from `.ts`.
- **Runtime:** Node >= 20 (Node 24 locally).
- **Package manager:** pnpm 10 workspaces. `.npmrc` uses `shamefully-hoist=true` so
  shared dev tooling (tsc, vitest, types) resolves from the root.
- **Tests:** vitest (`vitest run` per package).
- **Lint:** ESLint flat config (`eslint.config.js`), typescript-eslint recommended.
- **Hosting target:** Railway (managed Postgres + always-on services + cron). Not AWS.

## Commands (run from repo root)

```bash
pnpm install        # install workspace deps
pnpm build          # tsc build per package (TOPOLOGICAL — deps first)
pnpm typecheck      # tsc --noEmit per package
pnpm test           # vitest per package
pnpm lint           # eslint across the repo
```

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on every push:
`install → build → lint → typecheck → test`. **Build must come before typecheck**
because cross-package type resolution needs each package's emitted `.d.ts`
(see DECISIONS.md / the Task 5 fix). Keep this order.

## Package conventions

- Lib packages live in `packages/*`, services in `services/*`, apps in `apps/*`.
- Each package: `package.json` (build/typecheck/test scripts), `tsconfig.json`
  extending `tsconfig.base.json` with `outDir: dist`, `rootDir: src`, and excluding
  `src/**/*.test.ts` from build.
- `tsconfig.base.json` is strict (incl. `noUnusedLocals`/`noUnusedParameters`).
- Public exports via `package.json` `exports`; `main`/`types` point at `dist`.
- Test files are co-located as `*.test.ts` and excluded from the build.

## Workflow norms

- Per the user: short **design note → approval → implement** for each non-trivial task.
- After every change: run build/lint/typecheck/test locally, then commit + push and
  confirm CI is green. Keep commits scoped per task; update the plan checkbox.
- Log real decisions in `docs/DECISIONS.md` (with a "revisit when" trigger).
