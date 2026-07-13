"use server";

import { redirect } from "next/navigation";
import { ROBOT_KEYS, type PersonaOverrides, type RobotKey } from "@clockwork/config";
import { getActor } from "@/lib/session";
import { getTenantStore } from "@/lib/app";

/** Settings are agent-only; clients never reach them. */
async function requireAgentTenant(): Promise<string> {
  const actor = await getActor();
  if (!actor) redirect("/");
  if (actor.role !== "agent") redirect("/boards");
  return actor.tenantId;
}

/**
 * Store the tenant's Anthropic API key (encrypted at rest). The key is never
 * read back to the browser — this action only accepts a new value.
 */
export async function setApiKeyAction(formData: FormData): Promise<void> {
  const tenantId = await requireAgentTenant();
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  if (!apiKey) {
    redirect("/settings?error=empty_key");
    return;
  }
  const tenantStore = await getTenantStore();
  await tenantStore.setApiKey(tenantId, apiKey);
  redirect("/settings?saved=key");
}

/**
 * Remove the tenant's stored Anthropic API key (revoke). Used to clear a key
 * before handing a tenant to someone else, or to rotate cleanly.
 */
export async function removeApiKeyAction(): Promise<void> {
  const tenantId = await requireAgentTenant();
  const tenantStore = await getTenantStore();
  await tenantStore.clearApiKey(tenantId);
  redirect("/settings?saved=key_removed");
}

/**
 * Update per-robot persona name overrides. Blank fields fall back to the roster
 * default (we simply omit them from the stored overrides).
 */
export async function setPersonaNamesAction(formData: FormData): Promise<void> {
  const tenantId = await requireAgentTenant();
  const overrides: PersonaOverrides = {};
  for (const key of ROBOT_KEYS) {
    const value = String(formData.get(`persona_${key}`) ?? "").trim();
    if (value) overrides[key] = value;
  }
  const tenantStore = await getTenantStore();
  await tenantStore.setPersonaOverrides(tenantId, overrides);
  redirect("/settings?saved=names");
}

/**
 * Save a new version of a robot's skill text. Appends a version (history is
 * retained) so the agent can see it grow and, later, roll back.
 */
export async function setSkillAction(formData: FormData): Promise<void> {
  const tenantId = await requireAgentTenant();
  const robot = String(formData.get("robot") ?? "") as RobotKey;
  if (!ROBOT_KEYS.includes(robot)) {
    redirect("/settings?error=bad_robot");
    return;
  }
  const text = String(formData.get("text") ?? "");
  if (text.trim() === "") {
    redirect("/settings?error=empty_skill");
    return;
  }
  const tenantStore = await getTenantStore();
  await tenantStore.setSkill(tenantId, robot, text);
  redirect(`/settings?saved=skill&robot=${robot}`);
}
