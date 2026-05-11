import type { GeoPoint, GridPoint, InterpolationResult, MonitoringStation } from '../types'

type VariogramModel = 'spherical' | 'exponential' | 'gaussian'

interface VariogramParams {
  nugget: number
  sill: number
  range: number
  model: VariogramModel
}

function haversineDistance(p1: GeoPoint, p2: GeoPoint): number {
  const R = 6371
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function variogram(h: number, params: VariogramParams): number {
  const { nugget, sill, range, model } = params
  if (h === 0) return 0

  const normalizedH = h / range

  switch (model) {
    case 'spherical':
      return h < range
        ? nugget + (sill - nugget) * (1.5 * normalizedH - 0.5 * Math.pow(normalizedH, 3))
        : sill
    case 'exponential':
      return nugget + (sill - nugget) * (1 - Math.exp(-3 * normalizedH))
    case 'gaussian':
      return nugget + (sill - nugget) * (1 - Math.exp(-3 * Math.pow(normalizedH, 2)))
    default:
      return sill
  }
}

function estimateVariogramParams(stations: MonitoringStation[]): VariogramParams {
  const distances: number[] = []
  const semivariances: number[] = []

  for (let i = 0; i < stations.length; i++) {
    for (let j = i + 1; j < stations.length; j++) {
      const dist = haversineDistance(stations[i], stations[j])
      const semi = Math.pow(stations[i].pm25 - stations[j].pm25, 2) / 2
      distances.push(dist)
      semivariances.push(semi)
    }
  }

  const sill = Math.max(...semivariances) * 0.95
  const range = Math.max(...distances) * 0.5

  return {
    nugget: Math.min(...semivariances) * 0.1,
    sill,
    range,
    model: 'spherical'
  }
}

function solveKrigingSystem(
  stations: MonitoringStation[],
  target: GeoPoint,
  variogramParams: VariogramParams
): { value: number; variance: number } {
  const n = stations.length
  const size = n + 1
  const A: number[][] = Array(size)
    .fill(null)
    .map(() => Array(size).fill(0))
  const b: number[] = Array(size).fill(0)

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const dist = haversineDistance(stations[i], stations[j])
      A[i][j] = variogram(dist, variogramParams)
    }
    A[i][n] = 1
    A[n][i] = 1
  }
  A[n][n] = 0

  for (let i = 0; i < n; i++) {
    const dist = haversineDistance(stations[i], target)
    b[i] = variogram(dist, variogramParams)
  }
  b[n] = 1

  const weights = gaussianElimination(A, b)

  let value = 0
  let variance = variogram(0, variogramParams)
  for (let i = 0; i < n; i++) {
    value += weights[i] * stations[i].pm25
    variance -= weights[i] * b[i]
  }

  return { value, variance: Math.max(0, variance) }
}

function gaussianElimination(A: number[][], b: number[]): number[] {
  const n = A.length
  const augmented = A.map((row, i) => [...row, b[i]])

  for (let i = 0; i < n; i++) {
    let maxRow = i
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(augmented[j][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = j
      }
    }
    ;[augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]]

    const pivot = augmented[i][i]
    if (Math.abs(pivot) < 1e-10) continue

    for (let j = i + 1; j < n; j++) {
      const factor = augmented[j][i] / pivot
      for (let k = i; k <= n; k++) {
        augmented[j][k] -= factor * augmented[i][k]
      }
    }
  }

  const x: number[] = Array(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    x[i] = augmented[i][n]
    for (let j = i + 1; j < n; j++) {
      x[i] -= augmented[i][j] * x[j]
    }
    x[i] /= augmented[i][i]
  }

  return x
}

export async function asyncKrigingInterpolation(
  stations: MonitoringStation[],
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  resolution: number = 0.05,
  onProgress?: (current: number, total: number) => void
): Promise<InterpolationResult> {
  await new Promise(resolve => setTimeout(resolve, 0))

  const variogramParams = estimateVariogramParams(stations)

  const latSteps = Math.ceil((bounds.maxLat - bounds.minLat) / resolution)
  const lngSteps = Math.ceil((bounds.maxLng - bounds.minLng) / resolution)
  const totalPoints = latSteps * lngSteps
  let processedPoints = 0

  const grid: GridPoint[][] = []

  for (let i = 0; i < latSteps; i++) {
    const row: GridPoint[] = []
    for (let j = 0; j < lngSteps; j++) {
      const lat = bounds.minLat + i * resolution
      const lng = bounds.minLng + j * resolution

      const result = solveKrigingSystem(stations, { lat, lng }, variogramParams)

      row.push({
        lat,
        lng,
        pm25: Math.max(0, result.value),
        variance: result.variance
      })

      processedPoints++
      if (processedPoints % 100 === 0) {
        onProgress?.(processedPoints, totalPoints)
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }
    grid.push(row)
  }

  onProgress?.(totalPoints, totalPoints)

  return {
    grid,
    bounds,
    resolution,
    timestamp: Date.now()
  }
}
