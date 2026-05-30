import type {
  Transaction,
  Account,
  TaxRecord,
  SpecialDeductions,
} from '@/types';
import { db } from './index';
import { generateTaxRecordFromTransactions } from '../calculations/taxEngine';
import { generateId } from '../crypto';

type EventType =
  | 'transaction:created'
  | 'transaction:updated'
  | 'transaction:deleted'
  | 'account:updated'
  | 'tax:recalculated'
  | 'data:imported';

interface EventCallback {
  (data?: unknown): void | Promise<void>;
}

class DataSyncService {
  private listeners: Map<EventType, Set<EventCallback>> = new Map();
  private isProcessing: boolean = false;
  private pendingUpdates: Set<string> = new Set();

  on(event: EventType, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: EventType, data?: unknown): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  private async queueUpdate(updateType: string): Promise<void> {
    this.pendingUpdates.add(updateType);

    if (this.isProcessing) return;

    this.isProcessing = true;

    while (this.pendingUpdates.size > 0) {
      const updates = Array.from(this.pendingUpdates);
      this.pendingUpdates.clear();

      for (const update of updates) {
        try {
          if (update.startsWith('tax:')) {
            await this.recalculateTaxForMonth(update.split(':')[1]);
          }
        } catch (error) {
          console.error(`Error processing update ${update}:`, error);
        }
      }
    }

    this.isProcessing = false;
  }

  async handleTransactionCreated(
    transaction: Transaction,
    userId: string
  ): Promise<void> {
    await this.updateAccountBalance(
      transaction.accountId,
      transaction.type,
      transaction.amount,
      transaction.toAccountId
    );

    const txDate = new Date(transaction.date);
    const monthKey = `${txDate.getFullYear()}-${txDate.getMonth() + 1}`;
    await this.queueUpdate(`tax:${monthKey}`);

    this.emit('transaction:created', transaction);
  }

  async handleTransactionUpdated(
    oldTransaction: Transaction,
    newTransaction: Transaction,
    userId: string
  ): Promise<void> {
    await this.updateAccountBalance(
      oldTransaction.accountId,
      oldTransaction.type,
      -oldTransaction.amount,
      oldTransaction.toAccountId
    );

    await this.updateAccountBalance(
      newTransaction.accountId,
      newTransaction.type,
      newTransaction.amount,
      newTransaction.toAccountId
    );

    const oldDate = new Date(oldTransaction.date);
    const newDate = new Date(newTransaction.date);

    const oldMonthKey = `${oldDate.getFullYear()}-${oldDate.getMonth() + 1}`;
    const newMonthKey = `${newDate.getFullYear()}-${newDate.getMonth() + 1}`;

    await this.queueUpdate(`tax:${oldMonthKey}`);
    if (oldMonthKey !== newMonthKey) {
      await this.queueUpdate(`tax:${newMonthKey}`);
    }

    this.emit('transaction:updated', { old: oldTransaction, new: newTransaction });
  }

  async handleTransactionDeleted(
    transaction: Transaction,
    userId: string
  ): Promise<void> {
    await this.updateAccountBalance(
      transaction.accountId,
      transaction.type,
      -transaction.amount,
      transaction.toAccountId
    );

    const txDate = new Date(transaction.date);
    const monthKey = `${txDate.getFullYear()}-${txDate.getMonth() + 1}`;
    await this.queueUpdate(`tax:${monthKey}`);

    this.emit('transaction:deleted', transaction);
  }

  private async updateAccountBalance(
    accountId: string,
    type: string,
    amount: number,
    toAccountId?: string
  ): Promise<void> {
    const account = await db.accounts.get(accountId);
    if (!account) return;

    let balanceChange = 0;

    if (type === 'income') {
      balanceChange = amount;
    } else if (type === 'expense') {
      balanceChange = -amount;
    } else if (type === 'transfer') {
      balanceChange = -amount;

      if (toAccountId) {
        const toAccount = await db.accounts.get(toAccountId);
        if (toAccount) {
          await db.accounts.update(toAccountId, {
            balance: toAccount.balance + amount,
          });
        }
      }
    }

    if (account.type === 'credit' || account.type === 'liability') {
      balanceChange = -balanceChange;
    }

    await db.accounts.update(accountId, {
      balance: account.balance + balanceChange,
    });

    this.emit('account:updated', {
      id: accountId,
      balance: account.balance + balanceChange,
    });
  }

  private async recalculateTaxForMonth(monthKey: string): Promise<void> {
    const [year, month] = monthKey.split('-').map(Number);
    if (!year || !month) return;

    const currentUser = await db.users.orderBy('lastLogin').reverse().first();
    if (!currentUser) return;

    const allTransactions = await db.transactions
      .where('userId')
      .equals(currentUser.id)
      .toArray();

    const existingRecord = await db.taxRecords
      .where('[userId+year+month]')
      .equals([currentUser.id, year, month])
      .first();

    const deductions = existingRecord?.deductions || {
      childEducation: 0,
      continuingEducation: 0,
      seriousIllness: 0,
      housingLoanInterest: 0,
      housingRent: 0,
      elderlySupport: 0,
      infantCare: 0,
    };

    const taxRecord = generateTaxRecordFromTransactions(
      allTransactions,
      year,
      month,
      deductions,
      currentUser.id
    );

    if (existingRecord) {
      await db.taxRecords.update(existingRecord.id, {
        grossIncome: taxRecord.grossIncome,
        taxableIncome: taxRecord.taxableIncome,
        taxPayable: taxRecord.taxPayable,
        createdAt: existingRecord.createdAt,
      });
    } else {
      await db.taxRecords.add(taxRecord);
    }

    this.emit('tax:recalculated', { year, month });
  }

  async recalculateAllTaxRecords(
    userId: string,
    deductions: SpecialDeductions
  ): Promise<void> {
    const allTransactions = await db.transactions
      .where('userId')
      .equals(userId)
      .toArray();

    const years = new Set(
      allTransactions.map((t) => new Date(t.date).getFullYear())
    );

    for (const year of years) {
      for (let month = 1; month <= 12; month++) {
        const taxRecord = generateTaxRecordFromTransactions(
          allTransactions,
          year,
          month,
          deductions,
          userId
        );

        const existingRecord = await db.taxRecords
          .where('[userId+year+month]')
          .equals([userId, year, month])
          .first();

        if (existingRecord) {
          await db.taxRecords.update(existingRecord.id, {
            ...taxRecord,
            id: existingRecord.id,
            createdAt: existingRecord.createdAt,
          });
        } else {
          await db.taxRecords.add(taxRecord);
        }
      }
    }
  }

  async handleAccountCreated(account: Account): Promise<void> {
    this.emit('account:updated', account);
  }

  async handleAccountUpdated(account: Partial<Account> & { id: string }): Promise<void> {
    this.emit('account:updated', account);
  }

  async handleAccountDeleted(accountId: string): Promise<void> {
    const transactions = await db.transactions
      .where('accountId')
      .equals(accountId)
      .toArray();

    for (const tx of transactions) {
      await db.transactions.delete(tx.id);
    }

    const investments = await db.investments
      .where('accountId')
      .equals(accountId)
      .toArray();

    for (const inv of investments) {
      await db.investments.delete(inv.id);
    }

    this.emit('account:updated', { id: accountId, deleted: true });
  }

  async initializeDefaultData(userId: string): Promise<void> {
    const defaultCategories = await db.categories
      .where('userId')
      .equals(userId)
      .count();

    if (defaultCategories === 0) {
      const { DEFAULT_INCOME_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES } = await import(
        '@/constants'
      );

      const incomeCategories = DEFAULT_INCOME_CATEGORIES.map((cat, i) => ({
        id: generateId(),
        userId,
        name: cat.name,
        type: 'income' as const,
        icon: cat.icon,
        color: cat.color,
        isDefault: true,
        sortOrder: i,
      }));

      const expenseCategories = DEFAULT_EXPENSE_CATEGORIES.map((cat, i) => ({
        id: generateId(),
        userId,
        name: cat.name,
        type: 'expense' as const,
        icon: cat.icon,
        color: cat.color,
        isDefault: true,
        sortOrder: i,
      }));

      await db.categories.bulkAdd([...incomeCategories, ...expenseCategories]);
    }

    const defaultAccounts = await db.accounts
      .where('userId')
      .equals(userId)
      .count();

    if (defaultAccounts === 0) {
      const defaultAccountTypes = [
        { type: 'cash', name: '现金', balance: 0 },
        { type: 'bank', name: '储蓄卡', balance: 0 },
        { type: 'investment', name: '投资账户', balance: 0 },
      ];

      const accounts = defaultAccountTypes.map((acc, i) => ({
        id: generateId(),
        userId,
        name: acc.name,
        type: acc.type as Account['type'],
        balance: acc.balance,
        currency: 'CNY',
        interestRate: 0,
        createdAt: new Date(),
      }));

      await db.accounts.bulkAdd(accounts);
    }
  }

  async generateDemoData(userId: string): Promise<void> {
    const categories = await db.categories.where('userId').equals(userId).toArray();
    const accounts = await db.accounts.where('userId').equals(userId).toArray();

    if (categories.length === 0 || accounts.length === 0) {
      await this.initializeDefaultData(userId);
      return;
    }

    const now = new Date();
    const transactions: Transaction[] = [];

    const incomeCategories = categories.filter((c) => c.type === 'income');
    const expenseCategories = categories.filter((c) => c.type === 'expense');

    const bankAccount = accounts.find((a) => a.type === 'bank') || accounts[0];
    const cashAccount = accounts.find((a) => a.type === 'cash') || accounts[1];

    for (let month = 11; month >= 0; month--) {
      const date = new Date(now.getFullYear(), now.getMonth() - month, 15);
      const dateStr = date.toISOString().split('T')[0];

      transactions.push({
        id: generateId(),
        userId,
        date: dateStr,
        amount: 15000 + Math.random() * 5000,
        type: 'income',
        categoryId: incomeCategories[0].id,
        accountId: bankAccount.id,
        description: '工资收入',
        tags: ['工资'],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      if (month % 3 === 0) {
        transactions.push({
          id: generateId(),
          userId,
          date: dateStr,
          amount: 3000 + Math.random() * 2000,
          type: 'income',
          categoryId: incomeCategories[1]?.id || incomeCategories[0].id,
          accountId: bankAccount.id,
          description: '季度奖金',
          tags: ['奖金'],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      transactions.push({
        id: generateId(),
        userId,
        date: dateStr,
        amount: 3000 + Math.random() * 1000,
        type: 'expense',
        categoryId: expenseCategories[4].id,
        accountId: bankAccount.id,
        description: '房租/房贷',
        tags: ['居住'],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      for (let day = 1; day <= 28; day++) {
        const txDate = new Date(now.getFullYear(), now.getMonth() - month, day);
        const txDateStr = txDate.toISOString().split('T')[0];

        if (Math.random() > 0.3) {
          transactions.push({
            id: generateId(),
            userId,
            date: txDateStr,
            amount: 30 + Math.random() * 100,
            type: 'expense',
            categoryId: expenseCategories[0].id,
            accountId: cashAccount.id,
            description: '餐饮消费',
            tags: ['餐饮', '日常'],
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        if (Math.random() > 0.7) {
          transactions.push({
            id: generateId(),
            userId,
            date: txDateStr,
            amount: 10 + Math.random() * 50,
            type: 'expense',
            categoryId: expenseCategories[1].id,
            accountId: cashAccount.id,
            description: '交通出行',
            tags: ['交通'],
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        if (Math.random() > 0.85) {
          transactions.push({
            id: generateId(),
            userId,
            date: txDateStr,
            amount: 100 + Math.random() * 500,
            type: 'expense',
            categoryId: expenseCategories[2].id,
            accountId: bankAccount.id,
            description: '购物消费',
            tags: ['购物'],
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    }

    await db.transactions.bulkAdd(transactions);

    for (const tx of transactions) {
      await this.updateAccountBalance(
        tx.accountId,
        tx.type,
        tx.amount,
        tx.toAccountId
      );
    }

    for (let month = 0; month < 12; month++) {
      const txDate = new Date(now.getFullYear(), now.getMonth() - month, 1);
      const monthKey = `${txDate.getFullYear()}-${txDate.getMonth() + 1}`;
      await this.queueUpdate(`tax:${monthKey}`);
    }

    this.emit('data:imported', { count: transactions.length });
  }

  destroy(): void {
    this.listeners.clear();
    this.pendingUpdates.clear();
  }
}

export const dataSyncService = new DataSyncService();
export type { EventType };
