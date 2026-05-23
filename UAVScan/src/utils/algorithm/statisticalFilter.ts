import type { PointCloudData, BoundingBox } from '@/types'

function squaredDistance(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): number {
  const dx = x1 - x2
  const dy = y1 - y2
  const dz = z1 - z2
  return dx * dx + dy * dy + dz * dz
}

export function buildSpatialIndex(
  points: Float32Array,
  gridSize: number
): Map<string, number[]> {
  const index = new Map<string, number[]>()

  for (let i = 0; i < points.length; i += 3) {
    const gx = Math.floor(points[i] / gridSize)
    const gy = Math.floor(points[i + 1] / gridSize)
    const gz = Math.floor(points[i + 2] / gridSize)
    const key = `${gx},${gy},${gz}`

    if (!index.has(key)) {
      index.set(key, [])
    }
    index.get(key)!.push(Math.floor(i / 3))
  }

  return index
}

export function getNeighborCells(gx: number, gy: number, gz: number, radius: number): string[] {
  const neighbors: string[] = []
  const gr = Math.ceil(radius)

  for (let x = gx - gr; x <= gx + gr; x++) {
    for (let y = gy - gr; y <= gy + gr; y++) {
      for (let z = gz - gr; z <= gz + gr; z++) {
        neighbors.push(`${x},${y},${z}`)
      }
    }
  }

  return neighbors
}

export function findKNearestNeighbors(
  points: Float32Array,
  pointIndex: number,
  k: number,
  spatialIndex: Map<string, number[]>,
  gridSize: number
): { index: number; distance: number }[] {
  const px = points[pointIndex * 3]
  const py = points[pointIndex * 3 + 1]
  const pz = points[pointIndex * 3 + 2]

  const gx = Math.floor(px / gridSize)
  const gy = Math.floor(py / gridSize)
  const gz = Math.floor(pz / gridSize)

  const neighbors: { index: number; distance: number }[] = []
  let searchRadius = 1

  while (neighbors.length < k) {
    const cellKeys = getNeighborCells(gx, gy, gz, searchRadius)

    for (const key of cellKeys) {
      const cell = spatialIndex.get(key)
      if (!cell) continue

      for (const idx of cell) {
        if (idx === pointIndex) continue

        const dist = squaredDistance(
          px, py, pz,
          points[idx * 3],
          points[idx * 3 + 1],
          points[idx * 3 + 2]
        )

        if (neighbors.length < k) {
          neighbors.push({ index: idx, distance: Math.sqrt(dist) })
          neighbors.sort((a, b) => a.distance - b.distance)
        } else if (dist < neighbors[neighbors.length - 1].distance * neighbors[neighbors.length - 1].distance) {
          neighbors[neighbors.length - 1] = { index: idx, distance: Math.sqrt(dist) }
          neighbors.sort((a, b) => a.distance - b.distance)
        }
      }
    }

    searchRadius++
    if (searchRadius > 10) break
  }

  return neighbors
}

export function calculateMeanDistance(
  points: Float32Array,
  k: number = 5,
  onProgress?: (progress: number) => void
): { mean: number; std: number; distances: Float32Array } {
  const pointCount = Math.floor(points.length / 3)
  const distances = new Float32Array(pointCount)

  const bounds = calculateBounds(points)
  const gridSize = Math.max(
    (bounds.maxX - bounds.minX) / 50,
    (bounds.maxY - bounds.minY) / 50,
    (bounds.maxZ - bounds.minZ) / 50
  )

  const spatialIndex = buildSpatialIndex(points, gridSize)

  for (let i = 0; i < pointCount; i++) {
    const neighbors = findKNearestNeighbors(points, i, k, spatialIndex, gridSize)
    if (neighbors.length > 0) {
      const sum = neighbors.reduce((acc, n) => acc + n.distance, 0)
      distances[i] = sum / neighbors.length
    } else {
      distances[i] = Infinity
    }

    if (onProgress && i % Math.floor(pointCount / 100) === 0) {
      onProgress((i / pointCount) * 50)
    }
  }

  let mean = 0
  let validCount = 0
  for (let i = 0; i < pointCount; i++) {
    if (isFinite(distances[i])) {
      mean += distances[i]
      validCount++
    }
  }
  mean /= validCount

  let variance = 0
  for (let i = 0; i < pointCount; i++) {
    if (isFinite(distances[i])) {
      variance += (distances[i] - mean) ** 2
    }
  }
  variance /= validCount
  const std = Math.sqrt(variance)

  return { mean, std, distances }
}

export function statisticalOutlierRemoval(
  inputData: PointCloudData,
  k: number = 5,
  stdThreshold: number = 2.0,
  onProgress?: (progress: number) => void
): PointCloudData {
  const { mean, std, distances } = calculateMeanDistance(
    inputData.points,
    k,
    onProgress
  )

  const maxDistance = mean + stdThreshold * std
  const pointCount = inputData.pointCount
  const hasColors = inputData.colors !== undefined
  const hasIntensities = inputData.intensities !== undefined

  const keepMask = new Uint8Array(pointCount)
  let keepCount = 0

  for (let i = 0; i < pointCount; i++) {
    if (isFinite(distances[i]) && distances[i] <= maxDistance) {
      keepMask[i] = 1
      keepCount++
    }

    if (onProgress && i % Math.floor(pointCount / 100) === 0) {
      onProgress(50 + (i / pointCount) * 50)
    }
  }

  const outPoints = new Float32Array(keepCount * 3)
  const outColors = hasColors ? new Uint8Array(keepCount * 4) : undefined
  const outIntensities = hasIntensities ? new Float32Array(keepCount) : undefined

  let outIdx = 0
  for (let i = 0; i < pointCount; i++) {
    if (keepMask[i]) {
      outPoints[outIdx * 3] = inputData.points[i * 3]
      outPoints[outIdx * 3 + 1] = inputData.points[i * 3 + 1]
      outPoints[outIdx * 3 + 2] = inputData.points[i * 3 + 2]

      if (outColors && inputData.colors) {
        outColors[outIdx * 4] = inputData.colors[i * 4]
        outColors[outIdx * 4 + 1] = inputData.colors[i * 4 + 1]
        outColors[outIdx * 4 + 2] = inputData.colors[i * 4 + 2]
        outColors[outIdx * 4 + 3] = inputData.colors[i * 4 + 3]
      }

      if (outIntensities && inputData.intensities) {
        outIntensities[outIdx] = inputData.intensities[i]
      }

      outIdx++
    }
  }

  const bounds = calculateBounds(outPoints)

  if (onProgress) {
    onProgress(100)
  }

  return {
    points: outPoints,
    colors: outColors,
    intensities: outIntensities,
    pointCount: keepCount,
    bounds
  }
}

export function calculateBounds(points: Float32Array): BoundingBox {
  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity

  for (let i = 0; i < points.length; i += 3) {
    minX = Math.min(minX, points[i])
    minY = Math.min(minY, points[i + 1])
    minZ = Math.min(minZ, points[i + 2])
    maxX = Math.max(maxX, points[i])
    maxY = Math.max(maxY, points[i + 1])
    maxZ = Math.max(maxZ, points[i + 2])
  }

  return { minX, minY, minZ, maxX, maxY, maxZ }
}
