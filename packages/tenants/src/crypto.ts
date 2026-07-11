import {
  randomBytes,
  scryptSync,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";

/**
 * Symmetric encryption for tenant secrets (the Anthropic API key) at rest.
 *
 * Uses AES-256-GCM with a per-record random salt + IV. The 32-byte key is
 * derived from a single deployment-wide secret (`KEY_ENCRYPTION_SECRET`) via
 * scrypt, so a weak/short secret is still stretched. The auth tag makes
 * tampering detectable on decrypt.
 *
 * Payload layout (concatenated, then base64):
 *   [salt: 16][iv: 12][authTag: 16][ciphertext: N]
 */

const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;

export class CipherError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CipherError";
  }
}

/** Encrypts/decrypts short secrets with a deployment-wide master secret. */
export class SecretCipher {
  private readonly secret: string;

  constructor(secret: string | undefined) {
    if (!secret || secret.trim() === "") {
      throw new CipherError(
        "KEY_ENCRYPTION_SECRET is required to encrypt tenant secrets",
      );
    }
    this.secret = secret;
  }

  private deriveKey(salt: Buffer): Buffer {
    return scryptSync(this.secret, salt, KEY_LEN);
  }

  /**
   * Encrypt plaintext, returning an opaque base64 payload.
   *
   * `aad` (additional authenticated data) is bound into the GCM tag but not
   * encrypted. Callers pass the `tenantId` so a stored ciphertext cannot be
   * decrypted under a different tenant's context (replay protection).
   */
  encrypt(plaintext: string, aad?: string): string {
    const salt = randomBytes(SALT_LEN);
    const iv = randomBytes(IV_LEN);
    const key = this.deriveKey(salt);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    if (aad !== undefined) {
      cipher.setAAD(Buffer.from(aad, "utf8"));
    }
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([salt, iv, authTag, ciphertext]).toString("base64");
  }

  /**
   * Decrypt a payload produced by `encrypt`. Throws if tampered, decrypted with
   * the wrong secret, or verified against a different `aad` than it was sealed
   * with.
   */
  decrypt(payload: string, aad?: string): string {
    let raw: Buffer;
    try {
      raw = Buffer.from(payload, "base64");
    } catch {
      throw new CipherError("invalid ciphertext payload");
    }
    if (raw.length < SALT_LEN + IV_LEN + TAG_LEN) {
      throw new CipherError("ciphertext payload is too short");
    }
    const salt = raw.subarray(0, SALT_LEN);
    const iv = raw.subarray(SALT_LEN, SALT_LEN + IV_LEN);
    const authTag = raw.subarray(SALT_LEN + IV_LEN, SALT_LEN + IV_LEN + TAG_LEN);
    const ciphertext = raw.subarray(SALT_LEN + IV_LEN + TAG_LEN);
    const key = this.deriveKey(salt);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    if (aad !== undefined) {
      decipher.setAAD(Buffer.from(aad, "utf8"));
    }
    decipher.setAuthTag(authTag);
    try {
      return Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]).toString("utf8");
    } catch {
      throw new CipherError(
        "failed to decrypt secret (wrong key, wrong tenant, or tampered payload)",
      );
    }
  }
}
