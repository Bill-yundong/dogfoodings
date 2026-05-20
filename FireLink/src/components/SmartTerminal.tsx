import { For, createMemo, createSignal, createEffect } from 'solid-js'
import { useSystemStore } from '@/context/SystemContext'
import FloorMap from './FloorMap'
import { getRiskLevelText, getRiskLevelColor } from '@/services/smokeSimulation'
import { buildingFloors, getAllNodes } from '@/data/buildingData'

export default function SmartTerminal() {
  const store = useSystemStore()
  const [selectedStartNode, setSelectedStartNode] = createSignal<string | null>(null)
  const [isCalculating, setIsCalculating] = createSignal(false)
  const [showInstructions, setShowInstructions] = createSignal(false)

  const currentSmokeField = createMemo(() => {
    return store.smokeFields().get(store.selectedFloor())
  })

  const availableNodes = createMemo(() => {
    return getAllNodes().filter(n => n.floor === store.selectedFloor())
  })

  const currentFloorRisk = createMemo(() => {
    const field = store.smokeFields().get(store.selectedFloor())
    if (!field || field.points.length === 0) return 0
    const maxConcentration = Math.max(...field.points.map(p => p.concentration))
    return maxConcentration < 10 ? 0 : maxConcentration < 30 ? 1 : maxConcentration < 50 ? 2 : maxConcentration < 70 ? 3 : 4
  })

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}分${secs}秒` : `${secs}秒`
  }

  const handleNodeClick = (nodeId: string) => {
    if (!store.systemState().isEmergency) return
    setSelectedStartNode(nodeId)
  }

  const handleCalculatePath = async () => {
    if (!selectedStartNode()) return

    setIsCalculating(true)
    try {
      const path = await store.calculateEvacuationPath(selectedStartNode()!)
      if (path) {
        store.setSelectedPath(path)
        setShowInstructions(true)
      }
    } finally {
      setIsCalculating(false)
    }
  }

  const getTurnDirection = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const angle = Math.atan2(dy, dx) * 180 / Math.PI

    if (angle > -22.5 && angle <= 22.5) return '向右'
    if (angle > 22.5 && angle <= 67.5) return '向右下方'
    if (angle > 67.5 && angle <= 112.5) return '向下'
    if (angle > 112.5 && angle <= 157.5) return '向左下方'
    if (angle > 157.5 || angle <= -157.5) return '向左'
    if (angle > -157.5 && angle <= -112.5) return '向左上方'
    if (angle > -112.5 && angle <= -67.5) return '向上'
    return '向右上方'
  }

  const getStepIcon = (index: number, total: number) => {
    if (index === 0) return '📍'
    if (index === total - 1) return '🏁'
    return '👣'
  }

  createEffect(() => {
    if (store.selectedPath()) {
      const startFloor = store.selectedPath()?.nodes[0]?.floor
      if (startFloor && startFloor !== store.selectedFloor()) {
        store.setSelectedFloor(startFloor)
      }
    }
  })

  return (
    <div class="h-full flex flex-col bg-slate-950">
      <header class="bg-slate-900 border-b border-slate-800 px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <span class="text-2xl">📱</span>
              <h1 class="text-xl font-bold text-white">智能疏散导引终端</h1>
            </div>
            <div class={`px-3 py-1 rounded-full text-sm font-medium ${
              store.systemState().isEmergency
                ? 'bg-red-500/20 text-red-400 animate-pulse'
                : 'bg-green-500/20 text-green-400'
            }`}>
              {store.systemState().isEmergency ? '⚠️ 紧急疏散' : '✓ 安全'}
            </div>
            {store.systemState().powerStatus === 'critical' && (
              <div class="px-3 py-1 rounded-full text-sm font-medium bg-amber-500/20 text-amber-400 animate-pulse">
                ⚡ 断电模式
              </div>
            )}
          </div>

          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2 text-sm text-slate-400">
              <span class={`w-2 h-2 rounded-full ${
                store.systemState().isOfflineMode ? 'bg-amber-500' : 'bg-green-500'
              }`}></span>
              {store.systemState().isOfflineMode ? '本地运行' : '已连接'}
            </div>
            <button
              onClick={() => store.setUserMode('monitor')}
              class="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white transition-colors"
            >
              返回监控中心
            </button>
          </div>
        </div>
      </header>

      <div class="flex-1 flex overflow-hidden">
        <main class="flex-1 flex flex-col overflow-hidden">
          <div class="p-4 bg-slate-900/50 border-b border-slate-800">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold text-white">
                  {buildingFloors.find(f => f.floor === store.selectedFloor())?.name || '楼层地图'}
                </h2>
                <p class="text-sm text-slate-400">
                  {!store.systemState().isEmergency
                    ? '当前无紧急情况，系统处于待机状态'
                    : !selectedStartNode()
                    ? '请在地图上选择您当前的位置'
                    : !store.selectedPath()
                    ? '已选择起点，点击「计算逃生路线」获取指引'
                    : '已生成逃生路线，请按照指示行动'}
                </p>
              </div>
              <div class="flex items-center gap-3">
                <div class={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  currentFloorRisk() === 0 ? 'bg-green-500/20 text-green-400' :
                  currentFloorRisk() === 1 ? 'bg-lime-500/20 text-lime-400' :
                  currentFloorRisk() === 2 ? 'bg-yellow-500/20 text-yellow-400' :
                  currentFloorRisk() === 3 ? 'bg-orange-500/20 text-orange-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {getRiskLevelText(currentFloorRisk())}
                </div>
                <select
                  value={store.selectedFloor()}
                  onChange={(e) => store.setSelectedFloor(Number(e.target.value))}
                  class="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <For each={buildingFloors}>
                    {(floor) => (
                      <option value={floor.floor}>{floor.name}</option>
                    )}
                  </For>
                </select>
              </div>
            </div>
          </div>

          <div class="flex-1 p-4">
            <FloorMap
              floor={store.selectedFloor()}
              smokeField={currentSmokeField()}
              selectedPath={store.selectedPath()}
              onNodeClick={handleNodeClick}
              showSmoke={store.systemState().isEmergency}
              showPaths={true}
              interactive={true}
            />
          </div>

          <div class="p-4 bg-slate-900 border-t border-slate-800">
            <div class="flex items-center gap-4">
              <div class="flex-1">
                <div class="text-sm text-slate-400 mb-1">当前选择</div>
                <div class="text-white font-medium">
                  {selectedStartNode() || '未选择'}
                </div>
              </div>
              <button
                onClick={handleCalculatePath}
                disabled={!selectedStartNode() || !store.systemState().isEmergency || isCalculating()}
                class="px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors flex items-center gap-2"
              >
                {isCalculating() ? (
                  <>
                    <span class="animate-spin">⚙️</span>
                    计算中...
                  </>
                ) : (
                  <>
                    🧭 计算逃生路线
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  store.setSelectedPath(null)
                  setSelectedStartNode(null)
                  setShowInstructions(false)
                }}
                class="px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
              >
                重置
              </button>
            </div>
          </div>
        </main>

        <aside class="w-96 bg-slate-900 border-l border-slate-800 flex flex-col overflow-hidden">
          {store.systemState().isEmergency ? (
            <>
              {store.selectedPath() ? (
                <div class="flex-1 flex flex-col overflow-hidden">
                  <div class="p-4 border-b border-slate-800 bg-green-500/10">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="text-xl">✅</span>
                      <h3 class="text-lg font-semibold text-green-400">逃生路线已生成</h3>
                    </div>
                    <div class="grid grid-cols-2 gap-3 text-sm">
                      <div class="bg-slate-800 rounded-lg p-3">
                        <div class="text-slate-500 mb-1">总距离</div>
                        <div class="text-white text-lg font-semibold">{store.selectedPath()?.totalDistance}米</div>
                      </div>
                      <div class="bg-slate-800 rounded-lg p-3">
                        <div class="text-slate-500 mb-1">预计时间</div>
                        <div class="text-white text-lg font-semibold">
                          {formatTime(store.selectedPath()?.estimatedTime || 0)}
                        </div>
                      </div>
                      <div class="bg-slate-800 rounded-lg p-3">
                        <div class="text-slate-500 mb-1">风险等级</div>
                        <div
                          class="text-lg font-semibold"
                          style={{ color: getRiskLevelColor(store.selectedPath()?.isStable ? 0 : 2) }}
                        >
                          {store.selectedPath()?.isStable ? '安全路线' : '注意风险'}
                        </div>
                      </div>
                      <div class="bg-slate-800 rounded-lg p-3">
                        <div class="text-slate-500 mb-1">经过节点</div>
                        <div class="text-white text-lg font-semibold">{store.selectedPath()?.nodes.length}个</div>
                      </div>
                    </div>
                  </div>

                  <div class="flex-1 overflow-auto p-4">
                    <div class="flex items-center justify-between mb-3">
                      <h3 class="text-sm font-semibold text-slate-300">步行指引</h3>
                      <button
                        onClick={() => setShowInstructions(!showInstructions())}
                        class="text-xs text-blue-400 hover:text-blue-300"
                      >
                        {showInstructions() ? '收起' : '展开详情'}
                      </button>
                    </div>

                    <div class="space-y-3">
                      <For each={store.selectedPath()?.nodes || []}>
                        {(node, index) => {
                          const nodes = store.selectedPath()?.nodes || []
                          const nextNode = nodes[index() + 1]
                          const isStart = index() === 0
                          const isEnd = index() === nodes.length - 1

                          return (
                            <div
                              class={`flex gap-3 ${!isEnd ? 'pb-3' : ''} ${
                                showInstructions() ? '' : 'first:only-child'
                              }`}
                            >
                              <div class="flex flex-col items-center">
                                <div
                                  class={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                    isStart ? 'bg-blue-500 text-white' :
                                    isEnd ? 'bg-green-500 text-white' :
                                    'bg-slate-700 text-slate-300'
                                  }`}
                                  style={{
                                    'background-color': !isStart && !isEnd
                                      ? getRiskLevelColor(node.riskLevel)
                                      : undefined
                                  }}
                                >
                                  {index() + 1}
                                </div>
                                {!isEnd && (
                                  <div class="w-0.5 flex-1 bg-slate-700 mt-1"></div>
                                )}
                              </div>
                              <div class="flex-1">
                                <div class="flex items-center gap-2">
                                  <span>{getStepIcon(index(), nodes.length)}</span>
                                  <span class="text-white font-medium">
                                    {isStart ? '您的位置' : isEnd ? '安全出口' : node.nodeId}
                                  </span>
                                  {node.riskLevel > 1 && (
                                    <span class="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">
                                      ⚠️ 高风险
                                    </span>
                                  )}
                                </div>
                                {showInstructions() && nextNode && (
                                  <div class="mt-1 text-sm text-slate-400">
                                    {getTurnDirection(node.position, nextNode.position)}前行，
                                    约 {Math.round(Math.sqrt(
                                      Math.pow(nextNode.position.x - node.position.x, 2) +
                                      Math.pow(nextNode.position.y - node.position.y, 2)
                                    ))} 米
                                  </div>
                                )}
                                {showInstructions() && node.floor !== store.selectedFloor() && (
                                  <div class="mt-1 text-sm text-amber-400">
                                    🔄 前往 {node.floor} 层
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        }}
                      </For>
                    </div>
                  </div>

                  <div class="p-4 border-t border-slate-800 bg-red-500/5">
                    <div class="flex items-start gap-3">
                      <span class="text-xl">⚠️</span>
                      <div>
                        <div class="text-sm font-medium text-red-400 mb-1">安全提示</div>
                        <div class="text-xs text-slate-400 space-y-1">
                          <p>• 请保持冷静，按照指引路线有序撤离</p>
                          <p>• 用湿毛巾捂住口鼻，低姿态前行</p>
                          <p>• 遇到烟雾时，请尽量贴近地面</p>
                          <p>• 请勿乘坐电梯，使用楼梯疏散</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div class="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <div class="text-6xl mb-4">🧭</div>
                  <h3 class="text-xl font-semibold text-white mb-2">选择您的位置</h3>
                  <p class="text-slate-400 mb-6 max-w-xs">
                    在左侧地图上点击您当前所在的位置节点，系统将为您计算最优逃生路线
                  </p>
                  <div class="flex flex-wrap gap-2 justify-center">
                    <For each={availableNodes().slice(0, 8)}>
                      {(node) => (
                        <button
                          onClick={() => handleNodeClick(node.id)}
                          class={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                            selectedStartNode() === node.id
                              ? 'bg-blue-500 text-white'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {node.name || node.id}
                        </button>
                      )}
                    </For>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div class="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div class="text-6xl mb-4">✅</div>
              <h3 class="text-xl font-semibold text-white mb-2">系统正常</h3>
              <p class="text-slate-400 mb-6 max-w-xs">
                当前无紧急情况发生。如遇火灾，请立即按下报警按钮或通知工作人员。
              </p>
              <div class="w-full max-w-sm space-y-4">
                <button
                  onClick={() => store.triggerEmergency()}
                  class="w-full py-3 bg-red-500 hover:bg-red-600 rounded-lg text-white font-medium transition-colors"
                >
                  🚨 模拟紧急状态
                </button>
                <div class="bg-slate-800 rounded-lg p-4 text-left">
                  <div class="text-sm font-medium text-slate-300 mb-2">紧急联络</div>
                  <div class="space-y-1 text-xs text-slate-400">
                    <p>📞 火警电话: 119</p>
                    <p>🏥 急救电话: 120</p>
                    <p>👮 报警电话: 110</p>
                    <p>🏢 物业值班: 400-XXX-XXXX</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
