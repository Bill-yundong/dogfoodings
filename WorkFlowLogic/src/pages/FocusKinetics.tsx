import { onMount, onCleanup, createMemo, createSignal, For, Show } from 'solid-js'
import { focusState, startTracking, stopTracking, addDistraction } from '~/stores/focus'
import {
  generateWaveformPoints,
  smoothWaveform,
  computeKineticFrame,
  getGlowIntensity,
  getGlowColor,
} from '~/engines/focus-kinetic'

export default function FocusKinetics() {
  let canvasRef: HTMLCanvasElement | undefined
  let animFrameId: number | null = null
  const [canvasSize, setCanvasSize] = createSignal({ w: 800, h: 200 })

  const kineticFrame = createMemo(() =>
    computeKineticFrame(focusState.todaySamples)
  )

  const glowIntensity = createMemo(() => getGlowIntensity(focusState.currentLevel))
  const glowColor = createMemo(() => getGlowColor(focusState.currentLevel))

  const waveformPath = createMemo(() => {
    const points = generateWaveformPoints(focusState.todaySamples, canvasSize().w, canvasSize().h)
    return smoothWaveform(points)
  })

  onMount(() => {
    if (canvasRef) {
      const resize = () => {
        if (canvasRef) {
          const rect = canvasRef.parentElement?.getBoundingClientRect()
          if (rect) {
            setCanvasSize({ w: rect.width, h: 200 })
            canvasRef.width = rect.width * window.devicePixelRatio
            canvasRef.height = 200 * window.devicePixelRatio
            canvasRef.style.width = `${rect.width}px`
            canvasRef.style.height = '200px'
          }
        }
      }
      resize()
      window.addEventListener('resize', resize)
      onCleanup(() => window.removeEventListener('resize', resize))
    }

    const draw = () => {
      if (!canvasRef) return
      const ctx = canvasRef.getContext('2d')
      if (!ctx) return

      const w = canvasRef.width
      const h = canvasRef.height
      const dpr = window.devicePixelRatio

      ctx.clearRect(0, 0, w, h)

      ctx.strokeStyle = 'rgba(26, 29, 46, 0.5)'
      ctx.lineWidth = 1
      for (let y = 0; y < h; y += 40 * dpr) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }
      for (let x = 0; x < w; x += 60 * dpr) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }

      const samples = focusState.todaySamples
      if (samples.length < 2) {
        animFrameId = requestAnimationFrame(draw)
        return
      }

      const visible = samples.slice(-Math.floor(canvasSize().w / 2))
      const step = w / Math.max(visible.length - 1, 1)

      const pts = visible.map((s, i) => ({
        x: i * step,
        y: h - (s.value / 100) * h,
      }))

      const tension = 0.3
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)]
        const p1 = pts[i]
        const p2 = pts[i + 1]
        const p3 = pts[Math.min(pts.length - 1, i + 2)]
        const cp1x = p1.x + (p2.x - p0.x) * tension
        const cp1y = p1.y + (p2.y - p0.y) * tension
        const cp2x = p2.x - (p3.x - p1.x) * tension
        const cp2y = p2.y - (p3.y - p1.y) * tension
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y)
      }

      const lastPt = pts[pts.length - 1]
      ctx.lineTo(w, h)
      ctx.lineTo(0, h)
      ctx.closePath()
      const fillGrad = ctx.createLinearGradient(0, 0, 0, h)
      fillGrad.addColorStop(0, `${glowColor()}33`)
      fillGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = fillGrad
      ctx.fill()

      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)]
        const p1 = pts[i]
        const p2 = pts[i + 1]
        const p3 = pts[Math.min(pts.length - 1, i + 2)]
        const cp1x = p1.x + (p2.x - p0.x) * tension
        const cp1y = p1.y + (p2.y - p0.y) * tension
        const cp2x = p2.x - (p3.x - p1.x) * tension
        const cp2y = p2.y - (p3.y - p1.y) * tension
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y)
      }
      ctx.strokeStyle = glowColor()
      ctx.lineWidth = 3 * dpr
      ctx.shadowColor = glowColor()
      ctx.shadowBlur = 12 * dpr
      ctx.stroke()
      ctx.shadowBlur = 0

      if (lastPt) {
        ctx.beginPath()
        ctx.arc(lastPt.x, lastPt.y, 5 * dpr, 0, Math.PI * 2)
        ctx.fillStyle = glowColor()
        ctx.shadowColor = glowColor()
        ctx.shadowBlur = 16 * dpr
        ctx.fill()
        ctx.shadowBlur = 0
      }

      animFrameId = requestAnimationFrame(draw)
    }

    draw()
    onCleanup(() => {
      if (animFrameId) cancelAnimationFrame(animFrameId)
    })
  })

  const levelLabels: Record<string, string> = {
    deep: '深度专注',
    moderate: '中度专注',
    distracted: '注意力分散',
    idle: '闲置',
  }

  const distractionTypes = [
    { type: 'phone', icon: '📱', label: '手机' },
    { type: 'chat', icon: '💬', label: '消息' },
    { type: 'mind', icon: '🧠', label: '走神' },
    { type: 'other', icon: '🔔', label: '其他' },
  ]

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-white" style={{ 'font-family': 'Orbitron, monospace' }}>
            专注力动能
          </h1>
          <p class="text-sm text-gray-500 mt-1">实时专注数据采集与可视化反馈</p>
        </div>
        <button
          onClick={() => (focusState.isTracking ? stopTracking() : startTracking())}
          class={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all border ${
            focusState.isTracking
              ? 'border-[#ff8c00] text-[#ff8c00] hover:bg-[#ff8c00]/10'
              : 'border-[#00f0ff] text-[#00f0ff] hover:bg-[#00f0ff]/10'
          }`}
        >
          {focusState.isTracking ? '■ 结束专注' : '▶ 开始专注'}
        </button>
      </div>

      <div class="glass-card rounded-xl p-5">
        <span class="section-title">动能波形</span>
        <div class="relative w-full">
          <canvas ref={canvasRef} class="w-full rounded-lg" style={{ height: '200px' }} />
        </div>
        <div class="flex items-center gap-4 mt-3 text-xs text-gray-500">
          <span>速度: <span class="text-[#00f0ff]">{kineticFrame().velocity > 0 ? '+' : ''}{kineticFrame().velocity.toFixed(1)}</span></span>
          <span>加速度: <span class="text-[#00f0ff]">{kineticFrame().acceleration > 0 ? '+' : ''}{kineticFrame().acceleration.toFixed(1)}</span></span>
          <span>动量: <span class="text-[#00f0ff]">{kineticFrame().momentum.toFixed(2)}</span></span>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="glass-card rounded-xl p-6 flex flex-col items-center justify-center">
          <span class="section-title self-start">反馈光环</span>
          <div class="relative w-48 h-48 flex items-center justify-center">
            <svg width="192" height="192" viewBox="0 0 192 192" class="absolute">
              <defs>
                <filter id="halo-glow">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <radialGradient id="halo-gradient" cx="50%" cy="50%" r="50%">
                  <stop offset="70%" stop-color={glowColor()} stop-opacity={glowIntensity() * 0.3} />
                  <stop offset="100%" stop-color={glowColor()} stop-opacity="0" />
                </radialGradient>
              </defs>
              <circle cx="96" cy="96" r="90" fill="url(#halo-gradient)" />
              <circle
                cx="96"
                cy="96"
                r="76"
                fill="none"
                stroke={glowColor()}
                stroke-width="3"
                opacity={glowIntensity()}
                filter="url(#halo-glow)"
                class={focusState.isTracking ? 'animate-pulse-glow' : ''}
              />
              <circle
                cx="96"
                cy="96"
                r="68"
                fill="none"
                stroke={glowColor()}
                stroke-width="1"
                opacity={glowIntensity() * 0.4}
                stroke-dasharray="4 6"
                class={focusState.isTracking ? 'animate-spin-slow' : ''}
                style={{ 'transform-origin': '96px 96px' }}
              />
            </svg>
            <div class="z-10 flex flex-col items-center">
              <span
                class="text-4xl font-bold"
                style={{ 'font-family': 'Orbitron, monospace', color: glowColor() }}
              >
                {Math.round(focusState.currentFocus)}
              </span>
              <span class="text-xs text-gray-400 mt-1">{levelLabels[focusState.currentLevel]}</span>
            </div>
          </div>
        </div>

        <div class="space-y-6">
          <div class="glass-card rounded-xl p-5">
            <span class="section-title">深度专注区间</span>
            <div class="flex items-center gap-3 mb-3">
              <span class="text-3xl font-bold text-[#39ff14]" style={{ 'font-family': 'Orbitron, monospace' }}>
                {Math.round(focusState.todayDeepFocusMinutes)}
              </span>
              <span class="text-sm text-gray-400">分钟</span>
            </div>
            <div class="h-3 bg-[#1a1d2e] rounded-full overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-[#39ff14]/60 to-[#39ff14] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (focusState.todayDeepFocusMinutes / 240) * 100)}%` }}
              />
            </div>
            <div class="flex justify-between text-xs text-gray-500 mt-1">
              <span>0</span>
              <span>目标: 240分钟</span>
            </div>
          </div>

          <div class="glass-card rounded-xl p-5">
            <span class="section-title">干扰记录</span>
            <div class="flex gap-2 mb-3">
              <For each={distractionTypes}>
                {(d) => (
                  <button
                    onClick={() => addDistraction(d.type)}
                    class="px-2.5 py-1.5 rounded text-xs bg-[#1a1d2e] text-gray-300 hover:bg-[#ff8c00]/20 hover:text-[#ff8c00] transition-colors"
                  >
                    {d.icon} {d.label}
                  </button>
                )}
              </For>
            </div>
            <Show
              when={focusState.todayDistractions.length > 0}
              fallback={<p class="text-xs text-gray-600">尚无干扰记录</p>}
            >
              <div class="space-y-2 max-h-32 overflow-y-auto">
                <For each={focusState.todayDistractions.slice(-5).reverse()}>
                  {(d) => (
                    <div class="flex items-center gap-2 text-xs">
                      <span class="w-1.5 h-1.5 rounded-full bg-[#ff8c00] shrink-0" />
                      <span class="text-gray-400">
                        {new Date(d.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      <span class="text-gray-300">{d.type}</span>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </div>
      </div>
    </div>
  )
}
