import CryptoJS from 'crypto-js';
import { v4 as uuidv4 } from 'uuid';
import type { EncryptedData } from '@/types';
import { ENCRYPTION_VERSION, KDF_PARAMS } from '@/constants';

export const generateSalt = (): string => {
  return CryptoJS.lib.WordArray.random(16).toString();
};

export const generateIV = (): string => {
  return CryptoJS.lib.WordArray.random(16).toString();
};

export const deriveKeyFromPassword = (
  password: string,
  salt: string,
  iterations: number = KDF_PARAMS.iterations
): string => {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: KDF_PARAMS.keySize / 32,
    iterations,
    hasher: CryptoJS.algo.SHA256,
  }).toString();
};

export const hashPassword = (password: string, salt: string): string => {
  return CryptoJS.SHA256(password + salt).toString();
};

export const verifyPassword = (
  password: string,
  salt: string,
  hash: string
): boolean => {
  const computedHash = hashPassword(password, salt);
  return computedHash === hash;
};

export const encrypt = <T>(data: T, key: string): EncryptedData<T> => {
  const iv = generateIV();
  const salt = generateSalt();

  const jsonString = JSON.stringify(data);
  const encrypted = CryptoJS.AES.encrypt(jsonString, key, {
    iv: CryptoJS.enc.Hex.parse(iv),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString();

  return {
    data: encrypted,
    iv,
    salt,
    version: ENCRYPTION_VERSION,
  };
};

export const decrypt = <T>(encrypted: EncryptedData<T>, key: string): T => {
  try {
    const decrypted = CryptoJS.AES.decrypt(encrypted.data, key, {
      iv: CryptoJS.enc.Hex.parse(encrypted.iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
    return JSON.parse(jsonString) as T;
  } catch (error) {
    throw new Error('解密失败，请检查密钥是否正确');
  }
};

export const generateMasterKey = (): string => {
  return CryptoJS.lib.WordArray.random(32).toString();
};

export const wrapMasterKey = (masterKey: string, derivedKey: string): string => {
  return CryptoJS.AES.encrypt(masterKey, derivedKey).toString();
};

export const unwrapMasterKey = (
  wrappedKey: string,
  derivedKey: string
): string => {
  try {
    const decrypted = CryptoJS.AES.decrypt(wrappedKey, derivedKey);
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    throw new Error('密钥解包失败，密码可能不正确');
  }
};

export const generateId = (): string => {
  return uuidv4();
};

export const encryptSensitiveFields = <T extends Record<string, unknown>>(
  obj: T,
  sensitiveFields: (keyof T)[],
  key: string
): T => {
  const result = { ...obj };

  for (const field of sensitiveFields) {
    if (result[field] !== undefined && result[field] !== null) {
      const value = result[field];
      if (typeof value === 'number') {
        result[field] = encrypt(value, key) as unknown as T[keyof T];
      } else if (typeof value === 'string') {
        result[field] = encrypt(value, key) as unknown as T[keyof T];
      } else if (typeof value === 'object') {
        result[field] = encrypt(value, key) as unknown as T[keyof T];
      }
    }
  }

  return result;
};

export const decryptSensitiveFields = <T extends Record<string, unknown>>(
  obj: T,
  sensitiveFields: (keyof T)[],
  key: string
): T => {
  const result = { ...obj };

  for (const field of sensitiveFields) {
    if (result[field] !== undefined && result[field] !== null) {
      try {
        const encryptedValue = result[field] as unknown as EncryptedData<
          T[keyof T]
        >;
        if (
          typeof encryptedValue === 'object' &&
          encryptedValue !== null &&
          'data' in encryptedValue &&
          'iv' in encryptedValue
        ) {
          result[field] = decrypt(encryptedValue, key);
        }
      } catch {
        // 如果解密失败，保留原始值（可能是未加密的旧数据）
      }
    }
  }

  return result;
};

export const createEncryptedBackup = <T>(
  data: T,
  masterKey: string
): string => {
  const backup = {
    version: ENCRYPTION_VERSION,
    timestamp: new Date().toISOString(),
    data: encrypt(data, masterKey),
  };
  return JSON.stringify(backup);
};

export const restoreEncryptedBackup = <T>(
  backupString: string,
  masterKey: string
): T => {
  try {
    const backup = JSON.parse(backupString);
    if (backup.version !== ENCRYPTION_VERSION) {
      console.warn(`备份版本不匹配: 预期 ${ENCRYPTION_VERSION}，实际 ${backup.version}`);
    }
    return decrypt<T>(backup.data, masterKey);
  } catch (error) {
    throw new Error('备份恢复失败，请检查备份文件和密钥是否正确');
  }
};
