import type { BoundingBox, PointCloudData, DownsamplingConfig, VoxelGrid } from '@/types'

export function getVoxelKey(x: number, y: number, z: number, voxelSize: number): string {
  const vx = Math.floor(x / voxelSize)
  const vy = Math.floor(y / voxelSize)
  const vz = Math.floor(z / voxelSize)
  return `${vx},${vy},${vz}`
}

export function parseVoxelKey(key: string, voxelSize: number): number[] {
  const [vx, vy, vz] = key.split(',').map(Number)
  return [
    (vx + 0.5) * voxelSize,
    (vy + 0.5) * voxelSize,
    (vz + 0.5) * voxelSize
  ]
}

export function calculateBounds(points: Float32Array): BoundingBox {
  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity

  for (let i = 0; i < points.length; i += 3) {
    const x = points[i]
    const y = points[i + 1]
    const z = points[i + 2]
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (z < minZ) minZ = z
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
    if (z > maxZ) maxZ = z
  }

  return { minX, minY, minZ, maxX, maxY, maxZ }
}

export function normalizeCoordinates(
  points: Float32Array,
  bounds: BoundingBox
): { normalized: Float32Array; offset: number[]; scale: number } {
  const offset = [
    (bounds.maxX + bounds.minX) / 2,
    (bounds.maxY + bounds.minY) / 2,
    (bounds.maxZ + bounds.minZ) / 2
  ]

  const scale = Math.max(
    bounds.maxX - bounds.minX,
    bounds.maxY - bounds.minY,
    bounds.maxZ - bounds.minZ
  ) || 1

  const normalized = new Float32Array(points.length)
  for (let i = 0; i < points.length; i += 3) {
    normalized[i] = (points[i] - offset[0]) / scale
    normalized[i + 1] = (points[i + 1] - offset[1]) / scale
    normalized[i + 2] = (points[i + 2] - offset[2]) / scale
  }

  return { normalized, offset, scale }
}

export function buildVoxelGrid(
  points: Float32Array,
  colors: Uint8Array | undefined,
  intensities: Float32Array | undefined,
  voxelSize: number
): VoxelGrid {
  const grid: VoxelGrid = {}

  for (let i = 0; i < points.length; i += 3) {
    const x = points[i]
    const y = points[i + 1]
    const z = points[i + 2]

    const key = getVoxelKey(x, y, z, voxelSize)

    if (!grid[key]) {
      grid[key] = {
        points: [],
        center: [0, 0, 0],
        count: 0
      }
    }

    const pointData = [x, y, z]
    if (colors) {
      const ci = (i / 3) * 4
      pointData.push(colors[ci], colors[ci + 1], colors[ci + 2], colors[ci + 3])
    }
    if (intensities) {
      pointData.push(intensities[i / 3])
    }

    grid[key].points.push(pointData)
    grid[key].count++
  }

  for (const key in grid) {
    const voxel = grid[key]
    let sumX = 0, sumY = 0, sumZ = 0

    for (const p of voxel.points) {
      sumX += p[0]
      sumY += p[1]
      sumZ += p[2]
    }

    voxel.center = [
      sumX / voxel.count,
      sumY / voxel.count,
      sumZ / voxel.count
    ]
  }

  return grid
}

export function downsampleFromVoxelGrid(
  grid: VoxelGrid,
  config: DownsamplingConfig,
  originalColors?: Uint8Array,
  originalIntensities?: Float32Array
): PointCloudData {
  const voxelKeys = Object.keys(grid)
  const hasColors = originalColors !== undefined
  const hasIntensities = originalIntensities !== undefined
  const hasColorData = grid[voxelKeys[0]]?.points[0]?.length > 3

  const points = new Float32Array(voxelKeys.length * 3)
  const colors = hasColors ? new Uint8Array(voxelKeys.length * 4) : undefined
  const intensities = hasIntensities ? new Float32Array(voxelKeys.length) : undefined

  let outIndex = 0

  for (const key of voxelKeys) {
    const voxel = grid[key]

    if (voxel.count < 1) continue

    if (config.intensityFilter && hasIntensities && hasColorData) {
      let hasValidIntensity = false
      for (const p of voxel.points) {
        const intensity = p[7]
        if (intensity >= config.intensityFilter.min && intensity <= config.intensityFilter.max) {
          hasValidIntensity = true
          break
        }
      }
      if (!hasValidIntensity) continue
    }

    const center = voxel.center
    points[outIndex * 3] = center[0]
    points[outIndex * 3 + 1] = center[1]
    points[outIndex * 3 + 2] = center[2]

    if (colors && hasColorData) {
      let r = 0, g = 0, b = 0, a = 0
      for (const p of voxel.points) {
        r += p[3]
        g += p[4]
        b += p[5]
        a += p[6]
      }
      colors[outIndex * 4] = Math.round(r / voxel.count)
      colors[outIndex * 4 + 1] = Math.round(g / voxel.count)
      colors[outIndex * 4 + 2] = Math.round(b / voxel.count)
      colors[outIndex * 4 + 3] = Math.round(a / voxel.count)
    } else if (colors) {
      colors[outIndex * 4] = 100
      colors[outIndex * 4 + 1] = 200
      colors[outIndex * 4 + 2] = 255
      colors[outIndex * 4 + 3] = 255
    }

    if (intensities && hasColorData) {
      let sumIntensity = 0
      for (const p of voxel.points) {
        sumIntensity += p[7] ?? 0.5
      }
      intensities[outIndex] = sumIntensity / voxel.count
    } else if (intensities) {
      intensities[outIndex] = 0.5
    }

    outIndex++
  }

  const finalPoints = points.slice(0, outIndex * 3)
  const finalColors = colors ? colors.slice(0, outIndex * 4) : undefined
  const finalIntensities = intensities ? intensities.slice(0, outIndex) : undefined
  const bounds = calculateBounds(finalPoints)

  return {
    points: finalPoints,
    colors: finalColors,
    intensities: finalIntensities,
    pointCount: outIndex,
    bounds
  }
}

export function voxelDownsample(
  inputData: PointCloudData,
  config: DownsamplingConfig,
  onProgress?: (progress: number) => void
): PointCloudData {
  const totalPoints = inputData.pointCount
  let processedPoints = 0

  const bounds = inputData.bounds || calculateBounds(inputData.points)

  const adaptiveVoxelSize = config.voxelSize > 0
    ? config.voxelSize
    : Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY, bounds.maxZ - bounds.minZ) / 200

  const updateProgress = (current: number) => {
    processedPoints = current
    if (onProgress) {
      onProgress(Math.min(processedPoints / totalPoints, 1) * 100)
    }
  }

  updateProgress(0)

  const grid = buildVoxelGrid(
    inputData.points,
    inputData.colors,
    inputData.intensities,
    adaptiveVoxelSize
  )

  updateProgress(Math.floor(totalPoints * 0.6))

  const result = downsampleFromVoxelGrid(
    grid,
    config,
    inputData.colors,
    inputData.intensities
  )

  updateProgress(totalPoints)

  return result
}
