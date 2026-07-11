import { describe, it, expect } from "vitest";
import { SecretCipher, CipherError } from "./crypto.js";

describe("SecretCipher", () => {
  const secret = "test-master-secret-abc123";

  it("round-trips plaintext through encrypt/decrypt", () => {
    const cipher = new SecretCipher(secret);
    const plaintext = "sk-ant-api03-super-secret-key";
    const encrypted = cipher.encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(cipher.decrypt(encrypted)).toBe(plaintext);
  });

  it("produces different ciphertext each time (random salt + iv)", () => {
    const cipher = new SecretCipher(secret);
    const a = cipher.encrypt("same-input");
    const b = cipher.encrypt("same-input");
    expect(a).not.toBe(b);
    // ...but both decrypt back to the same plaintext
    expect(cipher.decrypt(a)).toBe("same-input");
    expect(cipher.decrypt(b)).toBe("same-input");
  });

  it("fails to decrypt with a different secret", () => {
    const enc = new SecretCipher(secret).encrypt("secret-value");
    const wrong = new SecretCipher("a-different-secret");
    expect(() => wrong.decrypt(enc)).toThrow(CipherError);
  });

  it("detects a tampered payload via the auth tag", () => {
    const cipher = new SecretCipher(secret);
    const enc = cipher.encrypt("secret-value");
    // Flip a character near the end (ciphertext region)
    const raw = Buffer.from(enc, "base64");
    raw[raw.length - 1] = raw[raw.length - 1] ^ 0xff;
    const tampered = raw.toString("base64");
    expect(() => cipher.decrypt(tampered)).toThrow(CipherError);
  });

  it("throws when constructed without a secret", () => {
    expect(() => new SecretCipher(undefined)).toThrow(CipherError);
    expect(() => new SecretCipher("")).toThrow(CipherError);
    expect(() => new SecretCipher("   ")).toThrow(CipherError);
  });

  it("rejects a too-short payload", () => {
    const cipher = new SecretCipher(secret);
    expect(() => cipher.decrypt("YWJj")).toThrow(CipherError);
  });

  it("round-trips with matching AAD (tenantId)", () => {
    const cipher = new SecretCipher(secret);
    const enc = cipher.encrypt("sk-key", "tenant-a");
    expect(cipher.decrypt(enc, "tenant-a")).toBe("sk-key");
  });

  it("fails to decrypt when the AAD differs (cross-tenant replay blocked)", () => {
    const cipher = new SecretCipher(secret);
    const enc = cipher.encrypt("sk-key", "tenant-a");
    expect(() => cipher.decrypt(enc, "tenant-b")).toThrow(CipherError);
  });

  it("fails to decrypt AAD-sealed ciphertext with no AAD", () => {
    const cipher = new SecretCipher(secret);
    const enc = cipher.encrypt("sk-key", "tenant-a");
    expect(() => cipher.decrypt(enc)).toThrow(CipherError);
  });
});
