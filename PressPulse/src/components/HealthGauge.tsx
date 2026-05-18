import { Component, createMemo } from 'solid-js'

interface HealthGaugeProps {
  value: number
  label?: string
  size?: number
}

export const HealthGauge: Component<HealthGaugeProps> = (props) => {
  const size = () => props.size || 150
  const radius = () => size() / 2 - 10
  const circumference = () => 2 * Math.PI * radius()
  
  const normalizedValue = createMemo(() => Math.max(0, Math.min(100, props.value)))
  
  const strokeDashoffset = createMemo(() => {
    return circumference() * (1 - normalizedValue() / 100)
  })

  const color = createMemo(() => {
    if (normalizedValue() >= 70) return '#10b981'
    if (normalizedValue() >= 40) return '#f59e0b'
    return '#ef4444'
  })

  return (
    <div style={{ 
      'display': 'flex', 
      'flex-direction': 'column', 
      'align-items': 'center',
      'padding': '16px',
    }}>
      <svg 
        width={size()} 
        height={size()} 
        viewBox={`0 0 ${size()} ${size()}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        <circle
          cx={size() / 2}
          cy={size() / 2}
          r={radius()}
          fill="none"
          stroke="#e5e7eb"
          stroke-width="12"
        />
        <circle
          cx={size() / 2}
          cy={size() / 2}
          r={radius()}
          fill="none"
          stroke={color()}
          stroke-width="12"
          stroke-dasharray={circumference()}
          stroke-dashoffset={strokeDashoffset()}
          stroke-linecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div style={{
        'position': 'relative',
        'top': `-${size() / 2 + 20}px`,
        'text-align': 'center',
      }}>
        <span style={{
          'font-size': `${size() / 5}px`,
          'font-weight': 'bold',
          'color': color(),
        }}>
          {Math.round(normalizedValue())}%
        </span>
      </div>
      {props.label && (
        <span style={{
          'font-size': '14px',
          'color': '#6b7280',
          'margin-top': '-20px',
        }}>
          {props.label}
        </span>
      )}
    </div>
  )
}
