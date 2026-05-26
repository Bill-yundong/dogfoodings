import { createStore, produce } from 'solid-js/store'
import type { SimulationState, FillingPhase, ValveState, EventSeverity, SimulationConfig, ActiveFault, FaultType } from '@/types'
import { FILLING_PHASE_CONFIG, DEFAULT_SIMULATION_CONFIG, PHASE_TRANSITION_CONDITIONS, FLUID_PROPERTIES } from '@/types'
import { clamp, lerp } from '@/utils/math'
import { faultInjector } from '@/physics/FaultInjector'
import { waveformManager } from '@/db/timeSeries'

const initialState: SimulationState = {
  isRunning: false,
  isPaused: false,
  currentPhase: 'IDLE',
  countdown: 3600000,
  startTime: null,
  oxygen: {
    tankPressure: 0.2,
    linePressure: 0.1,
    temperature: 293,
    flowRate: 0,
    fillLevel: 0,
    targetLevel: 98
  },
  hydrogen: {
    tankPressure: 0.3,
    linePressure: 0.15,
    temperature: 293,
    flowRate: 0,
    fillLevel: 0,
    targetLevel: 98
  },
  valves: [
    { id: 'V-O2-001', name: '氧路总阀', line: 'OXYGEN', state: 'CLOSED', position: 0 },
    { id: 'V-O2-002', name: '氧路加注阀', line: 'OXYGEN', state: 'CLOSED', position: 0 },
    { id: 'V-O2-003', name: '氧路泄放阀', line: 'OXYGEN', state: 'CLOSED', position: 0 },
    { id: 'V-H2-001', name: '氢路总阀', line: 'HYDROGEN', state: 'CLOSED', position: 0 },
    { id: 'V-H2-002', name: '氢路加注阀', line: 'HYDROGEN', state: 'CLOSED', position: 0 },
    { id: 'V-H2-003', name: '氢路泄放阀', line: 'HYDROGEN', state: 'CLOSED', position: 0 }
  ],
  waterHammerRisk: 0,
  temperatureGradient: 0,
  pressureDifference: 0,
  healthIndex: 100,
  events: []
}

export interface SimulationStoreState extends SimulationState {
  config: SimulationConfig
  sessionId: number | null
  phaseStartTime: number | null
  activeFaults: ActiveFault[]
  elapsedTime: number
}

const initialStoreState: SimulationStoreState = {
  ...initialState,
  config: { ...DEFAULT_SIMULATION_CONFIG },
  sessionId: null,
  phaseStartTime: null,
  activeFaults: [],
  elapsedTime: 0
}

export const [state, setState] = createStore<SimulationStoreState>(initialStoreState)

const PHASE_ORDER: FillingPhase[] = ['PRECOOLING', 'SLOW_FILL', 'FAST_FILL', 'TOP_OFF', 'PRESSURIZING', 'READY']

const getValvesForPhase = (phase: FillingPhase): Array<{ id: string; state: ValveState }> => {
  switch (phase) {
    case 'IDLE':
      return [
        { id: 'V-O2-001', state: 'CLOSED' },
        { id: 'V-O2-002', state: 'CLOSED' },
        { id: 'V-O2-003', state: 'CLOSED' },
        { id: 'V-H2-001', state: 'CLOSED' },
        { id: 'V-H2-002', state: 'CLOSED' },
        { id: 'V-H2-003', state: 'CLOSED' }
      ]
    case 'PRECOOLING':
      return [
        { id: 'V-O2-001', state: 'OPEN' },
        { id: 'V-O2-002', state: 'OPEN' },
        { id: 'V-O2-003', state: 'OPEN' },
        { id: 'V-H2-001', state: 'OPEN' },
        { id: 'V-H2-002', state: 'OPEN' },
        { id: 'V-H2-003', state: 'OPEN' }
      ]
    case 'SLOW_FILL':
    case 'FAST_FILL':
    case 'TOP_OFF':
      return [
        { id: 'V-O2-001', state: 'OPEN' },
        { id: 'V-O2-002', state: 'OPEN' },
        { id: 'V-O2-003', state: 'CLOSED' },
        { id: 'V-H2-001', state: 'OPEN' },
        { id: 'V-H2-002', state: 'OPEN' },
        { id: 'V-H2-003', state: 'CLOSED' }
      ]
    case 'PRESSURIZING':
    case 'READY':
      return [
        { id: 'V-O2-001', state: 'CLOSED' },
        { id: 'V-O2-002', state: 'CLOSED' },
        { id: 'V-O2-003', state: 'CLOSED' },
        { id: 'V-H2-001', state: 'CLOSED' },
        { id: 'V-H2-002', state: 'CLOSED' },
        { id: 'V-H2-003', state: 'CLOSED' }
      ]
    case 'EMERGENCY_STOP':
      return [
        { id: 'V-O2-001', state: 'CLOSED' },
        { id: 'V-O2-002', state: 'CLOSED' },
        { id: 'V-O2-003', state: 'OPEN' },
        { id: 'V-H2-001', state: 'CLOSED' },
        { id: 'V-H2-002', state: 'CLOSED' },
        { id: 'V-H2-003', state: 'OPEN' }
      ]
    default:
      return []
  }
}

export const simulationActions = {
  async start() {
    const sessionId = await waveformManager.createSession(`加注任务_${new Date().toLocaleString()}`, {
      config: state.config,
      startTime: Date.now()
    })
    
    setState(produce(s => {
      s.isRunning = true
      s.isPaused = false
      s.startTime = Date.now()
      s.phaseStartTime = Date.now()
      s.currentPhase = 'PRECOOLING'
      s.sessionId = sessionId
      s.elapsedTime = 0
    }))
    
    this.addEvent('SESSION_START', 'INFO', '仿真任务开始', { sessionId })
    
    if (state.config.autoValveControl) {
      this.applyValveConfiguration('PRECOOLING')
    }
  },
  
  pause() {
    setState(produce(s => {
      s.isPaused = true
    }))
    this.addEvent('SIMULATION_PAUSED', 'INFO', '仿真暂停')
  },
  
  resume() {
    setState(produce(s => {
      s.isPaused = false
    }))
    this.addEvent('SIMULATION_RESUMED', 'INFO', '仿真继续')
  },
  
  async stop() {
    setState(produce(s => {
      s.isRunning = false
      s.isPaused = false
      s.currentPhase = 'IDLE'
      s.phaseStartTime = null
      s.activeFaults = []
    }))
    
    faultInjector.clearAllFaults()
    waveformManager.stopAutoWrite()
    
    if (state.sessionId) {
      await waveformManager.endSession(state.sessionId, 'COMPLETED')
    }
    
    this.addEvent('SIMULATION_STOPPED', 'INFO', '仿真停止')
  },
  
  async emergencyStop() {
    setState(produce(s => {
      s.isRunning = false
      s.isPaused = false
      s.currentPhase = 'EMERGENCY_STOP'
      s.phaseStartTime = Date.now()
      s.oxygen.flowRate = 0
      s.hydrogen.flowRate = 0
      s.activeFaults = []
    }))
    
    faultInjector.clearAllFaults()
    waveformManager.stopAutoWrite()
    
    if (state.config.autoValveControl) {
      this.applyValveConfiguration('EMERGENCY_STOP')
    }
    
    if (state.sessionId) {
      await waveformManager.endSession(state.sessionId, 'ABORTED')
    }
    
    this.addEvent('EMERGENCY_STOP', 'CRITICAL', '紧急停车已触发', {
      waterHammerRisk: state.waterHammerRisk,
      temperatureGradient: state.temperatureGradient
    })
  },
  
  setPhase(phase: FillingPhase) {
    const prevPhase = state.currentPhase
    
    setState(produce(s => {
      s.currentPhase = phase
      s.phaseStartTime = Date.now()
    }))
    
    this.addEvent('PHASE_CHANGE', 'INFO', `切换到${FILLING_PHASE_CONFIG[phase].name}阶段`, {
      fromPhase: prevPhase,
      toPhase: phase as any
    })
    
    if (state.config.autoValveControl) {
      this.applyValveConfiguration(phase)
    }
  },
  
  applyValveConfiguration(phase: FillingPhase) {
    const valveConfig = getValvesForPhase(phase)
    setState(produce(s => {
      for (const config of valveConfig) {
        const valve = s.valves.find(v => v.id === config.id)
        if (valve) {
          valve.state = config.state
          valve.position = config.state === 'OPEN' ? 100 : config.state === 'CLOSED' ? 0 : 50
        }
      }
    }))
  },
  
  advancePhase() {
    const currentIndex = PHASE_ORDER.indexOf(state.currentPhase)
    if (currentIndex < PHASE_ORDER.length - 1) {
      this.setPhase(PHASE_ORDER[currentIndex + 1])
    }
  },
  
  checkPhaseTransition(): boolean {
    if (!state.config.autoAdvancePhase) return false
    if (state.currentPhase === 'READY' || state.currentPhase === 'EMERGENCY_STOP') return false
    
    const conditions = PHASE_TRANSITION_CONDITIONS[state.currentPhase]
    if (!conditions) return false
    
    const elapsed = state.phaseStartTime ? Date.now() - state.phaseStartTime : 0
    if (elapsed < conditions.minDuration / state.config.simulationSpeed) return false
    
    const { oxygen, hydrogen } = state
    let allMet = true
    
    if (conditions.conditions.oxygenTemp !== undefined) {
      allMet = allMet && oxygen.temperature <= conditions.conditions.oxygenTemp
    }
    if (conditions.conditions.hydrogenTemp !== undefined) {
      allMet = allMet && hydrogen.temperature <= conditions.conditions.hydrogenTemp
    }
    if (conditions.conditions.oxygenFillLevel !== undefined) {
      allMet = allMet && oxygen.fillLevel >= conditions.conditions.oxygenFillLevel
    }
    if (conditions.conditions.hydrogenFillLevel !== undefined) {
      allMet = allMet && hydrogen.fillLevel >= conditions.conditions.hydrogenFillLevel
    }
    if (conditions.conditions.oxygenPressure !== undefined) {
      allMet = allMet && oxygen.tankPressure >= conditions.conditions.oxygenPressure
    }
    if (conditions.conditions.hydrogenPressure !== undefined) {
      allMet = allMet && hydrogen.tankPressure >= conditions.conditions.hydrogenPressure
    }
    
    if (allMet) {
      this.advancePhase()
      return true
    }
    
    return false
  },
  
  updateCountdown(dt: number) {
    setState(produce(s => {
      s.countdown = Math.max(0, s.countdown - dt)
      s.elapsedTime += dt
    }))
  },
  
  setCountdown(ms: number) {
    setState(produce(s => {
      s.countdown = ms
    }))
  },
  
  updateOxygen(data: Partial<SimulationState['oxygen']>) {
    setState(produce(s => {
      Object.assign(s.oxygen, data)
    }))
  },
  
  updateHydrogen(data: Partial<SimulationState['hydrogen']>) {
    setState(produce(s => {
      Object.assign(s.hydrogen, data)
    }))
  },
  
  setOxygenFlowRate(rate: number) {
    setState(produce(s => {
      s.oxygen.flowRate = clamp(rate, 0, 15)
    }))
  },
  
  setHydrogenFlowRate(rate: number) {
    setState(produce(s => {
      s.hydrogen.flowRate = clamp(rate, 0, 10)
    }))
  },
  
  setValveState(valveId: string, state_: ValveState) {
    setState(produce(s => {
      const valve = s.valves.find(v => v.id === valveId)
      if (valve) {
        valve.state = state_
        valve.position = state_ === 'OPEN' ? 100 : state_ === 'CLOSED' ? 0 : 50
      }
    }))
    this.addEvent('VALVE_CHANGE', 'INFO', `阀门 ${valveId} 状态变更为 ${state_}`)
  },
  
  setWaterHammerRisk(risk: number) {
    setState(produce(s => {
      s.waterHammerRisk = clamp(risk, 0, 100)
    }))
  },
  
  setTemperatureGradient(gradient: number) {
    setState(produce(s => {
      s.temperatureGradient = clamp(gradient, 0, 100)
    }))
  },
  
  setPressureDifference(diff: number) {
    setState(produce(s => {
      s.pressureDifference = clamp(diff, 0, 10)
    }))
  },
  
  calculateDerivedParameters() {
    const { oxygen, hydrogen } = state
    
    const tempGrad = Math.abs(oxygen.temperature - hydrogen.temperature) / 10
    const pressDiff = Math.abs(oxygen.linePressure - hydrogen.linePressure)
    
    const healthFactors = [
      1 - state.waterHammerRisk / 100,
      1 - tempGrad / 50,
      1 - pressDiff / 5
    ]
    const health = healthFactors.reduce((a, b) => a + b, 0) / healthFactors.length * 100
    
    setState(produce(s => {
      s.temperatureGradient = tempGrad
      s.pressureDifference = pressDiff
      s.healthIndex = clamp(health, 0, 100)
    }))
  },
  
  checkSafetyConstraints(): Array<{ type: string; severity: EventSeverity; description: string }> {
    const violations: Array<{ type: string; severity: EventSeverity; description: string }> = []
    const { oxygen, hydrogen, waterHammerRisk, temperatureGradient, pressureDifference } = state
    
    if (waterHammerRisk > 80) {
      violations.push({
        type: 'WATER_HAMMER_CRITICAL',
        severity: 'CRITICAL',
        description: `水锤风险超过安全阈值: ${waterHammerRisk.toFixed(1)}%`
      })
    } else if (waterHammerRisk > 60) {
      violations.push({
        type: 'WATER_HAMMER_WARNING',
        severity: 'WARNING',
        description: `水锤风险偏高: ${waterHammerRisk.toFixed(1)}%`
      })
    }
    
    if (oxygen.temperature > 150) {
      violations.push({
        type: 'OVER_TEMP_O2',
        severity: oxygen.temperature > 200 ? 'ERROR' : 'WARNING',
        description: `氧温过高: ${oxygen.temperature.toFixed(1)}K`
      })
    }
    
    if (hydrogen.temperature > 50) {
      violations.push({
        type: 'OVER_TEMP_H2',
        severity: hydrogen.temperature > 100 ? 'ERROR' : 'WARNING',
        description: `氢温过高: ${hydrogen.temperature.toFixed(1)}K`
      })
    }
    
    if (oxygen.linePressure > 0.8) {
      violations.push({
        type: 'OVER_PRESSURE_O2',
        severity: oxygen.linePressure > 1.0 ? 'ERROR' : 'WARNING',
        description: `氧路压力过高: ${oxygen.linePressure.toFixed(3)}MPa`
      })
    }
    
    if (hydrogen.linePressure > 0.7) {
      violations.push({
        type: 'OVER_PRESSURE_H2',
        severity: hydrogen.linePressure > 0.9 ? 'ERROR' : 'WARNING',
        description: `氢路压力过高: ${hydrogen.linePressure.toFixed(3)}MPa`
      })
    }
    
    if (temperatureGradient > 20) {
      violations.push({
        type: 'TEMP_GRADIENT_HIGH',
        severity: 'WARNING',
        description: `温度梯度过大: ${temperatureGradient.toFixed(2)}K/m`
      })
    }
    
    if (pressureDifference > 0.5) {
      violations.push({
        type: 'PRESS_DIFF_HIGH',
        severity: 'WARNING',
        description: `压力差过大: ${pressureDifference.toFixed(3)}MPa`
      })
    }
    
    const tempDiff = Math.abs(oxygen.temperature - FLUID_PROPERTIES.LOX.boilingPoint)
    if (state.currentPhase !== 'IDLE' && tempDiff > 20 && oxygen.flowRate > 0) {
      violations.push({
        type: 'INSUFFICIENT_PRECooling',
        severity: 'WARNING',
        description: `氧路预冷不充分，与沸点差 ${tempDiff.toFixed(1)}K`
      })
    }
    
    return violations
  },
  
  simulateStep(dt: number) {
    if (!state.isRunning || state.isPaused) return
    
    const actualDt = dt * state.config.simulationSpeed
    const phaseConfig = FILLING_PHASE_CONFIG[state.currentPhase]
    if (!phaseConfig) return
    
    const faultResult = faultInjector.update(actualDt, state)
    
    for (const event of faultResult.events) {
      this.addEvent(event.type, event.severity, event.description)
    }
    
    if (state.config.enableFaultInjection) {
      const randomFault = faultInjector.triggerRandomFault(state.currentPhase, state.config.faultProbability)
      if (randomFault) {
        this.addEvent(
          `FAULT_${randomFault.config.type}`,
          randomFault.config.severity,
          `${randomFault.config.name}: ${randomFault.config.description}`
        )
      }
    }
    
    setState(produce(s => {
      s.activeFaults = faultInjector.getActiveFaults()
    }))
    
    const effects = faultResult.effects
    const dtSeconds = actualDt / 1000
    
    const o2TargetRate = phaseConfig.oxygenFlowRate * effects.oxygenFlowMultiplier
    const h2TargetRate = phaseConfig.hydrogenFlowRate * effects.hydrogenFlowMultiplier
    
    const o2FillRate = (state.oxygen.flowRate * dtSeconds / 100) * effects.oxygenFillRateMultiplier
    const h2FillRate = (state.hydrogen.flowRate * dtSeconds / 50) * effects.hydrogenFillRateMultiplier
    
    setState(produce(s => {
      s.oxygen.flowRate = lerp(s.oxygen.flowRate, o2TargetRate, 0.02)
      s.hydrogen.flowRate = lerp(s.hydrogen.flowRate, h2TargetRate, 0.02)
      
      s.oxygen.fillLevel = clamp(s.oxygen.fillLevel + o2FillRate, 0, s.oxygen.targetLevel)
      s.hydrogen.fillLevel = clamp(s.hydrogen.fillLevel + h2FillRate, 0, s.hydrogen.targetLevel)
      
      const o2TargetTemp = phaseConfig.targetTemp + effects.oxygenTempOffset
      const h2TargetTemp = phaseConfig.targetTemp * 0.25 + effects.hydrogenTempOffset
      
      s.oxygen.temperature = lerp(s.oxygen.temperature, o2TargetTemp, 0.01)
      s.hydrogen.temperature = lerp(s.hydrogen.temperature, h2TargetTemp, 0.01)
      
      s.oxygen.temperature = faultInjector.applySensorNoise(s.oxygen.temperature, effects.sensorNoise)
      s.hydrogen.temperature = faultInjector.applySensorNoise(s.hydrogen.temperature, effects.sensorNoise)
      
      s.oxygen.tankPressure = lerp(s.oxygen.tankPressure, 0.2 + s.oxygen.fillLevel * 0.005, 0.01)
      s.hydrogen.tankPressure = lerp(s.hydrogen.tankPressure, 0.3 + s.hydrogen.fillLevel * 0.007, 0.01)
      
      const o2LineBase = 0.15 + s.oxygen.flowRate * 0.01 + effects.oxygenPressureOffset
      const h2LineBase = 0.2 + s.hydrogen.flowRate * 0.015 + effects.hydrogenPressureOffset
      
      s.oxygen.linePressure = lerp(s.oxygen.linePressure, o2LineBase, 0.05)
      s.hydrogen.linePressure = lerp(s.hydrogen.linePressure, h2LineBase, 0.05)
      
      s.oxygen.linePressure = faultInjector.applySensorNoise(s.oxygen.linePressure, effects.sensorNoise)
      s.hydrogen.linePressure = faultInjector.applySensorNoise(s.hydrogen.linePressure, effects.sensorNoise)
      
      if (s.oxygen.flowRate > 0 || s.hydrogen.flowRate > 0) {
        const baseRisk = (s.oxygen.flowRate + s.hydrogen.flowRate) * 2 + Math.abs(effects.oxygenPressureOffset + effects.hydrogenPressureOffset) * 100
        const noise = (Math.random() - 0.5) * 10
        s.waterHammerRisk = clamp(lerp(s.waterHammerRisk, baseRisk + noise, 0.1), 0, 100)
      } else {
        s.waterHammerRisk = lerp(s.waterHammerRisk, 0, 0.05)
      }
    }))
    
    this.updateCountdown(actualDt)
    this.calculateDerivedParameters()
    
    const violations = this.checkSafetyConstraints()
    for (const violation of violations) {
      this.addEvent(violation.type, violation.severity, violation.description)
    }
    
    for (const violation of violations) {
      if (violation.severity === 'CRITICAL') {
        this.emergencyStop()
        return
      }
    }
    
    this.checkPhaseTransition()
    
    this.persistData()
  },
  
  persistData() {
    const record = {
      timestamp: Date.now(),
      phase: state.currentPhase,
      oxygenTankPressure: state.oxygen.tankPressure,
      hydrogenTankPressure: state.hydrogen.tankPressure,
      oxygenLinePressure: state.oxygen.linePressure,
      hydrogenLinePressure: state.hydrogen.linePressure,
      oxygenTemperature: state.oxygen.temperature,
      hydrogenTemperature: state.hydrogen.temperature,
      oxygenFlowRate: state.oxygen.flowRate,
      hydrogenFlowRate: state.hydrogen.flowRate,
      oxygenFillLevel: state.oxygen.fillLevel,
      hydrogenFillLevel: state.hydrogen.fillLevel,
      valveStates: JSON.stringify(state.valves.map(v => ({ id: v.id, state: v.state, position: v.position }))),
      waterHammerRisk: state.waterHammerRisk,
      temperatureGradient: state.temperatureGradient,
      pressureDifference: state.pressureDifference
    }
    
    waveformManager.addRecord(record)
  },
  
  addEvent(
    type: string,
    severity: EventSeverity,
    description: string,
    parameters?: Record<string, number | string>
  ) {
    setState(produce(s => {
      s.events.unshift({
        id: Date.now(),
        eventTimestamp: Date.now(),
        eventType: type,
        eventSeverity: severity,
        eventDescription: description,
        relatedParameters: JSON.stringify(parameters || {}),
        acknowledged: false
      })
      
      if (s.events.length > 100) {
        s.events.pop()
      }
    }))
    
    waveformManager.addEvent(type, severity, description, parameters as Record<string, number>).catch(() => {})
  },
  
  acknowledgeEvent(eventId: number) {
    setState(produce(s => {
      const event = s.events.find(e => e.id === eventId)
      if (event) {
        event.acknowledged = true
      }
    }))
  },
  
  injectFault(faultType: FaultType, targetLine?: 'OXYGEN' | 'HYDROGEN' | 'BOTH') {
    const fault = faultInjector.injectFault(faultType, targetLine)
    this.addEvent(
      `MANUAL_FAULT_${faultType}`,
      fault.config.severity,
      `手动注入故障: ${fault.config.name}`,
      { faultId: fault.id, intensity: fault.config.intensity }
    )
    return fault
  },
  
  clearFault(faultId: string) {
    const success = faultInjector.clearFault(faultId)
    if (success) {
      this.addEvent('FAULT_CLEARED', 'INFO', `故障已清除: ${faultId}`)
    }
    return success
  },
  
  clearAllFaults() {
    faultInjector.clearAllFaults()
    this.addEvent('ALL_FAULTS_CLEARED', 'INFO', '所有故障已清除')
  },
  
  updateConfig(config: Partial<SimulationConfig>) {
    setState(produce(s => {
      Object.assign(s.config, config)
    }))
    
    if (config.faultProbability !== undefined) {
      faultInjector.setProbabilityMultiplier(config.faultProbability / 0.3)
    }
  },
  
  setSimulationSpeed(speed: number) {
    this.updateConfig({ simulationSpeed: clamp(speed, 0.1, 16) })
  },
  
  async reset() {
    waveformManager.stopAutoWrite()
    
    if (state.sessionId && state.isRunning) {
      await waveformManager.endSession(state.sessionId, 'ABORTED')
    }
    
    faultInjector.reset()
    
    setState({
      ...initialStoreState,
      config: { ...state.config }
    })
    
    waveformManager.clearAll().catch(() => {})
  }
}
