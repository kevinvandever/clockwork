import type { PersonaOverrides, RobotKey } from "@clockwork/config";
import type { TenantRecord, TenantStore } from "./types.js";

export interface ProvisionTenantInput {
  tenantId?: string;
  displayName: string;
  personaOverrides?: PersonaOverrides;
  /** Optional plaintext Anthropic API key to seed (encrypted on store). */
  apiKey?: string;
  /** Optional seed skill text per robot (e.g. from Joe's templates). */
  skills?: Partial<Record<RobotKey, string>>;
}

/**
 * Admin/onboarding helper: create a tenant and seed its API key + skills in one
 * step. Clockwork is agent-installed, so tenants are provisioned here (a seed
 * script or install action), never via public signup.
 */
export async function provisionTenant(
  store: TenantStore,
  input: ProvisionTenantInput,
): Promise<TenantRecord> {
  const tenant = await store.createTenant({
    tenantId: input.tenantId,
    displayName: input.displayName,
    personaOverrides: input.personaOverrides,
  });

  if (input.apiKey && input.apiKey.trim() !== "") {
    await store.setApiKey(tenant.tenantId, input.apiKey);
  }

  if (input.skills) {
    for (const [robot, text] of Object.entries(input.skills)) {
      if (text && text.trim() !== "") {
        await store.setSkill(tenant.tenantId, robot as RobotKey, text);
      }
    }
  }

  // Return the freshest view (api key/skills now set).
  return (await store.getTenant(tenant.tenantId)) ?? tenant;
}
