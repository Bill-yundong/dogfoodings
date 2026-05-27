import { createMemo, For, Show } from 'solid-js'
import { useStore } from '../stores/appStore'

const navItems = [
  { path: '/', label: '安全态势', icon: '◆' },
  { path: '/leak-mapping', label: '云团映射', icon: '◎' },
  { path: '/overpressure', label: '超压预演', icon: '▲' },
  { path: '/coordination', label: '应急协同', icon: '⚡' },
]

export default function Sidebar(props: { currentPath: string; onNavigate: (path: string) => void }) {
  const store = useStore()

  const syncIndicator = createMemo(() => {
    const s = store.syncStatus()
    if (s === 'synced') return { color: 'bg-hydro-safe', text: '同步正常' }
    if (s === 'syncing') return { color: 'bg-hydro-amber', text: '同步中...' }
    return { color: 'bg-hydro-danger', text: '同步延迟' }
  })

  return (
    <aside class="w-56 h-screen bg-hydro-navy border-r border-hydro-border flex flex-col shrink-0">
      <div class="p-4 border-b border-hydro-border">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-hydro-flame to-orange-600 flex items-center justify-center text-white text-sm font-bold">
            H₂
          </div>
          <div>
            <div class="text-sm font-semibold text-white tracking-wide">HydrogenNexus</div>
            <div class="text-[10px] text-gray-500">加氢站安全评价平台</div>
          </div>
        </div>
      </div>

      <nav class="flex-1 p-3 space-y-1">
        <For each={navItems}>
          {(item) => (
            <button
              class={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 cursor-pointer ${
                props.currentPath === item.path
                  ? 'bg-hydro-flame/15 text-hydro-flame border border-hydro-flame/30'
                  : 'text-gray-400 hover:bg-hydro-slate/50 hover:text-gray-200 border border-transparent'
              }`}
              onClick={() => props.onNavigate(item.path)}
            >
              <span class="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          )}
        </For>
      </nav>

      <div class="p-3 border-t border-hydro-border space-y-3">
        <div class="flex items-center gap-2 px-2">
          <div class={`w-2 h-2 rounded-full ${syncIndicator().color} animate-pulse`} />
          <span class="text-[11px] text-gray-500">{syncIndicator().text}</span>
        </div>
        <div class="flex items-center gap-2 px-2">
          <div class={`w-2 h-2 rounded-full ${store.isOnline() ? 'bg-hydro-safe' : 'bg-hydro-amber'}`} />
          <span class="text-[11px] text-gray-500">{store.isOnline() ? '在线模式' : '离线模式'}</span>
        </div>
        <Show when={store.currentLeakEvent()}>
          <div class="px-2 py-1.5 bg-hydro-danger/10 border border-hydro-danger/30 rounded text-[10px] text-hydro-danger">
            ⚠ 泄漏事件激活中
          </div>
        </Show>
      </div>
    </aside>
  )
}
