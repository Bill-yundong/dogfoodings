import React, { useState } from "react";
import { useAppStore } from "@/store/appStore";
import { Shield, Lock, Eye, EyeOff, AlertTriangle, Fingerprint } from "lucide-react";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/lib/utils";

interface LockScreenProps {
  onSetup?: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onSetup }) => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const { unlock, error, hasPassword, setError } = useAppStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsUnlocking(true);
    try {
      await unlock(password);
      setPassword("");
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-primary-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/30">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">SoulPulse</h1>
          <p className="text-gray-500">情绪追踪与心理健康平台</p>
        </div>

        <div className="card p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              {hasPassword ? "输入密码解锁" : "设置访问密码"}
            </h2>
            <p className="text-sm text-gray-500">
              {hasPassword
                ? "您的数据已被端到端加密保护"
                : "请设置一个安全密码来保护您的数据"}
            </p>
          </div>

          {error && (
            <ErrorMessage message={error} onDismiss={() => setError(null)} className="mb-4" />
          )}

          {!hasPassword && onSetup ? (
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                首次使用请设置密码。密码使用 PBKDF2 密钥派生算法保护，无法被重置。
              </p>
              <button onClick={onSetup} className="btn-primary w-full">
                设置密码
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入密码"
                  className={cn(
                    "input-field pr-12",
                    error && "border-red-300 focus:border-red-500 focus:ring-red-200"
                  )}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              <button
                type="submit"
                className="btn-primary w-full flex items-center justify-center gap-2"
                disabled={!password.trim() || isUnlocking}
              >
                {isUnlocking ? (
                  <LoadingSpinner size="sm" text="解锁中..." />
                ) : (
                  <>
                    <Fingerprint className="w-5 h-5" />
                    解锁
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
            <Shield className="w-3 h-3" />
            所有数据均在本地加密存储，不上传服务器
          </p>
        </div>
      </div>
    </div>
  );
};

export default LockScreen;
