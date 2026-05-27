import { For, Show, createSignal } from 'solid-js';

interface MockUser {
  id: string;
  name: string;
  avgBloodSugar: number;
  riskLevel: 'low' | 'medium' | 'high';
  mealsLogged: number;
  lastActive: string;
}

const MOCK_USERS: MockUser[] = [
  { id: 'u1', name: '张明', avgBloodSugar: 8.2, riskLevel: 'high', mealsLogged: 42, lastActive: '2分钟前' },
  { id: 'u2', name: '李娜', avgBloodSugar: 7.1, riskLevel: 'medium', mealsLogged: 38, lastActive: '15分钟前' },
  { id: 'u3', name: '王磊', avgBloodSugar: 6.4, riskLevel: 'low', mealsLogged: 55, lastActive: '1小时前' },
  { id: 'u4', name: '陈思', avgBloodSugar: 9.1, riskLevel: 'high', mealsLogged: 27, lastActive: '30分钟前' },
  { id: 'u5', name: '赵雨', avgBloodSugar: 6.8, riskLevel: 'medium', mealsLogged: 33, lastActive: '5分钟前' },
  { id: 'u6', name: '刘洋', avgBloodSugar: 5.9, riskLevel: 'low', mealsLogged: 61, lastActive: '3分钟前' },
  { id: 'u7', name: '黄晓', avgBloodSugar: 10.3, riskLevel: 'high', mealsLogged: 19, lastActive: '2小时前' },
  { id: 'u8', name: '周敏', avgBloodSugar: 6.2, riskLevel: 'low', mealsLogged: 47, lastActive: '10分钟前' },
];

function riskBadgeClass(level: string) {
  if (level === 'low') return 'badge-low';
  if (level === 'medium') return 'badge-medium';
  return 'badge-high';
}

function riskLabel(level: string) {
  if (level === 'low') return '低风险';
  if (level === 'medium') return '中风险';
  return '高风险';
}

function bgBarColor(level: string) {
  if (level === 'low') return 'bg-metabo-glow';
  if (level === 'medium') return 'bg-metabo-amber';
  return 'bg-red-500';
}

export default function Overview() {
  const [sortBy, setSortBy] = createSignal<'risk' | 'meals' | 'sugar'>('risk');

  const sortedUsers = () => {
    const users = [...MOCK_USERS];
    const s = sortBy();
    if (s === 'risk') return users.sort((a, b) => a.riskLevel === b.riskLevel ? 0 : a.riskLevel === 'high' ? -1 : 1);
    if (s === 'meals') return users.sort((a, b) => b.mealsLogged - a.mealsLogged);
    return users.sort((a, b) => b.avgBloodSugar - a.avgBloodSugar);
  };

  const riskCounts = () => ({
    high: MOCK_USERS.filter(u => u.riskLevel === 'high').length,
    medium: MOCK_USERS.filter(u => u.riskLevel === 'medium').length,
    low: MOCK_USERS.filter(u => u.riskLevel === 'low').length,
  });

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="font-display text-2xl font-bold text-metabo-text">多用户代谢概览</h1>
        <div class="flex gap-2">
          <For each={['risk', 'meals', 'sugar'] as const}>
            {(s) => (
              <button
                class={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                  sortBy() === s
                    ? 'bg-metabo-glow/20 text-metabo-glow border border-metabo-glow/30'
                    : 'bg-metabo-surface border border-metabo-border text-metabo-muted hover:text-metabo-text'
                }`}
                onClick={() => setSortBy(s)}
              >
                {s === 'risk' ? '风险排序' : s === 'meals' ? '记录排序' : '血糖排序'}
              </button>
            )}
          </For>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-4">
        <div class="glass-card p-4 flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
            <svg class="w-6 h-6 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <div class="stat-number text-red-400">{riskCounts().high}</div>
            <div class="font-body text-xs text-metabo-muted">高风险用户</div>
          </div>
        </div>
        <div class="glass-card p-4 flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-metabo-amber/20 flex items-center justify-center">
            <svg class="w-6 h-6 text-metabo-amber" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <div class="stat-number text-metabo-amber">{riskCounts().medium}</div>
            <div class="font-body text-xs text-metabo-muted">中风险用户</div>
          </div>
        </div>
        <div class="glass-card p-4 flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-metabo-glow/20 flex items-center justify-center">
            <svg class="w-6 h-6 text-metabo-glow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div>
            <div class="stat-number text-metabo-glow">{riskCounts().low}</div>
            <div class="font-body text-xs text-metabo-muted">低风险用户</div>
          </div>
        </div>
      </div>

      <div class="glass-card overflow-hidden">
        <div class="grid grid-cols-12 gap-4 px-6 py-3 border-b border-metabo-border text-xs font-medium text-metabo-muted">
          <div class="col-span-3">用户</div>
          <div class="col-span-2">平均血糖</div>
          <div class="col-span-2">风险等级</div>
          <div class="col-span-2">膳食记录</div>
          <div class="col-span-3">血糖分布</div>
        </div>
        <For each={sortedUsers()}>
          {(u) => (
            <div class="grid grid-cols-12 gap-4 px-6 py-4 border-b border-metabo-border/50 hover:bg-metabo-surface/40 transition-colors">
              <div class="col-span-3 flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-metabo-green flex items-center justify-center text-metabo-glow text-xs font-bold font-display">
                  {u.name[0]}
                </div>
                <div>
                  <div class="font-body text-sm text-metabo-text font-medium">{u.name}</div>
                  <div class="font-body text-xs text-metabo-muted">{u.lastActive}</div>
                </div>
              </div>
              <div class="col-span-2 flex items-center">
                <span class={`stat-number text-base ${
                  u.avgBloodSugar >= 9 ? 'text-red-400' : u.avgBloodSugar >= 7 ? 'text-metabo-amber' : 'text-metabo-glow'
                }`}>
                  {u.avgBloodSugar}
                </span>
                <span class="font-body text-xs text-metabo-muted ml-1">mmol/L</span>
              </div>
              <div class="col-span-2 flex items-center">
                <span class={riskBadgeClass(u.riskLevel)}>{riskLabel(u.riskLevel)}</span>
              </div>
              <div class="col-span-2 flex items-center">
                <span class="font-body text-sm text-metabo-text">{u.mealsLogged}</span>
                <span class="font-body text-xs text-metabo-muted ml-1">条</span>
              </div>
              <div class="col-span-3 flex items-center gap-1">
                <div class="flex-1 h-2 bg-metabo-dark rounded-full overflow-hidden flex">
                  <div class={`h-full ${bgBarColor('low')}`} style={`width: ${(riskCounts().low / MOCK_USERS.length) * 100}%`} />
                  <div class={`h-full ${bgBarColor('medium')}`} style={`width: ${(riskCounts().medium / MOCK_USERS.length) * 100}%`} />
                  <div class={`h-full ${bgBarColor('high')}`} style={`width: ${(riskCounts().high / MOCK_USERS.length) * 100}%`} />
                </div>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
