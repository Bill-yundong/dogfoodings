import React, { useState } from "react";
import { useAppStore } from "@/store/appStore";
import { Shield, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/lib/utils";

interface SetupPasswordProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export const SetupPassword: React.FC<SetupPasswordProps> = ({ onComplete, onCancel }) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);

  const { setupPassword, error, setError } = useAppStore();

  const getPasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;
    return Math.min(strength, 5);
  };

  const getStrengthLabel = (strength: number) => {
    switch (strength) {
      case 0:
      case 1:
        return { label: "弱", color: "text-red-600", bg: "bg-red-500" };
      case 2:
        return { label: "中等", color: "text-yellow-600", bg: "bg-yellow-500" };
      case 3:
        return { label: "良好", color: "text-blue-600", bg: "bg-blue-500" };
      case 4:
      case 5:
        return { label: "强", color: "text-green-600", bg: "bg-green-500" };
      default:
        return { label: "弱", color: "text-red-600", bg: "bg-red-500" };
    }
  };

  const strength = getPasswordStrength(password);
  const strengthInfo = getStrengthLabel(strength);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const isValid = password.length >= 8 && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setIsSettingUp(true);
    try {
      await setupPassword(password);
      onComplete?.();
    } finally {
      setIsSettingUp(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-primary-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/30">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">设置密码</h1>
          <p className="text-gray-500">您的数据将使用 AES-256 端到端加密</p>
        </div>

        <div className="card p-8">
          {error && (
            <ErrorMessage message={error} onDismiss={() => setError(null)} className="mb-4" />
          )}

          <div className="mb-6 p-4 bg-blue-50 rounded-xl">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800 mb-1">重要提示</p>
                <p className="text-xs text-blue-600">
                  密码使用 PBKDF2 密钥派生算法保护，无法被重置。请务必牢记您的密码，
                  否则将无法访问您的数据。
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                设置密码
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少8个字符"
                  className="input-field pr-12"
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
              {password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">密码强度</span>
                    <span className={cn("text-xs font-medium", strengthInfo.color)}>
                      {strengthInfo.label}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-1.5 flex-1 rounded-full transition-colors",
                          i <= strength ? strengthInfo.bg : "bg-gray-200"
                        )}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                确认密码
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入密码"
                  className={cn(
                    "input-field pr-12",
                    confirmPassword &&
                      !passwordsMatch &&
                      "border-red-300 focus:border-red-500 focus:ring-red-200"
                  )}
                />
                {confirmPassword && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {passwordsMatch ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                )}
              </div>
              {confirmPassword && !passwordsMatch && (
                <p className="text-xs text-red-600 mt-1">密码不匹配</p>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <CheckCircle
                  className={cn(
                    "w-4 h-4",
                    password.length >= 8 ? "text-green-500" : "text-gray-300"
                  )}
                />
                至少 8 个字符
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <CheckCircle
                  className={cn(
                    "w-4 h-4",
                    /[A-Z]/.test(password) ? "text-green-500" : "text-gray-300"
                  )}
                />
                包含大写字母
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <CheckCircle
                  className={cn(
                    "w-4 h-4",
                    /[0-9]/.test(password) ? "text-green-500" : "text-gray-300"
                  )}
                />
                包含数字
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <CheckCircle
                  className={cn(
                    "w-4 h-4",
                    /[^A-Za-z0-9]/.test(password) ? "text-green-500" : "text-gray-300"
                  )}
                />
                包含特殊字符
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="btn-secondary flex-1"
                  disabled={isSettingUp}
                >
                  取消
                </button>
              )}
              <button
                type="submit"
                className="btn-primary flex-1 flex items-center justify-center gap-2"
                disabled={!isValid || isSettingUp}
              >
                {isSettingUp ? (
                  <LoadingSpinner size="sm" text="设置中..." />
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    设置密码
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SetupPassword;
