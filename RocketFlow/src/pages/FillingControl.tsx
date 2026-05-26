import { Component, createEffect, createSignal, For } from 'solid-js'
import { state, simulationActions } from '@/store/useSimulationStore'
import { stateSync } from '@/store/stateSync'
import { ValveControl } from '@/components/ValveControl'
import { TrendChart } from '@/components/TrendChart'
import { GaugeCard } from '@/components/GaugeCard'
import { waveformManager } from '@/db/timeSeries'
import { formatFlowRate, formatPressure, formatPercent } from '@/utils/format'
import { FILLING_PHASE_CONFIG } from '@/types'
import { Settings, Sliders, Clock, Zap } from 'lucide-solid'

export const FillingControl: Component = () => {
  const [o2FlowData, setO2FlowData] = createSignal<{ x: number[], y: number[] }>({ x: [], y: [] })
  const [h2FlowData, setH2FlowData] = createSignal<{ x: number[], y: number[] }>({ x: [], y: [] })
  const [o2LevelData, setO2LevelData] = createSignal<{ x: number[], y: number[] }>({ x: [], y: [] })
  const [h2LevelData, setH2LevelData] = createSignal<{ x: number[], y: number[] }>({ x: [], y: [] })
  
  const [o2TargetRate, setO2TargetRate] = createSignal(FILLING_PHASE_CONFIG.PRECOOLING.oxygenFlowRate)
  const [h2TargetRate, setH2TargetRate] = createSignal(FILLING_PHASE_CONFIG.PRECOOLING.hydrogenFlowRate)
  const [o2TargetLevel, setO2TargetLevel] = createSignal(98)
  const [h2TargetLevel, setH2TargetLevel] = createSignal(98)
  
  stateSync.registerModule('control', ['oxygenFlowRate', 'hydrogenFlowRate', 'oxygenFillLevel', 'hydrogenFillLevel', 'waterHammerRisk'])
  
  createEffect(() => {
    const o2Flow = waveformManager.getWaveformData('oxygenFlowRate')
    const h2Flow = waveformManager.getWaveformData('hydrogenFlowRate')
    const o2Level = waveformManager.getWaveformData('oxygenFillLevel')
    const h2Level = waveformManager.getWaveformData('hydrogenFillLevel')
    
    if (o2Flow.x.length > 0) setO2FlowData(o2Flow)
    if (h2Flow.x.length > 0) setH2FlowData(h2Flow)
    if (o2Level.x.length > 0) setO2LevelData(o2Level)
    if (h2Level.x.length > 0) setH2LevelData(h2Level)
  })
  
  const handleValveToggle = (id: string, newState: 'OPEN' | 'CLOSED' | 'TRANSITIONING') => {
    simulationActions.setValveState(id, newState)
    
    simulationActions.addEvent(
      'VALVE_OPERATION',
      'INFO',
      `阀门 ${id} 已${newState === 'OPEN' ? '打开' : '关闭'}`,
      { valveId: id as any, state: newState as any }
    )
  }
  
  const handleO2RateChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    const value = parseFloat(target.value)
    setO2TargetRate(value)
    simulationActions.setOxygenFlowRate(value)
    stateSync.updateParam('oxygenFlowRate', value)
  }
  
  const handleH2RateChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    const value = parseFloat(target.value)
    setH2TargetRate(value)
    simulationActions.setHydrogenFlowRate(value)
    stateSync.updateParam('hydrogenFlowRate', value)
  }
  
  const handleO2LevelChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    const value = parseFloat(target.value)
    setO2TargetLevel(value)
    simulationActions.updateOxygen({ targetLevel: value })
  }
  
  const handleH2LevelChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    const value = parseFloat(target.value)
    setH2TargetLevel(value)
    simulationActions.updateHydrogen({ targetLevel: value })
  }
  
  const applyPhasePreset = (phase: keyof typeof FILLING_PHASE_CONFIG) => {
    const config = FILLING_PHASE_CONFIG[phase]
    setO2TargetRate(config.oxygenFlowRate)
    setH2TargetRate(config.hydrogenFlowRate)
    simulationActions.setOxygenFlowRate(config.oxygenFlowRate)
    simulationActions.setHydrogenFlowRate(config.hydrogenFlowRate)
    simulationActions.setPhase(phase)
    
    if (config.oxygenFlowRate > 0) {
      simulationActions.setValveState('V-O2-001', 'OPEN')
      simulationActions.setValveState('V-O2-002', 'OPEN')
    }
    if (config.hydrogenFlowRate > 0) {
      simulationActions.setValveState('V-H2-001', 'OPEN')
      simulationActions.setValveState('V-H2-002', 'OPEN')
    }
  }
  
  const oxygenValves = () => state.valves.filter(v => v.line === 'OXYGEN')
  const hydrogenValves = () => state.valves.filter(v => v.line === 'HYDROGEN')
  
  const phaseProgress = () => {
    const phases = ['IDLE', 'PRECOOLING', 'SLOW_FILL', 'FAST_FILL', 'TOP_OFF', 'PRESSURIZING', 'READY']
    const currentIndex = phases.indexOf(state.currentPhase)
    return (currentIndex / (phases.length - 1)) * 100
  }
  
  return (
    <div class="h-full flex flex-col bg-space-deep text-white overflow-hidden">
      <div class="absolute inset-0 noise pointer-events-none opacity-30" />
      <div class="absolute inset-0 grid-bg pointer-events-none" />
      
      <header class="relative z-10 px-6 py-3 bg-space-blue/50 backdrop-blur-sm border-b border-space-blue">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <Settings class="w-6 h-6 text-lox-blue" />
            <h1 class="text-xl font-bold font-orbitron tracking-wider text-lox-blue">
              加注控制中心
            </h1>
          </div>
          
          <div class="flex items-center gap-6">
            <div class="flex items-center gap-2">
              <Clock class="w-4 h-4 text-gray-400" />
              <span class="text-sm font-jetbrains text-gray-400">
                阶段进度: {phaseProgress().toFixed(0)}%
              </span>
            </div>
            <div class="w-32 h-2 bg-space-deep rounded-full overflow-hidden">
              <div 
                class="h-full bg-lox-blue transition-all duration-500 rounded-full"
                style={{ width: `${phaseProgress()}%` }}
              />
            </div>
          </div>
        </div>
      </header>
      
      <main class="flex-1 relative z-10 p-4 overflow-auto">
        <div class="grid grid-cols-12 gap-4">
          <div class="col-span-3 flex flex-col gap-4">
            <div class="panel p-4">
              <h3 class="text-sm font-orbitron text-lox-blue mb-4 flex items-center gap-2">
                <Zap class="w-4 h-4" /> 阶段预设
              </h3>
              <div class="grid grid-cols-2 gap-2">
                <For each={(['PRECOOLING', 'SLOW_FILL', 'FAST_FILL', 'TOP_OFF', 'PRESSURIZING'] as const)}>
                  {(phase) => (
                    <button
                      onClick={() => applyPhasePreset(phase)}
                      class={`px-3 py-2 text-xs font-jetbrains rounded-lg transition-all ${
                        state.currentPhase === phase
                          ? 'bg-lox-blue text-space-deep font-bold'
                          : 'bg-space-deep text-gray-400 hover:bg-lox-blue/20 hover:text-lox-blue'
                      }`}
                    >
                      {FILLING_PHASE_CONFIG[phase].name}
                    </button>
                  )}
                </For>
              </div>
            </div>
            
            <div class="panel p-4">
              <h3 class="text-sm font-orbitron text-lox-blue mb-4">氧路参数设置</h3>
              
              <div class="space-y-4">
                <div>
                  <div class="flex justify-between text-xs font-jetbrains mb-1">
                    <span class="text-gray-400">目标加注速率</span>
                    <span class="text-lox-blue">{o2TargetRate().toFixed(1)} kg/s</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="0.1"
                    value={o2TargetRate()}
                    onInput={handleO2RateChange}
                    class="w-full h-2 bg-space-deep rounded-lg appearance-none cursor-pointer accent-lox-blue"
                  />
                  <div class="flex justify-between text-xs text-gray-600 font-jetbrains mt-1">
                    <span>0</span>
                    <span>7.5</span>
                    <span>15</span>
                  </div>
                </div>
                
                <div>
                  <div class="flex justify-between text-xs font-jetbrains mb-1">
                    <span class="text-gray-400">目标液位</span>
                    <span class="text-lox-blue">{o2TargetLevel().toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    step="1"
                    value={o2TargetLevel()}
                    onInput={handleO2LevelChange}
                    class="w-full h-2 bg-space-deep rounded-lg appearance-none cursor-pointer accent-lox-blue"
                  />
                </div>
                
                <div class="grid grid-cols-2 gap-2">
                  <div class="bg-space-deep p-2 rounded">
                    <div class="text-xs text-gray-500 font-jetbrains">当前液位</div>
                    <div class="text-lg font-bold font-jetbrains text-lox-blue">
                      {formatPercent(state.oxygen.fillLevel)}%
                    </div>
                  </div>
                  <div class="bg-space-deep p-2 rounded">
                    <div class="text-xs text-gray-500 font-jetbrains">当前流量</div>
                    <div class="text-lg font-bold font-jetbrains text-lox-blue">
                      {formatFlowRate(state.oxygen.flowRate)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="panel p-4">
              <h3 class="text-sm font-orbitron text-lh2-cyan mb-4">氢路参数设置</h3>
              
              <div class="space-y-4">
                <div>
                  <div class="flex justify-between text-xs font-jetbrains mb-1">
                    <span class="text-gray-400">目标加注速率</span>
                    <span class="text-lh2-cyan">{h2TargetRate().toFixed(1)} kg/s</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.1"
                    value={h2TargetRate()}
                    onInput={handleH2RateChange}
                    class="w-full h-2 bg-space-deep rounded-lg appearance-none cursor-pointer accent-lh2-cyan"
                  />
                  <div class="flex justify-between text-xs text-gray-600 font-jetbrains mt-1">
                    <span>0</span>
                    <span>5</span>
                    <span>10</span>
                  </div>
                </div>
                
                <div>
                  <div class="flex justify-between text-xs font-jetbrains mb-1">
                    <span class="text-gray-400">目标液位</span>
                    <span class="text-lh2-cyan">{h2TargetLevel().toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    step="1"
                    value={h2TargetLevel()}
                    onInput={handleH2LevelChange}
                    class="w-full h-2 bg-space-deep rounded-lg appearance-none cursor-pointer accent-lh2-cyan"
                  />
                </div>
                
                <div class="grid grid-cols-2 gap-2">
                  <div class="bg-space-deep p-2 rounded">
                    <div class="text-xs text-gray-500 font-jetbrains">当前液位</div>
                    <div class="text-lg font-bold font-jetbrains text-lh2-cyan">
                      {formatPercent(state.hydrogen.fillLevel)}%
                    </div>
                  </div>
                  <div class="bg-space-deep p-2 rounded">
                    <div class="text-xs text-gray-500 font-jetbrains">当前流量</div>
                    <div class="text-lg font-bold font-jetbrains text-lh2-cyan">
                      {formatFlowRate(state.hydrogen.flowRate)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="col-span-6 flex flex-col gap-4">
            <div class="panel p-4">
              <h3 class="text-sm font-orbitron text-white mb-4 flex items-center gap-2">
                <Sliders class="w-4 h-4" /> 阀门控制
              </h3>
              
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <h4 class="text-xs font-orbitron text-lox-blue mb-2">氧路阀门</h4>
                  <div class="space-y-2">
                    <For each={oxygenValves()}>
                      {(valve) => (
                        <ValveControl
                          id={valve.id}
                          name={valve.name}
                          state={valve.state}
                          line="OXYGEN"
                          onToggle={handleValveToggle}
                          disabled={!state.isRunning || state.isPaused}
                        />
                      )}
                    </For>
                  </div>
                </div>
                
                <div>
                  <h4 class="text-xs font-orbitron text-lh2-cyan mb-2">氢路阀门</h4>
                  <div class="space-y-2">
                    <For each={hydrogenValves()}>
                      {(valve) => (
                        <ValveControl
                          id={valve.id}
                          name={valve.name}
                          state={valve.state}
                          line="HYDROGEN"
                          onToggle={handleValveToggle}
                          disabled={!state.isRunning || state.isPaused}
                        />
                      )}
                    </For>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <GaugeCard
                title="氧路压力"
                value={state.oxygen.linePressure}
                unit="MPa"
                min={0}
                max={5}
                warningThreshold={3}
                dangerThreshold={4}
                color="#00d4ff"
              />
              <GaugeCard
                title="氢路压力"
                value={state.hydrogen.linePressure}
                unit="MPa"
                min={0}
                max={5}
                warningThreshold={3}
                dangerThreshold={4}
                color="#00ffc8"
              />
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div class="panel p-4">
                <TrendChart
                  data={o2FlowData()}
                  label="氧流量实时趋势"
                  unit="kg/s"
                  color="#00d4ff"
                  height={100}
                />
              </div>
              <div class="panel p-4">
                <TrendChart
                  data={h2FlowData()}
                  label="氢流量实时趋势"
                  unit="kg/s"
                  color="#00ffc8"
                  height={100}
                />
              </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div class="panel p-4">
                <TrendChart
                  data={o2LevelData()}
                  label="氧液位变化趋势"
                  unit="%"
                  color="#00d4ff"
                  height={100}
                />
              </div>
              <div class="panel p-4">
                <TrendChart
                  data={h2LevelData()}
                  label="氢液位变化趋势"
                  unit="%"
                  color="#00ffc8"
                  height={100}
                />
              </div>
            </div>
          </div>
          
          <div class="col-span-3 flex flex-col gap-4">
            <div class="panel p-4">
              <h3 class="text-sm font-orbitron text-white mb-4">加注时序</h3>
              
              <div class="relative">
                <div class="absolute left-3 top-0 bottom-0 w-0.5 bg-space-deep" />
                
                <For each={(['IDLE', 'PRECOOLING', 'SLOW_FILL', 'FAST_FILL', 'TOP_OFF', 'PRESSURIZING', 'READY'] as const)}>
                  {(phase, index) => {
                    const phases = ['IDLE', 'PRECOOLING', 'SLOW_FILL', 'FAST_FILL', 'TOP_OFF', 'PRESSURIZING', 'READY']
                    const currentIndex = phases.indexOf(state.currentPhase)
                    const isActive = index() <= currentIndex
                    const isCurrent = phase === state.currentPhase
                    
                    return (
                      <div class="relative pl-8 pb-4">
                      <div 
                        class={`absolute left-1.5 w-4 h-4 rounded-full border-2 transition-all ${
                          isCurrent 
                            ? 'bg-lox-blue border-lox-blue animate-pulse' 
                            : isActive 
                              ? 'bg-success-green border-success-green' 
                              : 'bg-space-deep border-gray-600'
                        }`}
                      />
                      <div class={`text-sm font-jetbrains ${isActive ? 'text-white' : 'text-gray-600'}`}>
                        {FILLING_PHASE_CONFIG[phase].name}
                      </div>
                      <div class="text-xs text-gray-500 font-jetbrains">
                        {FILLING_PHASE_CONFIG[phase].duration > 0 
                          ? `预计 ${Math.floor(FILLING_PHASE_CONFIG[phase].duration / 60000)} 分钟`
                          : phase === 'IDLE' ? '待机状态' : phase === 'READY' ? '准备就绪' : '持续监测'
                        }
                      </div>
                    </div>
                  )
                }}
                </For>
              </div>
            </div>
            
            <div class="panel p-4">
              <h3 class="text-sm font-orbitron text-white mb-4">管路状态</h3>
              
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-gray-400 font-jetbrains">氧路总阀</span>
                  <span class={`text-xs font-bold font-jetbrains px-2 py-1 rounded ${
                    state.valves.find(v => v.id === 'V-O2-001')?.state === 'OPEN'
                      ? 'bg-success-green/20 text-success-green'
                      : 'bg-gray-700 text-gray-400'
                  }`}>
                    {state.valves.find(v => v.id === 'V-O2-001')?.state === 'OPEN' ? '开启' : '关闭'}
                  </span>
                </div>
                
                <div class="flex items-center justify-between">
                  <span class="text-xs text-gray-400 font-jetbrains">氢路总阀</span>
                  <span class={`text-xs font-bold font-jetbrains px-2 py-1 rounded ${
                    state.valves.find(v => v.id === 'V-H2-001')?.state === 'OPEN'
                      ? 'bg-success-green/20 text-success-green'
                      : 'bg-gray-700 text-gray-400'
                  }`}>
                    {state.valves.find(v => v.id === 'V-H2-001')?.state === 'OPEN' ? '开启' : '关闭'}
                  </span>
                </div>
                
                <div class="border-t border-space-deep pt-3 mt-3">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-xs text-gray-400 font-jetbrains">氧路状态</span>
                    <span class={`text-xs font-jetbrains ${
                      state.oxygen.flowRate > 0 ? 'text-lox-blue' : 'text-gray-500'
                    }`}>
                      {state.oxygen.flowRate > 0 ? '加注中' : '待命'}
                    </span>
                  </div>
                  <div class="h-1 bg-space-deep rounded-full overflow-hidden">
                    <div 
                      class="h-full bg-lox-blue transition-all duration-500 rounded-full"
                      style={{ width: `${(state.oxygen.flowRate / 15) * 100}%` }}
                    />
                  </div>
                </div>
                
                <div class="mt-3">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-xs text-gray-400 font-jetbrains">氢路状态</span>
                    <span class={`text-xs font-jetbrains ${
                      state.hydrogen.flowRate > 0 ? 'text-lh2-cyan' : 'text-gray-500'
                    }`}>
                      {state.hydrogen.flowRate > 0 ? '加注中' : '待命'}
                    </span>
                  </div>
                  <div class="h-1 bg-space-deep rounded-full overflow-hidden">
                    <div 
                      class="h-full bg-lh2-cyan transition-all duration-500 rounded-full"
                      style={{ width: `${(state.hydrogen.flowRate / 10) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div class="panel p-4 flex-1">
              <h3 class="text-sm font-orbitron text-white mb-4">实时参数</h3>
              
              <div class="space-y-2 text-xs font-jetbrains">
                <div class="flex justify-between">
                  <span class="text-gray-400">氧贮箱压力</span>
                  <span class="text-lox-blue">{formatPressure(state.oxygen.tankPressure)} MPa</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-400">氢贮箱压力</span>
                  <span class="text-lh2-cyan">{formatPressure(state.hydrogen.tankPressure)} MPa</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-400">氧路压力</span>
                  <span class="text-lox-blue">{formatPressure(state.oxygen.linePressure)} MPa</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-400">氢路压力</span>
                  <span class="text-lh2-cyan">{formatPressure(state.hydrogen.linePressure)} MPa</span>
                </div>
                <div class="border-t border-space-deep pt-2 mt-2">
                  <div class="flex justify-between">
                    <span class="text-gray-400">水锤风险</span>
                    <span class={state.waterHammerRisk > 50 ? 'text-danger-red' : 'text-success-green'}>
                      {state.waterHammerRisk.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
