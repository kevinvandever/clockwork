import pg from "pg";
import type { Pool as PgPool, PoolConfig } from "pg";

const { Pool } = pg;

/**
 * Decide TLS settings from the connection URL + an optional override.
 *
 * - `DATABASE_SSL=disable` → no TLS (e.g. local, or Railway private network)
 * - `DATABASE_SSL=require` → TLS, don't verify the chain (managed PG certs)
 * - otherwise: localhost / *.railway.internal → no TLS; anything else → TLS
 *   without chain verification (typical for managed Postgres public proxies).
 */
function sslConfig(url: string): PoolConfig["ssl"] {
  const override = process.env.DATABASE_SSL;
  if (override === "disable") return false;
  if (override === "require") return { rejectUnauthorized: false };
  try {
    const host = new URL(url).hostname;
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".railway.internal")
    ) {
      return false;
    }
  } catch {
    // Unparseable URL — fall through to safe default below.
  }
  return { rejectUnauthorized: false };
}

let pool: PgPool | undefined;

/**
 * Process-wide connection pool. Reads `DATABASE_URL`. Safe to call repeatedly —
 * the pool is created once. On a single always-on server (Railway) the default
 * pool size is fine; there is no serverless connection-storm concern here.
 */
export function getPool(): PgPool {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url || url.trim() === "") {
    throw new Error("DATABASE_URL is not set");
  }
  pool = new Pool({
    connectionString: url,
    ssl: sslConfig(url),
    max: Number(process.env.DATABASE_POOL_MAX ?? "10"),
  });
  return pool;
}

/** True when a database connection is configured. */
export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim());
}

/** Close the pool (tests / graceful shutdown). */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
