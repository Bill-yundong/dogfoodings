import { createMemo } from 'solid-js'

interface FocusGaugeProps {
  value: number
}

function getArcColor(v: number): string {
  if (v < 25) return '#c77dff'
  if (v < 50) return '#ff8c00'
  if (v < 80) return '#00f0ff'
  return '#39ff14'
}

export default function FocusGauge(props: FocusGaugeProps) {
  const cx = 100
  const cy = 100
  const r = 80
  const startAngle = 135
  const sweepAngle = 270
  const endAngle = startAngle + sweepAngle

  const circumference = createMemo(() => 2 * Math.PI * r * (sweepAngle / 360))
  const offset = createMemo(() => circumference() * (1 - Math.min(Math.max(props.value, 0), 100) / 100))

  const startX = createMemo(() => cx + r * Math.cos((startAngle * Math.PI) / 180))
  const startY = createMemo(() => cy + r * Math.sin((startAngle * Math.PI) / 180))
  const endX = createMemo(() => cx + r * Math.cos((endAngle * Math.PI) / 180))
  const endY = createMemo(() => cy + r * Math.sin((endAngle * Math.PI) / 180))

  const arcColor = createMemo(() => getArcColor(props.value))

  return (
    <div class="relative flex items-center justify-center">
      <svg width="220" height="220" viewBox="0 0 200 200">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          d={`M ${startX()} ${startY()} A ${r} ${r} 0 1 1 ${endX()} ${endY()}`}
          fill="none"
          stroke="#1a1d2e"
          stroke-width="12"
          stroke-linecap="round"
        />

        <path
          d={`M ${startX()} ${startY()} A ${r} ${r} 0 1 1 ${endX()} ${endY()}`}
          fill="none"
          stroke={arcColor()}
          stroke-width="12"
          stroke-linecap="round"
          stroke-dasharray={`${circumference()}`}
          stroke-dashoffset={`${offset()}`}
          style={{ transition: 'stroke-dashoffset 0.8s ease-in-out, stroke 0.5s ease' }}
          filter="url(#glow)"
        />
      </svg>

      <div class="absolute flex flex-col items-center justify-center">
        <span
          class="text-4xl font-bold"
          style={{ 'font-family': 'Orbitron, monospace', color: arcColor() }}
        >
          {Math.round(Math.min(Math.max(props.value, 0), 100))}
        </span>
        <span class="text-xs text-gray-400 mt-1">专注力指数</span>
      </div>
    </div>
  )
}
