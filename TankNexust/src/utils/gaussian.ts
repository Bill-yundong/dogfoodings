import type { AtmosphericStability, DiffusionParameters, GaussianParams, DiffusionResult, RiskZone, RiskLevel } from '@/types/simulation'

const STABILITY_PARAMETERS: Record<AtmosphericStability, { a: number; b: number; c: number; d: number }> = {
  'A': { a: 213, b: 0.894, c: 453.85, d: 2.1166 },
  'B': { a: 156, b: 0.894, c: 108.2, d: 1.0981 },
  'C': { a: 104, b: 0.894, c: 61, d: 0.9146 },
  'D': { a: 68, b: 0.894, c: 33.5, d: 0.8108 },
  'E': { a: 50.5, b: 0.894, c: 22, d: 0.8 },
  'F': { a: 34, b: 0.894, c: 14.35, d: 0.74 }
}

const RISK_THRESHOLDS: Array<{ level: RiskLevel; concentration: number; color: string }> = [
  { level: 'extreme', concentration: 100, color: 'rgba(139, 0, 0, 0.85)' },
  { level: 'danger', concentration: 50, color: 'rgba(255, 71, 87, 0.75)' },
  { level: 'warning', concentration: 20, color: 'rgba(255, 127, 80, 0.65)' },
  { level: 'caution', concentration: 5, color: 'rgba(255, 215, 0, 0.55)' },
  { level: 'safe', concentration: 0, color: 'rgba(46, 213, 115, 0.1)' }
]

export function calculateDiffusionParameters(distance: number, stability: AtmosphericStability): DiffusionParameters {
  const params = STABILITY_PARAMETERS[stability]
  const sigmaY = params.a * Math.pow(Math.max(distance, 1), params.b)
  const sigmaZ = params.c * Math.pow(Math.max(distance, 1), params.d)
  return {
    sigmaY,
    sigmaZ,
    a: params.a,
    b: params.b,
    c: params.c,
    d: params.d
  }
}

export function calculateConcentration(
  x: number,
  y: number,
  z: number,
  params: GaussianParams,
  time: number
): number {
  const { sourceStrength, releaseHeight, windSpeed, diffusionCoefficient, decayRate } = params

  if (windSpeed < 0.1) {
    return calculateStaticConcentration(x, y, z, params, time)
  }

  const distance = Math.max(Math.abs(x), 1)
  const { sigmaY, sigmaZ } = calculateDiffusionParameters(distance, params.atmosphericStability)

  const term1 = sourceStrength / (Math.pow(2 * Math.PI, 1.5) * sigmaY * sigmaZ * windSpeed)
  const term2 = Math.exp(-Math.pow(y, 2) / (2 * Math.pow(sigmaY, 2)))
  const term3 = Math.exp(-Math.pow(z - releaseHeight, 2) / (2 * Math.pow(sigmaZ, 2)))
  const term4 = Math.exp(-Math.pow(z + releaseHeight, 2) / (2 * Math.pow(sigmaZ, 2)))
  const decay = Math.exp(-decayRate * time)
  const terrainCorrection = 1 + 0.001 * Math.abs(z)

  const concentration = term1 * term2 * (term3 + term4) * decay * terrainCorrection

  return Math.max(0, concentration)
}

export function calculateStaticConcentration(
  x: number,
  y: number,
  z: number,
  params: GaussianParams,
  time: number
): number {
  const { sourceStrength, releaseHeight, diffusionCoefficient, decayRate } = params

  const distance = Math.sqrt(x * x + y * y + Math.pow(z - releaseHeight, 2))

  if (distance < 1) {
    return sourceStrength / (Math.pow(4 * Math.PI * diffusionCoefficient * time, 1.5)) * Math.exp(-decayRate * time)
  }

  const term1 = sourceStrength / (Math.pow(4 * Math.PI * diffusionCoefficient * time, 1.5))
  const term2 = Math.exp(-Math.pow(distance, 2) / (4 * diffusionCoefficient * time))
  const decay = Math.exp(-decayRate * time)

  return Math.max(0, term1 * term2 * decay)
}

export function generateConcentrationGrid(
  params: GaussianParams,
  gridWidth: number,
  gridHeight: number,
  resolution: number,
  originX: number,
  originY: number,
  time: number
): number[][] {
  const grid: number[][] = []
  const windRad = (params.windDirection * Math.PI) / 180

  for (let j = 0; j < gridHeight; j++) {
    grid[j] = []
    for (let i = 0; i < gridWidth; i++) {
      const worldX = (i - gridWidth / 2) * resolution
      const worldY = (j - gridHeight / 2) * resolution

      const rotatedX = worldX * Math.cos(windRad) + worldY * Math.sin(windRad)
      const rotatedY = -worldX * Math.sin(windRad) + worldY * Math.cos(windRad)

      const concentration = calculateConcentration(rotatedX, rotatedY, 1.5, params, time)

      grid[j][i] = concentration
    }
  }

  return grid
}

export function extractRiskZones(
  concentrationGrid: number[][],
  resolution: number
): RiskZone[] {
  const zones: RiskZone[] = []

  for (const threshold of RISK_THRESHOLDS) {
    const polygon = findContour(concentrationGrid, threshold.concentration, resolution)
    if (polygon.length > 2) {
      zones.push({
        level: threshold.level,
        concentration: threshold.concentration,
        color: threshold.color,
        polygon
      })
    }
  }

  return zones
}

function findContour(
  grid: number[][],
  threshold: number,
  resolution: number
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = []
  const height = grid.length
  const width = grid[0]?.length || 0

  for (let angle = 0; angle < 360; angle += 15) {
    const rad = (angle * Math.PI) / 180
    for (let r = 5; r < Math.min(width, height) / 2; r += 2) {
      const i = Math.floor(width / 2 + r * Math.cos(rad))
      const j = Math.floor(height / 2 + r * Math.sin(rad))

      if (i >= 0 && i < width && j >= 0 && j < height) {
        if (grid[j][i] >= threshold) {
          points.push({
            x: (i - width / 2) * resolution,
            y: (j - height / 2) * resolution
          })
          break
        }
      }
    }
  }

  return simplifyPolygon(points)
}

function simplifyPolygon(points: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
  if (points.length <= 10) return points

  const simplified: Array<{ x: number; y: number }> = []
  const step = Math.ceil(points.length / 24)

  for (let i = 0; i < points.length; i += step) {
    simplified.push(points[i])
  }

  return simplified
}

export function calculateAffectedArea(riskZones: RiskZone[], resolution: number): number {
  if (riskZones.length === 0) return 0

  const extremeZone = riskZones.find(z => z.level === 'extreme')
  if (extremeZone && extremeZone.polygon.length >= 3) {
    return calculatePolygonArea(extremeZone.polygon)
  }

  const dangerZone = riskZones.find(z => z.level === 'danger')
  if (dangerZone && dangerZone.polygon.length >= 3) {
    return calculatePolygonArea(dangerZone.polygon)
  }

  return 0
}

function calculatePolygonArea(polygon: Array<{ x: number; y: number }>): number {
  let area = 0
  const n = polygon.length

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += polygon[i].x * polygon[j].y
    area -= polygon[j].x * polygon[i].y
  }

  return Math.abs(area / 2)
}

export function runGaussianSimulation(
  params: GaussianParams,
  gridWidth: number,
  gridHeight: number,
  resolution: number,
  time: number
): DiffusionResult {
  const concentrationGrid = generateConcentrationGrid(
    params,
    gridWidth,
    gridHeight,
    resolution,
    0,
    0,
    time
  )

  const riskZones = extractRiskZones(concentrationGrid, resolution)
  const maxConcentration = Math.max(...concentrationGrid.flat())
  const affectedArea = calculateAffectedArea(riskZones, resolution)

  return {
    timestamp: Date.now(),
    gridSize: {
      width: gridWidth,
      height: gridHeight,
      resolution
    },
    origin: { x: 0, y: 0 },
    concentrationGrid,
    riskZones,
    maxConcentration,
    affectedArea
  }
}

export function getRiskLevel(concentration: number): RiskLevel {
  for (const threshold of RISK_THRESHOLDS) {
    if (concentration >= threshold.concentration) {
      return threshold.level
    }
  }
  return 'safe'
}

export function getRiskColor(level: RiskLevel): string {
  const threshold = RISK_THRESHOLDS.find(t => t.level === level)
  return threshold?.color || 'rgba(46, 213, 115, 0.5)'
}
