import { Component } from 'solid-js'
import type { ValveState } from '@/types'

interface ValveControlProps {
  id: string
  name: string
  state: ValveState
  line: 'OXYGEN' | 'HYDROGEN'
  onToggle: (id: string, state: ValveState) => void
  disabled?: boolean
}

export const ValveControl: Component<ValveControlProps> = (props) => {
  const lineColor = props.line === 'OXYGEN' ? '#00d4ff' : '#00ffc8'
  const isOpen = props.state === 'OPEN'
  const isTransitioning = props.state === 'TRANSITIONING'
  
  const handleClick = () => {
    if (props.disabled || isTransitioning) return
    const newState: ValveState = isOpen ? 'CLOSED' : 'OPEN'
    props.onToggle(props.id, newState)
  }
  
  return (
    <div 
      class={`panel p-3 cursor-pointer transition-all duration-300 ${
        props.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'
      } ${isOpen ? 'border-opacity-100' : 'border-opacity-50'}`}
      style={{ 
        'border-color': isOpen ? lineColor : undefined,
        'box-shadow': isOpen ? `0 0 15px ${lineColor}40` : undefined
      }}
      onClick={handleClick}
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="relative">
            <svg width="32" height="32" viewBox="0 0 32 32">
              <rect x="12" y="6" width="8" height="20" fill={isOpen ? lineColor : '#333'} rx="2" />
              <rect x="4" y="14" width="24" height="4" fill={isOpen ? lineColor : '#333'} rx="1" />
              <circle cx="16" cy="16" r="6" fill="#0a1628" stroke={lineColor} stroke-width="2" />
              <line 
                x1="16" y1="16" 
                x2={isOpen ? "22" : "16"} 
                y2={isOpen ? "10" : "16"} 
                stroke={lineColor} 
                stroke-width="2" 
                stroke-linecap="round"
                style={{
                  transition: 'all 0.3s ease',
                  transform: isTransitioning ? 'rotate(45deg)' : 'none',
                  'transform-origin': '16px 16px'
                }}
              />
            </svg>
            {isTransitioning && (
              <div class="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-current" style={{ color: lineColor }} />
            )}
          </div>
          
          <div>
            <div class="text-sm font-jetbrains text-white">{props.name}</div>
            <div class="text-xs text-gray-500 font-jetbrains">{props.id}</div>
          </div>
        </div>
        
        <div class="flex items-center gap-2">
          <span 
            class={`text-xs font-bold font-jetbrains px-2 py-1 rounded ${
              isOpen ? 'bg-success-green/20 text-success-green' : 'bg-gray-700 text-gray-400'
            }`}
          >
            {isOpen ? '开' : isTransitioning ? '过渡' : '关'}
          </span>
        </div>
      </div>
      
      <div class="mt-2 h-1 bg-space-deep rounded-full overflow-hidden">
        <div 
          class="h-full transition-all duration-500 rounded-full"
          style={{ 
            width: isTransitioning ? '50%' : isOpen ? '100%' : '0%',
            'background-color': lineColor
          }}
        />
      </div>
    </div>
  )
}
