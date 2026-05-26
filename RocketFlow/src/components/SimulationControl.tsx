import { Component, createSignal, For } from 'solid-js'
import { state, simulationActions } from '@/store/useSimulationStore'
import { FAULT_TEMPLATES } from '@/types'
import type { FaultType } from '@/types'
import { Settings, Zap, AlertTriangle, Gauge, Play, Pause, RotateCcw, X, ToggleLeft, ToggleRight } from 'lucide-solid'

export const SimulationControl: Component<{ isExpanded?: boolean }> = () => {
  const [showFaultPanel, setShowFaultPanel] = createSignal(false)
  const [showConfig, setShowConfig] = createSignal(false)
  const [showActiveFaults, setShowActiveFaults] = createSignal(false)

  const speedOptions = [
    { value: 0.25, label: '0.25x' },
    { value: 0.5, label: '0.5x' },
    { value: 1, label: '1x' },
    { value: 2, label: '2x' },
    { value: 4, label: '4x' },
    { value: 8, label: '8x' },
    { value: 16, label: '16x' }
  ]

  const faultTypes = Object.entries(FAULT_TEMPLATES) as [FaultType, typeof FAULT_TEMPLATES[FaultType]][]

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-400 bg-red-500/20'
      case 'ERROR': return 'text-orange-400 bg-orange-500/20'
      case 'WARNING': return 'text-yellow-400 bg-yellow-500/20'
      default: return 'text-blue-400 bg-blue-500/20'
    }
  }

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
  }

  return (
    <div class="space-y-3">
      <div class="panel p-4">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <Settings class="w-4 h-4 text-lox-blue" />
            <span class="text-sm font-bold text-lox-blue">仿真控制</span>
          </div>
          <div class="flex items-center gap-1">
            <button
              onClick={() => setShowActiveFaults(!showActiveFaults())}
              class={`p-1.5 rounded transition-all ${
                showActiveFaults() ? 'bg-lox-blue/30 text-lox-blue' : 'hover:bg-white/10 text-gray-400'
              }`}
              title="活跃故障"
            >
              <AlertTriangle class="w-4 h-4" />
              {state.activeFaults.length > 0 && (
                <span class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white">
                  {state.activeFaults.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowFaultPanel(!showFaultPanel())}
              class={`p-1.5 rounded transition-all ${
                showFaultPanel() ? 'bg-lox-blue/30 text-lox-blue' : 'hover:bg-white/10 text-gray-400'
              }`}
              title="故障注入"
            >
              <Zap class="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowConfig(!showConfig())}
              class={`p-1.5 rounded transition-all ${
                showConfig() ? 'bg-lox-blue/30 text-lox-blue' : 'hover:bg-white/10 text-gray-400'
              }`}
              title="仿真配置"
            >
              <Gauge class="w-4 h-4" />
            </button>
          </div>
        </div>

        <div class="mb-3">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-gray-400">仿真速度</span>
            <span class="text-xs font-mono text-lox-blue">{state.config.simulationSpeed.toFixed(2)}x</span>
          </div>
          <div class="flex flex-wrap gap-1">
            <For each={speedOptions}>
              {(opt) => (
                <button
                  onClick={() => simulationActions.setSimulationSpeed(opt.value)}
                  class={`px-2 py-1 text-xs rounded transition-all ${
                    state.config.simulationSpeed === opt.value
                      ? 'bg-lox-blue text-white'
                      : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50'
                  }`}
                >
                  {opt.label}
                </button>
              )}
            </For>
          </div>
        </div>

        <div class="flex items-center justify-between text-xs text-gray-400">
          <span>已运行时间</span>
          <span class="font-mono text-lox-blue">{formatTime(state.elapsedTime)}</span>
        </div>
        <div class="flex items-center justify-between text-xs text-gray-400 mt-1">
          <span>数据点数</span>
          <span class="font-mono text-gray-300">{state.elapsedTime > 0 ? Math.floor(state.elapsedTime / 50) : 0}</span>
        </div>
        {state.sessionId && (
          <div class="flex items-center justify-between text-xs text-gray-400 mt-1">
            <span>会话ID</span>
            <span class="font-mono text-gray-300">#{state.sessionId}</span>
          </div>
        )}
      </div>

      {showActiveFaults() && state.activeFaults.length > 0 && (
        <div class="panel p-4">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <AlertTriangle class="w-4 h-4 text-red-400" />
              <span class="text-sm font-bold text-red-400">活跃故障 ({state.activeFaults.length})</span>
            </div>
            <button
              onClick={() => simulationActions.clearAllFaults()}
              class="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-all"
            >
              全部清除
            </button>
          </div>
          <div class="space-y-2 max-h-40 overflow-y-auto">
            <For each={state.activeFaults}>
              {(fault) => {
                const remaining = Math.max(0, fault.endTime - Date.now())
                const progress = 1 - remaining / fault.config.duration
                return (
                  <div class="p-2 bg-space-deep rounded border border-gray-700">
                    <div class="flex items-center justify-between">
                      <span class={`text-xs px-1.5 py-0.5 rounded ${getSeverityColor(fault.config.severity)}`}>
                        {fault.config.name}
                      </span>
                      <button
                        onClick={() => simulationActions.clearFault(fault.id)}
                        class="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white"
                      >
                        <X class="w-3 h-3" />
                      </button>
                    </div>
                    <p class="text-xs text-gray-400 mt-1">{fault.config.description}</p>
                    <div class="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        class="h-full bg-red-500 transition-all"
                        style={{ width: `${progress * 100}%` }}
                      />
                    </div>
                    <div class="text-right text-[10px] text-gray-500 mt-1 font-mono">
                      剩余 {Math.ceil(remaining / 1000)}s
                    </div>
                  </div>
                )
              }}
            </For>
          </div>
        </div>
      )}

      {showFaultPanel() && (
        <div class="panel p-4">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <Zap class="w-4 h-4 text-warning-yellow" />
              <span class="text-sm font-bold text-warning-yellow">故障注入</span>
            </div>
          </div>
          <div class="space-y-2 max-h-60 overflow-y-auto">
            <For each={faultTypes}>
              {([type, config]) => (
                <div class="p-2 bg-space-deep rounded border border-gray-700 hover:border-warning-yellow/50 transition-all">
                  <div class="flex items-center justify-between">
                    <div>
                      <span class={`text-xs px-1.5 py-0.5 rounded ${getSeverityColor(config.severity)}`}>
                        {config.name}
                      </span>
                      <p class="text-xs text-gray-400 mt-1">{config.description}</p>
                      <div class="flex gap-2 mt-1 text-[10px] text-gray-500">
                        <span>强度: {(config.intensity * 100).toFixed(0)}%</span>
                        <span>持续: {config.duration / 1000}s</span>
                      </div>
                    </div>
                    <button
                      onClick={() => simulationActions.injectFault(type)}
                      class="px-2 py-1 bg-warning-yellow/20 text-warning-yellow text-xs rounded hover:bg-warning-yellow/30 transition-all"
                      disabled={state.currentPhase === 'EMERGENCY_STOP'}
                    >
                      注入
                    </button>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      )}

      {showConfig() && (
        <div class="panel p-4">
          <div class="flex items-center gap-2 mb-3">
            <Gauge class="w-4 h-4 text-lox-blue" />
            <span class="text-sm font-bold text-lox-blue">仿真配置</span>
          </div>
          <div class="space-y-3">
            <button
              onClick={() => simulationActions.updateConfig({ autoAdvancePhase: !state.config.autoAdvancePhase })}
              class="w-full flex items-center justify-between p-2 bg-space-deep rounded hover:bg-white/5 transition-all"
            >
              <div class="text-left">
                <div class="text-sm text-white">自动阶段推进</div>
                <div class="text-xs text-gray-500">根据参数条件自动切换加注阶段</div>
              </div>
              {state.config.autoAdvancePhase ? (
                <ToggleRight class="w-6 h-6 text-green-400" />
              ) : (
                <ToggleLeft class="w-6 h-6 text-gray-500" />
              )}
            </button>

            <button
              onClick={() => simulationActions.updateConfig({ autoValveControl: !state.config.autoValveControl })}
              class="w-full flex items-center justify-between p-2 bg-space-deep rounded hover:bg-white/5 transition-all"
            >
              <div class="text-left">
                <div class="text-sm text-white">自动阀门控制</div>
                <div class="text-xs text-gray-500">根据阶段自动开关阀门</div>
              </div>
              {state.config.autoValveControl ? (
                <ToggleRight class="w-6 h-6 text-green-400" />
              ) : (
                <ToggleLeft class="w-6 h-6 text-gray-500" />
              )}
            </button>

            <button
              onClick={() => simulationActions.updateConfig({ enableFaultInjection: !state.config.enableFaultInjection })}
              class="w-full flex items-center justify-between p-2 bg-space-deep rounded hover:bg-white/5 transition-all"
            >
              <div class="text-left">
                <div class="text-sm text-white">自动故障注入</div>
                <div class="text-xs text-gray-500">随机触发故障模拟真实场景</div>
              </div>
              {state.config.enableFaultInjection ? (
                <ToggleRight class="w-6 h-6 text-green-400" />
              ) : (
                <ToggleLeft class="w-6 h-6 text-gray-500" />
              )}
            </button>

            <div class="p-2 bg-space-deep rounded">
              <div class="flex items-center justify-between mb-2">
                <div class="text-sm text-white">故障概率</div>
                <span class="text-xs font-mono text-warning-yellow">{(state.config.faultProbability * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={state.config.faultProbability}
                onInput={(e) => simulationActions.updateConfig({ faultProbability: parseFloat(e.currentTarget.value) })}
                class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-warning-yellow"
              />
              <div class="flex justify-between text-[10px] text-gray-500 mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            <div class="p-2 bg-space-deep rounded">
              <div class="flex items-center justify-between mb-2">
                <div class="text-sm text-white">目标仿真时长</div>
                <span class="text-xs font-mono text-gray-400">{(state.config.targetDuration / 60000).toFixed(0)} 分钟</span>
              </div>
              <input
                type="range"
                min="60000"
                max="1200000"
                step="60000"
                value={state.config.targetDuration}
                onInput={(e) => simulationActions.updateConfig({ targetDuration: parseInt(e.currentTarget.value) })}
                class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-lox-blue"
              />
              <div class="flex justify-between text-[10px] text-gray-500 mt-1">
                <span>1min</span>
                <span>10min</span>
                <span>20min</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div class="panel p-4">
        <div class="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              if (!state.isRunning) {
                simulationActions.start()
              } else if (state.isPaused) {
                simulationActions.resume()
              } else {
                simulationActions.pause()
              }
            }}
            class={`flex items-center justify-center gap-2 px-3 py-2 rounded transition-all ${
              state.isRunning && !state.isPaused
                ? 'bg-warning-yellow/20 text-warning-yellow border border-warning-yellow/50 hover:bg-warning-yellow/30'
                : 'bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30'
            }`}
            disabled={state.currentPhase === 'EMERGENCY_STOP'}
          >
            {state.isRunning && !state.isPaused ? (
              <><Pause class="w-4 h-4" /> 暂停</>
            ) : (
              <><Play class="w-4 h-4" /> {state.isRunning ? '继续' : '开始'}</>
            )}
          </button>
          <button
            onClick={() => simulationActions.reset()}
            class="flex items-center justify-center gap-2 px-3 py-2 bg-gray-700/50 text-gray-300 border border-gray-600 rounded hover:bg-gray-600/50 transition-all"
          >
            <RotateCcw class="w-4 h-4" /> 重置
          </button>
        </div>
      </div>
    </div>
  )
}
