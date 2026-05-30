import { useState } from 'react';
import {
  Shield,
  Database,
  Download,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  Key,
  Lock,
  AlertTriangle,
  CheckCircle,
  Info,
  Settings as SettingsIcon,
  User,
  Bell,
  Palette,
  Globe,
  HelpCircle,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useDataStore } from '@/store/useDataStore';
import { formatCurrency, formatDate, maskEmail } from '@/utils/formatters';
import { encrypt, decrypt } from '@/utils/crypto';
import { db } from '@/utils/database';

export const Settings = () => {
  const { user, changePassword, changeMasterPassword, isAuthenticated } = useAuthStore();
  const { transactions, accounts, categories, investments, taxRecords, budgets, clearData } = useDataStore();

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [exportProgress, setExportProgress] = useState(0);
  const [importFile, setImportFile] = useState<File | null>(null);

  const dataStats = {
    transactions: transactions.length,
    accounts: accounts.length,
    categories: categories.length,
    investments: investments.length,
    taxRecords: taxRecords.length,
    budgets: budgets.length,
  };

  const totalRecords = Object.values(dataStats).reduce((s, v) => s + v, 0);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    setIsChangingPassword(true);

    try {
      if (newPassword !== confirmPassword) {
        throw new Error('两次输入的新密码不一致');
      }
      if (newPassword.length < 8) {
        throw new Error('新密码长度至少为8位');
      }

      await changePassword(currentPassword, newPassword);
      setPasswordSuccess('密码修改成功！');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : '密码修改失败');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleExportData = async () => {
    try {
      setExportProgress(0);
      const exportData = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        user: { email: user?.email },
        data: {
          transactions,
          accounts,
          categories,
          investments,
          taxRecords,
          budgets,
        },
      };

      setExportProgress(50);

      const encrypted = encrypt(exportData, await useAuthStore.getState().getEncryptionKey());
      
      setExportProgress(80);

      const blob = new Blob([JSON.stringify(encrypted)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financenexus-export-${new Date().toISOString().split('T')[0]}.enc.json`;
      a.click();
      URL.revokeObjectURL(url);

      setExportProgress(100);
      setTimeout(() => {
        setShowExportModal(false);
        setExportProgress(0);
      }, 1000);
    } catch (err) {
      console.error('Export error:', err);
      alert('导出失败，请重试');
    }
  };

  const handleImportData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    try {
      const text = await importFile.text();
      const encrypted = JSON.parse(text);
      
      const key = await useAuthStore.getState().getEncryptionKey();
      const data = decrypt(encrypted, key);

      if (!data?.data) {
        throw new Error('无效的数据文件格式');
      }

      if (confirm(`即将导入 ${data.data.transactions?.length || 0} 条交易记录，是否继续？此操作将覆盖现有数据。`)) {
        await clearData();
        
        const state = useDataStore.getState();
        for (const item of data.data.transactions || []) {
          await state.addTransaction(item);
        }
        for (const item of data.data.accounts || []) {
          await state.addAccount(item);
        }
        for (const item of data.data.categories || []) {
          await state.addCategory(item);
        }
        for (const item of data.data.investments || []) {
          await state.addInvestment(item);
        }
        for (const item of data.data.taxRecords || []) {
          await state.addTaxRecord(item);
        }
        for (const item of data.data.budgets || []) {
          await state.addBudget(item);
        }

        alert('导入成功！');
        setShowImportModal(false);
        setImportFile(null);
      }
    } catch (err) {
      console.error('Import error:', err);
      alert('导入失败：' + (err instanceof Error ? err.message : '无效的文件或密码错误'));
    }
  };

  const handleDeleteAllData = async () => {
    if (deleteConfirmation !== '删除所有数据') {
      alert('请输入"删除所有数据"以确认');
      return;
    }

    try {
      await clearData();
      await db.delete();
      await db.open();
      alert('所有数据已删除');
      setShowDeleteModal(false);
      setDeleteConfirmation('');
    } catch (err) {
      console.error('Delete error:', err);
      alert('删除失败，请重试');
    }
  };

  const settingsSections = [
    {
      icon: User,
      title: '账户信息',
      description: '管理您的账户基本信息',
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-primary-800/30">
            <div>
              <p className="text-sm text-slate-400">邮箱地址</p>
              <p className="text-slate-200 font-medium">{user ? maskEmail(user.email) : '--'}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-500 to-amber-500 flex items-center justify-center">
              <span className="text-primary-950 font-bold text-lg">
                {user?.email.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-primary-800/30">
            <div>
              <p className="text-sm text-slate-400">注册时间</p>
              <p className="text-slate-200">{user ? formatDate(new Date(user.createdAt)) : '--'}</p>
            </div>
            <CheckCircle className="w-5 h-5 text-success-400" />
          </div>
        </div>
      ),
    },
    {
      icon: Lock,
      title: '修改密码',
      description: '更新您的登录密码',
      content: (
        <form onSubmit={handleChangePassword} className="space-y-4">
          {passwordError && (
            <div className="p-4 rounded-xl bg-danger-500/10 border border-danger-500/30">
              <p className="text-sm text-danger-400">{passwordError}</p>
            </div>
          )}
          {passwordSuccess && (
            <div className="p-4 rounded-xl bg-success-500/10 border border-success-500/30">
              <p className="text-sm text-success-400">{passwordSuccess}</p>
            </div>
          )}
          <div>
            <label className="input-label">当前密码</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input-field pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="input-label">新密码</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-field pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="input-label">确认新密码</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <button type="submit" className="w-full btn-primary" disabled={isChangingPassword}>
            {isChangingPassword ? '修改中...' : '修改密码'}
          </button>
        </form>
      ),
    },
    {
      icon: Shield,
      title: '数据安全',
      description: '您的数据已使用 AES-256 加密存储在本地',
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-success-500/10 border border-success-500/20">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-success-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-success-400">端到端加密已启用</p>
                <p className="text-xs text-slate-400 mt-1">
                  所有敏感数据使用您的密码派生密钥进行 AES-256 加密存储
                </p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-primary-800/30">
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-info-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-200">本地存储</p>
                <p className="text-xs text-slate-400 mt-1">
                  数据完全存储在您的设备上，我们无法访问任何数据
                </p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-primary-800/30">
            <div className="flex items-start gap-3">
              <Key className="w-5 h-5 text-accent-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-200">零知识架构</p>
                <p className="text-xs text-slate-400 mt-1">
                  服务器不存储任何明文数据，确保您的财务隐私绝对安全
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: Database,
      title: '数据管理',
      description: `共 ${totalRecords} 条记录`,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(dataStats).map(([key, value]) => {
              const labels: Record<string, string> = {
                transactions: '交易记录',
                accounts: '账户',
                categories: '分类',
                investments: '投资',
                taxRecords: '税务记录',
                budgets: '预算',
              };
              return (
                <div key={key} className="p-3 rounded-xl bg-primary-800/30">
                  <p className="text-xs text-slate-400">{labels[key]}</p>
                  <p className="text-lg font-semibold text-slate-200">{value}</p>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setShowExportModal(true)} className="btn-secondary flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              导出数据
            </button>
            <button onClick={() => setShowImportModal(true)} className="btn-secondary flex items-center justify-center gap-2">
              <Upload className="w-4 h-4" />
              导入数据
            </button>
          </div>
          <button onClick={() => setShowDeleteModal(true)} className="w-full btn-danger flex items-center justify-center gap-2">
            <Trash2 className="w-4 h-4" />
            删除所有数据
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon className="w-6 h-6 text-accent-400" />
        <h2 className="font-display text-2xl font-bold text-slate-100">系统设置</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {settingsSections.map((section, index) => {
          const Icon = section.icon;
          return (
            <div
              key={section.title}
              className="glass-card p-6 animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-accent-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-100">{section.title}</h3>
                  <p className="text-sm text-slate-400">{section.description}</p>
                </div>
              </div>
              {section.content}
            </div>
          );
        })}
      </div>

      {showExportModal && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowExportModal(false)}>
          <div className="modal-content">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-xl font-bold text-slate-100">导出数据</h3>
              <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-slate-200">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {exportProgress > 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-accent-500 border-t-transparent animate-spin" />
                <p className="text-slate-200 mb-2">正在导出...</p>
                <div className="progress-bar max-w-xs mx-auto">
                  <div className="progress-bar-fill" style={{ width: `${exportProgress}%` }} />
                </div>
              </div>
            ) : (
              <>
                <div className="p-4 rounded-xl bg-primary-800/30 mb-6">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-info-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-200">数据将被加密导出</p>
                      <p className="text-xs text-slate-400 mt-1">
                        导出文件包含您的所有财务数据，并使用您的密码加密。请妥善保管导出文件和密码。
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  {Object.entries(dataStats).map(([key, value]) => {
                    const labels: Record<string, string> = {
                      transactions: '交易记录',
                      accounts: '账户',
                      categories: '分类',
                      investments: '投资',
                      taxRecords: '税务记录',
                      budgets: '预算',
                    };
                    return (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">{labels[key]}</span>
                        <span className="text-slate-200 font-medium">{value} 条</span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setShowExportModal(false)} className="flex-1 btn-secondary">
                    取消
                  </button>
                  <button onClick={handleExportData} className="flex-1 btn-primary">
                    确认导出
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowImportModal(false)}>
          <div className="modal-content">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-xl font-bold text-slate-100">导入数据</h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-200">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleImportData}>
              <div className="p-4 rounded-xl bg-danger-500/10 border border-danger-500/20 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-danger-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-danger-400">警告：导入将覆盖现有数据</p>
                    <p className="text-xs text-slate-400 mt-1">
                      请确保在导入前已备份当前数据。此操作不可撤销。
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className="input-label">选择导出文件</label>
                <div className="border-2 border-dashed border-primary-700 rounded-xl p-8 text-center hover:border-accent-500/50 transition-colors">
                  <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                  {importFile ? (
                    <div>
                      <p className="text-sm text-slate-200 font-medium">{importFile.name}</p>
                      <p className="text-xs text-slate-400">{(importFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-slate-400 mb-1">拖放文件到此处或</p>
                      <label className="text-accent-400 hover:text-accent-300 cursor-pointer">
                        选择文件
                        <input
                          type="file"
                          accept=".json"
                          className="hidden"
                          onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowImportModal(false)} className="flex-1 btn-secondary">
                  取消
                </button>
                <button type="submit" className="flex-1 btn-primary" disabled={!importFile}>
                  确认导入
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowDeleteModal(false)}>
          <div className="modal-content">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-xl font-bold text-slate-100">删除所有数据</h3>
              <button onClick={() => setShowDeleteModal(false)} className="text-slate-400 hover:text-slate-200">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-danger-500/10 border border-danger-500/30 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-danger-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-danger-400">此操作不可撤销</p>
                  <p className="text-xs text-slate-400 mt-1">
                    您的所有财务数据将被永久删除，包括交易记录、账户信息、投资数据等。请确保已导出备份。
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="input-label">请输入"删除所有数据"以确认</label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                className="input-field"
                placeholder='删除所有数据'
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 btn-secondary">
                取消
              </button>
              <button
                onClick={handleDeleteAllData}
                className="flex-1 btn-danger"
                disabled={deleteConfirmation !== '删除所有数据'}
              >
                永久删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
