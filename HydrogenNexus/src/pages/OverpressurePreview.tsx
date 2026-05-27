import { onMount, onCleanup, createSignal, createMemo, Show } from 'solid-js'
import { useStore } from '../stores/appStore'
import { calculateOverpressure, getOverpressureZones, interpolateOverpressure, type OverpressureZone } from '../utils/models'

export default function OverpressurePreview() {
  const store = useStore()
  let heatCanvas: HTMLCanvasElement | undefined
  let chartCanvas: HTMLCanvasElement | undefined
  let animFrameId: number | null = null
  let chartInstance: any = null

  const [tntEquivalent, setTntEquivalent] = createSignal(50)
  const [timeFactor, setTimeFactor] = createSignal(1.0)
  const [isPlaying, setIsPlaying] = createSignal(false)

  const overpressureData = createMemo(() => {
    return calculateOverpressure(tntEquivalent(), 300, 200)
  })

  const zones = createMemo(() => {
    return getOverpressureZones(tntEquivalent())
  })

  const timeProgression = createMemo(() => {
    return interpolateOverpressure(tntEquivalent(), timeFactor())
  })

  function drawHeatmap(canvas: HTMLCanvasElement) {
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

    const z = zones()
    const scale = Math.min(w, h) / 600
    const cx = w * 0.35
    const cy = h * 0.5

    const zoneOrder: OverpressureZone[] = [...z].reverse()
    for (const zone of zoneOrder) {
      if (zone.outerRadius <= 0) continue
      ctx.beginPath()
      ctx.arc(cx, cy, zone.outerRadius * scale, 0, Math.PI * 2)
      ctx.fillStyle = zone.colorAlpha
      ctx.fill()
      ctx.strokeStyle = zone.color
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.stroke()
      ctx.setLineDash([])
    }

    const facilities = store.facilities()
    for (const f of facilities) {
      const fx = f.x * scale * 0.9 + cx - 150 * scale
      const fy = f.y * scale * 0.9 + cy - 100 * scale
      const dx = fx - cx
      const dy = fy - cy
      const dist = Math.sqrt(dx * dx + dy * dy) / scale
      let inZone = ''
      for (const zone of z) {
        if (dist >= zone.innerRadius && dist < zone.outerRadius && zone.outerRadius > 0) {
          inZone = zone.label
          break
        }
      }
      ctx.beginPath()
      ctx.arc(fx, fy, 5, 0, Math.PI * 2)
      ctx.fillStyle = inZone === '致命区' ? '#E63946' : inZone === '重伤区' ? '#FF6B35' : inZone === '轻伤区' ? '#F4A261' : '#2EC4B6'
      ctx.fill()
      if (inZone) {
        ctx.fillStyle = '#fff'
        ctx.font = '8px "Noto Sans SC"'
        ctx.textAlign = 'center'
        ctx.fillText(inZone, fx, fy - 8)
      }
    }

    ctx.beginPath()
    ctx.arc(cx, cy, 6, 0, Math.PI * 2)
    ctx.fillStyle = '#E63946'
    ctx.fill()
    ctx.fillStyle = '#aaa'
    ctx.font = '9px "Noto Sans SC"'
    ctx.textAlign = 'center'
    ctx.fillText('爆心', cx, cy + 16)

    ctx.fillStyle = '#555'
    ctx.font = '10px "Noto Sans SC"'
    ctx.textAlign = 'right'
    for (let d = 50; d <= 300; d += 50) {
      const lx = cx + d * scale
      if (lx < w) {
        ctx.fillText(`${d}m`, lx, h - 8)
        ctx.strokeStyle = '#1E3A5F'
        ctx.setLineDash([2, 4])
        ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, h - 15); ctx.stroke()
        ctx.setLineDash([])
      }
    }
  }

  async function drawChart() {
    if (!chartCanvas) return
    const Chart = (await import('chart.js')).default
    if (chartInstance) chartInstance.destroy()

    const data = timeProgression()
    chartInstance = new Chart(chartCanvas, {
      type: 'line',
      data: {
        labels: data.distances.map(d => `${d}m`),
        datasets: [{
          label: '峰值超压 (MPa)',
          data: data.overpressures,
          borderColor: '#FF6B35',
          backgroundColor: 'rgba(255, 107, 53, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2,
        }, {
          label: '0.1 MPa (致命)',
          data: data.distances.map(() => 0.1),
          borderColor: 'rgba(230, 57, 70, 0.5)',
          borderDash: [5, 5],
          pointRadius: 0,
          borderWidth: 1,
        }, {
          label: '0.03 MPa (重伤)',
          data: data.distances.map(() => 0.03),
          borderColor: 'rgba(255, 107, 53, 0.5)',
          borderDash: [5, 5],
          pointRadius: 0,
          borderWidth: 1,
        }, {
          label: '0.01 MPa (轻伤)',
          data: data.distances.map(() => 0.01),
          borderColor: 'rgba(244, 162, 97, 0.5)',
          borderDash: [5, 5],
          pointRadius: 0,
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#888', font: { size: 10, family: 'Noto Sans SC' } },
          },
        },
        scales: {
          x: {
            ticks: { color: '#555', font: { size: 9, family: 'JetBrains Mono' }, maxTicksLimit: 15 },
            grid: { color: '#1E3A5F' },
            title: { display: true, text: '距离 (m)', color: '#555', font: { size: 10 } },
          },
          y: {
            ticks: { color: '#555', font: { size: 9, family: 'JetBrains Mono' } },
            grid: { color: '#1E3A5F' },
            title: { display: true, text: '超压 (MPa)', color: '#555', font: { size: 10 } },
          },
        },
      },
    })
  }

  function animate() {
    if (heatCanvas) drawHeatmap(heatCanvas)
    if (isPlaying()) {
      setTimeFactor(prev => {
        const next = prev + 0.005
        return next > 2.0 ? 0.2 : next
      })
    }
    animFrameId = requestAnimationFrame(animate)
  }

  onMount(() => {
    if (heatCanvas) {
      heatCanvas.width = 700
      heatCanvas.height = 450
    }
    animate()
    drawChart()
  })

  onCleanup(() => {
    if (animFrameId) cancelAnimationFrame(animFrameId)
    if (chartInstance) chartInstance.destroy()
  })

  const tf = createMemo(() => timeFactor())
  createMemo(() => { tf(); drawChart() })

  return (
    <div class="flex-1 overflow-auto p-4 space-y-4">
      <div class="hydro-card">
        <div class="flex items-center justify-between mb-3">
          <div class="hydro-label">爆炸超压参数配置</div>
        </div>
        <div class="grid grid-cols-3 gap-6">
          <div>
            <label class="text-[10px] text-gray-500 block mb-1">TNT当量 (kg)</label>
            <input
              type="range" min="1" max="500" step="1"
              value={tntEquivalent()}
              onInput={(e) => setTntEquivalent(parseFloat(e.currentTarget.value))}
              class="w-full accent-hydro-flame"
            />
            <span class="font-mono text-xs text-hydro-flame">{tntEquivalent()} kg</span>
          </div>
          <div>
            <label class="text-[10px] text-gray-500 block mb-1">时间演化因子</label>
            <input
              type="range" min="0.2" max="2.0" step="0.05"
              value={timeFactor()}
              onInput={(e) => setTimeFactor(parseFloat(e.currentTarget.value))}
              class="w-full accent-hydro-flame"
            />
            <span class="font-mono text-xs text-hydro-flame">{timeFactor().toFixed(2)}x</span>
          </div>
          <div class="flex items-end gap-2">
            <button
              class={`hydro-btn text-xs ${isPlaying() ? 'bg-hydro-flame text-white' : 'hydro-btn-outline'}`}
              onClick={() => setIsPlaying(!isPlaying())}
            >
              {isPlaying() ? '⏸ 暂停推演' : '▶ 开始推演'}
            </button>
            <button class="hydro-btn-outline text-xs" onClick={() => setTimeFactor(1.0)}>重置</button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-12 gap-4">
        <div class="col-span-7 hydro-card">
          <div class="hydro-label mb-2">次生风险热力图</div>
          <canvas ref={heatCanvas} class="w-full rounded border border-hydro-border" />
        </div>
        <div class="col-span-5 hydro-card">
          <div class="hydro-label mb-2">伤害区域图例</div>
          <div class="space-y-3">
            <For each={zones()}>
              {(zone) => (
                <Show when={zone.outerRadius > 0}>
                  <div class="flex items-center gap-3 p-2 rounded-lg bg-hydro-slate/30">
                    <div class="w-4 h-4 rounded" style={{ 'background-color': zone.colorAlpha, border: `1px solid ${zone.color}` }} />
                    <div class="flex-1">
                      <div class="text-xs font-medium" style={{ color: zone.color }}>{zone.label}</div>
                      <div class="text-[10px] text-gray-500">
                        {zone.innerRadius > 0 ? `${zone.innerRadius.toFixed(0)}m` : '0m'} — {zone.outerRadius.toFixed(0)}m
                      </div>
                    </div>
                  </div>
                </Show>
              )}
            </For>
          </div>
          <div class="mt-4 pt-3 border-t border-hydro-border">
            <div class="hydro-label mb-2">当前参数</div>
            <div class="space-y-1.5 text-xs">
              <div class="flex justify-between">
                <span class="text-gray-500">TNT当量</span>
                <span class="font-mono text-hydro-flame">{tntEquivalent()} kg</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">时间因子</span>
                <span class="font-mono text-hydro-flame">{timeFactor().toFixed(2)}x</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">有效当量</span>
                <span class="font-mono text-hydro-danger">{(tntEquivalent() * timeFactor()).toFixed(1)} kg</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="hydro-card">
        <div class="hydro-label mb-2">超压演化曲线</div>
        <div class="h-64">
          <canvas ref={chartCanvas} />
        </div>
      </div>
    </div>
  )
}
