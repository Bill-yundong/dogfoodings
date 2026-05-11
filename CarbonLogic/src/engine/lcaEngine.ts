import { LCARepository } from '@/database/repository'
import type { LCABreakdown, LCAStage, SimulationParams, SimulationResult } from '@/types/carbon'

export interface LCAJob {
  productId: string
  productName: string
  parameters: {
    productionVolume: number
    materialWeight: number
    transportDistance: number
    lifespan: number
    recyclability: number
  }
}

export interface StagedResult<T> {
  stage: string
  progress: number
  result?: T
  error?: string
}

class LCAEngine {
  private isRunning = false
  private jobQueue: Array<{ jobId: string; job: LCAJob }> = []
  private listeners: Map<string, (update: StagedResult<any>) => void> = new Map()

  private emissionFactors = {
    rawMaterials: {
      steel: 2.5,
      aluminum: 11.0,
      plastic: 3.8,
      copper: 4.0,
      glass: 0.8
    },
    manufacturing: {
      electricity: 0.5,
      heat: 0.3,
      cooling: 0.2
    },
    transport: {
      road: 0.2,
      rail: 0.08,
      sea: 0.05,
      air: 2.1
    },
    use: {
      energyConsumption: 0.45
    },
    endOfLife: {
      landfill: 0.1,
      recycling: -0.5,
      incineration: 0.3
    }
  }

  addJob(job: LCAJob): string {
    const jobId = crypto.randomUUID()
    this.jobQueue.push({ jobId, job })
    this.processQueue()
    return jobId
  }

  addListener(jobId: string, callback: (update: StagedResult<any>) => void): void {
    this.listeners.set(jobId, callback)
  }

  removeListener(jobId: string): void {
    this.listeners.delete(jobId)
  }

  private async processQueue(): Promise<void> {
    if (this.isRunning || this.jobQueue.length === 0) return
    this.isRunning = true

    while (this.jobQueue.length > 0) {
      const { jobId, job } = this.jobQueue.shift()!
      await this.executeJob(jobId, job)
    }

    this.isRunning = false
  }

  private async executeJob(jobId: string, job: LCAJob): Promise<void> {
    await LCARepository.create({
      productId: job.productId,
      productName: job.productName,
      status: 'calculating',
      stages: [],
      totalEmissions: 0,
      breakdown: {
        rawMaterials: 0,
        manufacturing: 0,
        transport: 0,
        use: 0,
        endOfLife: 0
      }
    })

    const stages: LCAStage[] = []
    const breakdown: LCABreakdown = {
      rawMaterials: 0,
      manufacturing: 0,
      transport: 0,
      use: 0,
      endOfLife: 0
    }

    try {
      const materialResult = await this.calculateStage(
        '原材料获取',
        () => this.calculateRawMaterials(job),
        jobId
      )
      stages.push(materialResult.stageData)
      breakdown.rawMaterials = materialResult.emissions

      const manufacturingResult = await this.calculateStage(
        '生产制造',
        () => this.calculateManufacturing(job),
        jobId
      )
      stages.push(manufacturingResult.stageData)
      breakdown.manufacturing = manufacturingResult.emissions

      const transportResult = await this.calculateStage(
        '运输配送',
        () => this.calculateTransport(job),
        jobId
      )
      stages.push(transportResult.stageData)
      breakdown.transport = transportResult.emissions

      const useResult = await this.calculateStage(
        '使用阶段',
        () => this.calculateUsePhase(job),
        jobId
      )
      stages.push(useResult.stageData)
      breakdown.use = useResult.emissions

      const eolResult = await this.calculateStage(
        '生命周期末期',
        () => this.calculateEndOfLife(job),
        jobId
      )
      stages.push(eolResult.stageData)
      breakdown.endOfLife = eolResult.emissions

      const totalEmissions = Object.values(breakdown).reduce((sum, val) => sum + val, 0)

      const finalStages = stages.map(s => ({
        ...s,
        percentage: (s.emissions / totalEmissions) * 100
      }))

      await LCARepository.updateResult(jobId, {
        status: 'completed',
        stages: finalStages,
        totalEmissions,
        breakdown
      })

      this.notifyUpdate(jobId, {
        stage: 'complete',
        progress: 100,
        result: { totalEmissions, breakdown, stages: finalStages }
      })

    } catch (error) {
      await LCARepository.updateStatus(jobId, 'failed')
      this.notifyUpdate(jobId, {
        stage: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  private async calculateStage(
    stageName: string,
    calculation: () => Promise<number>,
    calcId: string
  ): Promise<{ stageData: LCAStage; emissions: number }> {
    const startTime = Date.now()

    this.notifyUpdate(calcId, {
      stage: stageName,
      progress: 0
    })

    for (let i = 0; i <= 100; i += 20) {
      await this.delay(100)
      this.notifyUpdate(calcId, {
        stage: stageName,
        progress: i
      })
    }

    const emissions = await calculation()
    const duration = Date.now() - startTime

    this.notifyUpdate(calcId, {
      stage: stageName,
      progress: 100,
      result: { emissions, duration }
    })

    return {
      stageData: {
        name: stageName,
        emissions,
        percentage: 0,
        duration
      },
      emissions
    }
  }

  private async calculateRawMaterials(job: LCAJob): Promise<number> {
    await this.delay(300)
    const baseEmission = job.parameters.materialWeight * this.emissionFactors.rawMaterials.steel
    return baseEmission * job.parameters.productionVolume
  }

  private async calculateManufacturing(job: LCAJob): Promise<number> {
    await this.delay(400)
    const energyPerUnit = 100
    return job.parameters.productionVolume * energyPerUnit * this.emissionFactors.manufacturing.electricity
  }

  private async calculateTransport(job: LCAJob): Promise<number> {
    await this.delay(200)
    return job.parameters.transportDistance * job.parameters.productionVolume * this.emissionFactors.transport.road
  }

  private async calculateUsePhase(job: LCAJob): Promise<number> {
    await this.delay(350)
    const annualConsumption = 50
    return job.parameters.productionVolume * annualConsumption * job.parameters.lifespan * this.emissionFactors.use.energyConsumption
  }

  private async calculateEndOfLife(job: LCAJob): Promise<number> {
    await this.delay(150)
    const recycled = job.parameters.productionVolume * job.parameters.recyclability
    const landfilled = job.parameters.productionVolume * (1 - job.parameters.recyclability)
    return recycled * this.emissionFactors.endOfLife.recycling + landfilled * this.emissionFactors.endOfLife.landfill
  }

  private notifyUpdate(jobId: string, update: StagedResult<any>): void {
    const callback = this.listeners.get(jobId)
    if (callback) {
      callback(update)
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async simulateReduction(
    baseEmissions: number,
    params: SimulationParams,
    scenarioName: string
  ): Promise<SimulationResult> {
    let simulatedEmissions = baseEmissions

    if (params.energyEfficiency) {
      simulatedEmissions *= (1 - params.energyEfficiency / 100)
    }

    if (params.renewableRatio) {
      simulatedEmissions *= (1 - params.renewableRatio / 200)
    }

    if (params.supplyChainOptimization) {
      simulatedEmissions *= (1 - params.supplyChainOptimization / 150)
    }

    if (params.productionOptimization) {
      simulatedEmissions *= (1 - params.productionOptimization / 120)
    }

    const reductionPercentage = ((baseEmissions - simulatedEmissions) / baseEmissions) * 100

    return {
      id: crypto.randomUUID(),
      name: scenarioName,
      timestamp: new Date().toISOString(),
      baseEmissions,
      simulatedEmissions,
      reductionPercentage,
      parameters: params,
      scenario: scenarioName
    }
  }
}

export const lcaEngine = new LCAEngine()
