import { createSignal, For, Show } from 'solid-js';
import { useLocation, useNavigate } from '@solidjs/router';
import { dbReady, isAnalyst, logout, user } from '../stores/app';

const navItems = [
  { label: '膳食控制台', path: '/dashboard', icon: 'grid' },
  { label: '血糖预测', path: '/dashboard/blood-sugar', icon: 'activity' },
  { label: '营养仪表盘', path: '/dashboard/nutrition', icon: 'pie' },
  { label: '膳食时间轴', path: '/dashboard/timeline', icon: 'clock' },
  { label: '食物营养库', path: '/food-database', icon: 'database' },
];

const analystItems = [
  { label: '分析师控制台', path: '/analyst', icon: 'shield' },
  { label: '语义对齐', path: '/analyst/alignment', icon: 'link' },
  { label: '用户概览', path: '/analyst/overview', icon: 'users' },
  { label: '异常告警', path: '/analyst/alerts', icon: 'alert' },
  { label: '报告生成', path: '/analyst/reports', icon: 'file' },
];

function NavIcon(props: { name: string; class?: string }) {
  const base = props.class || 'w-5 h-5';
  switch (props.name) {
    case 'grid':
      return (
        <svg class={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
        </svg>
      );
    case 'activity':
      return (
        <svg class={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      );
    case 'pie':
      return (
        <svg class={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" />
        </svg>
      );
    case 'clock':
      return (
        <svg class={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case 'database':
      return (
        <svg class={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
      );
    case 'shield':
      return (
        <svg class={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case 'link':
      return (
        <svg class={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      );
    case 'users':
      return (
        <svg class={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'alert':
      return (
        <svg class={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case 'file':
      return (
        <svg class={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
        </svg>
      );
    default:
      return null;
  }
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = createSignal(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside
      class={`flex flex-col h-screen bg-metabo-dark border-r border-metabo-border transition-all duration-300 ${
        collapsed() ? 'w-16' : 'w-60'
      }`}
    >
      <div class="flex items-center gap-3 px-4 h-16 border-b border-metabo-border">
        <div class="w-8 h-8 rounded-lg bg-metabo-glow/20 flex items-center justify-center flex-shrink-0">
          <span class="text-metabo-glow font-display font-bold text-sm">M</span>
        </div>
        <span
          class={`font-display font-bold text-metabo-glow text-lg transition-opacity duration-200 ${
            collapsed() ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
          }`}
        >
          MetaboFlow
        </span>
      </div>

      <nav class="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        <For each={navItems}>
          {(item) => (
            <button
              class={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                isActive(item.path)
                  ? 'bg-metabo-glow/10 glow-border text-metabo-glow'
                  : 'text-metabo-muted hover:bg-metabo-surface hover:text-metabo-text'
              }`}
              onClick={() => navigate(item.path)}
            >
              <NavIcon
                name={item.icon}
                class={`w-5 h-5 flex-shrink-0 ${
                  isActive(item.path) ? 'text-metabo-glow' : ''
                }`}
              />
              <span
                class={`font-body text-sm whitespace-nowrap transition-opacity duration-200 ${
                  collapsed() ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
                }`}
              >
                {item.label}
              </span>
            </button>
          )}
        </For>

        <Show when={isAnalyst()}>
          <div class="pt-3 pb-1 px-3">
            <span
              class={`font-body text-xs text-metabo-muted uppercase tracking-wider transition-opacity duration-200 ${
                collapsed() ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
              }`}
            >
              专业分析
            </span>
          </div>
          <For each={analystItems}>
            {(item) => (
              <button
                class={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive(item.path)
                    ? 'bg-metabo-amber/10 border border-metabo-amber/30 text-metabo-amber'
                    : 'text-metabo-muted hover:bg-metabo-surface hover:text-metabo-text'
                }`}
                onClick={() => navigate(item.path)}
              >
                <NavIcon
                  name={item.icon}
                  class={`w-5 h-5 flex-shrink-0 ${
                    isActive(item.path) ? 'text-metabo-amber' : ''
                  }`}
                />
                <span
                  class={`font-body text-sm whitespace-nowrap transition-opacity duration-200 ${
                    collapsed() ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            )}
          </For>
        </Show>
      </nav>

      <div class="px-4 py-3 border-t border-metabo-border space-y-2">
        <div
          class={`flex items-center gap-2 ${
            collapsed() ? 'justify-center' : ''
          }`}
        >
          <span
            class={`w-2 h-2 rounded-full flex-shrink-0 ${
              dbReady() ? 'bg-metabo-glow shadow-glow-sm' : 'bg-metabo-amber shadow-amber'
            }`}
          />
          <span
            class={`text-xs font-body text-metabo-muted transition-opacity duration-200 ${
              collapsed() ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
            }`}
          >
            {dbReady() ? '数据库就绪' : '数据库加载中'}
          </span>
        </div>
        <button
          class={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-metabo-muted hover:text-red-400 transition-colors duration-200 ${
            collapsed() ? 'justify-center' : ''
          }`}
          onClick={() => { logout(); navigate('/'); }}
        >
          <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span
            class={`text-xs font-body transition-opacity duration-200 ${
              collapsed() ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
            }`}
          >
            退出登录
          </span>
        </button>
      </div>

      <button
        class="flex items-center justify-center h-10 border-t border-metabo-border text-metabo-muted hover:text-metabo-text transition-colors duration-200"
        onClick={() => setCollapsed(!collapsed())}
      >
        <svg
          class={`w-4 h-4 transition-transform duration-300 ${
            collapsed() ? 'rotate-180' : ''
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
    </aside>
  );
}
