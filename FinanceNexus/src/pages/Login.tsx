import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Eye, EyeOff, Lock, Mail, Shield, Database, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useDataStore } from '@/store/useDataStore';

type AuthMode = 'login' | 'register';

export const Login = () => {
  const navigate = useNavigate();
  const { login, register, isAuthenticated, user } = useAuthStore();
  const { loadData } = useDataStore();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (mode === 'register') {
        if (password !== confirmPassword) {
          setError('两次输入的密码不一致');
          setIsLoading(false);
          return;
        }
        if (password.length < 8) {
          setError('密码长度至少为8位');
          setIsLoading(false);
          return;
        }

        const success = await register(email, password);
        if (success) {
          const currentUser = useAuthStore.getState().user;
          if (currentUser) {
            localStorage.setItem('auth_user', currentUser.id);
            setSuccess('注册成功！正在初始化您的财务账户...');
            setTimeout(() => {
              navigate('/dashboard');
            }, 1500);
          }
        }
      } else {
        const success = await login(email, password);
        if (success) {
          const currentUser = useAuthStore.getState().user;
          if (currentUser) {
            localStorage.setItem('auth_user', currentUser.id);
            await loadData(currentUser.id);
            navigate('/dashboard');
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: Shield, title: '端到端加密', desc: 'AES-256 加密保护您的财务隐私' },
    { icon: Database, title: '本地存储', desc: '数据主权，完全离线存储' },
    { icon: TrendingUp, title: '智能分析', desc: 'AI 驱动的财务洞察与预测' },
    { icon: Lock, title: '零知识架构', desc: '我们无法访问您的任何数据' },
  ];

  return (
    <div className="min-h-screen bg-primary-950 flex noise-overlay">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-900 via-primary-950 to-accent-900/20 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-noise opacity-[0.02]" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-500 to-amber-500 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary-950" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold gradient-text">
                FinanceNexus
              </h1>
              <p className="text-sm text-slate-400">智能财务规划系统</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-12">
          <div>
            <h2 className="font-display text-5xl font-bold text-slate-100 mb-4 leading-tight">
              掌控您的
              <span className="gradient-text block">财务未来</span>
            </h2>
            <p className="text-lg text-slate-400 max-w-md leading-relaxed">
              基于跨周期配置理念，整合记账、税务与理财辅助，
              帮助您抵御通胀侵蚀，实现资产稳健增长。
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="glass-card p-5 animate-slide-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-10 h-10 rounded-lg bg-accent-500/10 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-accent-400" />
                  </div>
                  <h3 className="font-semibold text-slate-100 mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-400">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-500 to-amber-600 border-2 border-primary-900 flex items-center justify-center"
                >
                  <span className="text-xs font-bold text-primary-950">
                    {String.fromCharCode(64 + i)}
                  </span>
                </div>
              ))}
            </div>
            <div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <CheckCircle2
                    key={i}
                    className="w-4 h-4 text-accent-500 fill-current"
                  />
                ))}
              </div>
              <p className="text-sm text-slate-400">
                已有 <span className="text-accent-400 font-medium">10,000+</span>{' '}
                用户信赖
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-500 to-amber-500 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary-950" />
              </div>
              <h1 className="font-display text-2xl font-bold gradient-text">
                FinanceNexus
              </h1>
            </div>
          </div>

          <div className="glass-card p-8">
            <div className="text-center mb-8">
              <h2 className="font-display text-3xl font-bold text-slate-100 mb-2">
                {mode === 'login' ? '欢迎回来' : '创建账户'}
              </h2>
              <p className="text-slate-400">
                {mode === 'login'
                  ? '登录以访问您的财务数据'
                  : '开始您的财务自由之旅'}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-danger-500/10 border border-danger-500/30">
                <p className="text-sm text-danger-400">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 rounded-xl bg-success-500/10 border border-success-500/30">
                <p className="text-sm text-success-400">{success}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="input-label">邮箱地址</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field pl-12"
                    placeholder="your@email.com"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label className="input-label">密码</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pl-12 pr-12"
                    placeholder={mode === 'register' ? '至少8位，包含字母和数字' : '输入您的密码'}
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {mode === 'register' && (
                <div className="animate-slide-down">
                  <label className="input-label">确认密码</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input-field pl-12 pr-12"
                      placeholder="再次输入密码"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
              )}

              {mode === 'login' && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-sm text-accent-400 hover:text-accent-300"
                  >
                    忘记密码？
                  </button>
                </div>
              )}

              <button
                type="submit"
                className="w-full btn-primary flex items-center justify-center gap-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {mode === 'login' ? '登录中...' : '创建中...'}
                  </>
                ) : (
                  <>{mode === 'login' ? '登录' : '创建账户'}</>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-slate-400">
                {mode === 'login' ? '还没有账户？' : '已有账户？'}
                <button
                  onClick={() => {
                    setMode(mode === 'login' ? 'register' : 'login');
                    setError('');
                    setSuccess('');
                    setEmail('');
                    setPassword('');
                    setConfirmPassword('');
                  }}
                  className="text-accent-400 hover:text-accent-300 font-medium ml-1"
                >
                  {mode === 'login' ? '立即注册' : '立即登录'}
                </button>
              </p>
            </div>

            <div className="mt-6 pt-6 border-t border-primary-800">
              <p className="text-xs text-slate-500 text-center">
                您的数据将使用 AES-256 加密存储在本地设备，我们无法访问。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
