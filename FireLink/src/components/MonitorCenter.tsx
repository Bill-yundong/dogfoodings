import { For, createMemo, createSignal, createEffect } from 'solid-js'
import { useSystemStore } from '@/context/SystemContext'
import FloorMap from './FloorMap'
import { getRiskLevelText, getRiskLevelColor } from '@/services/smokeSimulation'
import { buildingFloors } from '@/data/buildingData'
import type { EvacuationPath } from '@/types'

export default function MonitorCenter() {
  const store = useSystemStore()
  const [showSmoke, setShowSmoke] = createSignal(true)
  const [showPaths, setShowPaths] = createSignal(true)
  const [isCalculating, setIsCalculating] = createSignal(false)

  const currentSmokeField = createMemo(() => {
    return store.smokeFields().get(store.selectedFloor())
  })

  const floorStats = createMemo(() => {
    const fields = store.smokeFields()
    return buildingFloors.map(floor => {
      const field = fields.get(floor.floor)
      let avgConcentration = 0
      let maxConcentration = 0
      let riskLevel = 0

      if (field && field.points.length > 0) {
        const concentrations = field.points.map(p => p.concentration)
        avgConcentration = concentrations.reduce((a, b) => a + b, 0) / concentrations.length
        maxConcentration = Math.max(...concentrations)
        riskLevel = maxConcentration < 10 ? 0 : maxConcentration < 30 ? 1 : maxConcentration < 50 ? 2 : maxConcentration < 70 ? 3 : 4
      }

      return {
        floor: floor.floor,
        name: floor.name,
        avgConcentration,
        maxConcentration,
        riskLevel
      }
    })
  })

  const handleNodeClick = async (nodeId: string) => {
    if (!store.systemState().isEmergency) return

    setIsCalculating(true)
    try {
      const path = await store.calculateEvacuationPath(nodeId)
      if (path) {
        store.setSelectedPath(path)
      }
    } finally {
      setIsCalculating(false)
    }
  }

  const handleSelectPath = (path: EvacuationPath) => {
    store.setSelectedPath(path)
    const startFloor = path.nodes[0]?.floor
    if (startFloor) {
      store.setSelectedFloor(startFloor)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}分${secs}秒` : `${secs}秒`
  }

  createEffect(() => {
    if (store.evacuationPaths().length > 0 && !store.selectedPath()) {
      store.setSelectedPath(store.evacuationPaths()[0])
    }
  })

  return (
    <div class="h-full flex flex-col bg-slate-950">
      <header class="bg-slate-900 border-b border-slate-800 px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <span class="text-2xl">🔥</span>
              <h1 class="text-xl font-bold text-white">FireLink 监控中心</h1>
            </div>
            <div class={`px-3 py-1 rounded-full text-sm font-medium ${
              store.systemState().isEmergency
                ? 'bg-red-500/20 text-red-400 animate-pulse'
                : 'bg-green-500/20 text-green-400'
            }`}>
              {store.systemState().isEmergency ? '⚠️ 紧急状态' : '✓ 正常运行'}
            </div>
          </div>

          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2 text-sm text-slate-400">
              <span class={`w-2 h-2 rounded-full ${
                store.systemState().syncStatus === 'synced' ? 'bg-green-500' :
                store.systemState().syncStatus === 'syncing' ? 'bg-yellow-500 animate-pulse' :
                'bg-red-500'
              }`}></span>
              {store.systemState().syncStatus === 'synced' ? '已同步' :
               store.systemState().syncStatus === 'syncing' ? '同步中...' : '同步冲突'}
            </div>
            <button
              onClick={() => store.setUserMode('terminal')}
              class="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white transition-colors"
            >
              切换到终端模式
            </button>
          </div>
        </div>
      </header>

      <div class="flex-1 flex overflow-hidden">
        <aside class="w-72 bg-slate-900 border-r border-slate-800 flex flex-col overflow-hidden">
          <div class="p-4 border-b border-slate-800">
            <h3 class="text-sm font-semibold text-slate-300 mb-3">楼层选择</h3>
            <div class="space-y-2">
              <For each={floorStats()}>
                {(floor) => (
                  <button
                    onClick={() => store.setSelectedFloor(floor.floor)}
                    class={`w-full p-3 rounded-lg text-left transition-all ${
                      store.selectedFloor() === floor.floor
                        ? 'bg-blue-500/20 border border-blue-500/50'
                        : 'bg-slate-800 hover:bg-slate-700 border border-transparent'
                    }`}
                  >
                    <div class="flex items-center justify-between">
                      <span class="text-white font-medium">{floor.name}</span>
                      <span
                        class="w-3 h-3 rounded-full"
                        style={{ 'background-color': getRiskLevelColor(floor.riskLevel) }}
                      ></span>
                    </div>
                    <div class="mt-1 flex items-center gap-2 text-xs">
                      <span class="text-slate-400">最高浓度:</span>
                      <span class={floor.riskLevel >= 3 ? 'text-red-400' : 'text-slate-300'}>
                        {floor.maxConcentration.toFixed(1)}%
                      </span>
                      <span class="text-slate-500">|</span>
                      <span class="text-slate-400">{getRiskLevelText(floor.riskLevel)}</span>
                    </div>
                  </button>
                )}
              </For>
            </div>
          </div>

          <div class="p-4 border-b border-slate-800">
            <h3 class="text-sm font-semibold text-slate-300 mb-3">控制选项</h3>
            <div class="space-y-3">
              <button
                onClick={() => store.triggerEmergency()}
                disabled={store.systemState().isEmergency}
                class="w-full py-3 bg-red-500 hover:bg-red-600 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
              >
                🚨 触发紧急状态
              </button>
              <button
                onClick={() => store.clearEmergency()}
                disabled={!store.systemState().isEmergency}
                class="w-full py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-slate-300 text-sm transition-colors"
              >
                清除紧急状态
              </button>
              <button
                onClick={() => store.togglePowerStatus()}
                class="w-full py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 text-sm transition-colors"
              >
                🔋 电源状态: {
                  store.systemState().powerStatus === 'normal' ? '正常' :
                  store.systemState().powerStatus === 'backup' ? '备用电源' : '断电模式'
                }
              </button>
              <button
                onClick={() => store.toggleOfflineMode()}
                class="w-full py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 text-sm transition-colors"
              >
                📶 {store.systemState().isOfflineMode ? '离线模式' : '在线模式'}
              </button>
              <div class="flex gap-2">
                <label class="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSmoke()}
                    onChange={(e) => setShowSmoke(e.target.checked)}
                    class="rounded"
                  />
                  显示烟雾
                </label>
                <label class="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPaths()}
                    onChange={(e) => setShowPaths(e.target.checked)}
                    class="rounded"
                  />
                  显示路径
                </label>
              </div>
            </div>
          </div>

          <div class="flex-1 overflow-auto p-4">
            <h3 class="text-sm font-semibold text-slate-300 mb-3">
              疏散路径 ({store.evacuationPaths().length})
            </h3>
            {store.evacuationPaths().length === 0 ? (
              <div class="text-center py-8 text-slate-500 text-sm">
                {store.systemState().isEmergency
                  ? '点击地图上的节点计算疏散路径'
                  : '请先触发紧急状态'}
              </div>
            ) : (
              <div class="space-y-2">
                <For each={store.evacuationPaths()}>
                  {(path, index) => (
                    <div
                      onClick={() => handleSelectPath(path)}
                      class={`p-3 rounded-lg cursor-pointer transition-all ${
                        store.selectedPath()?.id === path.id
                          ? 'bg-blue-500/20 border border-blue-500/50'
                          : 'bg-slate-800 hover:bg-slate-700 border border-transparent'
                      }`}
                    >
                      <div class="flex items-center justify-between">
                        <span class="text-white text-sm font-medium">
                          路径 #{index() + 1}
                        </span>
                        <span class={`text-xs px-2 py-0.5 rounded ${
                          path.isStable ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {path.isStable ? '稳定' : '风险较高'}
                        </span>
                      </div>
                      <div class="mt-2 grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <div class="text-slate-500">距离</div>
                          <div class="text-slate-300">{path.totalDistance}m</div>
                        </div>
                        <div>
                          <div class="text-slate-500">预计时间</div>
                          <div class="text-slate-300">{formatTime(path.estimatedTime)}</div>
                        </div>
                        <div>
                          <div class="text-slate-500">风险分</div>
                          <div class="text-slate-300">{path.riskScore.toFixed(1)}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            )}
          </div>
        </aside>

        <main class="flex-1 flex flex-col overflow-hidden">
          <div class="p-4 bg-slate-900/50 border-b border-slate-800">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold text-white">
                  {buildingFloors.find(f => f.floor === store.selectedFloor())?.name || '楼层地图'}
                </h2>
                <p class="text-sm text-slate-400">
                  {isCalculating() ? '⏳ 正在计算最优疏散路径...' :
                   store.selectedPath() ? '✓ 路径已生成，点击节点可计算新路径' :
                   store.systemState().isEmergency ? '点击任意节点开始计算疏散路径' : '系统待机中'}
                </p>
              </div>
              {currentSmokeField() && (
                <div class="flex items-center gap-4 text-sm">
                  <div class="text-slate-400">
                    烟雾更新: {new Date(currentSmokeField()!.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div class="flex-1 p-4">
            <FloorMap
              floor={store.selectedFloor()}
              smokeField={currentSmokeField()}
              selectedPath={store.selectedPath()}
              onNodeClick={handleNodeClick}
              showSmoke={showSmoke() && store.systemState().isEmergency}
              showPaths={showPaths()}
              interactive={true}
            />
          </div>

          {store.selectedPath() && (
            <div class="p-4 bg-slate-900 border-t border-slate-800">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <div class="flex items-center gap-2">
                    <span class="text-blue-400">📍</span>
                    <span class="text-sm text-slate-300">起点: {store.selectedPath()?.startNodeId}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-green-400">🏁</span>
                    <span class="text-sm text-slate-300">终点: {store.selectedPath()?.endNodeId}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-yellow-400">📏</span>
                    <span class="text-sm text-slate-300">{store.selectedPath()?.totalDistance}米</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-purple-400">⏱️</span>
                    <span class="text-sm text-slate-300">预计 {formatTime(store.selectedPath()?.estimatedTime || 0)}</span>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <For each={store.selectedPath()?.nodes || []}>
                    {(node, index) => (
                      <div
                        class={`w-3 h-3 rounded-full ${
                          index() === 0 ? 'bg-blue-500' :
                          index() === (store.selectedPath()?.nodes.length || 0) - 1 ? 'bg-green-500' :
                          ''
                        }`}
                        style={{
                          'background-color': index() > 0 && index() < (store.selectedPath()?.nodes.length || 0) - 1
                            ? getRiskLevelColor(node.riskLevel)
                            : undefined
                        }}
                        title={`节点 ${node.nodeId} - ${getRiskLevelText(node.riskLevel)}`}
                      />
                    )}
                  </For>
                </div>
              </div>
            </div>
          )}
        </main>

        <aside class="w-72 bg-slate-900 border-l border-slate-800 flex flex-col overflow-hidden">
          <div class="p-4 border-b border-slate-800">
            <h3 class="text-sm font-semibold text-slate-300 mb-3">实时数据面板</h3>
            <div class="space-y-3">
              <div class="bg-slate-800 rounded-lg p-3">
                <div class="text-xs text-slate-500 mb-1">烟雾浓度图例</div>
                <div class="space-y-1">
                  <For each={[
                    { level: 0, color: '#22c55e', label: '安全 (<10%)' },
                    { level: 1, color: '#84cc16', label: '低风险 (10-30%)' },
                    { level: 2, color: '#eab308', label: '中风险 (30-50%)' },
                    { level: 3, color: '#f97316', label: '高风险 (50-70%)' },
                    { level: 4, color: '#ef4444', label: '极危险 (>70%)' }
                  ]}>
                    {(item) => (
                      <div class="flex items-center gap-2 text-xs">
                        <span class="w-3 h-3 rounded" style={{ 'background-color': item.color }}></span>
                        <span class="text-slate-400">{item.label}</span>
                      </div>
                    )}
                  </For>
                </div>
              </div>

              <div class="bg-slate-800 rounded-lg p-3">
                <div class="text-xs text-slate-500 mb-2">疏散统计</div>
                <div class="space-y-2">
                  <div class="flex justify-between text-sm">
                    <span class="text-slate-400">总人数</span>
                    <span class="text-white">{store.evacuationStatus().totalPopulation}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-slate-400">已疏散</span>
                    <span class="text-green-400">{store.evacuationStatus().evacuatedCount}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-slate-400">被困</span>
                    <span class="text-red-400">{store.evacuationStatus().trappedCount}</span>
                  </div>
                  <div class="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      class="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500"
                      style={{
                        width: `${(store.evacuationStatus().evacuatedCount / store.evacuationStatus().totalPopulation) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex-1 overflow-auto p-4">
            <h3 class="text-sm font-semibold text-slate-300 mb-3">节点图例</h3>
            <div class="space-y-2 text-sm">
              <div class="flex items-center gap-2">
                <span class="text-lg">🚪</span>
                <span class="text-slate-400">安全出口</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-lg">🪜</span>
                <span class="text-slate-400">楼梯间</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-lg">🛗</span>
                <span class="text-slate-400">电梯 (火灾禁用)</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-lg">🏠</span>
                <span class="text-slate-400">房间/商铺</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-lg">➡️</span>
                <span class="text-slate-400">走廊节点</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-lg">🔀</span>
                <span class="text-slate-400">交叉路口</span>
              </div>
            </div>

            <div class="mt-6 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div class="text-xs text-blue-400 font-medium mb-1">💡 操作提示</div>
              <div class="text-xs text-slate-400 space-y-1">
                <p>• 点击「触发紧急状态」开始模拟</p>
                <p>• 点击地图节点计算疏散路径</p>
                <p>• 滚轮缩放，拖拽平移地图</p>
                <p>• 绿色路径为推荐安全路线</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
