import { createMemo, For, Show } from 'solid-js'
import { useStore } from '../stores/appStore'
import { formatTime } from '../utils/helpers'

export default function SafetyOverview() {
  const store = useStore()
  const score = createMemo(() => store.safetyScore())

  const scoreColor = createMemo(() => {
    const s = score().overall
    if (s >= 80) return 'text-hydro-safe'
    if (s >= 60) return 'text-hydro-amber'
    if (s >= 40) return 'text-hydro-flame'
    return 'text-hydro-danger'
  })

  const scoreRingColor = createMemo(() => {
    const s = score().overall
    if (s >= 80) return '#2EC4B6'
    if (s >= 60) return '#F4A261'
    if (s >= 40) return '#FF6B35'
    return '#E63946'
  })

  const circumference = 2 * Math.PI * 54
  const dashOffset = createMemo(() => circumference - (score().overall / 100) * circumference)

  const dimLabels: Record<string, string> = {
    storage: '储氢系统',
    compression: '压缩系统',
    dispensing: '加注系统',
    environment: '环境监测',
  }

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    normal: { label: '正常', color: 'text-hydro-safe', bg: 'bg-hydro-safe/20' },
    warning: { label: '预警', color: 'text-hydro-amber', bg: 'bg-hydro-amber/20' },
    alarm: { label: '告警', color: 'text-hydro-flame', bg: 'bg-hydro-flame/20' },
    offline: { label: '离线', color: 'text-gray-500', bg: 'bg-gray-500/20' },
  }

  const typeIcons: Record<string, string> = {
    compressor: '⚙',
    tank: '☡',
    dispenser: '⛽',
    pipeline: '┃',
    vent: '↑',
    sensor: '◉',
  }

  const levelConfig: Record<string, { color: string; border: string }> = {
    info: { color: 'text-gray-400', border: 'border-l-gray-500' },
    warning: { color: 'text-hydro-amber', border: 'border-l-hydro-amber' },
    alarm: { color: 'text-hydro-flame', border: 'border-l-hydro-flame' },
    critical: { color: 'text-hydro-danger', border: 'border-l-hydro-danger' },
  }

  return (
    <div class="flex-1 overflow-auto p-4 space-y-4">
      <div class="grid grid-cols-12 gap-4">
        <div class="col-span-3 hydro-card-glow flex flex-col items-center justify-center py-6">
          <div class="hydro-label mb-3">全站安全评分</div>
          <div class="relative w-32 h-32">
            <svg viewBox="0 0 120 120" class="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r="54" fill="none" stroke="#1E3A5F" stroke-width="8" />
              <circle
                cx="60" cy="60" r="54" fill="none"
                stroke={scoreRingColor()}
                stroke-width="8"
                stroke-linecap="round"
                stroke-dasharray={circumference}
                stroke-dashoffset={dashOffset()}
                class="transition-all duration-1000 ease-out"
              />
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center">
              <span class={`font-mono font-bold text-3xl ${scoreColor()}`}>{score().overall}</span>
              <span class="text-[10px] text-gray-500 mt-0.5">/ 100</span>
            </div>
          </div>
        </div>

        <div class="col-span-3 hydro-card space-y-3">
          <div class="hydro-label">维度分项评分</div>
          <For each={Object.entries(score().dimensions)}>
            {([key, value]) => (
              <div class="space-y-1">
                <div class="flex justify-between text-xs">
                  <span class="text-gray-400">{dimLabels[key]}</span>
                  <span class={`font-mono font-medium ${value >= 80 ? 'text-hydro-safe' : value >= 60 ? 'text-hydro-amber' : 'text-hydro-flame'}`}>{value}</span>
                </div>
                <div class="h-1.5 bg-hydro-slate rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-700 ease-out"
                    classList={{
                      'bg-hydro-safe': value >= 80,
                      'bg-hydro-amber': value >= 60 && value < 80,
                      'bg-hydro-flame': value >= 40 && value < 60,
                      'bg-hydro-danger': value < 40,
                    }}
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            )}
          </For>
        </div>

        <div class="col-span-6 hydro-card">
          <div class="hydro-label mb-3">设施状态矩阵</div>
          <div class="grid grid-cols-4 gap-2">
            <For each={store.facilities()}>
              {(facility) => {
                const cfg = statusConfig[facility.status]
                return (
                  <div
                    class="relative p-2.5 rounded-lg border border-hydro-border bg-hydro-slate/30 cursor-pointer hover:border-hydro-flame/40 transition-all duration-200"
                    onClick={() => store.setExpandedFacility(store.expandedFacility() === facility.id ? null : facility.id)}
                  >
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-sm">{typeIcons[facility.type]}</span>
                      <span class="text-xs text-gray-300 truncate flex-1">{facility.name}</span>
                    </div>
                    <div class={`hydro-badge ${cfg.bg} ${cfg.color} text-[10px]`}>{cfg.label}</div>
                    <Show when={store.expandedFacility() === facility.id}>
                      <div class="mt-2 pt-2 border-t border-hydro-border space-y-1 animate-slide-up">
                        <div class="flex justify-between text-[10px]">
                          <span class="text-gray-500">压力</span>
                          <span class="font-mono text-gray-300">{facility.pressure} MPa</span>
                        </div>
                        <div class="flex justify-between text-[10px]">
                          <span class="text-gray-500">温度</span>
                          <span class="font-mono text-gray-300">{facility.temperature} °C</span>
                        </div>
                        <Show when={facility.type === 'dispenser' || facility.type === 'compressor'}>
                          <button
                            class="w-full mt-1.5 px-2 py-1 bg-hydro-danger/15 border border-hydro-danger/30 rounded text-[10px] text-hydro-danger hover:bg-hydro-danger/25 transition-colors cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); store.triggerLeakEvent(facility.id) }}
                          >
                            模拟泄漏
                          </button>
                        </Show>
                      </div>
                    </Show>
                  </div>
                )
              }}
            </For>
          </div>
        </div>
      </div>

      <div class="hydro-card">
        <div class="flex items-center justify-between mb-3">
          <div class="hydro-label">实时告警流</div>
          <span class="text-[10px] text-gray-600">每4秒刷新</span>
        </div>
        <div class="space-y-1.5 max-h-64 overflow-y-auto">
          <For each={store.alerts().slice(0, 20)}>
            {(alert) => {
              const lcfg = levelConfig[alert.level]
              return (
                <div class={`flex items-center gap-3 px-3 py-2 rounded-lg border-l-2 ${lcfg.border} bg-hydro-slate/20 animate-slide-up`}>
                  <span class={`text-[11px] font-medium ${lcfg.color} w-10`}>
                    {alert.level === 'critical' ? '紧急' : alert.level === 'alarm' ? '告警' : alert.level === 'warning' ? '预警' : '信息'}
                  </span>
                  <span class="text-xs text-gray-300 flex-1">{alert.message}</span>
                  <span class="text-[10px] text-gray-600 font-mono shrink-0">{formatTime(alert.timestamp)}</span>
                </div>
              )
            }}
          </For>
          <Show when={store.alerts().length === 0}>
            <div class="text-center text-gray-600 text-xs py-6">暂无告警信息</div>
          </Show>
        </div>
      </div>
    </div>
  )
}
