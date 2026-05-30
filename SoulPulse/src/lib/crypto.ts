import CryptoJS from "crypto-js";
import { EncryptedData } from "@/types";
import { ENCRYPTION_VERSION, ENABLE_ENCRYPTION } from "@/lib/constants";
import { generateId } from "@/lib/utils";

const KEY_STORAGE_KEY = "soulpulse_encryption_key";
const SALT_LENGTH = 16;
const ITERATIONS = 100000;
const KEY_SIZE = 256;

export class EncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EncryptionError";
  }
}

export function generateSalt(): string {
  return CryptoJS.lib.WordArray.random(SALT_LENGTH).toString();
}

export function generateIV(): string {
  return CryptoJS.lib.WordArray.random(16).toString();
}

export function deriveKey(password: string, salt: string): CryptoJS.lib.WordArray {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: KEY_SIZE / 32,
    iterations: ITERATIONS,
    hasher: CryptoJS.algo.SHA256,
  });
}

export function generateMasterKey(): string {
  return CryptoJS.lib.WordArray.random(32).toString();
}

export function storeMasterKey(key: string): void {
  if (typeof window !== "undefined") {
    const wrappedKey = wrapKey(key);
    sessionStorage.setItem(KEY_STORAGE_KEY, wrappedKey);
  }
}

export function getMasterKey(): string | null {
  if (typeof window !== "undefined") {
    const wrappedKey = sessionStorage.getItem(KEY_STORAGE_KEY);
    if (wrappedKey) {
      return unwrapKey(wrappedKey);
    }
  }
  return null;
}

export function clearMasterKey(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(KEY_STORAGE_KEY);
  }
}

export function hasMasterKey(): boolean {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem(KEY_STORAGE_KEY) !== null;
  }
  return false;
}

function wrapKey(key: string): string {
  const wrapper = generateId();
  return btoa(`${wrapper}:${key}:${wrapper.split("-").reverse().join("")}`);
}

function unwrapKey(wrapped: string): string {
  try {
    const decoded = atob(wrapped);
    const parts = decoded.split(":");
    if (parts.length >= 3) {
      return parts[1];
    }
  } catch {
    // ignore
  }
  return wrapped;
}

export function encryptData(data: unknown, key: string): EncryptedData {
  if (!ENABLE_ENCRYPTION) {
    return {
      iv: "",
      encryptedData: JSON.stringify(data),
      salt: "",
      version: ENCRYPTION_VERSION,
    };
  }

  if (!key) {
    throw new EncryptionError("Encryption key is required");
  }

  try {
    const salt = generateSalt();
    const iv = generateIV();
    const derivedKey = deriveKey(key, salt);
    const jsonString = JSON.stringify(data);

    const encrypted = CryptoJS.AES.encrypt(jsonString, derivedKey, {
      iv: CryptoJS.enc.Hex.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    return {
      iv,
      encryptedData: encrypted.toString(),
      salt,
      version: ENCRYPTION_VERSION,
    };
  } catch (error) {
    throw new EncryptionError(`Failed to encrypt data: ${error}`);
  }
}

export function decryptData<T>(encrypted: EncryptedData, key: string): T {
  if (!ENABLE_ENCRYPTION) {
    return JSON.parse(encrypted.encryptedData) as T;
  }

  if (!key) {
    throw new EncryptionError("Decryption key is required");
  }

  try {
    const derivedKey = deriveKey(key, encrypted.salt);

    const decrypted = CryptoJS.AES.decrypt(encrypted.encryptedData, derivedKey, {
      iv: CryptoJS.enc.Hex.parse(encrypted.iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const jsonString = decrypted.toString(CryptoJS.enc.Utf8);

    if (!jsonString) {
      throw new EncryptionError("Decryption produced empty result - invalid key or corrupted data");
    }

    return JSON.parse(jsonString) as T;
  } catch (error) {
    if (error instanceof EncryptionError) {
      throw error;
    }
    throw new EncryptionError(`Failed to decrypt data: ${error}`);
  }
}

export function generateChecksum(data: string): string {
  return CryptoJS.SHA256(data).toString();
}

export function verifyChecksum(data: string, checksum: string): boolean {
  return generateChecksum(data) === checksum;
}

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || generateSalt();
  const hash = CryptoJS.PBKDF2(password, actualSalt, {
    keySize: 256 / 32,
    iterations: ITERATIONS,
    hasher: CryptoJS.algo.SHA256,
  }).toString();

  return { hash, salt: actualSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const result = hashPassword(password, salt);
  return result.hash === hash;
}

export function createSecureBackup(key: string, password: string): string {
  const salt = generateSalt();
  const derivedKey = deriveKey(password, salt);
  const iv = generateIV();

  const encrypted = CryptoJS.AES.encrypt(key, derivedKey, {
    iv: CryptoJS.enc.Hex.parse(iv),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  const backupData = {
    v: ENCRYPTION_VERSION,
    s: salt,
    iv,
    d: encrypted.toString(),
    c: generateChecksum(key),
  };

  return btoa(JSON.stringify(backupData));
}

export function restoreFromBackup(backup: string, password: string): string | null {
  try {
    const backupData = JSON.parse(atob(backup));
    const derivedKey = deriveKey(password, backupData.s);

    const decrypted = CryptoJS.AES.decrypt(backupData.d, derivedKey, {
      iv: CryptoJS.enc.Hex.parse(backupData.iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const key = decrypted.toString(CryptoJS.enc.Utf8);

    if (generateChecksum(key) !== backupData.c) {
      return null;
    }

    return key;
  } catch {
    return null;
  }
}

export function secureRandom(min: number, max: number): number {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return min + (array[0] % (max - min + 1));
  }
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function obfuscateData(data: string): string {
  const key = generateId();
  let result = "";
  for (let i = 0; i < data.length; i++) {
    const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode);
  }
  return btoa(`${key}:${result}`);
}

export function deobfuscateData(obfuscated: string): string {
  try {
    const decoded = atob(obfuscated);
    const colonIndex = decoded.indexOf(":");
    if (colonIndex === -1) return obfuscated;

    const key = decoded.substring(0, colonIndex);
    const data = decoded.substring(colonIndex + 1);
    let result = "";

    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }

    return result;
  } catch {
    return obfuscated;
  }
}
