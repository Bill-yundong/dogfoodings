import React, { useState } from "react";
import { useAppStore } from "@/store/appStore";
import { Layout } from "@/components/layout/Layout";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import {
  Settings as SettingsIcon,
  Shield,
  Database,
  Download,
  Upload,
  Trash2,
  Lock,
  RefreshCw,
  AlertTriangle,
  FileDown,
  FileUp,
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const {
    entries,
    profile,
    error,
    setError,
    isLoading,
    exportData,
    importData,
    clearAllData,
    getStats,
    changePassword,
    verifyPassword,
  } = useAppStore();

  const [stats, setStats] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [changeSuccess, setChangeSuccess] = useState(false);

  React.useEffect(() => {
    const loadStats = async () => {
      const s = await getStats();
      setStats(s);
    };
    loadStats();
  }, [getStats, entries.length]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `soulpulse-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      setError("导出失败，请重试");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        await importData(data);
        setStats(await getStats());
      } catch (err) {
        console.error("Import failed:", err);
        setError("导入失败，请确保文件格式正确");
      } finally {
        setIsImporting(false);
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleClearData = async () => {
    try {
      await clearAllData();
      setShowClearConfirm(false);
      setStats(await getStats());
    } catch (err) {
      console.error("Clear data failed:", err);
      setError("清除数据失败");
    }
  };

  const handleVerifyPassword = async () => {
    const verified = await verifyPassword(oldPassword);
    if (verified) {
      setPasswordVerified(true);
    } else {
      setError("原密码错误");
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setError("新密码不匹配");
      return;
    }
    if (newPassword.length < 8) {
      setError("新密码至少需要8个字符");
      return;
    }

    try {
      await changePassword(oldPassword, newPassword);
      setChangeSuccess(true);
      setTimeout(() => {
        setShowChangePassword(false);
        setChangeSuccess(false);
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setPasswordVerified(false);
      }, 2000);
    } catch (err) {
      setError("密码修改失败");
    }
  };

  return (
    <Layout>
      {error && (
        <ErrorMessage
          message={error}
          onDismiss={() => setError(null)}
          className="mb-6"
        />
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-primary-500" />
          设置
        </h1>
        <p className="text-gray-500 mt-1">管理您的数据和隐私设置</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-primary-500" />
              数据统计
            </h2>
            {isLoading || !stats ? (
              <LoadingSpinner text="加载统计数据..." />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {stats.totalEntries}
                  </div>
                  <div className="text-sm text-gray-500">日记总数</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {stats.totalWords}
                  </div>
                  <div className="text-sm text-gray-500">总字数</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {stats.totalTags}
                  </div>
                  <div className="text-sm text-gray-500">标签数</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {(stats.totalSize / 1024).toFixed(1)}KB
                  </div>
                  <div className="text-sm text-gray-500">数据大小</div>
                </div>
              </div>
            )}
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary-500" />
              数据安全
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800">
                      端到端加密已启用
                    </p>
                    <p className="text-sm text-green-700">
                      您的所有日记数据均使用 AES-256-CBC 加密存储，仅您的密码可以解密。
                      数据永远不会上传到服务器。
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800">
                      本地存储
                    </p>
                    <p className="text-sm text-blue-700">
                      所有数据存储在您的浏览器 IndexedDB 中。清除浏览器数据将导致数据丢失，
                      请定期导出备份。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Key className="w-5 h-5 text-primary-500" />
              密码管理
            </h2>
            {!showChangePassword ? (
              <button
                onClick={() => setShowChangePassword(true)}
                className="flex items-center gap-2 w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <Lock className="w-5 h-5 text-gray-500" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">修改密码</p>
                  <p className="text-sm text-gray-500">
                    定期更换密码以保护您的数据安全
                  </p>
                </div>
              </button>
            ) : (
              <div className="space-y-4">
                {changeSuccess ? (
                  <div className="p-4 bg-green-50 rounded-xl text-center">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                    <p className="font-medium text-green-800">密码修改成功！</p>
                  </div>
                ) : (
                  <>
                    {!passwordVerified ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          请输入原密码
                        </label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <input
                              type={showOldPassword ? "text" : "password"}
                              value={oldPassword}
                              onChange={(e) => setOldPassword(e.target.value)}
                              className="input-field pr-12"
                              placeholder="原密码"
                            />
                            <button
                              type="button"
                              onClick={() => setShowOldPassword(!showOldPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                            >
                              {showOldPassword ? (
                                <EyeOff className="w-5 h-5" />
                              ) : (
                                <Eye className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                          <button
                            onClick={handleVerifyPassword}
                            disabled={!oldPassword}
                            className="btn-primary"
                          >
                            验证
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            新密码
                          </label>
                          <div className="relative">
                            <input
                              type={showNewPassword ? "text" : "password"}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="input-field pr-12"
                              placeholder="至少8个字符"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                            >
                              {showNewPassword ? (
                                <EyeOff className="w-5 h-5" />
                              ) : (
                                <Eye className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            确认新密码
                          </label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="input-field"
                            placeholder="再次输入新密码"
                          />
                        </div>
                        <div className="flex gap-3 pt-2">
                          <button
                            onClick={() => {
                              setShowChangePassword(false);
                              setOldPassword("");
                              setNewPassword("");
                              setConfirmPassword("");
                              setPasswordVerified(false);
                            }}
                            className="btn-secondary flex-1"
                          >
                            取消
                          </button>
                          <button
                            onClick={handleChangePassword}
                            disabled={
                              !newPassword ||
                              !confirmPassword ||
                              newPassword !== confirmPassword ||
                              newPassword.length < 8
                            }
                            className="btn-primary flex-1"
                          >
                            确认修改
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileDown className="w-5 h-5 text-primary-500" />
              数据导出
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              导出您的所有数据作为加密备份文件。建议定期备份以防数据丢失。
            </p>
            <button
              onClick={handleExport}
              disabled={isExporting || entries.length === 0}
              className="w-full btn-secondary flex items-center justify-center gap-2"
            >
              {isExporting ? (
                <LoadingSpinner size="sm" text="导出中..." />
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  导出数据
                </>
              )}
            </button>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileUp className="w-5 h-5 text-primary-500" />
              数据导入
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              从之前导出的备份文件恢复数据。导入将合并现有数据。
            </p>
            <label
              className={cn(
                "w-full btn-secondary flex items-center justify-center gap-2 cursor-pointer",
                isImporting && "opacity-50 cursor-not-allowed"
              )}
            >
              {isImporting ? (
                <LoadingSpinner size="sm" text="导入中..." />
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  选择文件导入
                </>
              )}
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                disabled={isImporting}
                className="hidden"
              />
            </label>
          </div>

          <div className="card p-6 border-red-200 bg-red-50/50">
            <h2 className="text-lg font-semibold text-red-700 mb-4 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              危险操作
            </h2>
            <p className="text-sm text-red-600 mb-4">
              清除所有数据将永久删除您的日记和设置，此操作无法撤销。请确保已导出备份。
            </p>
            {!showClearConfirm ? (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="w-full btn-danger flex items-center justify-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                清除所有数据
              </button>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-red-100 rounded-lg">
                  <p className="text-sm text-red-700 flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span>
                      确定要清除所有数据吗？此操作不可撤销！
                    </span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="btn-secondary flex-1"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleClearData}
                    className="btn-danger flex-1"
                  >
                    确认清除
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
