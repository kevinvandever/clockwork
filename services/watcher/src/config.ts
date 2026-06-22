/**
 * Watcher configuration.
 *
 * The intake endpoint authenticates each inbound POST with a per-tenant shared
 * secret (token → tenantId). Provider-native verification (e.g. Google OIDC for
 * Gmail push) is deferred until we wire a real inbox — see docs/DECISIONS.md.
 */

export interface WatcherConfig {
  port: number;
  /** Maps an intake token to the tenant it belongs to. */
  intakeTokens: Record<string, string>;
}

/** Build config from the environment. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): WatcherConfig {
  return {
    port: Number(env.PORT ?? 3001),
    intakeTokens: parseIntakeTokens(env.INTAKE_TOKENS),
  };
}

/**
 * Parse `INTAKE_TOKENS` of the form "token1:tenantA,token2:tenantB" into a map.
 * Blank/malformed entries are ignored.
 */
export function parseIntakeTokens(raw: string | undefined): Record<string, string> {
  const map: Record<string, string> = {};
  if (!raw) {
    return map;
  }
  for (const pair of raw.split(",")) {
    const [token, tenantId] = pair.split(":").map((s) => s.trim());
    if (token && tenantId) {
      map[token] = tenantId;
    }
  }
  return map;
}

/** Resolve a tenant from an intake token, or null if unknown/missing. */
export function resolveTenant(
  config: WatcherConfig,
  token: string | undefined,
): string | null {
  if (!token) {
    return null;
  }
  return config.intakeTokens[token] ?? null;
}
