import type { CloudDataPoint } from './types'

const pasquillSigmaY: Record<string, number[]> = { A: [0.22, 0.0001], B: [0.16, 0.0001], C: [0.11, 0.0001], D: [0.08, 0.0001], E: [0.06, 0.0001], F: [0.04, 0.0001] }
const pasquillSigmaZ: Record<string, number[]> = { A: [0.20, 0.0], B: [0.12, 0.0], C: [0.08, 0.0002], D: [0.06, 0.0015], E: [0.03, 0.0003], F: [0.016, 0.0003] }

function sigmaY(x: number, stability: string): number {
  const coeffs = pasquillSigmaY[stability] || pasquillSigmaY['D']
  return coeffs[0] * x / Math.sqrt(1 + coeffs[1] * x)
}

function sigmaZ(x: number, stability: string): number {
  const coeffs = pasquillSigmaZ[stability] || pasquillSigmaZ['D']
  return coeffs[0] * x / Math.sqrt(1 + coeffs[1] * x)
}

export function gaussianPlume(
  Q: number,
  u: number,
  windDir: number,
  stability: string,
  H: number,
  gridWidth: number,
  gridHeight: number,
  cellSize: number
): CloudDataPoint[] {
  const points: CloudDataPoint[] = []
  const cosDir = Math.cos((windDir * Math.PI) / 180)
  const sinDir = Math.sin((windDir * Math.PI) / 180)
  const cx = gridWidth / 2
  const cy = gridHeight / 2

  for (let gx = 0; gx < gridWidth; gx += cellSize) {
    for (let gy = 0; gy < gridHeight; gy += cellSize) {
      const dx = gx - cx
      const dy = gy - cy
      const xDown = dx * cosDir + dy * sinDir
      const yCross = -dx * sinDir + dy * cosDir

      if (xDown <= 1) continue

      const sy = sigmaY(xDown, stability)
      const sz = sigmaZ(xDown, stability)
      if (sy <= 0 || sz <= 0) continue

      const safeU = Math.max(u, 0.5)
      const cBase = Q / (2 * Math.PI * sy * sz * safeU)
      const yTerm = Math.exp(-(yCross * yCross) / (2 * sy * sy))
      const zTerm = Math.exp(-((0 - H) * (0 - H)) / (2 * sz * sz)) + Math.exp(-((0 + H) * (0 + H)) / (2 * sz * sz))
      const concentration = cBase * yTerm * zTerm

      if (concentration > 0.001) {
        points.push({ x: gx, y: gy, concentration: Math.min(concentration, 4) })
      }
    }
  }
  return points
}

export function getCloudColor(concentration: number): string {
  if (concentration > 3) return 'rgba(230, 57, 70, 0.7)'
  if (concentration > 1.5) return 'rgba(255, 107, 53, 0.5)'
  if (concentration > 0.5) return 'rgba(244, 162, 97, 0.4)'
  return 'rgba(46, 196, 182, 0.25)'
}

export interface OverpressureZone {
  label: string
  innerRadius: number
  outerRadius: number
  color: string
  colorAlpha: string
}

export function calculateOverpressure(
  tntEquivalent: number,
  maxDistance: number,
  steps: number
): { distances: number[]; overpressures: number[] } {
  const distances: number[] = []
  const overpressures: number[] = []
  const E = tntEquivalent * 4.184e6
  const Patm = 101325

  for (let i = 1; i <= steps; i++) {
    const R = (i / steps) * maxDistance
    if (R <= 0) continue
    const Z = R / Math.pow(E / Patm, 1 / 3)
    if (Z <= 0) continue
    const deltaP_atm = 0.84 * Math.pow(Z, -1) + 2.7 * Math.pow(Z, -2) + 7.0 * Math.pow(Z, -3)
    const deltaP_MPa = Math.max(deltaP_atm * 0.101325, 0)
    distances.push(Math.round(R * 10) / 10)
    overpressures.push(Math.round(deltaP_MPa * 10000) / 10000)
  }
  return { distances, overpressures }
}

export function getOverpressureZones(tntEquivalent: number): OverpressureZone[] {
  const { distances, overpressures } = calculateOverpressure(tntEquivalent, 500, 500)
  const zones: OverpressureZone[] = [
    { label: '致命区', innerRadius: 0, outerRadius: 0, color: '#E63946', colorAlpha: 'rgba(230, 57, 70, 0.35)' },
    { label: '重伤区', innerRadius: 0, outerRadius: 0, color: '#FF6B35', colorAlpha: 'rgba(255, 107, 53, 0.3)' },
    { label: '轻伤区', innerRadius: 0, outerRadius: 0, color: '#F4A261', colorAlpha: 'rgba(244, 162, 97, 0.25)' },
    { label: '安全区', innerRadius: 0, outerRadius: 0, color: '#2EC4B6', colorAlpha: 'rgba(46, 196, 182, 0.15)' },
  ]

  let foundFatal = false, foundSevere = false, foundMinor = false
  for (let i = 0; i < distances.length; i++) {
    if (!foundFatal && overpressures[i] <= 0.1) {
      zones[0].outerRadius = distances[i]
      zones[1].innerRadius = distances[i]
      foundFatal = true
    }
    if (!foundSevere && overpressures[i] <= 0.03) {
      zones[1].outerRadius = distances[i]
      zones[2].innerRadius = distances[i]
      foundSevere = true
    }
    if (!foundMinor && overpressures[i] <= 0.01) {
      zones[2].outerRadius = distances[i]
      zones[3].innerRadius = distances[i]
      foundMinor = true
    }
  }
  zones[3].outerRadius = distances[distances.length - 1] || 500
  return zones
}

export function interpolateOverpressure(
  tntEquivalent: number,
  timeFactor: number
): { distances: number[]; overpressures: number[] } {
  const effectiveTnt = tntEquivalent * timeFactor
  return calculateOverpressure(effectiveTnt, 300, 200)
}
