import {
  resolveAllPersonas,
  type PersonaOverrides,
  type ResolvedPersona,
  type RobotKey,
} from "./personas.js";

/** Per-client (per-tenant) configuration captured at install time. */
export interface ClientConfig {
  /** Stable tenant identifier (drives data isolation in agentfolio). */
  tenantId: string;
  /** Human-friendly client / brokerage name. */
  displayName: string;
  /** Optional per-robot persona name overrides. */
  personaOverrides?: PersonaOverrides;
}

export interface ResolvedClientConfig {
  tenantId: string;
  displayName: string;
  personas: Record<RobotKey, ResolvedPersona>;
}

/** Expand a raw client config into fully resolved, ready-to-use values. */
export function resolveClientConfig(config: ClientConfig): ResolvedClientConfig {
  return {
    tenantId: config.tenantId,
    displayName: config.displayName,
    personas: resolveAllPersonas(config.personaOverrides ?? {}),
  };
}
