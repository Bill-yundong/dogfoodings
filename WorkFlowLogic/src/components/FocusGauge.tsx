import { createMemo } from 'solid-js'

interface FocusGaugeProps {
  value: number
}

function getArcColor(v: number): string {
  if (v < 30) return '#ef4444'
  if (v < 60) return '#f59e0b'
  if (v < 85) return '#6366f1'
  return '#10b981'
}

export default function FocusGauge(props: FocusGaugeProps) {
  const cx = 100
  const cy = 100
  const r = 75
  const startAngle = 135
  const sweepAngle = 270
  const endAngle = startAngle + sweepAngle

  const circumference = createMemo(() => 2 * Math.PI * r * (sweepAngle / 360))
  const clampedValue = createMemo(() => Math.min(Math.max(props.value, 0), 100))
  const offset = createMemo(() => circumference() * (1 - clampedValue() / 100))

  const startX = createMemo(() => cx + r * Math.cos((startAngle * Math.PI) / 180))
  const startY = createMemo(() => cy + r * Math.sin((startAngle * Math.PI) / 180))
  const endX = createMemo(() => cx + r * Math.cos((endAngle * Math.PI) / 180))
  const endY = createMemo(() => cy + r * Math.sin((endAngle * Math.PI) / 180))

  const arcColor = createMemo(() => getArcColor(clampedValue()))
  const displayValue = createMemo(() => Math.round(clampedValue()))

  return (
    <div class="relative flex items-center justify-center">
      <svg width="220" height="220" viewBox="0 0 200 200">
        <defs>
          <filter id="gaugeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#334155" stop-opacity="0.3" />
            <stop offset="100%" stop-color="#1e293b" stop-opacity="0.5" />
          </linearGradient>
        </defs>

        <path
          d={`M ${startX()} ${startY()} A ${r} ${r} 0 1 1 ${endX()} ${endY()}`}
          fill="none"
          stroke="#334155"
          stroke-width="10"
          stroke-linecap="round"
          opacity="0.4"
        />

        <path
          d={`M ${startX()} ${startY()} A ${r} ${r} 0 1 1 ${endX()} ${endY()}`}
          fill="none"
          stroke={arcColor()}
          stroke-width="10"
          stroke-linecap="round"
          stroke-dasharray={`${circumference()}`}
          stroke-dashoffset={`${offset()}`}
          style={{ transition: 'stroke-dashoffset 0.5s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease' }}
          filter="url(#gaugeGlow)"
        />
      </svg>

      <div class="absolute flex flex-col items-center justify-center">
        <span
          class="text-5xl font-bold tracking-tight"
          style={{ 'font-family': "'JetBrains Mono', 'SF Mono', monospace", color: arcColor() }}
        >
          {displayValue()}
        </span>
        <span class="text-sm text-[#94a3b8] mt-1 font-medium">专注指数</span>
      </div>
    </div>
  )
}
