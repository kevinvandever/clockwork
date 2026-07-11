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
    const sig1 = sign("tenant-a:user-123");
    const sig2 = sign("tenant-a:user-123");
    expect(sig1).toBe(sig2);
    expect(sig1).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(sig1)).toBe(true);
  });

  it("sign produces different signatures for different payloads", () => {
    expect(sign("tenant-a:user-123")).not.toBe(sign("tenant-a:user-456"));
  });

  it("verifySignature returns true for a valid signature", () => {
    const sig = sign("tenant-a:user-123");
    expect(verifySignature("tenant-a:user-123", sig)).toBe(true);
  });

  it("verifySignature returns false for a tampered signature", () => {
    const sig = sign("tenant-a:user-123");
    const tampered = sig.slice(0, -1) + (sig.endsWith("0") ? "1" : "0");
    expect(verifySignature("tenant-a:user-123", tampered)).toBe(false);
  });

  it("verifySignature returns false for wrong-length signature", () => {
    expect(verifySignature("tenant-a:user-123", "tooshort")).toBe(false);
  });
});

describe("session — cookie encoding/decoding", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", "test-secret-key-123");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("encodeCookie produces tenantId:userId.signature format", () => {
    const cookie = encodeCookie({ tenantId: "tenant-a", userId: "user-123" });
    expect(cookie.startsWith("tenant-a:user-123.")).toBe(true);
  });

  it("decodeCookie returns identity for a valid signed cookie", () => {
    const cookie = encodeCookie({ tenantId: "tenant-a", userId: "user-123" });
    expect(decodeCookie(cookie)).toEqual({
      tenantId: "tenant-a",
      userId: "user-123",
    });
  });

  it("decodeCookie returns null for an unsigned/plain value", () => {
    expect(decodeCookie("tenant-a:user-123")).toBe(null);
  });

  it("decodeCookie returns null for a forged cookie", () => {
    expect(
      decodeCookie(
        "tenant-a:admin.fakesig1234567890abcdef1234567890abcdef1234567890abcdef1234",
      ),
    ).toBe(null);
  });

  it("decodeCookie returns null for empty string", () => {
    expect(decodeCookie("")).toBe(null);
  });

  it("decodeCookie returns null when the payload has no tenant separator", () => {
    // Sign a payload with no ":" — valid signature but not a valid identity
    const payload = "no-separator";
    const cookie = `${payload}.${sign(payload)}`;
    expect(decodeCookie(cookie)).toBe(null);
  });

  it("decodeCookie returns null for empty tenantId or userId", () => {
    const c1 = `:user-1.${sign(":user-1")}`;
    const c2 = `tenant-a:.${sign("tenant-a:")}`;
    expect(decodeCookie(c1)).toBe(null);
    expect(decodeCookie(c2)).toBe(null);
  });

  it("decodeCookie handles userId containing a colon (splits on first)", () => {
    const cookie = encodeCookie({
      tenantId: "tenant-a",
      userId: "user:with:colons",
    });
    expect(decodeCookie(cookie)).toEqual({
      tenantId: "tenant-a",
      userId: "user:with:colons",
    });
  });
});

describe("session — access control (unauthenticated blocked)", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", "real-secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("no cookie → null", () => {
    expect(decodeCookie("")).toBe(null);
  });

  it("unsigned cookie → null (blocked)", () => {
    expect(decodeCookie("tenant-a:some-user")).toBe(null);
  });

  it("forged cookie with wrong secret → null (blocked)", () => {
    const forged =
      "tenant-a:user-123.abcdef0123456789abcdef0123456789abcdef0123456789abcdef01234567";
    expect(decodeCookie(forged)).toBe(null);
  });

  it("valid signed cookie → identity (authenticated allowed)", () => {
    const cookie = encodeCookie({
      tenantId: "tenant-joe",
      userId: "agent-joe-id",
    });
    expect(decodeCookie(cookie)).toEqual({
      tenantId: "tenant-joe",
      userId: "agent-joe-id",
    });
  });

  it("a cookie signed for one tenant cannot be re-pointed to another", () => {
    // Attacker takes a valid cookie and swaps the tenant prefix; signature no
    // longer matches the tampered payload.
    const cookie = encodeCookie({ tenantId: "tenant-a", userId: "user-1" });
    const sigIdx = cookie.lastIndexOf(".");
    const sig = cookie.slice(sigIdx + 1);
    const swapped = `tenant-b:user-1.${sig}`;
    expect(decodeCookie(swapped)).toBe(null);
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

  it("dev mode: returns true when neither AGENT_PASSWORD nor SESSION_SECRET is set", () => {
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
