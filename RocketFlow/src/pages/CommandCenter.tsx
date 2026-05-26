import { Component, createEffect, createSignal, onMount, onCleanup, For } from 'solid-js'
import { state, simulationActions } from '@/store/useSimulationStore'
import { stateSync } from '@/store/stateSync'
import { waveformManager } from '@/db/timeSeries'
import { GaugeCard } from '@/components/GaugeCard'
import { TrendChart } from '@/components/TrendChart'
import { StatusIndicator } from '@/components/StatusIndicator'
import { SimulationControl } from '@/components/SimulationControl'
import { formatCountdown, formatTemperature, formatPressure, formatFlowRate, formatPercent, getRiskLevel, getRiskColor } from '@/utils/format'
import { FILLING_PHASE_CONFIG } from '@/types'
import { AlertTriangle, Rocket, Gauge, Thermometer, Droplets } from 'lucide-solid'

export const CommandCenter: Component = () => {
  const [currentTime, setCurrentTime] = createSignal(Date.now())
  const [o2PressureData, setO2PressureData] = createSignal<{ x: number[], y: number[] }>({ x: [], y: [] })
  const [h2PressureData, setH2PressureData] = createSignal<{ x: number[], y: number[] }>({ x: [], y: [] })
  const [o2FlowData, setO2FlowData] = createSignal<{ x: number[], y: number[] }>({ x: [], y: [] })
  const [h2FlowData, setH2FlowData] = createSignal<{ x: number[], y: number[] }>({ x: [], y: [] })
  
  let timeInterval: number | undefined
  let dataInterval: number | undefined
  
  const phaseName = () => FILLING_PHASE_CONFIG[state.currentPhase]?.name || '待机'
  
  const unsubs: (() => void)[] = []
  
  onMount(() => {
    stateSync.registerModule('command', ['temperatureGradient', 'pressureDifference', 'oxygenFillLevel', 'hydrogenFillLevel', 'oxygenFlowRate', 'hydrogenFlowRate', 'healthIndex'])
    
    unsubs.push(
      stateSync.subscribe('oxygenFillLevel', (v) => simulationActions.updateOxygen({ fillLevel: v })),
      stateSync.subscribe('hydrogenFillLevel', (v) => simulationActions.updateHydrogen({ fillLevel: v })),
      stateSync.subscribe('temperatureGradient', (v) => simulationActions.setTemperatureGradient(v)),
      stateSync.subscribe('pressureDifference', (v) => simulationActions.setPressureDifference(v))
    )
    
    timeInterval = window.setInterval(() => {
      setCurrentTime(Date.now())
    }, 50)
    
    dataInterval = window.setInterval(() => {
      if (state.isRunning) {
        simulationActions.simulateStep(50)
        
        stateSync.updateParam('oxygenFillLevel', state.oxygen.fillLevel)
        stateSync.updateParam('hydrogenFillLevel', state.hydrogen.fillLevel)
        stateSync.updateParam('oxygenFlowRate', state.oxygen.flowRate)
        stateSync.updateParam('hydrogenFlowRate', state.hydrogen.flowRate)
        stateSync.updateParam('temperatureGradient', state.temperatureGradient)
        stateSync.updateParam('pressureDifference', state.pressureDifference)
        stateSync.updateParam('waterHammerRisk', state.waterHammerRisk)
        stateSync.updateParam('healthIndex', state.healthIndex)
        stateSync.updateParam('oxygenTemperature', state.oxygen.temperature)
        stateSync.updateParam('hydrogenTemperature', state.hydrogen.temperature)
        stateSync.updateParam('oxygenPressure', state.oxygen.linePressure)
        stateSync.updateParam('hydrogenPressure', state.hydrogen.linePressure)
      }
    }, 50)
  })
  
  onCleanup(() => {
    if (timeInterval) clearInterval(timeInterval)
    if (dataInterval) clearInterval(dataInterval)
    unsubs.forEach(unsub => unsub())
  })
  
  createEffect(() => {
    const o2Press = waveformManager.getWaveformData('oxygenLinePressure')
    const h2Press = waveformManager.getWaveformData('hydrogenLinePressure')
    const o2Flow = waveformManager.getWaveformData('oxygenFlowRate')
    const h2Flow = waveformManager.getWaveformData('hydrogenFlowRate')
    
    if (o2Press.x.length > 0) setO2PressureData(o2Press)
    if (h2Press.x.length > 0) setH2PressureData(h2Press)
    if (o2Flow.x.length > 0) setO2FlowData(o2Flow)
    if (h2Flow.x.length > 0) setH2FlowData(h2Flow)
  })
  
  const handleEmergency = () => {
    simulationActions.emergencyStop()
  }
  
  const riskLevel = () => getRiskLevel(state.waterHammerRisk)
  const riskColor = () => getRiskColor(riskLevel())
  
  return (
    <div class="h-full flex flex-col bg-space-deep text-white overflow-hidden">
      <div class="absolute inset-0 noise pointer-events-none opacity-30" />
      <div class="absolute inset-0 grid-bg pointer-events-none" />
      
      <header class="relative z-10 px-6 py-3 bg-space-blue/50 backdrop-blur-sm border-b border-space-blue">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <Rocket class="w-8 h-8 text-lox-blue" />
              <h1 class="text-2xl font-bold font-orbitron tracking-wider text-glow text-lox-blue">
                ROCKETFLOW
              </h1>
            </div>
            <span class="text-sm text-gray-400 font-jetbrains">运载火箭推进剂加注模拟系统</span>
          </div>
          
          <div class="flex items-center gap-6">
            <div class="flex items-center gap-2">
              <StatusIndicator status={state.isRunning ? 'active' : 'standby'} pulse={state.isRunning && !state.isPaused} />
              <span class="text-sm font-jetbrains text-gray-300">
                阶段: <span class="text-lox-blue font-bold">{phaseName()}</span>
              </span>
            </div>
            
            <div class="text-right">
              <div class="text-xs text-gray-500 font-jetbrains">系统时间</div>
              <div class="text-lg font-bold font-jetbrains text-lox-blue">
                {new Date(currentTime()).toLocaleTimeString('zh-CN', { hour12: false })}
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <main class="flex-1 relative z-10 p-4 overflow-hidden">
        <div class="h-full grid grid-cols-12 gap-4">
          <div class="col-span-3 flex flex-col gap-4">
            <div class="panel p-4">
              <div class="text-center">
                <div class="text-xs text-gray-400 font-jetbrains mb-1">发射倒计时</div>
                <div class="text-3xl font-bold font-jetbrains seven-segment text-lox-blue text-glow">
                  {formatCountdown(state.countdown)}
                </div>
              </div>
            </div>
            
            <GaugeCard
              title="系统健康度"
              value={state.healthIndex}
              unit="%"
              min={0}
              max={100}
              warningThreshold={70}
              dangerThreshold={50}
            />
            
            <div class="panel p-4">
              <div class="flex items-center gap-2 mb-3">
                <AlertTriangle class="w-4 h-4" style={{ color: riskColor() }} />
                <span class="text-sm font-jetbrains" style={{ color: riskColor() }}>
                  水锤风险: {riskLevel()}
                </span>
              </div>
              <div class="h-2 bg-space-deep rounded-full overflow-hidden">
                <div 
                  class="h-full rounded-full transition-all duration-300"
                  style={{ width: `${state.waterHammerRisk}%`, 'background-color': riskColor() }}
                />
              </div>
              <div class="mt-2 text-right text-xs font-jetbrains" style={{ color: riskColor() }}>
                {state.waterHammerRisk.toFixed(1)}%
              </div>
            </div>
            
            <div class="panel p-4 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs text-gray-400 font-jetbrains">温度梯度</span>
                <span class="text-sm font-bold font-jetbrains text-warning-orange">
                  {state.temperatureGradient.toFixed(2)} K/m
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs text-gray-400 font-jetbrains">压力差</span>
                <span class="text-sm font-bold font-jetbrains text-warning-yellow">
                  {state.pressureDifference.toFixed(3)} MPa
                </span>
              </div>
            </div>
            
            <SimulationControl />
          </div>
          
          <div class="col-span-6 flex flex-col gap-4">
            <div class="panel p-6 flex-1 relative overflow-hidden">
              <div class="absolute inset-0 scanline opacity-20 pointer-events-none" />
              
              <div class="text-center mb-4">
                <h2 class="text-lg font-orbitron text-lox-blue">发射工位态势</h2>
              </div>
              
              <svg viewBox="0 0 800 400" class="w-full h-full">
                <defs>
                  <linearGradient id="oxygenGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="transparent" />
                    <stop offset="50%" stop-color="#00d4ff" stop-opacity="0.8" />
                    <stop offset="100%" stop-color="transparent" />
                  </linearGradient>
                  <linearGradient id="hydrogenGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="transparent" />
                    <stop offset="50%" stop-color="#00ffc8" stop-opacity="0.8" />
                    <stop offset="100%" stop-color="transparent" />
                  </linearGradient>
                </defs>
                
                <rect x="50" y="320" width="700" height="20" fill="#1a1a2e" rx="2" />
                <text x="60" y="315" fill="#666" font-size="10" font-family="JetBrains Mono">发射台</text>
                
                <g transform="translate(350, 80)">
                  <path d="M0 0 L-30 120 L-15 180 L15 180 L30 120 Z" fill="#1e3a5f" stroke="#00d4ff" stroke-width="1" />
                  <circle cx="0" cy="60" r="12" fill="#0a1628" stroke="#00d4ff" stroke-width="1" />
                  
                  <rect x="-25" y="180" width="50" height="8" fill="#1e3a5f" />
                  <ellipse cx="0" cy="195" rx="20" ry="5" fill="#ff6b35" opacity={state.isRunning ? 0.8 : 0.2} />
                  <ellipse cx="0" cy="200" rx="12" ry="3" fill="#ffd700" opacity={state.isRunning ? 0.9 : 0.2} />
                </g>
                
                <text x="350" y="70" text-anchor="middle" fill="#00d4ff" font-size="12" font-family="Orbitron">
                  运载火箭
                </text>
                
                <g>
                  <rect x="80" y="200" width="60" height="100" fill="#1e3a5f" stroke="#00d4ff" stroke-width="1" />
                  <text x="110" y="195" text-anchor="middle" fill="#00d4ff" font-size="10" font-family="JetBrains Mono">
                    液氧贮箱
                  </text>
                  
                  <rect x="85" y={300 - state.oxygen.fillLevel * 0.8} width="50" height={state.oxygen.fillLevel * 0.8} fill="#00d4ff" opacity="0.6" />
                  <text x="110" y="260" text-anchor="middle" fill="#fff" font-size="14" font-family="JetBrains Mono" font-weight="bold">
                    {formatPercent(state.oxygen.fillLevel)}%
                  </text>
                </g>
                
                <g>
                  <rect x="660" y="200" width="60" height="100" fill="#1e3a5f" stroke="#00ffc8" stroke-width="1" />
                  <text x="690" y="195" text-anchor="middle" fill="#00ffc8" font-size="10" font-family="JetBrains Mono">
                    液氢贮箱
                  </text>
                  
                  <rect x="665" y={300 - state.hydrogen.fillLevel * 0.8} width="50" height={state.hydrogen.fillLevel * 0.8} fill="#00ffc8" opacity="0.6" />
                  <text x="690" y="260" text-anchor="middle" fill="#fff" font-size="14" font-family="JetBrains Mono" font-weight="bold">
                    {formatPercent(state.hydrogen.fillLevel)}%
                  </text>
                </g>
                
                <g>
                  <line x1="140" y1="250" x2="320" y2="250" stroke="#00d4ff" stroke-width="4" />
                  
                  {state.oxygen.flowRate > 0 && (
                    <rect x="140" y="248" width="180" height="4" fill="url(#oxygenGrad)" class="animate-flow" />
                  )}
                  
                  <circle cx="200" cy="250" r="8" fill="#1e3a5f" stroke="#00d4ff" stroke-width="2" />
                  <text x="200" y="270" text-anchor="middle" fill="#00d4ff" font-size="8" font-family="JetBrains Mono">
                    V-O2-002
                  </text>
                </g>
                
                <g>
                  <line x1="660" y1="250" x2="480" y2="250" stroke="#00ffc8" stroke-width="4" />
                  
                  {state.hydrogen.flowRate > 0 && (
                    <rect x="480" y="248" width="180" height="4" fill="url(#hydrogenGrad)" class="animate-flow" />
                  )}
                  
                  <circle cx="600" cy="250" r="8" fill="#1e3a5f" stroke="#00ffc8" stroke-width="2" />
                  <text x="600" y="270" text-anchor="middle" fill="#00ffc8" font-size="8" font-family="JetBrains Mono">
                    V-H2-002
                  </text>
                </g>
                
                <g>
                  <line x1="320" y1="250" x2="350" y2="200" stroke="#00d4ff" stroke-width="3" />
                  <line x1="480" y1="250" x2="450" y2="200" stroke="#00ffc8" stroke-width="3" />
                </g>
                
                <g transform="translate(200, 340)">
                  <text x="0" y="0" fill="#00d4ff" font-size="10" font-family="JetBrains Mono">
                    氧路: {formatFlowRate(state.oxygen.flowRate)} kg/s | {formatPressure(state.oxygen.linePressure)} MPa
                  </text>
                </g>
                
                <g transform="translate(500, 340)">
                  <text x="0" y="0" fill="#00ffc8" font-size="10" font-family="JetBrains Mono">
                    氢路: {formatFlowRate(state.hydrogen.flowRate)} kg/s | {formatPressure(state.hydrogen.linePressure)} MPa
                  </text>
                </g>
              </svg>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div class="panel p-4">
                <TrendChart
                  data={o2PressureData()}
                  label="氧路压力"
                  unit="MPa"
                  color="#00d4ff"
                  height={80}
                />
              </div>
              <div class="panel p-4">
                <TrendChart
                  data={h2PressureData()}
                  label="氢路压力"
                  unit="MPa"
                  color="#00ffc8"
                  height={80}
                />
              </div>
            </div>
          </div>
          
          <div class="col-span-3 flex flex-col gap-4">
            <div class="grid grid-cols-2 gap-3">
              <GaugeCard
                title="氧温"
                value={state.oxygen.temperature}
                unit="K"
                min={80}
                max={300}
                warningThreshold={150}
                dangerThreshold={200}
                color="#00d4ff"
              />
              <GaugeCard
                title="氢温"
                value={state.hydrogen.temperature}
                unit="K"
                min={20}
                max={300}
                warningThreshold={50}
                dangerThreshold={100}
                color="#00ffc8"
              />
              <GaugeCard
                title="氧流量"
                value={state.oxygen.flowRate}
                unit="kg/s"
                min={0}
                max={15}
                color="#00d4ff"
              />
              <GaugeCard
                title="氢流量"
                value={state.hydrogen.flowRate}
                unit="kg/s"
                min={0}
                max={10}
                color="#00ffc8"
              />
            </div>
            
            <div class="panel p-4">
              <TrendChart
                data={o2FlowData()}
                label="氧流量趋势"
                unit="kg/s"
                color="#00d4ff"
                height={80}
              />
            </div>
            
            <div class="panel p-4">
              <TrendChart
                data={h2FlowData()}
                label="氢流量趋势"
                unit="kg/s"
                color="#00ffc8"
                height={80}
              />
            </div>
            
            <div class="panel p-4 flex-1">
              <h3 class="text-sm font-orbitron text-lox-blue mb-3">事件日志</h3>
              <div class="space-y-2 max-h-40 overflow-y-auto">
                <For each={state.events.slice(0, 10)}>
                  {(event) => (
                    <div 
                      class={`text-xs p-2 rounded ${
                        event.eventSeverity === 'CRITICAL' ? 'bg-danger-red/20 text-danger-red' :
                        event.eventSeverity === 'ERROR' ? 'bg-warning-orange/20 text-warning-orange' :
                        event.eventSeverity === 'WARNING' ? 'bg-warning-yellow/20 text-warning-yellow' :
                        'bg-space-deep text-gray-400'
                      }`}
                    >
                      <div class="flex justify-between">
                        <span class="font-jetbrains">{event.eventType}</span>
                        <span class="opacity-70">
                          {new Date(event.eventTimestamp).toLocaleTimeString('zh-CN')}
                        </span>
                      </div>
                      <div class="mt-1 opacity-80">{event.eventDescription}</div>
                    </div>
                  )}
                </For>
                {state.events.length === 0 && (
                  <div class="text-center text-gray-600 text-xs py-4">暂无事件</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <footer class="relative z-10 px-6 py-3 bg-space-blue/50 backdrop-blur-sm border-t border-space-blue">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-6">
            <div class="flex items-center gap-2 text-sm font-jetbrains">
              <Gauge class="w-4 h-4 text-gray-500" />
              <span class="text-gray-500">数据点: {waveformManager.getBufferSize()}</span>
            </div>
            <div class="flex items-center gap-2 text-sm font-jetbrains">
              <span class="text-gray-500">速度: </span>
              <span class="text-lox-blue font-bold">{state.config.simulationSpeed.toFixed(1)}x</span>
            </div>
            <div class="flex items-center gap-2 text-sm font-jetbrains">
              <span class="text-gray-500">会话: </span>
              <span class="text-lh2-cyan font-bold">#{state.sessionId || '-'}</span>
            </div>
          </div>
          
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2 text-sm font-jetbrains">
              <Thermometer class="w-4 h-4 text-lox-blue" />
              <span class="text-lox-blue">氧温: {formatTemperature(state.oxygen.temperature)}K</span>
            </div>
            <div class="flex items-center gap-2 text-sm font-jetbrains">
              <Droplets class="w-4 h-4 text-lh2-cyan" />
              <span class="text-lh2-cyan">氢温: {formatTemperature(state.hydrogen.temperature)}K</span>
            </div>
            <div class="flex items-center gap-2 text-sm font-jetbrains">
              <span class="text-gray-500">阶段: </span>
              <span class="text-white font-bold">{phaseName()}</span>
            </div>
          </div>
          
          <button
            onClick={handleEmergency}
            class="flex items-center gap-2 px-6 py-2 bg-danger-red/20 hover:bg-danger-red/30 border border-danger-red text-danger-red rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] animate-pulse"
            disabled={!state.isRunning || state.currentPhase === 'EMERGENCY_STOP'}
          >
            <AlertTriangle class="w-4 h-4" /> 紧急停车
          </button>
        </div>
      </footer>
    </div>
  )
}
