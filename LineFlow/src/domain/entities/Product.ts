export enum ProductStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED'
}

export interface ProcessStep {
  workstationId: string
  startTime: Date
  endTime?: Date
  operator?: string
  qualityResult?: QualityResult
}

export interface QualityResult {
  passed: boolean
  defects?: string[]
  inspector?: string
}

export class Product {
  public id: string
  public serialNumber: string
  public status: ProductStatus
  public currentStationIndex: number
  public entryTime: Date
  public exitTime?: Date
  public processSteps: ProcessStep[]
  public priority: number

  constructor(props: {
    id: string
    serialNumber: string
    priority?: number
  }) {
    this.id = props.id
    this.serialNumber = props.serialNumber
    this.status = ProductStatus.PENDING
    this.currentStationIndex = 0
    this.entryTime = new Date()
    this.processSteps = []
    this.priority = props.priority || 1
  }

  startProcessing(workstationId: string, operator?: string): void {
    this.status = ProductStatus.PROCESSING
    this.processSteps.push({
      workstationId,
      startTime: new Date(),
      operator
    })
  }

  completeStep(qualityResult?: QualityResult): void {
    const lastStep = this.processSteps[this.processSteps.length - 1]
    if (lastStep) {
      lastStep.endTime = new Date()
      lastStep.qualityResult = qualityResult
    }
    this.currentStationIndex++
  }

  complete(): void {
    this.status = ProductStatus.COMPLETED
    this.exitTime = new Date()
  }

  reject(defects: string[]): void {
    this.status = ProductStatus.REJECTED
    this.exitTime = new Date()
    const lastStep = this.processSteps[this.processSteps.length - 1]
    if (lastStep) {
      lastStep.qualityResult = { passed: false, defects }
    }
  }

  getCycleTime(): number {
    if (!this.exitTime) return 0
    return (this.exitTime.getTime() - this.entryTime.getTime()) / 1000
  }

  getProcessingTime(): number {
    return this.processSteps.reduce((total, step) => {
      if (step.endTime) {
        return total + (step.endTime.getTime() - step.startTime.getTime()) / 1000
      }
      return total
    }, 0)
  }

  getWaitingTime(): number {
    return this.getCycleTime() - this.getProcessingTime()
  }

  getCurrentStep(): ProcessStep | undefined {
    return this.processSteps[this.processSteps.length - 1]
  }

  isInProgress(): boolean {
    return this.status === ProductStatus.PROCESSING
  }

  isCompleted(): boolean {
    return this.status === ProductStatus.COMPLETED
  }

  isRejected(): boolean {
    return this.status === ProductStatus.REJECTED
  }

  clone(): Product {
    const p = new Product({
      id: this.id,
      serialNumber: this.serialNumber,
      priority: this.priority
    })
    p.status = this.status
    p.currentStationIndex = this.currentStationIndex
    p.entryTime = new Date(this.entryTime.getTime())
    p.exitTime = this.exitTime ? new Date(this.exitTime.getTime()) : undefined
    p.processSteps = this.processSteps.map(s => ({
      ...s,
      startTime: new Date(s.startTime.getTime()),
      endTime: s.endTime ? new Date(s.endTime.getTime()) : undefined
    }))
    return p
  }
}
