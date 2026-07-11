import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { _testing, verifyPassword } from "./session";

const { sign, verifySignature, encodeCookie, decodeCookie } = _testing;

describe("session — HMAC signing", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", "test-secret-key-123");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sign produces a consistent hex string for a given payload", () => {
    const sig1 = sign("user-123");
    const sig2 = sign("user-123");
    expect(sig1).toBe(sig2);
    // HMAC-SHA256 produces 64 hex chars
    expect(sig1).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(sig1)).toBe(true);
  });

  it("sign produces different signatures for different payloads", () => {
    const sig1 = sign("user-123");
    const sig2 = sign("user-456");
    expect(sig1).not.toBe(sig2);
  });

  it("verifySignature returns true for a valid signature", () => {
    const sig = sign("user-123");
    expect(verifySignature("user-123", sig)).toBe(true);
  });

  it("verifySignature returns false for an invalid signature", () => {
    const sig = sign("user-123");
    expect(verifySignature("user-456", sig)).toBe(false);
  });

  it("verifySignature returns false for a tampered signature", () => {
    const sig = sign("user-123");
    const tampered = sig.slice(0, -1) + (sig.endsWith("0") ? "1" : "0");
    expect(verifySignature("user-123", tampered)).toBe(false);
  });

  it("verifySignature returns false for wrong-length signature", () => {
    expect(verifySignature("user-123", "tooshort")).toBe(false);
  });
});

describe("session — cookie encoding/decoding", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", "test-secret-key-123");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("encodeCookie produces userId.signature format", () => {
    const cookie = encodeCookie("user-123");
    expect(cookie).toContain(".");
    expect(cookie.startsWith("user-123.")).toBe(true);
  });

  it("decodeCookie returns userId for a valid signed cookie", () => {
    const cookie = encodeCookie("user-123");
    expect(decodeCookie(cookie)).toBe("user-123");
  });

  it("decodeCookie returns null for an unsigned/plain userId", () => {
    // This is the old format — just a bare userId with no signature
    expect(decodeCookie("user-123")).toBe(null);
  });

  it("decodeCookie returns null for a forged cookie", () => {
    // Attacker sets cookie to "admin.fakesignature"
    expect(decodeCookie("admin.fakesignature1234567890abcdef1234567890abcdef1234567890abcdef1234")).toBe(null);
  });

  it("decodeCookie returns null for empty string", () => {
    expect(decodeCookie("")).toBe(null);
  });

  it("decodeCookie returns null for cookie with empty userId", () => {
    expect(decodeCookie(".somesig")).toBe(null);
  });

  it("decodeCookie returns null for cookie with empty signature", () => {
    expect(decodeCookie("user-123.")).toBe(null);
  });

  it("decodeCookie handles userId that contains dots", () => {
    // userId might contain dots — we split on the LAST dot
    const cookie = encodeCookie("tenant.user.123");
    expect(decodeCookie(cookie)).toBe("tenant.user.123");
  });
});

describe("session — access control (unauthenticated blocked)", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", "real-secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("no cookie → null (unauthenticated)", () => {
    expect(decodeCookie("")).toBe(null);
  });

  it("unsigned cookie (old format) → null (blocked)", () => {
    // The old system stored just "userId" — that must now be rejected
    expect(decodeCookie("some-user-id-without-signature")).toBe(null);
  });

  it("forged cookie with wrong secret → null (blocked)", () => {
    // Encode with one secret, try to decode with another
    const cookieFromDifferentSecret = "user-123.abcdef0123456789abcdef0123456789abcdef0123456789abcdef01234567";
    expect(decodeCookie(cookieFromDifferentSecret)).toBe(null);
  });

  it("valid signed cookie → userId (authenticated allowed)", () => {
    const cookie = encodeCookie("agent-joe-id");
    expect(decodeCookie(cookie)).toBe("agent-joe-id");
  });
});

describe("session — verifyPassword", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns true when password matches AGENT_PASSWORD", () => {
    vi.stubEnv("AGENT_PASSWORD", "s3cret!");
    expect(verifyPassword("s3cret!")).toBe(true);
  });

  it("returns false when password does not match AGENT_PASSWORD", () => {
    vi.stubEnv("AGENT_PASSWORD", "s3cret!");
    expect(verifyPassword("wrongpass")).toBe(false);
  });

  it("returns false for empty password when AGENT_PASSWORD is set", () => {
    vi.stubEnv("AGENT_PASSWORD", "s3cret!");
    expect(verifyPassword("")).toBe(false);
  });

  it("dev mode: returns true (any password) when neither AGENT_PASSWORD nor SESSION_SECRET is set", () => {
    vi.stubEnv("AGENT_PASSWORD", "");
    vi.stubEnv("SESSION_SECRET", "");
    expect(verifyPassword("")).toBe(true);
    expect(verifyPassword("anything")).toBe(true);
  });

  it("production mode: returns false when AGENT_PASSWORD not set but SESSION_SECRET is", () => {
    vi.stubEnv("AGENT_PASSWORD", "");
    vi.stubEnv("SESSION_SECRET", "prod-secret");
    expect(verifyPassword("")).toBe(false);
    expect(verifyPassword("anything")).toBe(false);
  });
});
