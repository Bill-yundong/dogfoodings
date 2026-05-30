import { useState, useMemo } from 'react';
import {
  Plus,
  Filter,
  Search,
  Calendar,
  ChevronDown,
  Trash2,
  Edit2,
  Upload,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
} from 'lucide-react';
import { useDataStore } from '@/store/useDataStore';
import { useCashFlow } from '@/hooks/useCashFlow';
import { formatCurrency, formatDate } from '@/utils/formatters';
import type { Transaction, TransactionType } from '@/types';

export const Transactions = () => {
  const { transactions, accounts, categories, addTransaction, updateTransaction, deleteTransaction } = useDataStore();
  const { getMonthlyCashFlow } = useCashFlow(transactions, accounts, []);

  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('month');

  const [formData, setFormData] = useState({
    type: 'expense' as TransactionType,
    amount: '',
    categoryId: '',
    accountId: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    tags: '',
  });

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        if (typeFilter !== 'all' && t.type !== typeFilter) return false;
        if (categoryFilter !== 'all' && t.categoryId !== categoryFilter) return false;
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const category = categories.find((c) => c.id === t.categoryId)?.name || '';
          return (
            t.description.toLowerCase().includes(query) ||
            category.toLowerCase().includes(query) ||
            t.amount.toString().includes(query)
          );
        }
        const tDate = new Date(t.date);
        const now = new Date();
        if (dateFilter === 'today') {
          return tDate.toDateString() === now.toDateString();
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return tDate >= weekAgo;
        } else if (dateFilter === 'month') {
          return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
        } else if (dateFilter === 'year') {
          return tDate.getFullYear() === now.getFullYear();
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, typeFilter, categoryFilter, searchQuery, dateFilter, categories]);

  const monthlySummary = useMemo(() => {
    const now = new Date();
    return getMonthlyCashFlow(now.getFullYear(), now.getMonth() + 1);
  }, [getMonthlyCashFlow]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const user = useDataStore.getState().user;
    if (!user) return;

    const transactionData = {
      userId: user.id,
      type: formData.type,
      amount: parseFloat(formData.amount),
      categoryId: formData.categoryId,
      accountId: formData.accountId,
      date: formData.date,
      description: formData.description,
      tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
    };

    if (editingTransaction) {
      await updateTransaction(editingTransaction.id, transactionData);
    } else {
      await addTransaction(transactionData);
    }

    resetForm();
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      type: transaction.type,
      amount: transaction.amount.toString(),
      categoryId: transaction.categoryId,
      accountId: transaction.accountId,
      date: transaction.date,
      description: transaction.description,
      tags: transaction.tags.join(', '),
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这条交易记录吗？')) {
      await deleteTransaction(id);
    }
  };

  const resetForm = () => {
    setShowModal(false);
    setEditingTransaction(null);
    setFormData({
      type: 'expense' as TransactionType,
      amount: '',
      categoryId: '',
      accountId: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      tags: '',
    });
  };

  const incomeCategories = categories.filter((c) => c.type === 'income');
  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const currentCategories = formData.type === 'income' ? incomeCategories : expenseCategories;

  const totalIncome = filteredTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filteredTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-stat">
          <div className="flex items-start justify-between">
            <div>
              <p className="card-stat-label">总收入</p>
              <p className="card-stat-value text-success-400">{formatCurrency(totalIncome)}</p>
              <p className="card-stat-change text-success-400">
                <ArrowUpRight className="w-4 h-4" />
                {filteredTransactions.filter((t) => t.type === 'income').length} 笔交易
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-success-500/10 flex items-center justify-center">
              <ArrowUpRight className="w-6 h-6 text-success-400" />
            </div>
          </div>
        </div>

        <div className="card-stat">
          <div className="flex items-start justify-between">
            <div>
              <p className="card-stat-label">总支出</p>
              <p className="card-stat-value text-danger-400">{formatCurrency(totalExpense)}</p>
              <p className="card-stat-change text-danger-400">
                <ArrowDownRight className="w-4 h-4" />
                {filteredTransactions.filter((t) => t.type === 'expense').length} 笔交易
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-danger-500/10 flex items-center justify-center">
              <ArrowDownRight className="w-6 h-6 text-danger-400" />
            </div>
          </div>
        </div>

        <div className="card-stat">
          <div className="flex items-start justify-between">
            <div>
              <p className="card-stat-label">净结余</p>
              <p className={`card-stat-value ${totalIncome - totalExpense >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
                {formatCurrency(totalIncome - totalExpense)}
              </p>
              <p className="card-stat-change text-slate-400">
                储蓄率 {monthlySummary?.savingsRate ? formatPercent(monthlySummary.savingsRate) : '--'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-info-500/10 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-info-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h3 className="font-semibold text-lg text-slate-100">交易记录</h3>
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn-secondary flex items-center gap-2">
              <Download className="w-4 h-4" />
              导出
            </button>
            <button className="btn-secondary flex items-center gap-2">
              <Upload className="w-4 h-4" />
              导入
            </button>
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              记一笔
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索交易..."
              className="input-field pl-12"
            />
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-primary-900/50 rounded-xl border border-primary-800/50">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TransactionType | 'all')}
              className="bg-transparent text-slate-200 text-sm outline-none"
            >
              <option value="all">全部类型</option>
              <option value="income">收入</option>
              <option value="expense">支出</option>
              <option value="transfer">转账</option>
            </select>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-primary-900/50 rounded-xl border border-primary-800/50">
            <Calendar className="w-4 h-4 text-slate-500" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent text-slate-200 text-sm outline-none"
            >
              <option value="today">今天</option>
              <option value="week">本周</option>
              <option value="month">本月</option>
              <option value="year">本年</option>
              <option value="all">全部</option>
            </select>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-primary-900/50 rounded-xl border border-primary-800/50">
            <ChevronDown className="w-4 h-4 text-slate-500" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent text-slate-200 text-sm outline-none"
            >
              <option value="all">全部分类</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-primary-800">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">日期</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">描述</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">分类</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">账户</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">金额</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((transaction, index) => {
                  const category = categories.find((c) => c.id === transaction.categoryId);
                  const account = accounts.find((a) => a.id === transaction.accountId);
                  return (
                    <tr
                      key={transaction.id}
                      className="border-b border-primary-800/50 hover:bg-primary-800/30 transition-colors animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <td className="py-4 px-4">
                        <span className="text-sm text-slate-300">
                          {formatDate(new Date(transaction.date))}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-slate-200">
                          {transaction.description || category?.name || '未分类'}
                        </span>
                        {transaction.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {transaction.tags.slice(0, 2).map((tag) => (
                              <span key={tag} className="badge badge-info text-[10px]">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                          style={{ backgroundColor: `${category?.color || '#64748B'}20`, color: category?.color || '#64748B' }}
                        >
                          {category?.name || '未分类'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-slate-400">{account?.name || '未知'}</span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span
                          className={`font-semibold ${
                            transaction.type === 'income' ? 'text-success-400' : 'text-danger-400'
                          }`}
                        >
                          {transaction.type === 'income' ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(transaction)}
                            className="p-2 rounded-lg hover:bg-primary-700/50 transition-colors text-slate-400 hover:text-slate-200"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(transaction.id)}
                            className="p-2 rounded-lg hover:bg-danger-500/10 transition-colors text-slate-400 hover:text-danger-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="text-slate-500">
                      <p className="text-lg mb-2">暂无交易记录</p>
                      <p className="text-sm">点击"记一笔"开始记录您的收支</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && resetForm()}>
          <div className="modal-content max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-xl font-bold text-slate-100">
                {editingTransaction ? '编辑交易' : '新增交易'}
              </h3>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-200">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex gap-4 mb-6">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'expense' })}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                    formData.type === 'expense'
                      ? 'bg-danger-500/20 text-danger-400 border border-danger-500/30'
                      : 'bg-primary-800/50 text-slate-400 border border-primary-700/50 hover:bg-primary-800'
                  }`}
                >
                  支出
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'income' })}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                    formData.type === 'income'
                      ? 'bg-success-500/20 text-success-400 border border-success-500/30'
                      : 'bg-primary-800/50 text-slate-400 border border-primary-700/50 hover:bg-primary-800'
                  }`}
                >
                  收入
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'transfer' })}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                    formData.type === 'transfer'
                      ? 'bg-info-500/20 text-info-400 border border-info-500/30'
                      : 'bg-primary-800/50 text-slate-400 border border-primary-700/50 hover:bg-primary-800'
                  }`}
                >
                  转账
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="input-label">金额</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl">¥</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="input-field pl-10 text-xl font-semibold"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="input-label">日期</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="input-label">分类</label>
                <div className="grid grid-cols-4 gap-2">
                  {currentCategories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, categoryId: category.id })}
                      className={`p-3 rounded-xl text-center transition-all ${
                        formData.categoryId === category.id
                          ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30'
                          : 'bg-primary-800/50 text-slate-400 border border-primary-700/50 hover:bg-primary-800'
                      }`}
                    >
                      <span className="text-xl block mb-1">{category.icon}</span>
                      <span className="text-xs">{category.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="input-label">账户</label>
                <select
                  value={formData.accountId}
                  onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="">请选择账户</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({formatCurrency(account.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="input-label">描述</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  placeholder="添加备注说明..."
                />
              </div>

              <div>
                <label className="input-label">标签（逗号分隔）</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="input-field"
                  placeholder="例如：工资, 月度, 固定收入"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={resetForm} className="flex-1 btn-secondary">
                  取消
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  {editingTransaction ? '保存修改' : '添加交易'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
