import { create } from 'zustand';
import type { User } from '@/types';
import { db } from '@/utils/database';
import {
  generateSalt,
  generateMasterKey,
  deriveKeyFromPassword,
  hashPassword,
  verifyPassword,
  wrapMasterKey,
  unwrapMasterKey,
  generateId,
} from '@/utils/crypto';
import { dataSyncService } from '@/utils/database/dataSyncService';
import { KDF_PARAMS } from '@/constants';

interface AuthState {
  user: User | null;
  masterKey: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  register: (email: string, password: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
  changePassword: (
    oldPassword: string,
    newPassword: string
  ) => Promise<boolean>;
  getEncryptionKey: () => Promise<string>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  masterKey: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  register: async (email: string, password: string): Promise<boolean> => {
    set({ isLoading: true, error: null });

    try {
      const existingUser = await db.users.where('email').equals(email).first();
      if (existingUser) {
        set({ error: '该邮箱已被注册', isLoading: false });
        return false;
      }

      const salt = generateSalt();
      const passwordHash = hashPassword(password, salt);
      const derivedKey = deriveKeyFromPassword(password, salt);

      const masterKey = generateMasterKey();
      const wrappedMasterKey = wrapMasterKey(masterKey, derivedKey);

      const userId = generateId();
      const user: User = {
        id: userId,
        email,
        encryptedMasterKey: wrappedMasterKey,
        passwordHash,
        encryptionSalt: salt,
        lastLogin: new Date(),
        createdAt: new Date(),
      };

      await db.users.add(user);

      const encryptionKeyRecord = {
        id: generateId(),
        userId,
        wrappedKey: wrappedMasterKey,
        keyDerivationParams: {
          iterations: KDF_PARAMS.iterations,
          salt,
          hash: KDF_PARAMS.hash,
        },
        version: 1,
        createdAt: new Date(),
      };
      await db.encryptionKeys.add(encryptionKeyRecord);

      await dataSyncService.initializeDefaultData(userId);

      set({
        user,
        masterKey,
        isAuthenticated: true,
        isLoading: false,
      });

      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '注册失败',
        isLoading: false,
      });
      return false;
    }
  },

  login: async (email: string, password: string): Promise<boolean> => {
    set({ isLoading: true, error: null });

    try {
      const user = await db.users.where('email').equals(email).first();
      if (!user) {
        set({ error: '用户不存在', isLoading: false });
        return false;
      }

      if (!verifyPassword(password, user.encryptionSalt, user.passwordHash)) {
        set({ error: '密码错误', isLoading: false });
        return false;
      }

      const derivedKey = deriveKeyFromPassword(password, user.encryptionSalt);
      const masterKey = unwrapMasterKey(user.encryptedMasterKey, derivedKey);

      await db.users.update(user.id, { lastLogin: new Date() });

      set({
        user: { ...user, lastLogin: new Date() },
        masterKey,
        isAuthenticated: true,
        isLoading: false,
      });

      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '登录失败',
        isLoading: false,
      });
      return false;
    }
  },

  logout: (): void => {
    localStorage.removeItem('auth_user');
    set({
      user: null,
      masterKey: null,
      isAuthenticated: false,
      error: null,
    });
  },

  checkAuth: async (): Promise<boolean> => {
    const { isAuthenticated, user } = get();

    if (isAuthenticated && user) {
      return true;
    }

    try {
      const lastUser = await db.users.orderBy('lastLogin').reverse().first();
      if (lastUser) {
        set({ user: lastUser });
        return false;
      }
    } catch {
      // Ignore errors
    }

    return false;
  },

  changePassword: async (
    oldPassword: string,
    newPassword: string
  ): Promise<boolean> => {
    const { user, masterKey } = get();
    if (!user || !masterKey) {
      set({ error: '请先登录' });
      return false;
    }

    set({ isLoading: true, error: null });

    try {
      if (!verifyPassword(oldPassword, user.encryptionSalt, user.passwordHash)) {
        set({ error: '原密码错误', isLoading: false });
        return false;
      }

      const newSalt = generateSalt();
      const newPasswordHash = hashPassword(newPassword, newSalt);
      const newDerivedKey = deriveKeyFromPassword(newPassword, newSalt);
      const newWrappedMasterKey = wrapMasterKey(masterKey, newDerivedKey);

      await db.users.update(user.id, {
        passwordHash: newPasswordHash,
        encryptionSalt: newSalt,
        encryptedMasterKey: newWrappedMasterKey,
      });

      const latestKey = await db.encryptionKeys
        .where('userId')
        .equals(user.id)
        .reverse()
        .first();

      const newVersion = latestKey ? latestKey.version + 1 : 1;

      await db.encryptionKeys.add({
        id: generateId(),
        userId: user.id,
        wrappedKey: newWrappedMasterKey,
        keyDerivationParams: {
          iterations: KDF_PARAMS.iterations,
          salt: newSalt,
          hash: KDF_PARAMS.hash,
        },
        version: newVersion,
        createdAt: new Date(),
      });

      set({
        user: {
          ...user,
          passwordHash: newPasswordHash,
          encryptionSalt: newSalt,
          encryptedMasterKey: newWrappedMasterKey,
        },
        isLoading: false,
      });

      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '密码修改失败',
        isLoading: false,
      });
      return false;
    }
  },

  getEncryptionKey: async (): Promise<string> => {
    const { masterKey } = get();
    if (masterKey) {
      return masterKey;
    }
    throw new Error('未登录，无法获取加密密钥');
  },

  clearError: (): void => {
    set({ error: null });
  },
}));
