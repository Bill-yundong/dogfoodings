import { createSignal, createMemo, For, Show, onMount } from 'solid-js'
import { useStore } from '../stores/appStore'
import { loadLatestTopology, loadCoordinationOrders } from '../utils/indexeddb'
import type { CoordinationOrder, TopologySnapshot } from '../utils/types'
import { formatDateTime } from '../utils/helpers'

export default function Coordination() {
  const store = useStore()
  const [newOrderAction, setNewOrderAction] = createSignal('')
  const [newOrderDetail, setNewOrderDetail] = createSignal('')
  const [topologySnapshot, setTopologySnapshot] = createSignal<TopologySnapshot | null>(null)
  const [offlineMode, setOfflineMode] = createSignal(false)
  const [recoveryProgress, setRecoveryProgress] = createSignal(0)

  onMount(async () => {
    const snapshot = await loadLatestTopology()
    if (snapshot) setTopologySnapshot(snapshot)
  })

  const handleToggleOffline = async () => {
    if (!offlineMode()) {
      setOfflineMode(true)
      setRecoveryProgress(0)
      const snapshot = await loadLatestTopology()
      if (snapshot) {
        let progress = 0
        const interval = setInterval(() => {
          progress += 10
          setRecoveryProgress(progress)
          if (progress >= 100) {
            clearInterval(interval)
            setTopologySnapshot(snapshot)
          }
        }, 100)
      }
    } else {
      setOfflineMode(false)
      setRecoveryProgress(100)
    }
    store.setIsOnline(!offlineMode())
  }

  const handleSendOrder = () => {
    const action = newOrderAction()
    if (!action.trim()) return
    store.sendCoordinationOrder({
      fromRole: 'station',
      toRole: 'fire',
      action: action,
      status: 'sent',
      detail: newOrderDetail() || undefined,
    })
    setNewOrderAction('')
    setNewOrderDetail('')
  }

  const presetActions = [
    '启动紧急切断阀',
    '通知消防车辆就位',
    '疏散站区人员',
    '启动水幕喷淋系统',
    '封锁周边道路',
    '通知医疗急救待命',
  ]

  const statusConfig: Record<CoordinationOrder['status'], { label: string; color: string; bg: string }> = {
    sent: { label: '已发送', color: 'text-gray-400', bg: 'bg-gray-500/15' },
    confirmed: { label: '已确认', color: 'text-hydro-amber', bg: 'bg-hydro-amber/15' },
    executing: { label: '执行中', color: 'text-hydro-flame', bg: 'bg-hydro-flame/15' },
    completed: { label: '已完成', color: 'text-hydro-safe', bg: 'bg-hydro-safe/15' },
    failed: { label: '执行失败', color: 'text-hydro-danger', bg: 'bg-hydro-danger/15' },
  }

  const roleLabels: Record<string, string> = {
    station: '站控中心',
    fire: '消防终端',
    admin: '管理中心',
  }

  const typeIcons: Record<string, string> = {
    compressor: '⚙',
    tank: '☡',
    dispenser: '⛽',
    pipeline: '┃',
    vent: '↑',
    sensor: '◉',
  }

  const tasks = createMemo(() => {
    const orders = store.coordinationOrders()
    return orders.slice(0, 6).map((o, i) => ({
      ...o,
      progress: o.status === 'completed' ? 100 : o.status === 'executing' ? 30 + i * 15 : o.status === 'confirmed' ? 20 : 10,
    }))
  })

  return (
    <div class="flex-1 overflow-auto p-4 space-y-4">
      <div class="grid grid-cols-12 gap-4">
        <div class="col-span-8 hydro-card">
          <div class="flex items-center justify-between mb-3">
            <div class="hydro-label">联动指令流</div>
            <Show when={offlineMode()}>
              <div class="flex items-center gap-1.5 px-2 py-0.5 bg-hydro-amber/15 border border-hydro-amber/30 rounded-full">
                <div class="w-1.5 h-1.5 rounded-full bg-hydro-amber animate-pulse" />
                <span class="text-[10px] text-hydro-amber">离线模式</span>
              </div>
            </Show>
          </div>

          <div class="flex gap-2 mb-4 flex-wrap">
            <For each={presetActions}>
              {(action) => (
                <button
                  class="hydro-btn-outline text-[11px] px-3 py-1.5 hover:border-hydro-flame/50 hover:text-hydro-flame"
                  onClick={() => setNewOrderAction(action)}
                >
                  {action}
                </button>
              )}
            </For>
          </div>

          <div class="flex gap-2 mb-4">
            <input
              type="text"
              value={newOrderAction()}
              onInput={(e) => setNewOrderAction(e.currentTarget.value)}
              placeholder="输入联动指令..."
              class="flex-1 bg-hydro-slate border border-hydro-border rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:border-hydro-flame/50 focus:outline-none"
            />
            <input
              type="text"
              value={newOrderDetail()}
              onInput={(e) => setNewOrderDetail(e.currentTarget.value)}
              placeholder="补充说明（可选）"
              class="w-48 bg-hydro-slate border border-hydro-border rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:border-hydro-flame/50 focus:outline-none"
            />
            <button class="hydro-btn-primary text-xs" onClick={handleSendOrder}>发送指令</button>
          </div>

          <div class="space-y-2 max-h-96 overflow-y-auto">
            <For each={store.coordinationOrders()}>
              {(order) => {
                const sc = statusConfig[order.status]
                const isFromStation = order.fromRole === 'station'
                return (
                  <div class={`flex ${isFromStation ? 'justify-start' : 'justify-end'}`}>
                    <div class={`max-w-md p-3 rounded-lg border ${
                      isFromStation
                        ? 'bg-hydro-slate/40 border-hydro-border rounded-tl-none'
                        : 'bg-hydro-panel border-hydro-flame/20 rounded-tr-none'
                    }`}>
                      <div class="flex items-center gap-2 mb-1">
                        <span class="text-[10px] text-gray-500">{roleLabels[order.fromRole]}</span>
                        <span class="text-gray-600">→</span>
                        <span class="text-[10px] text-gray-500">{roleLabels[order.toRole]}</span>
                        <span class={`hydro-badge ${sc.bg} ${sc.color} text-[10px] ml-auto`}>{sc.label}</span>
                      </div>
                      <div class="text-xs text-gray-200">{order.action}</div>
                      <Show when={order.detail}>
                        <div class="text-[10px] text-gray-500 mt-1">{order.detail}</div>
                      </Show>
                      <div class="text-[10px] text-gray-600 mt-1 font-mono">{formatDateTime(order.timestamp)}</div>
                      <Show when={order.status === 'sent' && order.toRole === 'fire'}>
                        <div class="flex gap-2 mt-2">
                          <button
                            class="px-2 py-0.5 bg-hydro-safe/15 border border-hydro-safe/30 rounded text-[10px] text-hydro-safe hover:bg-hydro-safe/25 cursor-pointer"
                            onClick={() => store.updateOrderStatus(order.id, 'confirmed')}
                          >确认</button>
                          <button
                            class="px-2 py-0.5 bg-hydro-flame/15 border border-hydro-flame/30 rounded text-[10px] text-hydro-flame hover:bg-hydro-flame/25 cursor-pointer"
                            onClick={() => store.updateOrderStatus(order.id, 'executing')}
                          >执行</button>
                          <button
                            class="px-2 py-0.5 bg-hydro-safe/15 border border-hydro-safe/30 rounded text-[10px] text-hydro-safe hover:bg-hydro-safe/25 cursor-pointer"
                            onClick={() => store.updateOrderStatus(order.id, 'completed')}
                          >完成</button>
                        </div>
                      </Show>
                    </div>
                  </div>
                )
              }}
            </For>
            <Show when={store.coordinationOrders().length === 0}>
              <div class="text-center text-gray-600 text-xs py-8">暂无联动指令，请发送指令开始协同</div>
            </Show>
          </div>
        </div>

        <div class="col-span-4 space-y-4">
          <div class="hydro-card">
            <div class="flex items-center justify-between mb-3">
              <div class="hydro-label">离线拓扑恢复</div>
              <button
                class={`hydro-btn text-[11px] px-3 py-1 ${offlineMode() ? 'bg-hydro-amber text-white' : 'hydro-btn-outline'}`}
                onClick={handleToggleOffline}
              >
                {offlineMode() ? '恢复在线' : '模拟离线'}
              </button>
            </div>

            <Show when={offlineMode() && recoveryProgress() < 100}>
              <div class="mb-3">
                <div class="flex justify-between text-[10px] mb-1">
                  <span class="text-gray-500">从 IndexedDB 恢复拓扑...</span>
                  <span class="text-hydro-flame font-mono">{recoveryProgress()}%</span>
                </div>
                <div class="h-1.5 bg-hydro-slate rounded-full overflow-hidden">
                  <div
                    class="h-full bg-gradient-to-r from-hydro-flame to-orange-500 rounded-full transition-all duration-200"
                    style={{ width: `${recoveryProgress()}%` }}
                  />
                </div>
              </div>
            </Show>

            <Show when={topologySnapshot()}>
              <div class="space-y-2">
                <div class="text-[10px] text-gray-500 mb-2">
                  拓扑版本: {topologySnapshot()!.version} | {topologySnapshot()!.facilities.length} 个设施 | {topologySnapshot()!.connections.length} 条连接
                </div>
                <div class="bg-hydro-slate/30 rounded-lg p-3 max-h-60 overflow-y-auto">
                  <For each={topologySnapshot()!.facilities}>
                    {(f) => {
                      const statusColors: Record<string, string> = {
                        normal: 'bg-hydro-safe',
                        warning: 'bg-hydro-amber',
                        alarm: 'bg-hydro-danger',
                        offline: 'bg-gray-500',
                      }
                      return (
                        <div class="flex items-center gap-2 py-1">
                          <div class={`w-2 h-2 rounded-full ${offlineMode() ? 'bg-hydro-amber' : statusColors[f.status]}`} />
                          <span class="text-[10px] text-gray-400">{typeIcons[f.type]}</span>
                          <span class="text-xs text-gray-300 flex-1">{f.name}</span>
                          <span class="font-mono text-[10px] text-gray-500">{f.pressure} MPa</span>
                        </div>
                      )
                    }}
                  </For>
                </div>
                <Show when={topologySnapshot()!.connections.length > 0}>
                  <div class="text-[10px] text-gray-600 mt-2">连接关系:</div>
                  <div class="bg-hydro-slate/20 rounded p-2 max-h-32 overflow-y-auto">
                    <For each={topologySnapshot()!.connections}>
                      {(conn) => {
                        const fromF = topologySnapshot()!.facilities.find(f => f.id === conn.from)
                        const toF = topologySnapshot()!.facilities.find(f => f.id === conn.to)
                        const typeLabel: Record<string, string> = { pipe: '管道', cable: '电缆', signal: '信号' }
                        return (
                          <div class="text-[10px] text-gray-500 py-0.5">
                            {fromF?.name || conn.from} → [{typeLabel[conn.type]}] → {toF?.name || conn.to}
                          </div>
                        )
                      }}
                    </For>
                  </div>
                </Show>
              </div>
            </Show>
            <Show when={!topologySnapshot() && !offlineMode()}>
              <div class="text-center text-gray-600 text-xs py-4">在线模式下拓扑数据实时同步</div>
            </Show>
          </div>

          <div class="hydro-card">
            <div class="hydro-label mb-3">处置进度追踪</div>
            <div class="space-y-3">
              <For each={tasks()}>
                {(task) => {
                  const sc = statusConfig[task.status]
                  return (
                    <div>
                      <div class="flex items-center justify-between mb-1">
                        <span class="text-[11px] text-gray-300 truncate max-w-48">{task.action}</span>
                        <span class={`hydro-badge ${sc.bg} ${sc.color} text-[10px]`}>{sc.label}</span>
                      </div>
                      <div class="h-1 bg-hydro-slate rounded-full overflow-hidden">
                        <div
                          class="h-full rounded-full transition-all duration-500"
                          classList={{
                            'bg-hydro-safe': task.status === 'completed',
                            'bg-hydro-flame': task.status === 'executing',
                            'bg-hydro-amber': task.status === 'confirmed',
                            'bg-gray-500': task.status === 'sent',
                          }}
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    </div>
                  )
                }}
              </For>
              <Show when={tasks().length === 0}>
                <div class="text-center text-gray-600 text-xs py-4">暂无处置任务</div>
              </Show>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
