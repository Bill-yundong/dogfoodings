import { RainflowCycle, LoadDataPoint } from '../types'

export class AsyncRainflowCounter {
  private buffer: number[] = []
  private cycles: RainflowCycle[] = []
  private readonly batchSize: number = 1000
  private processing: boolean = false

  constructor(batchSize: number = 1000) {
    this.batchSize = batchSize
  }

  async processLoadData(data: LoadDataPoint[]): Promise<RainflowCycle[]> {
    const loads = data.map(d => d.load)
    this.buffer.push(...loads)
    
    if (this.buffer.length >= this.batchSize && !this.processing) {
      return this.processBuffer()
    }
    
    return []
  }

  private async processBuffer(): Promise<RainflowCycle[]> {
    this.processing = true
    
    try {
      await new Promise(resolve => setTimeout(resolve, 0))
      
      const newCycles = this.rainflowCount(this.buffer)
      this.cycles.push(...newCycles)
      
      this.buffer = this.getResidualPoints()
      
      return newCycles
    } finally {
      this.processing = false
    }
  }

  private rainflowCount(loads: number[]): RainflowCycle[] {
    const cycles: RainflowCycle[] = []
    const extrema = this.findExtrema(loads)
    
    if (extrema.length < 3) return cycles

    let i = 0
    while (i < extrema.length - 2) {
      const x = extrema[i]
      const y = extrema[i + 1]
      const z = extrema[i + 2]

      const range1 = Math.abs(y - x)
      const range2 = Math.abs(z - y)

      if (range1 <= range2) {
        const cycleRange = range1
        const cycleMean = (x + y) / 2
        
        cycles.push({
          range: cycleRange,
          mean: cycleMean,
          count: 0.5,
          startIndex: i,
          endIndex: i + 1
        })

        extrema.splice(i, 1)
        if (i > 0) i--
      } else {
        i++
      }
    }

    for (let j = 0; j < extrema.length - 1; j++) {
      const cycleRange = Math.abs(extrema[j + 1] - extrema[j])
      const cycleMean = (extrema[j] + extrema[j + 1]) / 2
      
      cycles.push({
        range: cycleRange,
        mean: cycleMean,
        count: 0.5,
        startIndex: j,
        endIndex: j + 1
      })
    }

    return this.mergeCycles(cycles)
  }

  private findExtrema(loads: number[]): number[] {
    if (loads.length < 3) return loads

    const extrema: number[] = [loads[0]]
    
    for (let i = 1; i < loads.length - 1; i++) {
      const prev = loads[i - 1]
      const curr = loads[i]
      const next = loads[i + 1]

      const isMax = curr >= prev && curr >= next
      const isMin = curr <= prev && curr <= next

      if (isMax || isMin) {
        extrema.push(curr)
      }
    }

    extrema.push(loads[loads.length - 1])
    return extrema
  }

  private mergeCycles(cycles: RainflowCycle[]): RainflowCycle[] {
    const cycleMap = new Map<string, RainflowCycle>()

    for (const cycle of cycles) {
      const key = `${cycle.range.toFixed(2)}_${cycle.mean.toFixed(2)}`
      
      if (cycleMap.has(key)) {
        const existing = cycleMap.get(key)!
        existing.count += cycle.count
      } else {
        cycleMap.set(key, { ...cycle })
      }
    }

    return Array.from(cycleMap.values())
  }

  private getResidualPoints(): number[] {
    if (this.buffer.length < 100) {
      return [...this.buffer]
    }
    return this.buffer.slice(-50)
  }

  getCycles(): RainflowCycle[] {
    return [...this.cycles]
  }

  clear(): void {
    this.buffer = []
    this.cycles = []
  }

  async flush(): Promise<RainflowCycle[]> {
    if (this.buffer.length > 0) {
      const remaining = await this.processBuffer()
      return [...this.cycles, ...remaining]
    }
    return [...this.cycles]
  }
}

export async function processLoadStream(
  dataStream: AsyncIterable<LoadDataPoint[]>,
  onBatchComplete?: (cycles: RainflowCycle[]) => void
): Promise<RainflowCycle[]> {
  const counter = new AsyncRainflowCounter(1000)
  const allCycles: RainflowCycle[] = []

  for await (const batch of dataStream) {
    const cycles = await counter.processLoadData(batch)
    if (cycles.length > 0 && onBatchComplete) {
      onBatchComplete(cycles)
    }
    allCycles.push(...cycles)
  }

  const finalCycles = await counter.flush()
  allCycles.push(...finalCycles)

  return allCycles
}
