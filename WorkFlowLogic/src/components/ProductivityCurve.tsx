import { createMemo, For } from 'solid-js'
import type { HourlyFocusProfile } from '../types'

interface ProductivityCurveProps {
  hourlyProfile: HourlyFocusProfile[]
  currentFocus: number
}

const W = 600
const H = 240
const PX = 40
const PY = 24
const PW = W - PX * 2
const PH = H - PY * 2

function toX(hour: number): number {
  return PX + (hour / 24) * PW
}

function toY(focus: number): number {
  return PY + PH - (Math.min(Math.max(focus, 0), 100) / 100) * PH
}

function buildSmoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) return ''
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const cpx1 = prev.x + (curr.x - prev.x) * 0.4
    const cpx2 = prev.x + (curr.x - prev.x) * 0.6
    d += ` C ${cpx1} ${prev.y} ${cpx2} ${curr.y} ${curr.x} ${curr.y}`
  }
  return d
}

export default function ProductivityCurve(props: ProductivityCurveProps) {
  const points = createMemo(() =>
    props.hourlyProfile.map((p) => ({ x: toX(p.hour), y: toY(p.avgFocus) }))
  )

  const linePath = createMemo(() => buildSmoothPath(points()))

  const areaPath = createMemo(() => {
    if (points().length < 2) return ''
    const pts = points()
    const last = pts[pts.length - 1]
    const first = pts[0]
    return `${linePath()} L ${last.x} ${PY + PH} L ${first.x} ${PY + PH} Z`
  })

  const currentHour = createMemo(() => new Date().getHours() + new Date().getMinutes() / 60)
  const currentX = createMemo(() => toX(currentHour()))
  const currentPoint = createMemo(() => {
    const h = Math.round(currentHour())
    const profile = props.hourlyProfile.find((p) => p.hour === h)
    return profile ? { x: toX(h), y: toY(profile.avgFocus) } : null
  })

  const gridHours = createMemo(() => {
    const g = []
    for (let h = 0; h <= 24; h += 4) g.push(h)
    return g
  })

  const gridFocusLevels = [0, 25, 50, 75, 100]

  return (
    <div class="w-full">
      <div class="text-xs text-[#00f0ff] mb-2 font-medium" style={{ 'font-family': 'Orbitron, monospace' }}>
        产能曲线
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} class="w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#00f0ff" stop-opacity="0.2" />
            <stop offset="100%" stop-color="#00f0ff" stop-opacity="0" />
          </linearGradient>
        </defs>

        <For each={gridFocusLevels}>
          {(level) => (
            <line
              x1={PX}
              y1={toY(level)}
              x2={W - PX}
              y2={toY(level)}
              stroke="#1a1d2e"
              stroke-width="1"
            />
          )}
        </For>

        <For each={gridHours()}>
          {(h) => (
            <line
              x1={toX(h)}
              y1={PY}
              x2={toX(h)}
              y2={PY + PH}
              stroke="#1a1d2e"
              stroke-width="1"
            />
          )}
        </For>

        {areaPath() && <path d={areaPath()} fill="url(#curveGradient)" />}
        {linePath() && (
          <path d={linePath()} fill="none" stroke="#00f0ff" stroke-width="2" />
        )}

        <For each={points()}>
          {(p) => <circle cx={p.x} cy={p.y} r="2.5" fill="#00f0ff" />}
        </For>

        <line
          x1={currentX()}
          y1={PY}
          x2={currentX()}
          y2={PY + PH}
          stroke="#00f0ff"
          stroke-width="1"
          stroke-dasharray="4 3"
          opacity="0.6"
        />

        {currentPoint() && (
          <circle
            cx={currentPoint()!.x}
            cy={currentPoint()!.y}
            r="5"
            fill="#00f0ff"
            stroke="#0a0e27"
            stroke-width="2"
          />
        )}

        <For each={gridHours()}>
          {(h) => (
            <text
              x={toX(h)}
              y={H - 4}
              text-anchor="middle"
              class="fill-gray-500"
              style={{ 'font-size': '9px' }}
            >
              {String(h).padStart(2, '0')}
            </text>
          )}
        </For>

        <For each={gridFocusLevels}>
          {(level) => (
            <text
              x={PX - 6}
              y={toY(level) + 3}
              text-anchor="end"
              class="fill-gray-500"
              style={{ 'font-size': '9px' }}
            >
              {level}
            </text>
          )}
        </For>
      </svg>
    </div>
  )
}
