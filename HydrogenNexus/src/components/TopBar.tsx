import { createMemo, Show, For } from 'solid-js'
import { useStore } from '../stores/appStore'

export default function TopBar() {
  const store = useStore()

  const alertCount = createMemo(() => store.alerts().filter(a => !a.acknowledged && a.level === 'critical').length)

  const timeStr = createMemo(() => {
    return new Date().toLocaleTimeString('zh-CN', { hour12: false })
  })

  return (
    <header class="h-12 bg-hydro-navy/80 border-b border-hydro-border flex items-center justify-between px-4 shrink-0 backdrop-blur-sm">
      <div class="flex items-center gap-4">
        <span class="text-xs text-gray-500">加氢站 #HRS-2024-007</span>
        <span class="text-xs text-gray-600">|</span>
        <span class="font-mono text-xs text-gray-400">{timeStr()}</span>
      </div>
      <div class="flex items-center gap-4">
        <Show when={alertCount() > 0}>
          <div class="flex items-center gap-1.5 px-2.5 py-1 bg-hydro-danger/15 border border-hydro-danger/30 rounded-full">
            <span class="w-1.5 h-1.5 rounded-full bg-hydro-danger animate-pulse" />
            <span class="text-[11px] text-hydro-danger font-medium">{alertCount()} 条紧急告警</span>
          </div>
        </Show>
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-full bg-hydro-slate flex items-center justify-center text-xs text-gray-300">调度</div>
          <span class="text-xs text-gray-400">站控调度员</span>
        </div>
      </div>
    </header>
  )
}
