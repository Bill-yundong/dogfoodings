import { Component, createEffect, createSignal } from 'solid-js'

interface GaugeCardProps {
  title: string
  value: number
  unit: string
  min?: number
  max?: number
  warningThreshold?: number
  dangerThreshold?: number
  color?: string
  icon?: string
}

export const GaugeCard: Component<GaugeCardProps> = (props) => {
  const [displayValue, setDisplayValue] = createSignal(0)
  const min = props.min ?? 0
  const max = props.max ?? 100
  
  const normalizedValue = () => Math.min(Math.max((displayValue() - min) / (max - min), 0), 1)
  
  const getColor = () => {
    if (props.color) return props.color
    const val = displayValue()
    if (props.dangerThreshold && val >= props.dangerThreshold) return '#ff2d55'
    if (props.warningThreshold && val >= props.warningThreshold) return '#ffd700'
    return '#00ff88'
  }
  
  const getStatus = () => {
    const val = displayValue()
    if (props.dangerThreshold && val >= props.dangerThreshold) return 'danger'
    if (props.warningThreshold && val >= props.warningThreshold) return 'warning'
    return 'normal'
  }
  
  createEffect(() => {
    const target = props.value
    const start = displayValue()
    const diff = target - start
    const duration = 300
    const startTime = performance.now()
    
    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(start + diff * eased)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    requestAnimationFrame(animate)
  })
  
  const circumference = 2 * Math.PI * 45
  const offset = circumference * (1 - normalizedValue())
  
  return (
    <div class={`panel p-4 relative overflow-hidden transition-all duration-300 ${
      getStatus() === 'danger' ? 'animate-pulse border-danger-red' :
      getStatus() === 'warning' ? 'border-warning-yellow' : ''
    }`}>
      <div class="absolute inset-0 scanline opacity-30 pointer-events-none"></div>
      
      <div class="flex items-center gap-2 mb-3">
        <span class="text-gray-400 text-sm font-jetbrains">{props.title}</span>
      </div>
      
      <div class="flex items-center gap-4">
        <div class="relative w-24 h-24">
          <svg class="w-full h-full transform -rotate-90">
            <circle
              cx="48"
              cy="48"
              r="45"
              fill="none"
              stroke="#1e3a5f"
              stroke-width="6"
            />
            <circle
              cx="48"
              cy="48"
              r="45"
              fill="none"
              stroke={getColor()}
              stroke-width="6"
              stroke-linecap="round"
              stroke-dasharray={`${circumference}`}
              stroke-dashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.3s ease, stroke 0.3s ease' }}
            />
          </svg>
          <div class="absolute inset-0 flex items-center justify-center">
            <span class="text-lg font-bold font-jetbrains" style={{ color: getColor() }}>
              {displayValue().toFixed(1)}
            </span>
          </div>
        </div>
        
        <div class="flex-1">
          <div class="text-2xl font-bold font-jetbrains" style={{ color: getColor() }}>
            {displayValue().toFixed(2)}
            <span class="text-sm text-gray-400 ml-1">{props.unit}</span>
          </div>
          
          <div class="mt-2 flex justify-between text-xs text-gray-500 font-jetbrains">
            <span>{min}</span>
            <span>{max}</span>
          </div>
          
          {props.warningThreshold && (
            <div class="mt-1 h-1 bg-space-deep rounded-full overflow-hidden">
              <div 
                class="h-full rounded-full transition-all duration-300"
                style={{ 
                  width: `${normalizedValue() * 100}%`,
                  'background-color': getColor()
                }}
              />
            </div>
          )}
        </div>
      </div>
      
      {getStatus() !== 'normal' && (
        <div 
          class="absolute top-2 right-2 w-3 h-3 rounded-full animate-pulse"
          style={{ 'background-color': getColor() }}
        />
      )}
    </div>
  )
}
