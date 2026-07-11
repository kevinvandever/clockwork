import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Actor } from "@clockwork/agentfolio-core";
import { getApp } from "./app";

const COOKIE = "agentfolio_uid";

/** Identity carried in the signed session cookie. */
export interface SessionIdentity {
  tenantId: string;
  userId: string;
}

/**
 * Session secret used to HMAC-sign the session cookie.
 * Required in production (env SESSION_SECRET). Falls back to a dev-only
 * default so local `pnpm dev` still works without configuration.
 */
function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  // Dev-only fallback — never rely on this in a deployed environment.
  return "dev-only-session-secret-do-not-use-in-prod";
}

/** Produce an HMAC-SHA256 hex signature for a given payload. */
function sign(payload: string): string {
  return createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("hex");
}

/**
 * Verify that a signature matches the expected payload using timing-safe
 * comparison to prevent timing attacks.
 */
function verifySignature(payload: string, signature: string): boolean {
  const expected = sign(payload);
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

/**
 * Encode an identity into a signed cookie value: `tenantId:userId.signature`.
 * The tenantId is signed alongside the userId so it cannot be forged — this is
 * what lets one deployment serve multiple tenants safely.
 */
function encodeCookie(identity: SessionIdentity): string {
  const payload = `${identity.tenantId}:${identity.userId}`;
  return `${payload}.${sign(payload)}`;
}

/**
 * Decode and verify a signed cookie value. Returns the identity if valid,
 * null otherwise (missing, malformed, unsigned, or tampered).
 */
function decodeCookie(raw: string): SessionIdentity | null {
  const dotIdx = raw.lastIndexOf(".");
  if (dotIdx === -1) return null;
  const payload = raw.slice(0, dotIdx);
  const sig = raw.slice(dotIdx + 1);
  if (!payload || !sig) return null;
  if (!verifySignature(payload, sig)) return null;

  const sepIdx = payload.indexOf(":");
  if (sepIdx === -1) return null;
  const tenantId = payload.slice(0, sepIdx);
  const userId = payload.slice(sepIdx + 1);
  if (!tenantId || !userId) return null;
  return { tenantId, userId };
}

/**
 * Resolve the current actor from the signed session cookie. The tenant comes
 * from the signed cookie, and the user is confirmed to exist in that tenant
 * (fails closed for deleted users or cross-tenant tampering).
 */
export async function getActor(): Promise<Actor | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;

  const identity = decodeCookie(raw);
  if (!identity) return null;

  const { store } = await getApp();
  const user = await store.getUser(identity.tenantId, identity.userId);
  return user
    ? { userId: user.id, tenantId: user.tenantId, role: user.role }
    : null;
}

export async function setSession(
  tenantId: string,
  userId: string,
): Promise<void> {
  (await cookies()).set(COOKIE, encodeCookie({ tenantId, userId }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/**
 * Verify a password against the configured AGENT_PASSWORD env var.
 * Returns true if the password matches, false otherwise.
 * If AGENT_PASSWORD is not set, authentication always fails in production
 * (SESSION_SECRET is set) but succeeds in dev mode for convenience.
 */
export function verifyPassword(password: string): boolean {
  const expected = process.env.AGENT_PASSWORD;
  if (!expected) {
    // In dev mode (no SESSION_SECRET set), allow passwordless login
    // for backwards compat with the demo flow.
    return !process.env.SESSION_SECRET;
  }
  // Use HMAC comparison to safely handle variable-length inputs
  // without leaking timing information about the expected value.
  const inputHmac = createHmac("sha256", "pw-check").update(password).digest();
  const expectedHmac = createHmac("sha256", "pw-check")
    .update(expected)
    .digest();
  return timingSafeEqual(inputHmac, expectedHmac);
}

// --- Exported for testing only ---
export const _testing = { sign, verifySignature, encodeCookie, decodeCookie };
