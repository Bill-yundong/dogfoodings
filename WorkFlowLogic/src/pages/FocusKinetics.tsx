import { onMount, onCleanup, createMemo, createSignal, For, Show } from 'solid-js'
import { focusState, startTracking, stopTracking, addDistraction } from '~/stores/focus'
import { computeKineticFrame, getGlowIntensity, getGlowColor } from '~/engines/focus-kinetic'

export default function FocusKinetics() {
  let canvasRef: HTMLCanvasElement | undefined
  let animFrameId: number | null = null
  const [canvasSize, setCanvasSize] = createSignal({ w: 800, h: 220 })

  const kineticFrame = createMemo(() => computeKineticFrame(focusState.todaySamples))

  const levelLabels: Record<string, string> = {
    deep: '深度专注',
    moderate: '中度专注',
    distracted: '注意力分散',
    idle: '闲置',
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'deep': return '#10b981'
      case 'moderate': return '#6366f1'
      case 'distracted': return '#f59e0b'
      case 'idle': return '#64748b'
      default: return '#64748b'
    }
  }

  const distractionTypes = [
    { type: 'phone', icon: '📱', label: '手机' },
    { type: 'chat', icon: '💬', label: '消息' },
    { type: 'mind', icon: '🧠', label: '走神' },
    { type: 'other', icon: '🔔', label: '其他' },
  ]

  onMount(() => {
    if (canvasRef) {
      const resize = () => {
        if (canvasRef && canvasRef.parentElement) {
          const rect = canvasRef.parentElement.getBoundingClientRect()
          setCanvasSize({ w: rect.width, h: 220 })
          canvasRef.width = rect.width * window.devicePixelRatio
          canvasRef.height = 220 * window.devicePixelRatio
          canvasRef.style.width = `${rect.width}px`
          canvasRef.style.height = '220px'
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

      ctx.fillStyle = 'rgba(30, 41, 59, 0.3)'
      ctx.fillRect(0, 0, w, h)

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)'
      ctx.lineWidth = 1
      for (let y = 0; y < h; y += 44 * dpr) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }
      for (let x = 0; x < w; x += 88 * dpr) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }

      const samples = focusState.todaySamples
      if (samples.length >= 2) {
        const visible = samples.slice(-Math.floor(canvasSize().w / 1.5))
        const step = w / Math.max(visible.length - 1, 1)
        const pts = visible.map((s, i) => ({
          x: i * step,
          y: h - (s.value / 100) * h * 0.75 - h * 0.1,
        }))

        const tension = 0.35
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
        fillGrad.addColorStop(0, 'rgba(99, 102, 241, 0.2)')
        fillGrad.addColorStop(1, 'rgba(99, 102, 241, 0)')
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
        ctx.strokeStyle = '#6366f1'
        ctx.lineWidth = 2.5 * dpr
        ctx.shadowColor = 'rgba(99, 102, 241, 0.5)'
        ctx.shadowBlur = 10 * dpr
        ctx.stroke()
        ctx.shadowBlur = 0

        if (lastPt) {
          ctx.beginPath()
          ctx.arc(lastPt.x, lastPt.y, 6 * dpr, 0, Math.PI * 2)
          ctx.fillStyle = '#6366f1'
          ctx.shadowColor = 'rgba(99, 102, 241, 0.6)'
          ctx.shadowBlur = 14 * dpr
          ctx.fill()
          ctx.beginPath()
          ctx.arc(lastPt.x, lastPt.y, 3 * dpr, 0, Math.PI * 2)
          ctx.fillStyle = '#fff'
          ctx.fill()
          ctx.shadowBlur = 0
        }
      }

      animFrameId = requestAnimationFrame(draw)
    }

    draw()
    onCleanup(() => {
      if (animFrameId) cancelAnimationFrame(animFrameId)
    })
  })

  const progressPercent = Math.min(100, (focusState.todayDeepFocusMinutes / 240) * 100)

  return (
    <div class="space-y-6 max-w-6xl">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-slate-100">
            专注力动能
          </h1>
          <p class="text-sm text-slate-400 mt-1">实时专注数据采集与可视化反馈</p>
        </div>
        <button
          onClick={() => (focusState.isTracking ? stopTracking() : startTracking())}
          class={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
            focusState.isTracking
              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20'
              : 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5'
          }`}
        >
          {focusState.isTracking ? '■ 结束专注' : '▶ 开始专注'}
        </button>
      </div>

      <div class="card-base p-6">
        <div class="flex items-center justify-between mb-4">
          <div class="text-sm font-semibold uppercase tracking-wider text-slate-400">动能波形</div>
          <div class="flex items-center gap-4 text-xs text-slate-500">
            <span>速度: <span class="text-indigo-400 font-mono">{kineticFrame().velocity > 0 ? '+' : ''}{kineticFrame().velocity.toFixed(1)}</span></span>
            <span>加速度: <span class="text-indigo-400 font-mono">{kineticFrame().acceleration > 0 ? '+' : ''}{kineticFrame().acceleration.toFixed(1)}</span></span>
            <span>动量: <span class="text-indigo-400 font-mono">{kineticFrame().momentum.toFixed(2)}</span></span>
          </div>
        </div>
        <canvas ref={canvasRef} class="w-full rounded-xl" style={{ height: '220px' }} />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="card-base p-6 flex flex-col items-center justify-center">
          <div class="text-sm font-semibold uppercase tracking-wider text-slate-400 self-start mb-4">反馈光环</div>
          <div class="relative w-48 h-48 flex items-center justify-center">
            <svg width="192" height="192" viewBox="0 0 192 192" class="absolute">
              <defs>
                <filter id="halo-glow-new">
                  <feGaussianBlur stdDeviation="8" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <radialGradient id="halo-gradient-new" cx="50%" cy="50%" r="50%">
                  <stop offset="60%" stop-color={getLevelColor(focusState.currentLevel)} stop-opacity={getGlowIntensity(focusState.currentLevel) * 0.25} />
                  <stop offset="100%" stop-color={getLevelColor(focusState.currentLevel)} stop-opacity="0" />
                </radialGradient>
              </defs>
              <circle cx="96" cy="96" r="90" fill="url(#halo-gradient-new)" />
              <circle
                cx="96" cy="96" r="72"
                fill="none"
                stroke={getLevelColor(focusState.currentLevel)}
                stroke-width="2.5"
                opacity={0.3 + getGlowIntensity(focusState.currentLevel) * 0.5}
                filter="url(#halo-glow-new)"
                class={focusState.isTracking ? 'animate-pulse-soft' : ''}
              />
              <circle
                cx="96" cy="96" r="60"
                fill="none"
                stroke={getLevelColor(focusState.currentLevel)}
                stroke-width="1"
                opacity="0.2"
                stroke-dasharray="3 6"
                class={focusState.isTracking ? 'animate-spin-slow' : ''}
                style={{ 'transform-origin': '96px 96px' }}
              />
            </svg>
            <div class="z-10 flex flex-col items-center">
              <span
                class="text-4xl font-semibold"
                style={{ 'font-family': "'JetBrains Mono', monospace", color: getLevelColor(focusState.currentLevel) }}
              >
                {Math.round(focusState.currentFocus)}
              </span>
              <span class="text-sm text-slate-400 mt-1">{levelLabels[focusState.currentLevel]}</span>
            </div>
          </div>
        </div>

        <div class="lg:col-span-2 space-y-6">
          <div class="card-base p-6">
            <div class="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">深度专注区间</div>
            <div class="flex items-baseline gap-3 mb-4">
              <span class="text-4xl font-semibold text-emerald-400" style={{ 'font-family': "'JetBrains Mono', monospace" }}>
                {Math.round(focusState.todayDeepFocusMinutes)}
              </span>
              <span class="text-sm text-slate-400">分钟</span>
              <span class="text-xs text-slate-500">/ 目标 240 分钟</span>
            </div>
            <div class="h-3 bg-slate-700/50 rounded-full overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-emerald-400/70 to-emerald-400 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div class="flex justify-between text-xs text-slate-500 mt-2">
              <span>0</span>
              <span>240</span>
            </div>
          </div>

          <div class="card-base p-6">
            <div class="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">干扰记录</div>
            <div class="flex flex-wrap gap-2 mb-4">
              <For each={distractionTypes}>
                {(d) => (
                  <button
                    onClick={() => addDistraction(d.type)}
                    class="px-3 py-2 rounded-lg text-xs bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-slate-200 transition-colors"
                  >
                    {d.icon} {d.label}
                  </button>
                )}
              </For>
            </div>
            <Show
              when={focusState.todayDistractions.length > 0}
              fallback={<p class="text-sm text-slate-500 italic">暂无干扰记录</p>}
            >
              <div class="space-y-2 max-h-28 overflow-y-auto">
                <For each={focusState.todayDistractions.slice(-6).reverse()}>
                  {(d) => (
                    <div class="flex items-center gap-3 text-sm">
                      <span class="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span class="text-slate-500" style={{ 'font-family': "'JetBrains Mono', monospace", 'font-size': '12px' }}>
                        {new Date(d.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      <span class="text-slate-300">{d.type}</span>
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
