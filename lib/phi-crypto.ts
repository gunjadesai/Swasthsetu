import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// Application-level encryption for Protected Health Information (PHI).
// Supabase already encrypts the disk, but that doesn't stop anyone with
// dashboard/SQL/backup access from reading diagnoses in plain text.
// Encrypting in the app means the database only ever stores ciphertext
// for the fields that matter - diagnoses, symptoms, clinical notes,
// triage free text, addresses, emergency contacts, SMS bodies.
//
// AES-256-GCM (authenticated - tampered ciphertext fails to decrypt
// rather than silently returning garbage). Format:
//   enc:v1:<iv base64>:<auth tag base64>:<ciphertext base64>
// Values without the prefix are treated as legacy plaintext and passed
// through, so rows written before this existed keep rendering.
//
// Server-only: node's crypto module doesn't exist in the browser, and
// the key must never be exposed there. Decrypt on the server, then hand
// plain values to Client Components.
const PREFIX = "enc:v1:";

function parseKey(raw: string, name: string): Buffer {
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(`${name} must be exactly 32 bytes, base64-encoded.`);
  }
  return key;
}

function currentKey(): Buffer {
  const raw = process.env.PHI_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "PHI_ENCRYPTION_KEY is not set - generate one with `node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"` and add it to .env.local. It encrypts patient health information before it reaches the database."
    );
  }
  return parseKey(raw, "PHI_ENCRYPTION_KEY");
}

// During a key rotation, set the old key here so existing rows still
// decrypt while new writes use the new PHI_ENCRYPTION_KEY.
function previousKey(): Buffer | null {
  const raw = process.env.PHI_ENCRYPTION_KEY_PREVIOUS;
  return raw ? parseKey(raw, "PHI_ENCRYPTION_KEY_PREVIOUS") : null;
}

export function isEncryptedPHI(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}

export function encryptPHI(plain: string | null | undefined): string | null {
  if (plain === null || plain === undefined || plain === "") return null;
  if (isEncryptedPHI(plain)) return plain;

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", currentKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
}

function decryptWith(key: Buffer, iv: Buffer, tag: Buffer, ciphertext: Buffer): string {
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export const UNREADABLE_PHI = "[encrypted - unable to decrypt]";

export function decryptPHI(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (!isEncryptedPHI(value)) return value;

  const [ivB64, tagB64, ctB64] = value.slice(PREFIX.length).split(":");
  if (!ivB64 || !tagB64 || ctB64 === undefined) return UNREADABLE_PHI;
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ciphertext = Buffer.from(ctB64, "base64");

  try {
    return decryptWith(currentKey(), iv, tag, ciphertext);
  } catch {
    try {
      const old = previousKey();
      if (old) return decryptWith(old, iv, tag, ciphertext);
    } catch {
      // fall through
    }
    // Never throw from a render path - a wrong/missing key shows a
    // placeholder instead of taking the whole page down.
    return UNREADABLE_PHI;
  }
}

export function encryptPHIJson(value: unknown): string | null {
  return value === null || value === undefined ? null : encryptPHI(JSON.stringify(value));
}

export function decryptPHIJson<T>(value: string | null | undefined): T | null {
  const plain = decryptPHI(value);
  if (!plain || plain === UNREADABLE_PHI) return null;
  try {
    return JSON.parse(plain) as T;
  } catch {
    return null;
  }
}
