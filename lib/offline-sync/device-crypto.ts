"use client";

// Encryption for whatever an offline queue holds on the device.
//
// A queued ASHA field visit carries clinical notes about a named
// patient. Those sat in localStorage as plain text - readable by any
// script on the origin, by anyone who picks the phone up, and by
// anything that dumps a browser profile. Server-side PHI encryption
// (lib/phi-crypto.ts) can't help here: its key must never reach the
// browser.
//
// So: AES-256-GCM with a key generated on the device, kept in
// IndexedDB, and marked non-extractable - the browser will encrypt and
// decrypt with it but will not hand the key material back to JavaScript,
// so it can't be copied out or dumped alongside localStorage. This is
// defence in depth for a phone that is lost, shared or inspected, not
// protection against malicious code running in this origin: anything
// that can call into this module can also ask the browser to decrypt.
// Queued entries are deleted the moment they sync, so the window is
// short by design.
//
// Where Web Crypto or IndexedDB isn't available (an http:// origin, a
// locked-down browser), isLocalEncryptionAvailable() reports false and
// the caller decides - the ASHA flows keep saving the visit in the
// clear rather than losing it, and say so on screen.

const DB_NAME = "swasthsetu-offline";
const DB_VERSION = 1;
const STORE = "keys";
const KEY_ID = "queue-key-v1";
const PREFIX = "loc:v1:";

let keyPromise: Promise<CryptoKey | null> | null = null;

function subtle(): SubtleCrypto | null {
  if (typeof window === "undefined") return null;
  // crypto.subtle only exists in a secure context (https:// or localhost).
  return window.crypto?.subtle ?? null;
}

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) {
          request.result.createObjectStore(STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function readKey(db: IDBDatabase): Promise<CryptoKey | null> {
  return new Promise((resolve) => {
    try {
      const request = db.transaction(STORE, "readonly").objectStore(STORE).get(KEY_ID);
      request.onsuccess = () => resolve((request.result as CryptoKey) ?? null);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function writeKey(db: IDBDatabase, key: CryptoKey): Promise<void> {
  return new Promise((resolve) => {
    try {
      const request = db.transaction(STORE, "readwrite").objectStore(STORE).put(key, KEY_ID);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function deviceKey(): Promise<CryptoKey | null> {
  if (keyPromise) return keyPromise;

  keyPromise = (async () => {
    const crypto = subtle();
    const db = await openDb();
    if (!crypto || !db) return null;

    const existing = await readKey(db);
    if (existing) return existing;

    try {
      // extractable: false - the key can be stored and used, never read.
      const key = await crypto.generateKey({ name: "AES-GCM", length: 256 }, false, [
        "encrypt",
        "decrypt",
      ]);
      await writeKey(db, key);
      return key;
    } catch {
      return null;
    }
  })();

  return keyPromise;
}

export async function isLocalEncryptionAvailable(): Promise<boolean> {
  return (await deviceKey()) !== null;
}

export function isLocallyEncrypted(value: string): boolean {
  return value.startsWith(PREFIX);
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  // Backed by a plain ArrayBuffer so it satisfies BufferSource - a
  // Uint8Array can also sit on a SharedArrayBuffer, which Web Crypto
  // won't take.
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Returns the ciphertext, or the original string when this device can't
// encrypt. Callers that care check isLocalEncryptionAvailable() and warn.
export async function encryptOnDevice(plain: string): Promise<string> {
  if (!plain) return plain;
  const crypto = subtle();
  const key = await deviceKey();
  if (!crypto || !key) return plain;

  try {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = new Uint8Array(
      await crypto.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain))
    );
    return `${PREFIX}${toBase64(iv)}:${toBase64(ciphertext)}`;
  } catch {
    return plain;
  }
}

export async function decryptOnDevice(value: string): Promise<string> {
  if (!value || !isLocallyEncrypted(value)) return value;
  const crypto = subtle();
  const key = await deviceKey();
  if (!crypto || !key) return "";

  const [ivB64, ctB64] = value.slice(PREFIX.length).split(":");
  if (!ivB64 || !ctB64) return "";

  try {
    const plain = await crypto.decrypt(
      { name: "AES-GCM", iv: fromBase64(ivB64) },
      key,
      fromBase64(ctB64)
    );
    return new TextDecoder().decode(plain);
  } catch {
    // Key gone (site data cleared between queueing and syncing) - the
    // entry can't be recovered. Empty rather than ciphertext on screen.
    return "";
  }
}
