import { cookies } from "next/headers";
import type { Actor } from "@clockwork/agentfolio-core";
import { DEMO_TENANT, getApp } from "./app";

const COOKIE = "agentfolio_uid";

/**
 * Resolve the current actor from the session cookie. The cookie holds only a
 * userId and is NOT signed — acceptable for a local seeded prototype with no real
 * data; real auth replaces this (see docs/DECISIONS.md D19). Access control still
 * runs server-side against the resolved actor.
 */
export async function getActor(): Promise<Actor | null> {
  const uid = (await cookies()).get(COOKIE)?.value;
  if (!uid) {
    return null;
  }
  const { store } = await getApp();
  const user = await store.getUser(DEMO_TENANT, uid);
  return user
    ? { userId: user.id, tenantId: DEMO_TENANT, role: user.role }
    : null;
}

export async function setSession(userId: string): Promise<void> {
  (await cookies()).set(COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
