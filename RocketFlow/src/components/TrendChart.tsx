import { Component, createEffect, onMount, onCleanup, createSignal } from 'solid-js'

interface TrendChartProps {
  data: { x: number[], y: number[] }
  label?: string
  unit?: string
  color?: string
  height?: number
  showGrid?: boolean
  showYAxis?: boolean
  maxPoints?: number
}

export const TrendChart: Component<TrendChartProps> = (props) => {
  let canvasRef: HTMLCanvasElement | undefined
  let animationId: number = 0
  
  const color = props.color || '#00d4ff'
  const height = props.height || 120
  const maxPoints = props.maxPoints || 200
  
  const [hoverPoint, setHoverPoint] = createSignal<{ x: number; y: number; value: number } | null>(null)
  
  const draw = () => {
    if (!canvasRef || !props.data.x.length) return
    
    const canvas = canvasRef
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    
    canvas.width = rect.width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)
    
    const width = rect.width
    const chartHeight = height
    
    ctx.fillStyle = '#0a1628'
    ctx.fillRect(0, 0, width, chartHeight)
    
    if (props.showGrid !== false) {
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.1)'
      ctx.lineWidth = 1
      
      for (let i = 0; i <= 4; i++) {
        const y = (chartHeight / 4) * i
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }
      
      for (let i = 0; i <= 5; i++) {
        const x = (width / 5) * i
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, chartHeight)
        ctx.stroke()
      }
    }
    
    const yValues = props.data.y.slice(-maxPoints)
    
    if (yValues.length < 2) return
    
    const minY = Math.min(...yValues) * 0.9
    const maxY = Math.max(...yValues) * 1.1
    const yRange = maxY - minY || 1
    
    const points: { x: number; y: number }[] = []
    
    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    
    for (let i = 0; i < yValues.length; i++) {
      const x = (i / (yValues.length - 1)) * width
      const y = chartHeight - ((yValues[i] - minY) / yRange) * (chartHeight - 20) - 10
      
      points.push({ x, y })
      
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        const prevX = points[i - 1].x
        const prevY = points[i - 1].y
        const cpX = (prevX + x) / 2
        ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y)
      }
    }
    ctx.stroke()
    
    const gradient = ctx.createLinearGradient(0, 0, 0, chartHeight)
    gradient.addColorStop(0, color + '40')
    gradient.addColorStop(1, color + '00')
    
    ctx.lineTo(width, chartHeight)
    ctx.lineTo(0, chartHeight)
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()
    
    if (props.showYAxis !== false) {
      ctx.fillStyle = '#888'
      ctx.font = '10px JetBrains Mono'
      ctx.textAlign = 'left'
      
      ctx.fillText(maxY.toFixed(1), 5, 12)
      ctx.fillText(minY.toFixed(1), 5, chartHeight - 2)
      
      if (props.unit) {
        ctx.fillText(props.unit, 5, chartHeight / 2)
      }
    }
    
    if (hoverPoint()) {
      const hp = hoverPoint()!
      ctx.beginPath()
      ctx.arc(hp.x, hp.y, 5, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()
    }
    
    animationId = requestAnimationFrame(draw)
  }
  
  const handleMouseMove = (e: MouseEvent) => {
    if (!canvasRef || !props.data.x.length) return
    
    const rect = canvasRef.getBoundingClientRect()
    const x = e.clientX - rect.left
    const yValues = props.data.y.slice(-maxPoints)
    
    if (yValues.length < 2) return
    
    const minY = Math.min(...yValues) * 0.9
    const maxY = Math.max(...yValues) * 1.1
    const yRange = maxY - minY || 1
    
    const index = Math.round((x / rect.width) * (yValues.length - 1))
    if (index >= 0 && index < yValues.length) {
      const chartY = height - ((yValues[index] - minY) / yRange) * (height - 20) - 10
      setHoverPoint({
        x: (index / (yValues.length - 1)) * rect.width,
        y: chartY,
        value: yValues[index]
      })
    }
  }
  
  const handleMouseLeave = () => {
    setHoverPoint(null)
  }
  
  createEffect(() => {
    if (props.data.x.length > 0) {
      cancelAnimationFrame(animationId)
      draw()
    }
  })
  
  onMount(() => {
    draw()
  })
  
  onCleanup(() => {
    cancelAnimationFrame(animationId)
  })
  
  return (
    <div class="relative">
      {props.label && (
        <div class="flex justify-between items-center mb-1">
          <span class="text-xs text-gray-400 font-jetbrains">{props.label}</span>
          {hoverPoint() && (
            <span class="text-xs font-jetbrains" style={{ color }}>
              {hoverPoint()!.value.toFixed(2)} {props.unit || ''}
            </span>
          )}
        </div>
      )}
      <canvas
        ref={canvasRef}
        class="w-full rounded"
        style={{ height: `${height}px` }}
        onmousemove={handleMouseMove}
        onmouseleave={handleMouseLeave}
      />
    </div>
  )
}
