/**
 * Renamable persona registry.
 *
 * Joe's roster names are the defaults; each client (tenant) may override any
 * robot's display name. Every consumer — drafted-message voice/signature, the
 * activity log, the Chief of Staff dashboard — resolves names through here so no
 * persona name is hardcoded anywhere else.
 */

export const ROBOT_KEYS = [
  "pipeline",
  "buyers",
  "marketing",
  "socialMedia",
  "clientCare",
  "transaction",
  "referralPartner",
  "chiefOfStaff",
] as const;

export type RobotKey = (typeof ROBOT_KEYS)[number];

export interface PersonaDefault {
  /** Default display name from Joe's roster. */
  defaultName: string;
  /** Robot's role label. */
  role: string;
}

/** Defaults per §4 of the build brief (the team roster). */
export const DEFAULT_PERSONAS: Record<RobotKey, PersonaDefault> = {
  pipeline: { defaultName: "Josh 2", role: "Pipeline" },
  buyers: { defaultName: "Ben", role: "Buyer's" },
  marketing: { defaultName: "Dave", role: "Marketing" },
  socialMedia: { defaultName: "Josh", role: "Social Media" },
  clientCare: { defaultName: "Stephanie", role: "Client Care" },
  transaction: { defaultName: "Trush", role: "Transaction" },
  referralPartner: { defaultName: "Larry", role: "Referral Partner" },
  chiefOfStaff: { defaultName: "Linda", role: "Chief of Staff" },
};

/** Optional per-tenant overrides of persona display names. */
export type PersonaOverrides = Partial<Record<RobotKey, string>>;

export interface ResolvedPersona {
  key: RobotKey;
  name: string;
  role: string;
}

/**
 * Resolve one robot's display name. A non-blank override wins; otherwise the
 * roster default is used.
 */
export function resolvePersonaName(
  key: RobotKey,
  overrides: PersonaOverrides = {},
): string {
  const override = overrides[key];
  if (override !== undefined && override.trim() !== "") {
    return override.trim();
  }
  return DEFAULT_PERSONAS[key].defaultName;
}

/** Resolve the full set of personas for a tenant. */
export function resolveAllPersonas(
  overrides: PersonaOverrides = {},
): Record<RobotKey, ResolvedPersona> {
  const out = {} as Record<RobotKey, ResolvedPersona>;
  for (const key of ROBOT_KEYS) {
    out[key] = {
      key,
      name: resolvePersonaName(key, overrides),
      role: DEFAULT_PERSONAS[key].role,
    };
  }
  return out;
}
