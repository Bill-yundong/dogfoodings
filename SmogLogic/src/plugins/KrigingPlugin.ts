import type { ComputationPlugin, ExecutionContext, InterpolationResult, MonitoringStation } from '../types'
import { asyncKrigingInterpolation } from '../core/Kriging'

interface KrigingInput {
  stations: MonitoringStation[]
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }
  resolution?: number
}

export const KrigingPlugin: ComputationPlugin<KrigingInput, InterpolationResult> = {
  id: 'kriging-interpolation',
  name: '克里金插值算法',
  version: '1.0.0',
  description: '基于变异函数理论的空间插值算法，适用于 PM2.5 浓度场重构',
  type: 'interpolation',

  validate(input: KrigingInput): boolean {
    if (!input.stations || input.stations.length < 3) {
      return false
    }
    if (!input.bounds) {
      return false
    }
    return true
  },

  async execute(input: KrigingInput, context?: ExecutionContext): Promise<InterpolationResult> {
    return asyncKrigingInterpolation(
      input.stations,
      input.bounds,
      input.resolution ?? 0.05,
      context?.progress
    )
  }
}
