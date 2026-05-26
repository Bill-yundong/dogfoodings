import { Component, createEffect, createSignal, onMount, onCleanup, For } from 'solid-js'
import { state, simulationActions } from '@/store/useSimulationStore'
import { stateSync } from '@/store/stateSync'
import { waveformManager } from '@/db/timeSeries'
import { TrendChart } from '@/components/TrendChart'
import { GaugeCard } from '@/components/GaugeCard'
import { StatusIndicator } from '@/components/StatusIndicator'
import { getRiskLevel, getRiskColor, formatTemperature, formatPressure } from '@/utils/format'
import { Shield, AlertTriangle, Thermometer, Gauge, Waves, AlertCircle, CheckCircle, XCircle } from 'lucide-solid'

interface SensorData {
  id: string
  name: string
  value: number
  unit: string
  min: number
  max: number
  warning: number
  danger: number
  status: 'normal' | 'warning' | 'danger'
}

export const SafetyMonitor: Component = () => {
  const [sensors, setSensors] = createSignal<SensorData[]>([])
  const [tempGradientData, setTempGradientData] = createSignal<{ x: number[], y: number[] }>({ x: [], y: [] })
  const [pressureDiffData, setPressureDiffData] = createSignal<{ x: number[], y: number[] }>({ x: [], y: [] })
  const [waterHammerData, setWaterHammerData] = createSignal<{ x: number[], y: number[] }>({ x: [], y: [] })
  const [selectedTimeRange, setSelectedTimeRange] = createSignal<number>(300000)
  const [predictionEnabled, setPredictionEnabled] = createSignal(true)
  
  let updateInterval: number | undefined
  
  stateSync.registerModule('safety', ['temperatureGradient', 'pressureDifference', 'waterHammerRisk', 'oxygenTemperature', 'hydrogenTemperature', 'oxygenPressure', 'hydrogenPressure', 'healthIndex'])
  
  const sensorConfigs: Omit<SensorData, 'value' | 'status'>[] = [
    { id: 'O2-T-001', name: '氧路温度传感器1', unit: 'K', min: 80, max: 300, warning: 120, danger: 150 },
    { id: 'O2-T-002', name: '氧路温度传感器2', unit: 'K', min: 80, max: 300, warning: 120, danger: 150 },
    { id: 'H2-T-001', name: '氢路温度传感器1', unit: 'K', min: 20, max: 300, warning: 50, danger: 80 },
    { id: 'H2-T-002', name: '氢路温度传感器2', unit: 'K', min: 20, max: 300, warning: 50, danger: 80 },
    { id: 'O2-P-001', name: '氧路压力传感器1', unit: 'MPa', min: 0, max: 5, warning: 3, danger: 4 },
    { id: 'O2-P-002', name: '氧路压力传感器2', unit: 'MPa', min: 0, max: 5, warning: 3, danger: 4 },
    { id: 'H2-P-001', name: '氢路压力传感器1', unit: 'MPa', min: 0, max: 5, warning: 3, danger: 4 },
    { id: 'H2-P-002', name: '氢路压力传感器2', unit: 'MPa', min: 0, max: 5, warning: 3, danger: 4 },
  ]
  
  onMount(() => {
    updateSensors()
    
    updateInterval = window.setInterval(() => {
      if (state.isRunning && !state.isPaused) {
        updateSensors()
        checkSafetyConditions()
      }
    }, 100)
  })
  
  onCleanup(() => {
    if (updateInterval) clearInterval(updateInterval)
  })
  
  createEffect(() => {
    const tempGrad = waveformManager.getWaveformData('temperatureGradient')
    const pressDiff = waveformManager.getWaveformData('pressureDifference')
    const waterHammer = waveformManager.getWaveformData('waterHammerRisk')
    
    if (tempGrad.x.length > 0) setTempGradientData(tempGrad)
    if (pressDiff.x.length > 0) setPressureDiffData(pressDiff)
    if (waterHammer.x.length > 0) setWaterHammerData(waterHammer)
  })
  
  const updateSensors = () => {
    const { oxygen, hydrogen } = state
    
    const sensorData: SensorData[] = sensorConfigs.map(config => {
      let value = 0
      
      if (config.id.includes('O2-T')) {
        value = oxygen.temperature + (Math.random() - 0.5) * 2
      } else if (config.id.includes('H2-T')) {
        value = hydrogen.temperature + (Math.random() - 0.5) * 1
      } else if (config.id.includes('O2-P')) {
        value = oxygen.linePressure + (Math.random() - 0.5) * 0.02
      } else if (config.id.includes('H2-P')) {
        value = hydrogen.linePressure + (Math.random() - 0.5) * 0.02
      }
      
      let status: 'normal' | 'warning' | 'danger' = 'normal'
      if (value >= config.danger) status = 'danger'
      else if (value >= config.warning) status = 'warning'
      
      return { ...config, value, status }
    })
    
    setSensors(sensorData)
  }
  
  const checkSafetyConditions = () => {
    const { waterHammerRisk, temperatureGradient, pressureDifference } = state
    
    if (predictionEnabled()) {
      if (waterHammerRisk > 80) {
        simulationActions.addEvent(
          'WATER_HAMMER_CRITICAL',
          'CRITICAL',
          '水锤风险达到临界值，建议紧急停车',
          { waterHammerRisk, temperatureGradient, pressureDifference }
        )
      } else if (waterHammerRisk > 50) {
        simulationActions.addEvent(
          'WATER_HAMMER_WARNING',
          'WARNING',
          '水锤风险升高，请密切关注',
          { waterHammerRisk }
        )
      }
    }
    
    const dangerSensors = sensors().filter(s => s.status === 'danger')
    
    if (dangerSensors.length > 0 && state.currentPhase !== 'EMERGENCY_STOP') {
      simulationActions.addEvent(
        'SENSOR_DANGER',
        'ERROR',
        `检测到危险传感器: ${dangerSensors.map(s => s.id).join(', ')}`,
        dangerSensors.length as any
      )
    }
  }
  
  const riskLevel = () => getRiskLevel(state.waterHammerRisk)
  const riskColor = () => getRiskColor(riskLevel())
  
  const getSensorStatusIcon = (status: string) => {
    switch (status) {
      case 'normal': return <CheckCircle class="w-4 h-4 text-success-green" />
      case 'warning': return <AlertCircle class="w-4 h-4 text-warning-yellow" />
      case 'danger': return <XCircle class="w-4 h-4 text-danger-red animate-pulse" />
      default: return null
    }
  }
  
  const getPredictionTime = () => {
    if (state.waterHammerRisk < 30) return '> 30分钟'
    if (state.waterHammerRisk < 50) return '10-30分钟'
    if (state.waterHammerRisk < 80) return '2-10分钟'
    return '< 2分钟'
  }
  
  const handleEmergencyStop = () => {
    simulationActions.emergencyStop()
  }
  
  const handleAcknowledgeAlert = () => {
    const unacknowledged = state.events.find(e => !e.acknowledged)
    if (unacknowledged) {
      simulationActions.acknowledgeEvent(unacknowledged.id!)
    }
  }
  
  return (
    <div class="h-full flex flex-col bg-space-deep text-white overflow-hidden">
      <div class="absolute inset-0 noise pointer-events-none opacity-30" />
      <div class="absolute inset-0 grid-bg pointer-events-none" />
      
      <header class="relative z-10 px-6 py-3 bg-space-blue/50 backdrop-blur-sm border-b border-space-blue">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <Shield class="w-6 h-6 text-danger-red" />
            <h1 class="text-xl font-bold font-orbitron tracking-wider text-danger-red">
              安全防爆监测中心
            </h1>
          </div>
          
          <div class="flex items-center gap-6">
            <div class="flex items-center gap-2">
              <span class="text-sm font-jetbrains text-gray-400">超前预测</span>
              <button
                onClick={() => setPredictionEnabled(!predictionEnabled())}
                class={`w-12 h-6 rounded-full transition-all ${
                  predictionEnabled() ? 'bg-success-green' : 'bg-gray-600'
                }`}
              >
                <div 
                  class={`w-5 h-5 bg-white rounded-full transition-transform ${
                    predictionEnabled() ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            
            <div class="flex items-center gap-2">
              <StatusIndicator 
                status={state.healthIndex > 70 ? 'online' : state.healthIndex > 50 ? 'warning' : 'error'} 
                pulse={state.isRunning} 
              />
              <span class="text-sm font-jetbrains text-gray-300">
                系统健康度: <span class="text-success-green font-bold">{state.healthIndex.toFixed(1)}%</span>
              </span>
            </div>
          </div>
        </div>
      </header>
      
      <main class="flex-1 relative z-10 p-4 overflow-auto">
        <div class="grid grid-cols-12 gap-4">
          <div class="col-span-4 flex flex-col gap-4">
            <div class={`panel p-6 border-2 ${
              riskLevel() === 'CRITICAL' ? 'border-danger-red animate-pulse' :
              riskLevel() === 'HIGH' ? 'border-warning-orange' :
              riskLevel() === 'MEDIUM' ? 'border-warning-yellow' :
              'border-success-green'
            }`}>
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-orbitron text-white flex items-center gap-2">
                  <Waves class="w-5 h-5" style={{ color: riskColor() }} />
                  水锤风险预测
                </h3>
                <span 
                  class="px-3 py-1 rounded-full text-sm font-bold font-jetbrains"
                  style={{ 'background-color': riskColor() + '30', color: riskColor() }}
                >
                  {riskLevel()}
                </span>
              </div>
              
              <div class="text-center mb-4">
                <div class="text-5xl font-bold font-jetbrains" style={{ color: riskColor() }}>
                  {state.waterHammerRisk.toFixed(1)}
                  <span class="text-2xl text-gray-500">%</span>
                </div>
                <div class="text-sm text-gray-400 font-jetbrains mt-1">
                  预计达到临界时间: <span style={{ color: riskColor() }}>{getPredictionTime()}</span>
                </div>
              </div>
              
              <div class="h-4 bg-space-deep rounded-full overflow-hidden">
                <div 
                  class="h-full rounded-full transition-all duration-300"
                  style={{ width: `${state.waterHammerRisk}%`, 'background-color': riskColor() }}
                />
              </div>
              
              <div class="flex justify-between mt-2 text-xs text-gray-500 font-jetbrains">
                <span>0% 安全</span>
                <span>30%</span>
                <span>50%</span>
                <span>80%</span>
                <span>100% 危险</span>
              </div>
              
              {predictionEnabled() && (
                <div class="mt-4 p-3 bg-space-deep rounded-lg">
                  <div class="text-xs text-gray-400 font-jetbrains mb-2">预测分析</div>
                  <div class="space-y-1 text-xs font-jetbrains">
                    <div class="flex justify-between">
                      <span class="text-gray-500">压力波传播速度</span>
                      <span class="text-lox-blue">1150 m/s</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-500">最大压力梯度</span>
                      <span class={state.pressureDifference > 2 ? 'text-danger-red' : 'text-lh2-cyan'}>
                        {state.pressureDifference.toFixed(3)} MPa/m
                      </span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-500">预测峰值压力</span>
                      <span class="text-warning-orange">
                        {(state.oxygen.linePressure * (1 + state.waterHammerRisk / 100)).toFixed(3)} MPa
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div class="grid grid-cols-2 gap-3">
              <GaugeCard
                title="温度梯度"
                value={state.temperatureGradient}
                unit="K/m"
                min={0}
                max={50}
                warningThreshold={20}
                dangerThreshold={35}
                color="#ff6b35"
              />
              <GaugeCard
                title="压力差"
                value={state.pressureDifference}
                unit="MPa"
                min={0}
                max={5}
                warningThreshold={2}
                dangerThreshold={3.5}
                color="#ffd700"
              />
            </div>
            
            <div class="panel p-4">
              <h3 class="text-sm font-orbitron text-white mb-3 flex items-center gap-2">
                <Thermometer class="w-4 h-4" /> 温度分布热力图
              </h3>
              
              <div class="grid grid-cols-8 gap-1">
                <For each={Array.from({ length: 32 }).map((_, index) => ({ index, baseTemp: index < 16 ? state.oxygen.temperature : state.hydrogen.temperature }))}>
                  {({ baseTemp }) => {
                    const variation = (Math.random() - 0.5) * 5
                    const temp = baseTemp + variation
                    const normalized = (temp - 20) / 280
                    
                    const r = Math.floor(255 * normalized)
                    const g = Math.floor(150 * (1 - normalized))
                    const b = Math.floor(255 * (1 - normalized))
                    
                    return (
                      <div
                        class="aspect-square rounded transition-all duration-300"
                        style={{ 
                          'background-color': `rgb(${r}, ${g}, ${b})`,
                          opacity: 0.7 + normalized * 0.3
                        }}
                        title={`${temp.toFixed(1)} K`}
                      />
                    )
                  }}
                </For>
              </div>
              
              <div class="flex justify-between mt-2 text-xs font-jetbrains">
                <span class="text-lh2-cyan">20K</span>
                <span class="text-gray-500">温度标尺</span>
                <span class="text-danger-red">300K</span>
              </div>
            </div>
            
            <div class="panel p-4">
              <h3 class="text-sm font-orbitron text-white mb-3 flex items-center gap-2">
                <Gauge class="w-4 h-4" /> 压力等高线
              </h3>
              
              <div class="relative h-32 bg-space-deep rounded overflow-hidden">
                <svg width="100%" height="100%" viewBox="0 0 200 100">
                  <For each={[0.2, 0.4, 0.6, 0.8, 1.0]}>
                    {(level) => {
                      const color = level > 0.8 ? '#ff2d55' : level > 0.5 ? '#ffd700' : '#00d4ff'
                      
                      return (
                        <path
                          d={`M 0 ${50 + Math.sin(level * Math.PI) * 30} Q 50 ${30 + level * 40}, 100 ${50 + Math.cos(level * Math.PI) * 20} T 200 ${50 + Math.sin(level * Math.PI * 2) * 25}`}
                          fill="none"
                          stroke={color}
                          stroke-width="1"
                          opacity={0.3 + level * 0.5}
                        />
                      )
                    }}
                  </For>
                </svg>
                
                <div class="absolute bottom-1 left-2 text-xs font-jetbrains text-gray-500">
                  氧路: {formatPressure(state.oxygen.linePressure)} MPa
                </div>
                <div class="absolute bottom-1 right-2 text-xs font-jetbrains text-gray-500">
                  氢路: {formatPressure(state.hydrogen.linePressure)} MPa
                </div>
              </div>
            </div>
          </div>
          
          <div class="col-span-5 flex flex-col gap-4">
            <div class="panel p-4">
              <h3 class="text-sm font-orbitron text-white mb-3">温度梯度趋势</h3>
              <TrendChart
                data={tempGradientData()}
                label=""
                unit="K/m"
                color="#ff6b35"
                height={120}
              />
            </div>
            
            <div class="panel p-4">
              <h3 class="text-sm font-orbitron text-white mb-3">压力差趋势</h3>
              <TrendChart
                data={pressureDiffData()}
                label=""
                unit="MPa"
                color="#ffd700"
                height={120}
              />
            </div>
            
            <div class="panel p-4">
              <h3 class="text-sm font-orbitron text-white mb-3">水锤风险趋势</h3>
              <TrendChart
                data={waterHammerData()}
                label=""
                unit="%"
                color="#ff2d55"
                height={120}
              />
            </div>
            
            <div class="panel p-4 flex-1">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-orbitron text-white flex items-center gap-2">
                  <AlertTriangle class="w-4 h-4 text-warning-yellow" /> 安全事件
                </h3>
                <button
                  onClick={handleAcknowledgeAlert}
                  class="text-xs px-2 py-1 bg-space-deep hover:bg-lox-blue/20 text-lox-blue rounded transition-all"
                >
                  确认告警
                </button>
              </div>
              
              <div class="space-y-2 max-h-64 overflow-y-auto">
                <For each={state.events
                  .filter(e => ['CRITICAL', 'ERROR', 'WARNING'].includes(e.eventSeverity))
                  .slice(0, 15)}>
                  {(event) => (
                    <div 
                      class={`p-3 rounded-lg transition-all ${
                        event.acknowledged 
                          ? 'bg-space-deep/50 opacity-60' 
                          : event.eventSeverity === 'CRITICAL' 
                            ? 'bg-danger-red/20 border border-danger-red' 
                            : event.eventSeverity === 'ERROR'
                              ? 'bg-warning-orange/20 border border-warning-orange'
                              : 'bg-warning-yellow/10 border border-warning-yellow'
                      }`}
                    >
                      <div class="flex items-start justify-between">
                        <div class="flex items-center gap-2">
                          {event.eventSeverity === 'CRITICAL' && <AlertCircle class="w-4 h-4 text-danger-red" />}
                          {event.eventSeverity === 'ERROR' && <AlertTriangle class="w-4 h-4 text-warning-orange" />}
                          {event.eventSeverity === 'WARNING' && <AlertCircle class="w-4 h-4 text-warning-yellow" />}
                          <span class="text-sm font-jetbrains font-bold text-white">
                            {event.eventType}
                          </span>
                        </div>
                        <div class="flex items-center gap-2">
                          <span class="text-xs text-gray-500 font-jetbrains">
                            {new Date(event.eventTimestamp).toLocaleTimeString('zh-CN')}
                          </span>
                          {event.acknowledged && (
                            <CheckCircle class="w-3 h-3 text-success-green" />
                          )}
                        </div>
                      </div>
                      <p class="text-xs text-gray-400 mt-1 font-jetbrains">
                        {event.eventDescription}
                      </p>
                    </div>
                  )}
                </For>
                {state.events.length === 0 && (
                  <div class="text-center text-gray-600 text-sm py-8">暂无安全事件</div>
                )}
              </div>
            </div>
          </div>
          
          <div class="col-span-3 flex flex-col gap-4">
            <div class="panel p-4">
              <h3 class="text-sm font-orbitron text-white mb-3">传感器矩阵</h3>
              
              <div class="grid grid-cols-2 gap-2">
                <For each={sensors()}>
                  {(sensor) => (
                    <div 
                      class={`p-2 rounded transition-all ${
                        sensor.status === 'danger' ? 'bg-danger-red/20 border border-danger-red' :
                        sensor.status === 'warning' ? 'bg-warning-yellow/10 border border-warning-yellow' :
                        'bg-space-deep border border-transparent'
                      }`}
                    >
                      <div class="flex items-center justify-between mb-1">
                        {getSensorStatusIcon(sensor.status)}
                        <span class="text-xs text-gray-500 font-jetbrains">{sensor.id}</span>
                      </div>
                      <div class="text-xs text-gray-400 font-jetbrains truncate">{sensor.name}</div>
                      <div 
                        class={`text-lg font-bold font-jetbrains ${
                          sensor.status === 'danger' ? 'text-danger-red' :
                          sensor.status === 'warning' ? 'text-warning-yellow' :
                          'text-success-green'
                        }`}
                      >
                        {sensor.value.toFixed(2)}
                        <span class="text-xs text-gray-500 ml-1">{sensor.unit}</span>
                      </div>
                      <div class="h-1 bg-space-deep rounded-full mt-1 overflow-hidden">
                        <div 
                          class="h-full rounded-full transition-all"
                          style={{ 
                            width: `${((sensor.value - sensor.min) / (sensor.max - sensor.min)) * 100}%`,
                            'background-color': sensor.status === 'danger' ? '#ff2d55' : 
                                              sensor.status === 'warning' ? '#ffd700' : '#00ff88'
                          }}
                        />
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </div>
            
            <div class="panel p-4">
              <h3 class="text-sm font-orbitron text-white mb-3">联锁保护状态</h3>
              
              <div class="space-y-2">
                <div class="flex items-center justify-between p-2 bg-space-deep rounded">
                  <span class="text-xs font-jetbrains text-gray-400">超压保护</span>
                  <StatusIndicator status={state.pressureDifference < 3 ? 'online' : 'error'} />
                </div>
                <div class="flex items-center justify-between p-2 bg-space-deep rounded">
                  <span class="text-xs font-jetbrains text-gray-400">超温保护</span>
                  <StatusIndicator status={state.temperatureGradient < 30 ? 'online' : 'error'} />
                </div>
                <div class="flex items-center justify-between p-2 bg-space-deep rounded">
                  <span class="text-xs font-jetbrains text-gray-400">水锤保护</span>
                  <StatusIndicator status={state.waterHammerRisk < 50 ? 'online' : 'warning'} />
                </div>
                <div class="flex items-center justify-between p-2 bg-space-deep rounded">
                  <span class="text-xs font-jetbrains text-gray-400">紧急停车</span>
                  <StatusIndicator status={state.currentPhase === 'EMERGENCY_STOP' ? 'active' : 'standby'} />
                </div>
              </div>
            </div>
            
            <div class="panel p-4">
              <h3 class="text-sm font-orbitron text-white mb-3">时间范围</h3>
              
              <div class="grid grid-cols-2 gap-2">
                <For each={[
                  { label: '5分钟', value: 300000 },
                  { label: '15分钟', value: 900000 },
                  { label: '30分钟', value: 1800000 },
                  { label: '1小时', value: 3600000 }
                ]}>
                  {(option) => (
                    <button
                      onClick={() => setSelectedTimeRange(option.value)}
                      class={`px-2 py-1.5 text-xs font-jetbrains rounded transition-all ${
                        selectedTimeRange() === option.value
                          ? 'bg-lox-blue text-space-deep font-bold'
                          : 'bg-space-deep text-gray-400 hover:bg-lox-blue/20 hover:text-lox-blue'
                      }`}
                    >
                      {option.label}
                    </button>
                  )}
                </For>
              </div>
            </div>
            
            <div class="panel p-4 flex-1">
              <h3 class="text-sm font-orbitron text-white mb-3">实时参数</h3>
              
              <div class="space-y-2 text-xs font-jetbrains">
                <div class="flex justify-between">
                  <span class="text-gray-400">氧温</span>
                  <span class="text-lox-blue">{formatTemperature(state.oxygen.temperature)} K</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-400">氢温</span>
                  <span class="text-lh2-cyan">{formatTemperature(state.hydrogen.temperature)} K</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-400">氧压</span>
                  <span class="text-lox-blue">{formatPressure(state.oxygen.linePressure)} MPa</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-400">氢压</span>
                  <span class="text-lh2-cyan">{formatPressure(state.hydrogen.linePressure)} MPa</span>
                </div>
                <div class="border-t border-space-deep pt-2 mt-2">
                  <div class="flex justify-between">
                    <span class="text-gray-400">温度梯度</span>
                    <span class={state.temperatureGradient > 20 ? 'text-warning-orange' : 'text-success-green'}>
                      {state.temperatureGradient.toFixed(2)} K/m
                    </span>
                  </div>
                  <div class="flex justify-between mt-1">
                    <span class="text-gray-400">压力差</span>
                    <span class={state.pressureDifference > 2 ? 'text-warning-yellow' : 'text-success-green'}>
                      {state.pressureDifference.toFixed(3)} MPa
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleEmergencyStop}
              class="w-full py-4 bg-danger-red/20 hover:bg-danger-red/30 border-2 border-danger-red text-danger-red rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] animate-pulse font-bold font-orbitron text-lg"
            >
              <AlertTriangle class="w-5 h-5 inline mr-2" />
              紧急联锁停车
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
