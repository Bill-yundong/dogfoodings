import { createSignal } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { login } from '../../stores/app';
import type { UserRole } from '../../types';

export default function Login() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = createSignal('');
  const [analystEmail, setAnalystEmail] = createSignal('');
  const [loading, setLoading] = createSignal(false);

  async function handleLogin(email: string, role: UserRole) {
    if (!email.trim()) return;
    setLoading(true);
    login(email, role);
    await new Promise(r => setTimeout(r, 300));
    setLoading(false);
    navigate(role === 'analyst' ? '/analyst' : '/dashboard');
  }

  return (
    <div class="min-h-screen flex flex-col items-center justify-center bg-metabo-dark relative overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-b from-metabo-glow/5 via-transparent to-metabo-amber/5" />
      <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-metabo-glow/5 rounded-full blur-3xl" />
      <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-metabo-amber/5 rounded-full blur-3xl" />

      <div class="relative z-10 flex flex-col items-center gap-12 w-full max-w-4xl px-6">
        <div class="flex flex-col items-center gap-3">
          <div class="w-16 h-16 rounded-2xl bg-metabo-glow/20 flex items-center justify-center shadow-glow">
            <span class="text-metabo-glow font-display font-bold text-3xl glow-text">M</span>
          </div>
          <h1 class="font-display text-4xl font-bold text-metabo-glow glow-text tracking-tight">
            MetaboFlow
          </h1>
          <p class="font-body text-metabo-muted text-center">
            智能代谢管理平台 · 血糖预测 · 营养分析
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <div
            class="glass-card p-8 flex flex-col gap-6 transition-all duration-300 hover:border-metabo-glow/50 hover:shadow-glow-sm cursor-default"
          >
            <div class="flex flex-col items-center gap-3">
              <div class="w-12 h-12 rounded-full bg-metabo-glow/10 flex items-center justify-center">
                <svg class="w-6 h-6 text-metabo-glow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <h2 class="font-display text-xl font-semibold text-metabo-text">个人用户</h2>
              <p class="font-body text-sm text-metabo-muted text-center">记录饮食、追踪血糖、管理营养</p>
            </div>

            <div class="flex flex-col gap-4">
              <input
                type="email"
                class="input-field w-full"
                placeholder="输入邮箱地址"
                value={userEmail()}
                onInput={(e) => setUserEmail(e.currentTarget.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin(userEmail(), 'user')}
              />
              <button
                class="btn-primary w-full"
                onClick={() => handleLogin(userEmail(), 'user')}
                disabled={loading() || !userEmail().trim()}
              >
                {loading() ? '登录中...' : '登录'}
              </button>
            </div>
          </div>

          <div
            class="glass-card p-8 flex flex-col gap-6 transition-all duration-300 hover:border-metabo-amber/50 hover:shadow-amber cursor-default"
          >
            <div class="flex flex-col items-center gap-3">
              <div class="w-12 h-12 rounded-full bg-metabo-amber/10 flex items-center justify-center">
                <svg class="w-6 h-6 text-metabo-amber" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h2 class="font-display text-xl font-semibold text-metabo-text">专业分析师</h2>
              <p class="font-body text-sm text-metabo-muted text-center">监测用户、风险告警、语义对齐</p>
            </div>

            <div class="flex flex-col gap-4">
              <input
                type="email"
                class="input-field w-full"
                placeholder="输入分析师邮箱"
                value={analystEmail()}
                onInput={(e) => setAnalystEmail(e.currentTarget.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin(analystEmail(), 'analyst')}
              />
              <button
                class="btn-secondary w-full border-metabo-amber/50 text-metabo-amber hover:border-metabo-amber hover:shadow-amber"
                onClick={() => handleLogin(analystEmail(), 'analyst')}
                disabled={loading() || !analystEmail().trim()}
              >
                {loading() ? '登录中...' : '分析师登录'}
              </button>
            </div>
          </div>
        </div>

        <p class="font-body text-xs text-metabo-muted/60">
          登录即表示您同意我们的服务条款和隐私政策
        </p>
      </div>
    </div>
  );
}
