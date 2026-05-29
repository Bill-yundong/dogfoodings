import type { FocusSample, FocusLevel } from '~/types'

export interface KineticFrame {
  value: number
  level: FocusLevel
  velocity: number
  acceleration: number
  momentum: number
}

export function computeKineticFrame(samples: FocusSample[]): KineticFrame {
  if (samples.length === 0) {
    return { value: 0, level: "idle", velocity: 0, acceleration: 0, momentum: 0 }
  }

  const current = samples[samples.length - 1]
  const value = current.value
  const level = current.type

  let velocity = 0
  let acceleration = 0

  if (samples.length >= 2) {
    const prev = samples[samples.length - 2]
    velocity = value - prev.value
  }

  if (samples.length >= 3) {
    const prev = samples[samples.length - 2]
    const prevPrev = samples[samples.length - 3]
    const prevVelocity = prev.value - prevPrev.value
    acceleration = velocity - prevVelocity
  }

  const momentum = value * Math.abs(velocity + 1) / 100

  return { value, level, velocity, acceleration, momentum }
}

export function generateWaveformPoints(
  samples: FocusSample[],
  width: number,
  height: number
): Array<{ x: number; y: number }> {
  if (samples.length === 0) return []

  const visibleSamples = samples.slice(-Math.floor(width / 2))
  if (visibleSamples.length === 0) return []

  const points: Array<{ x: number; y: number }> = []
  const step = width / Math.max(visibleSamples.length - 1, 1)

  for (let i = 0; i < visibleSamples.length; i++) {
    const x = i * step
    const y = height - (visibleSamples[i].value / 100) * height
    points.push({ x, y })
  }

  return points
}

export function smoothWaveform(
  points: Array<{ x: number; y: number }>,
  tension: number = 0.3
): string {
  if (points.length < 2) return ""

  let path = `M ${points[0].x} ${points[0].y}`

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]

    const cp1x = p1.x + (p2.x - p0.x) * tension
    const cp1y = p1.y + (p2.y - p0.y) * tension
    const cp2x = p2.x - (p3.x - p1.x) * tension
    const cp2y = p2.y - (p3.y - p1.y) * tension

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
  }

  return path
}

export function getGlowIntensity(level: FocusLevel): number {
  switch (level) {
    case "deep": return 1.0
    case "moderate": return 0.6
    case "distracted": return 0.3
    case "idle": return 0.1
  }
}

export function getGlowColor(level: FocusLevel): string {
  switch (level) {
    case "deep": return "#39ff14"
    case "moderate": return "#00f0ff"
    case "distracted": return "#c77dff"
    case "idle": return "#555555"
  }
}
