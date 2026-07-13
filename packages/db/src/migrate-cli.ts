import { getPool, closePool } from "./pool.js";
import { migrate } from "./migrate.js";

/**
 * CLI entry: `node dist/migrate-cli.js` (or `pnpm --filter @clockwork/db migrate`).
 * Applies pending migrations against DATABASE_URL and exits.
 */
async function main(): Promise<void> {
  const pool = getPool();
  const ran = await migrate(pool);
  if (ran.length === 0) {
    console.log("[migrate] up to date — no migrations to apply");
  } else {
    console.log(`[migrate] applied: ${ran.join(", ")}`);
  }
  await closePool();
}

main().catch((err) => {
  console.error("[migrate] failed:", err);
  process.exitCode = 1;
});
