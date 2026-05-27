import { onMount, onCleanup, createSignal, createMemo, Show, For } from 'solid-js'
import { useStore } from '../stores/appStore'
import { gaussianPlume, getCloudColor } from '../utils/models'

export default function LeakMapping() {
  const store = useStore()
  let stationCanvas: HTMLCanvasElement | undefined
  let fireCanvas: HTMLCanvasElement | undefined
  let animFrameId: number | null = null

  const [canvasSize, setCanvasSize] = createSignal({ w: 700, h: 500 })

  const cloudData = createMemo(() => {
    return gaussianPlume(
      store.leakRate(),
      store.windSpeed(),
      store.windDirection(),
      store.stabilityClass(),
      3,
      canvasSize().w,
      canvasSize().h,
      6
    )
  })

  const stabilityOptions = [
    { value: 'A', label: 'A - 极不稳定' },
    { value: 'B', label: 'B - 不稳定' },
    { value: 'C', label: 'C - 弱不稳定' },
    { value: 'D', label: 'D - 中性' },
    { value: 'E', label: 'E - 弱稳定' },
    { value: 'F', label: 'F - 稳定' },
  ]

  function drawScene(canvas: HTMLCanvasElement, label: string, viewOffset: { x: number; y: number }) {
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width
    const h = canvas.height

    ctx.fillStyle = '#0A1628'
    ctx.fillRect(0, 0, w, h)

    ctx.strokeStyle = '#1E3A5F'
    ctx.lineWidth = 0.5
    for (let x = 0; x < w; x += 50) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
    }
    for (let y = 0; y < h; y += 50) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
    }

    const facilities = store.facilities()
    for (const f of facilities) {
      ctx.beginPath()
      ctx.arc(f.x + viewOffset.x, f.y + viewOffset.y, 8, 0, Math.PI * 2)
      const colors: Record<string, string> = { normal: '#2EC4B6', warning: '#F4A261', alarm: '#E63946', offline: '#555' }
      ctx.fillStyle = colors[f.status] || '#555'
      ctx.fill()
      ctx.fillStyle = '#aaa'
      ctx.font = '9px "Noto Sans SC"'
      ctx.textAlign = 'center'
      ctx.fillText(f.name, f.x + viewOffset.x, f.y + viewOffset.y + 18)
    }

    if (store.currentLeakEvent()) {
      const points = cloudData()
      for (const p of points) {
        ctx.fillStyle = getCloudColor(p.concentration)
        ctx.fillRect(p.x + viewOffset.x - 3, p.y + viewOffset.y - 3, 6, 6)
      }

      const leakFacility = facilities.find(f => f.id === store.currentLeakEvent()!.facilityId)
      if (leakFacility) {
        const lx = leakFacility.x + viewOffset.x
        const ly = leakFacility.y + viewOffset.y
        const time = Date.now() / 1000
        const pulseR = 12 + Math.sin(time * 3) * 4
        ctx.beginPath()
        ctx.arc(lx, ly, pulseR, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(230, 57, 70, 0.6)'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }

    const cx = w / 2
    const cy = 40
    ctx.save()
    ctx.translate(cx, cy)
    const dir = (store.windDirection() * Math.PI) / 180
    ctx.rotate(dir)
    ctx.beginPath()
    ctx.moveTo(0, -18)
    ctx.lineTo(-6, 6)
    ctx.lineTo(0, 2)
    ctx.lineTo(6, 6)
    ctx.closePath()
    ctx.fillStyle = 'rgba(244, 162, 97, 0.7)'
    ctx.fill()
    ctx.restore()
    ctx.fillStyle = '#666'
    ctx.font = '9px "Noto Sans SC"'
    ctx.textAlign = 'center'
    ctx.fillText('风向', cx, cy + 26)

    ctx.fillStyle = '#555'
    ctx.font = '11px "Noto Sans SC"'
    ctx.textAlign = 'left'
    ctx.fillText(label, 10, 20)
  }

  function animate() {
    if (stationCanvas) drawScene(stationCanvas, '站控中心视角', { x: 0, y: 0 })
    if (fireCanvas) drawScene(fireCanvas, '消防联动终端视角', { x: 20, y: 10 })
    animFrameId = requestAnimationFrame(animate)
  }

  onMount(() => {
    if (stationCanvas) {
      stationCanvas.width = canvasSize().w
      stationCanvas.height = canvasSize().h
    }
    if (fireCanvas) {
      fireCanvas.width = canvasSize().w
      fireCanvas.height = canvasSize().h
    }
    animate()
  })

  onCleanup(() => {
    if (animFrameId) cancelAnimationFrame(animFrameId)
  })

  const syncDot = createMemo(() => {
    const s = store.syncStatus()
    if (s === 'synced') return { c: 'bg-hydro-safe', t: '数据同步' }
    if (s === 'syncing') return { c: 'bg-hydro-amber', t: '同步中...' }
    return { c: 'bg-hydro-danger', t: '同步延迟' }
  })

  return (
    <div class="flex-1 overflow-auto p-4 space-y-4">
      <div class="hydro-card">
        <div class="flex items-center justify-between mb-3">
          <div class="hydro-label">风场参数控制</div>
          <Show when={!store.currentLeakEvent()}>
            <button class="hydro-btn-primary text-xs" onClick={() => {
              const f = store.facilities().find(f => f.type === 'dispenser' || f.type === 'compressor')
              if (f) store.triggerLeakEvent(f.id)
            }}>
              触发泄漏模拟
            </button>
          </Show>
        </div>
        <div class="grid grid-cols-4 gap-4">
          <div>
            <label class="text-[10px] text-gray-500 block mb-1">风速 (m/s)</label>
            <input
              type="range" min="0.5" max="15" step="0.5"
              value={store.windSpeed()}
              onInput={(e) => store.setWindSpeed(parseFloat(e.currentTarget.value))}
              class="w-full accent-hydro-flame"
            />
            <span class="font-mono text-xs text-hydro-flame">{store.windSpeed()}</span>
          </div>
          <div>
            <label class="text-[10px] text-gray-500 block mb-1">风向 (°)</label>
            <input
              type="range" min="0" max="360" step="5"
              value={store.windDirection()}
              onInput={(e) => store.setWindDirection(parseFloat(e.currentTarget.value))}
              class="w-full accent-hydro-flame"
            />
            <span class="font-mono text-xs text-hydro-flame">{store.windDirection()}°</span>
          </div>
          <div>
            <label class="text-[10px] text-gray-500 block mb-1">大气稳定度</label>
            <select
              value={store.stabilityClass()}
              onChange={(e) => store.setStabilityClass(e.currentTarget.value)}
              class="w-full bg-hydro-slate border border-hydro-border rounded px-2 py-1 text-xs text-gray-300"
            >
              <For each={stabilityOptions}>
                {(opt) => <option value={opt.value}>{opt.label}</option>}
              </For>
            </select>
          </div>
          <div>
            <label class="text-[10px] text-gray-500 block mb-1">泄漏源强 (kg/s)</label>
            <input
              type="range" min="0.1" max="5" step="0.1"
              value={store.leakRate()}
              onInput={(e) => store.setLeakRate(parseFloat(e.currentTarget.value))}
              class="w-full accent-hydro-flame"
            />
            <span class="font-mono text-xs text-hydro-flame">{store.leakRate()}</span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="hydro-card">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-gray-400 font-medium">站控中心</span>
            <div class="flex items-center gap-1.5">
              <div class={`w-1.5 h-1.5 rounded-full ${syncDot().c} animate-pulse`} />
              <span class="text-[10px] text-gray-500">{syncDot().t}</span>
            </div>
          </div>
          <canvas ref={stationCanvas} class="w-full rounded border border-hydro-border" style={{ imageRendering: 'pixelated' }} />
        </div>
        <div class="hydro-card">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-gray-400 font-medium">区域消防联动终端</span>
            <div class="flex items-center gap-1.5">
              <div class={`w-1.5 h-1.5 rounded-full ${syncDot().c} animate-pulse`} />
              <span class="text-[10px] text-gray-500">{syncDot().t}</span>
            </div>
          </div>
          <canvas ref={fireCanvas} class="w-full rounded border border-hydro-border" style={{ imageRendering: 'pixelated' }} />
        </div>
      </div>

      <Show when={store.currentLeakEvent()}>
        <div class="hydro-card border-hydro-danger/30">
          <div class="flex items-center gap-2 mb-2">
            <span class="w-2 h-2 rounded-full bg-hydro-danger animate-pulse" />
            <span class="text-xs text-hydro-danger font-medium">活跃泄漏事件</span>
          </div>
          <div class="grid grid-cols-5 gap-3 text-xs">
            <div>
              <span class="text-gray-500 block">事件ID</span>
              <span class="font-mono text-gray-300">{store.currentLeakEvent()!.id}</span>
            </div>
            <div>
              <span class="text-gray-500 block">泄漏设施</span>
              <span class="font-mono text-gray-300">{store.currentLeakEvent()!.facilityId}</span>
            </div>
            <div>
              <span class="text-gray-500 block">泄漏源强</span>
              <span class="font-mono text-hydro-flame">{store.currentLeakEvent()!.leakRate} kg/s</span>
            </div>
            <div>
              <span class="text-gray-500 block">严重程度</span>
              <span class="hydro-badge-danger">{store.currentLeakEvent()!.severity}</span>
            </div>
            <div>
              <span class="text-gray-500 block">云团数据点</span>
              <span class="font-mono text-gray-300">{cloudData().length}</span>
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}
