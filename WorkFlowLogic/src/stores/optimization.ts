import { createStore } from 'solid-js/store'
import type { OptimizationWeights, TimeSliceAllocation, EfficiencyRecord } from '~/types'

interface OptimizationState {
  weights: OptimizationWeights
  allocations: TimeSliceAllocation[]
}

const [optimizationState, setOptimizationState] = createStore<OptimizationState>({
  weights: {
    urgency: 0.3,
    importance: 0.3,
    focusNeed: 0.25,
    deadline: 0.15,
  },
  allocations: [],
})

export function updateWeights(weights: Partial<OptimizationWeights>) {
  setOptimizationState("weights", weights)
}

export function setAllocations(allocations: TimeSliceAllocation[]) {
  setOptimizationState("allocations", allocations)
}

export { optimizationState }
