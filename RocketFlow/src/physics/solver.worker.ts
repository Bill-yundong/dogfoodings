import { TwoPhaseSolver } from './TwoPhaseSolver'
import { WaterHammerPredictor } from './WaterHammerPredictor'
import type { SolverConfig, SolverOutput } from '@/types'
import { FLUID_PROPERTIES } from '@/types'

interface WorkerMessage {
  type: 'CONFIGURE' | 'START' | 'STOP' | 'SET_FLOW_RATE'
  config?: SolverConfig
  flowRate?: number
  fluidType?: 'LOX' | 'LH2'
}

interface WorkerOutput {
  type: 'SOLVER_DATA' | 'PREDICTION' | 'STATUS'
  data?: SolverOutput
  prediction?: {
    riskLevel: string
    riskScore: number
    timeToImpact: number
    peakPressure: number
  }
  status?: string
}

const o2Solver = new TwoPhaseSolver()
const h2Solver = new TwoPhaseSolver()
const o2Predictor = new WaterHammerPredictor()
const h2Predictor = new WaterHammerPredictor()

let isRunning = false
let o2Config: SolverConfig | null = null
let h2Config: SolverConfig | null = null

const postOutput = (output: WorkerOutput) => {
  (self as unknown as Worker).postMessage(output)
}

o2Solver.onData((data) => {
  o2Predictor.update(data)
  const props = FLUID_PROPERTIES.LOX
  const prediction = o2Predictor.predict(props.soundSpeed, o2Config?.pipeLength || 100)
  
  postOutput({
    type: 'SOLVER_DATA',
    data: { ...data, timestamp: performance.now() }
  })
  
  postOutput({
    type: 'PREDICTION',
    prediction: {
      riskLevel: prediction.riskLevel,
      riskScore: prediction.riskScore,
      timeToImpact: prediction.timeToImpact,
      peakPressure: prediction.peakPressure
    }
  })
})

h2Solver.onData((data) => {
  h2Predictor.update(data)
  const props = FLUID_PROPERTIES.LH2
  const prediction = h2Predictor.predict(props.soundSpeed, h2Config?.pipeLength || 100)
  
  postOutput({
    type: 'SOLVER_DATA',
    data: { ...data, timestamp: performance.now() }
  })
  
  postOutput({
    type: 'PREDICTION',
    prediction: {
      riskLevel: prediction.riskLevel,
      riskScore: prediction.riskScore,
      timeToImpact: prediction.timeToImpact,
      peakPressure: prediction.peakPressure
    }
  })
})

const handleMessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type, config, flowRate, fluidType } = e.data
  
  switch (type) {
    case 'CONFIGURE':
      if (config) {
        if (config.fluidType === 'LOX') {
          o2Config = config
          o2Solver.configure(config)
        } else {
          h2Config = config
          h2Solver.configure(config)
        }
        postOutput({ type: 'STATUS', status: 'CONFIGURED' })
      }
      break
      
    case 'START':
      if (!isRunning) {
        isRunning = true
        await Promise.all([
          o2Solver.start(),
          h2Solver.start()
        ])
        postOutput({ type: 'STATUS', status: 'RUNNING' })
      }
      break
      
    case 'STOP':
      isRunning = false
      o2Solver.stop()
      h2Solver.stop()
      o2Predictor.clear()
      h2Predictor.clear()
      postOutput({ type: 'STATUS', status: 'STOPPED' })
      break
      
    case 'SET_FLOW_RATE':
      if (flowRate !== undefined && fluidType) {
        if (fluidType === 'LOX' && o2Config) {
          o2Config.massFlowRate = flowRate
          o2Solver.configure(o2Config)
        } else if (fluidType === 'LH2' && h2Config) {
          h2Config.massFlowRate = flowRate
          h2Solver.configure(h2Config)
        }
      }
      break
  }
}

(self as unknown as Worker).onmessage = handleMessage
