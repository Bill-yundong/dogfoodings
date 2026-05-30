import { create } from 'zustand';
import type {
  Transaction,
  Category,
  Account,
  Investment,
  TaxRecord,
  SimulationParams,
  Budget,
  TransactionType,
  User,
} from '@/types';
import { db } from '@/utils/database';
import { dataSyncService } from '@/utils/database/dataSyncService';
import { generateId } from '@/utils/crypto';
import { useAuthStore } from './useAuthStore';

interface DataState {
  user: User | null;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  investments: Investment[];
  taxRecords: TaxRecord[];
  simulationParams: SimulationParams[];
  budgets: Budget[];
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;

  loadData: (userId: string) => Promise<void>;
  addTransaction: (
    transaction: Omit<
      Transaction,
      'id' | 'userId' | 'createdAt' | 'updatedAt'
    >
  ) => Promise<boolean>;
  updateTransaction: (
    id: string,
    updates: Partial<Transaction>
  ) => Promise<boolean>;
  deleteTransaction: (id: string) => Promise<boolean>;

  addCategory: (
    category: Omit<Category, 'id' | 'userId' | 'isDefault'>
  ) => Promise<boolean>;
  updateCategory: (
    id: string,
    updates: Partial<Category>
  ) => Promise<boolean>;
  deleteCategory: (id: string) => Promise<boolean>;

  addAccount: (
    account: Omit<Account, 'id' | 'userId' | 'createdAt'>
  ) => Promise<boolean>;
  updateAccount: (
    id: string,
    updates: Partial<Account>
  ) => Promise<boolean>;
  deleteAccount: (id: string) => Promise<boolean>;

  addInvestment: (
    investment: Omit<Investment, 'id' | 'userId'>
  ) => Promise<boolean>;
  updateInvestment: (
    id: string,
    updates: Partial<Investment>
  ) => Promise<boolean>;
  deleteInvestment: (id: string) => Promise<boolean>;

  addTaxRecord: (
    taxRecord: Omit<TaxRecord, 'id' | 'userId' | 'createdAt'>
  ) => Promise<boolean>;

  addSimulationParams: (
    params: Omit<SimulationParams, 'id' | 'userId'>
  ) => Promise<boolean>;
  deleteSimulationParams: (id: string) => Promise<boolean>;

  addBudget: (budget: Omit<Budget, 'id'>) => Promise<boolean>;
  updateBudget: (id: string, updates: Partial<Budget>) => Promise<boolean>;
  deleteBudget: (id: string) => Promise<boolean>;

  generateDemoData: () => Promise<boolean>;
  clearData: () => void;
  setError: (error: string | null) => void;
}

export const useDataStore = create<DataState>((set, get) => ({
  user: null,
  transactions: [],
  categories: [],
  accounts: [],
  investments: [],
  taxRecords: [],
  simulationParams: [],
  budgets: [],
  isLoading: false,
  error: null,
  isInitialized: false,

  loadData: async (userId: string): Promise<void> => {
    set({ isLoading: true, error: null });

    try {
      const [
        user,
        transactions,
        categories,
        accounts,
        investments,
        taxRecords,
        simulationParams,
        budgets,
      ] = await Promise.all([
        db.users.get(userId),
        db.transactions.where('userId').equals(userId).reverse().sortBy('date'),
        db.categories.where('userId').equals(userId).sortBy('sortOrder'),
        db.accounts.where('userId').equals(userId).toArray(),
        db.investments.where('userId').equals(userId).toArray(),
        db.taxRecords.where('userId').equals(userId).toArray(),
        db.simulationParams.where('userId').equals(userId).toArray(),
        db.budgets.toArray(),
      ]);

      set({
        user: user || null,
        transactions,
        categories,
        accounts,
        investments,
        taxRecords,
        simulationParams,
        budgets,
        isLoading: false,
        isInitialized: true,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '数据加载失败',
        isLoading: false,
      });
    }
  },

  addTransaction: async (
    transaction: Omit<
      Transaction,
      'id' | 'userId' | 'createdAt' | 'updatedAt'
    >
  ): Promise<boolean> => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ error: '请先登录' });
      return false;
    }

    set({ isLoading: true, error: null });

    try {
      const newTransaction: Transaction = {
        ...transaction,
        id: generateId(),
        userId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.transactions.add(newTransaction);
      await dataSyncService.handleTransactionCreated(newTransaction, user.id);

      const updatedTransactions = await db.transactions
        .where('userId')
        .equals(user.id)
        .reverse()
        .sortBy('date');

      const updatedAccounts = await db.accounts
        .where('userId')
        .equals(user.id)
        .toArray();

      const updatedTaxRecords = await db.taxRecords
        .where('userId')
        .equals(user.id)
        .toArray();

      set({
        transactions: updatedTransactions,
        accounts: updatedAccounts,
        taxRecords: updatedTaxRecords,
        isLoading: false,
      });

      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '添加交易失败',
        isLoading: false,
      });
      return false;
    }
  },

  updateTransaction: async (
    id: string,
    updates: Partial<Transaction>
  ): Promise<boolean> => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ error: '请先登录' });
      return false;
    }

    set({ isLoading: true, error: null });

    try {
      const oldTransaction = await db.transactions.get(id);
      if (!oldTransaction) {
        set({ error: '交易不存在', isLoading: false });
        return false;
      }

      const newTransaction: Transaction = {
        ...oldTransaction,
        ...updates,
        updatedAt: new Date(),
      };

      const { id: _, ...updateData } = newTransaction;
      await db.transactions.update(id, updateData);
      await dataSyncService.handleTransactionUpdated(
        oldTransaction,
        newTransaction,
        user.id
      );

      const updatedTransactions = await db.transactions
        .where('userId')
        .equals(user.id)
        .reverse()
        .sortBy('date');

      const updatedAccounts = await db.accounts
        .where('userId')
        .equals(user.id)
        .toArray();

      const updatedTaxRecords = await db.taxRecords
        .where('userId')
        .equals(user.id)
        .toArray();

      set({
        transactions: updatedTransactions,
        accounts: updatedAccounts,
        taxRecords: updatedTaxRecords,
        isLoading: false,
      });

      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '更新交易失败',
        isLoading: false,
      });
      return false;
    }
  },

  deleteTransaction: async (id: string): Promise<boolean> => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ error: '请先登录' });
      return false;
    }

    set({ isLoading: true, error: null });

    try {
      const transaction = await db.transactions.get(id);
      if (!transaction) {
        set({ error: '交易不存在', isLoading: false });
        return false;
      }

      await db.transactions.delete(id);
      await dataSyncService.handleTransactionDeleted(transaction, user.id);

      const updatedTransactions = await db.transactions
        .where('userId')
        .equals(user.id)
        .reverse()
        .sortBy('date');

      const updatedAccounts = await db.accounts
        .where('userId')
        .equals(user.id)
        .toArray();

      const updatedTaxRecords = await db.taxRecords
        .where('userId')
        .equals(user.id)
        .toArray();

      set({
        transactions: updatedTransactions,
        accounts: updatedAccounts,
        taxRecords: updatedTaxRecords,
        isLoading: false,
      });

      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '删除交易失败',
        isLoading: false,
      });
      return false;
    }
  },

  addCategory: async (
    category: Omit<Category, 'id' | 'userId' | 'isDefault'>
  ): Promise<boolean> => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ error: '请先登录' });
      return false;
    }

    set({ isLoading: true, error: null });

    try {
      const newCategory: Category = {
        ...category,
        id: generateId(),
        userId: user.id,
        isDefault: false,
      };

      await db.categories.add(newCategory);

      const updatedCategories = await db.categories
        .where('userId')
        .equals(user.id)
        .sortBy('sortOrder');

      set({
        categories: updatedCategories,
        isLoading: false,
      });

      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '添加分类失败',
        isLoading: false,
      });
      return false;
    }
  },

  updateCategory: async (
    id: string,
    updates: Partial<Category>
  ): Promise<boolean> => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ error: '请先登录' });
      return false;
    }

    set({ isLoading: true, error: null });

    try {
      await db.categories.update(id, updates);

      const updatedCategories = await db.categories
        .where('userId')
        .equals(user.id)
        .sortBy('sortOrder');

      set({
        categories: updatedCategories,
        isLoading: false,
      });

      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '更新分类失败',
        isLoading: false,
      });
      return false;
    }
  },

  deleteCategory: async (id: string): Promise<boolean> => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ error: '请先登录' });
      return false;
    }

    set({ isLoading: true, error: null });

    try {
      const category = await db.categories.get(id);
      if (!category) {
        set({ error: '分类不存在', isLoading: false });
        return false;
      }

      if (category.isDefault) {
        set({ error: '默认分类不能删除', isLoading: false });
        return false;
      }

      const transactionsWithCategory = await db.transactions
        .where('categoryId')
        .equals(id)
        .count();

      if (transactionsWithCategory > 0) {
        set({
          error: '该分类下还有交易记录，请先处理',
          isLoading: false,
        });
        return false;
      }

      await db.categories.delete(id);

      const updatedCategories = await db.categories
        .where('userId')
        .equals(user.id)
        .sortBy('sortOrder');

      set({
        categories: updatedCategories,
        isLoading: false,
      });

      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '删除分类失败',
        isLoading: false,
      });
      return false;
    }
  },

  addAccount: async (
    account: Omit<Account, 'id' | 'userId' | 'createdAt'>
  ): Promise<boolean> => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ error: '请先登录' });
      return false;
    }

    set({ isLoading: true, error: null });

    try {
      const newAccount: Account = {
        ...account,
        id: generateId(),
        userId: user.id,
        createdAt: new Date(),
      };

      await db.accounts.add(newAccount);
      await dataSyncService.handleAccountCreated(newAccount);

      const updatedAccounts = await db.accounts
        .where('userId')
        .equals(user.id)
        .toArray();

      set({
        accounts: updatedAccounts,
        isLoading: false,
      });

      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '添加账户失败',
        isLoading: false,
      });
      return false;
    }
  },

  updateAccount: async (
    id: string,
    updates: Partial<Account>
  ): Promise<boolean> => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ error: '请先登录' });
      return false;
    }

    set({ isLoading: true, error: null });

    try {
      await db.accounts.update(id, updates);
      await dataSyncService.handleAccountUpdated({ id, ...updates });

      const updatedAccounts = await db.accounts
        .where('userId')
        .equals(user.id)
        .toArray();

      set({
        accounts: updatedAccounts,
        isLoading: false,
      });

      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '更新账户失败',
        isLoading: false,
      });
      return false;
    }
  },

  deleteAccount: async (id: string): Promise<boolean> => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ error: '请先登录' });
      return false;
    }

    set({ isLoading: true, error: null });

    try {
      await dataSyncService.handleAccountDeleted(id);

      const updatedAccounts = await db.accounts
        .where('userId')
        .equals(user.id)
        .toArray();

      const updatedTransactions = await db.transactions
        .where('userId')
        .equals(user.id)
        .reverse()
        .sortBy('date');

      const updatedInvestments = await db.investments
        .where('userId')
        .equals(user.id)
        .toArray();

      set({
        accounts: updatedAccounts,
        transactions: updatedTransactions,
        investments: updatedInvestments,
        isLoading: false,
      });

      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '删除账户失败',
        isLoading: false,
      });
      return false;
    }
  },

  addInvestment: async (
    investment: Omit<Investment, 'id' | 'userId'>
  ): Promise<boolean> => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ error: '请先登录' });
      return false;
    }

    set({ isLoading: true, error: null });

    try {
      const newInvestment: Investment = {
        ...investment,
        id: generateId(),
        userId: user.id,
      };

      await db.investments.add(newInvestment);

      const updatedInvestments = await db.investments
        .where('userId')
        .equals(user.id)
        .toArray();

      set({
        investments: updatedInvestments,
        isLoading: false,
      });

      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '添加投资失败',
        isLoading: false,
      });
      return false;
    }
  },

  updateInvestment: async (
    id: string,
    updates: Partial<Investment>
  ): Promise<boolean> => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ error: '请先登录' });
      return false;
    }

    set({ isLoading: true, error: null });

    try {
      await db.investments.update(id, updates);

      const updatedInvestments = await db.investments
        .where('userId')
        .equals(user.id)
        .toArray();

      set({
        investments: updatedInvestments,
        isLoading: false,
      });

      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '更新投资失败',
        isLoading: false,
      });
      return false;
    }
  },

  deleteInvestment: async (id: string): Promise<boolean> => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ error: '请先登录' });
      return false;
    }

    set({ isLoading: true, error: null });

    try {
      await db.investments.delete(id);

      const updatedInvestments = await db.investments
        .where('userId')
        .equals(user.id)
        .toArray();

      set({
        investments: updatedInvestments,
        isLoading: false,
      });

      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '删除投资失败',
        isLoading: false,
      });
      return false;
    }
  },

  addTaxRecord: async (
    taxRecord: Omit<TaxRecord, 'id' | 'userId' | 'createdAt'>
  ): Promise<boolean> => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ error: '请先登录' });
      return false;
    }

    set({ isLoading: true, error: null });

    try {
      const newTaxRecord: TaxRecord = {
        ...taxRecord,
        id: generateId(),
        userId: user.id,
        createdAt: new Date(),
      };

      await db.taxRecords.add(newTaxRecord);

      const updatedTaxRecords = await db.taxRecords
        .where('userId')
        .equals(user.id)
        .toArray();

      set({
        taxRecords: updatedTaxRecords,
        isLoading: false,
      });

      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '添加税务记录失败',
        isLoading: false,
      });
      return false;
    }
  },

  addSimulationParams: async (
    params: Omit<SimulationParams, 'id' | 'userId'>
  ): Promise<boolean> => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ error: '请先登录' });
      return false;
    }

    set({ isLoading: true, error: null });

    try {
      const newParams: SimulationParams = {
        ...params,
        id: generateId(),
        userId: user.id,
      };

      await db.simulationParams.add(newParams);

      const updatedParams = await db.simulationParams
        .where('userId')
        .equals(user.id)
        .toArray();

      set({
        simulationParams: updatedParams,
        isLoading: false,
      });

      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '保存参数失败',
        isLoading: false,
      });
      return false;
    }
  },

  deleteSimulationParams: async (id: string): Promise<boolean> => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ error: '请先登录' });
      return false;
    }

    set({ isLoading: true, error: null });

    try {
      await db.simulationParams.delete(id);

      const updatedParams = await db.simulationParams
        .where('userId')
        .equals(user.id)
        .toArray();

      set({
        simulationParams: updatedParams,
        isLoading: false,
      });

      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '删除参数失败',
        isLoading: false,
      });
      return false;
    }
  },

  addBudget: async (budget: Omit<Budget, 'id'>): Promise<boolean> => {
    set({ isLoading: true, error: null });

    try {
      const newBudget: Budget = {
        ...budget,
        id: generateId(),
      };

      await db.budgets.add(newBudget);

      const updatedBudgets = await db.budgets.toArray();

      set({
        budgets: updatedBudgets,
        isLoading: false,
      });

      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '添加预算失败',
        isLoading: false,
      });
      return false;
    }
  },

  updateBudget: async (
    id: string,
    updates: Partial<Budget>
  ): Promise<boolean> => {
    set({ isLoading: true, error: null });

    try {
      await db.budgets.update(id, updates);

      const updatedBudgets = await db.budgets.toArray();

      set({
        budgets: updatedBudgets,
        isLoading: false,
      });

      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '更新预算失败',
        isLoading: false,
      });
      return false;
    }
  },

  deleteBudget: async (id: string): Promise<boolean> => {
    set({ isLoading: true, error: null });

    try {
      await db.budgets.delete(id);

      const updatedBudgets = await db.budgets.toArray();

      set({
        budgets: updatedBudgets,
        isLoading: false,
      });

      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '删除预算失败',
        isLoading: false,
      });
      return false;
    }
  },

  generateDemoData: async (): Promise<boolean> => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ error: '请先登录' });
      return false;
    }

    set({ isLoading: true, error: null });

    try {
      await dataSyncService.generateDemoData(user.id);
      await get().loadData(user.id);

      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '生成演示数据失败',
        isLoading: false,
      });
      return false;
    }
  },

  clearData: (): void => {
    set({
      user: null,
      transactions: [],
      categories: [],
      accounts: [],
      investments: [],
      taxRecords: [],
      simulationParams: [],
      budgets: [],
      isInitialized: false,
    });
  },

  setError: (error: string | null): void => {
    set({ error });
  },
}));
