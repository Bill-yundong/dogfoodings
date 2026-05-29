import { createMemo, For } from 'solid-js'
import { efficiencyState, setPeriod, getFilteredRecords, getAverageMetrics } from '~/stores/efficiency'

export default function EfficiencyAtlas() {
  const filteredRecords = createMemo(() => getFilteredRecords())
  const avgMetrics = createMemo(() => getAverageMetrics())

  const radarDimensions = [
    { key: 'focusScore', label: '专注深度', color: '#6366f1' },
    { key: 'taskCompletionRate', label: '任务完成率', color: '#10b981' },
    { key: 'timeUtilization', label: '时间利用率', color: '#f59e0b' },
    { key: 'rhythmStability', label: '节奏稳定性', color: '#8b5cf6' },
    { key: 'recoveryEfficiency', label: '恢复效率', color: '#06b6d4' },
  ] as const

  const radarPoints = createMemo(() => {
    if (!avgMetrics()) return []
    const m = avgMetrics()!
    const values = [
      m.focusScore,
      m.taskCompletionRate,
      m.timeUtilization,
      m.rhythmStability,
      m.recoveryEfficiency,
    ]
    const cx = 150
    const cy = 150
    const r = 100
    const n = values.length

    return values.map((v, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2
      const ratio = v / 100
      return {
        x: cx + r * ratio * Math.cos(angle),
        y: cy + r * ratio * Math.sin(angle),
        value: v,
        label: radarDimensions[i].label,
      }
    })
  })

  const W = 640
  const H = 260
  const PX = 48
  const PY = 24
  const PW = W - PX * 2
  const PH = H - PY * 2

  const trendPath = createMemo(() => {
    const records = filteredRecords()
    if (records.length < 2) return ''
    return records
      .map((r, i) => {
        const x = PX + (i / (records.length - 1)) * PW
        const y = PY + PH - (r.focusScore / 100) * PH
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
      })
      .join(' ')
  })

  const completionPath = createMemo(() => {
    const records = filteredRecords()
    if (records.length < 2) return ''
    return records
      .map((r, i) => {
        const x = PX + (i / (records.length - 1)) * PW
        const y = PY + PH - (r.taskCompletionRate / 100) * PH
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
      })
      .join(' ')
  })

  const trendAreaPath = createMemo(() => {
    const records = filteredRecords()
    if (records.length < 2) return ''
    const bottom = PY + PH
    const last = records.length - 1
    const lastX = PX + (last / (records.length - 1)) * PW
    return `${trendPath()} L ${lastX} ${bottom} L ${PX} ${bottom} Z`
  })

  const heatCalendar = createMemo(() => {
    const records = efficiencyState.records
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDow = firstDay.getDay()

    const cells: Array<{ date: string; day: number; score: number; inMonth: boolean }> = []

    for (let i = 0; i < startDow; i++) {
      cells.push({ date: '', day: 0, score: 0, inMonth: false })
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const record = records.find((r) => r.date === dateStr)
      const score = record
        ? (record.focusScore + record.taskCompletionRate + record.timeUtilization) / 3
        : 0
      cells.push({ date: dateStr, day: d, score, inMonth: true })
    }

    return cells
  })

  const heatColor = (score: number): string => {
    if (score === 0) return '#1e293b'
    if (score < 30) return '#334155'
    if (score < 50) return '#475569'
    if (score < 70) return '#6366f1'
    if (score < 85) return '#818cf8'
    return '#a5b4fc'
  }

  const baselineReport = createMemo(() => {
    const records = filteredRecords()
    if (records.length === 0) return null

    const avgFocus = records.reduce((s, r) => s + r.focusScore, 0) / records.length
    const avgCompletion = records.reduce((s, r) => s + r.taskCompletionRate, 0) / records.length
    const avgDeepFocus = records.reduce((s, r) => s + r.totalDeepFocusMinutes, 0) / records.length
    const avgTasks = records.reduce((s, r) => s + r.totalTasksCompleted, 0) / records.length

    const suggestions: string[] = []
    if (avgFocus < 55) suggestions.push('专注力偏低，建议减少多任务切换，尝试番茄工作法')
    if (avgCompletion < 60) suggestions.push('任务完成率不足，建议拆分大任务为更小的可执行单元')
    if (avgDeepFocus < 60) suggestions.push('深度专注时间偏少，建议屏蔽干扰源并延长单次专注时段')
    if (avgFocus >= 70 && avgCompletion >= 70) suggestions.push('效能状态良好，建议维持当前节奏并适当挑战更高目标')
    if (suggestions.length === 0) suggestions.push('保持良好状态，持续关注数据变化')

    return { avgFocus, avgCompletion, avgDeepFocus, avgTasks, suggestions }
  })

  const periodLabel = createMemo(() => {
    switch (efficiencyState.selectedPeriod) {
      case 7: return '近7天'
      case 30: return '近30天'
      case 90: return '近90天'
    }
  })

  return (
    <div class="space-y-6 max-w-6xl">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-slate-100">
            效能图谱
          </h1>
          <p class="text-sm text-slate-400 mt-1">长周期效能分析与产能基线报告</p>
        </div>
        <div class="flex gap-1 bg-slate-800/50 rounded-xl p-1">
          <For each={[7, 30, 90] as const}>
            {(p) => (
              <button
                onClick={() => setPeriod(p)}
                class={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                  efficiencyState.selectedPeriod === p
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p}天
              </button>
            )}
          </For>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="card-base p-6 lg:col-span-2">
          <div class="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">{periodLabel()}效能趋势</div>
          <svg viewBox={`0 0 ${W} ${H}`} class="w-full" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="trendFillNew" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#6366f1" stop-opacity="0.15" />
                <stop offset="100%" stop-color="#6366f1" stop-opacity="0" />
              </linearGradient>
            </defs>
            {[0, 25, 50, 75, 100].map((l) => (
              <line
                x1={PX} y1={PY + PH - (l / 100) * PH}
                x2={W - PX} y2={PY + PH - (l / 100) * PH}
                stroke="rgba(148, 163, 184, 0.08)" stroke-width="1"
              />
            ))}
            {trendAreaPath() && <path d={trendAreaPath()} fill="url(#trendFillNew)" />}
            {trendPath() && (
              <path d={trendPath()} fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" />
            )}
            {completionPath() && (
              <path d={completionPath()} fill="none" stroke="#10b981" stroke-width="1.5" stroke-dasharray="5 4" stroke-linecap="round" />
            )}
            {[0, 25, 50, 75, 100].map((l) => (
              <text x={PX - 8} y={PY + PH - (l / 100) * PH + 4} text-anchor="end" fill="#64748b" style={{ 'font-size': '11px' }}>
                {l}
              </text>
            ))}
          </svg>
          <div class="flex items-center gap-6 mt-3 text-xs text-slate-500">
            <span class="flex items-center gap-2">
              <span class="w-4 h-0.5 bg-[#6366f1] rounded inline-block" /> 专注力
            </span>
            <span class="flex items-center gap-2">
              <span class="w-4 h-0.5 bg-[#10b981] rounded inline-block" style={{ 'border-top': '1px dashed #10b981' }} /> 任务完成率
            </span>
          </div>
        </div>

        <div class="card-base p-6 flex flex-col items-center">
          <div class="text-sm font-semibold uppercase tracking-wider text-slate-400 self-start mb-4">效能雷达</div>
          <svg width="280" height="280" viewBox="0 0 300 300">
            {[0.25, 0.5, 0.75, 1].map((ratio) => {
              const pts = Array.from({ length: 5 }, (_, i) => {
                const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2
                return `${150 + 100 * ratio * Math.cos(angle)},${150 + 100 * ratio * Math.sin(angle)}`
              })
              return <polygon points={pts.join(' ')} fill="none" stroke="rgba(148, 163, 184, 0.1)" stroke-width="1" />
            })}
            {radarDimensions.map((_, i) => {
              const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2
              return (
                <line
                  x1="150" y1="150"
                  x2={150 + 100 * Math.cos(angle)} y2={150 + 100 * Math.sin(angle)}
                  stroke="rgba(148, 163, 184, 0.1)" stroke-width="1"
                />
              )
            })}
            {radarPoints().length > 0 && (
              <polygon
                points={radarPoints().map((p) => `${p.x},${p.y}`).join(' ')}
                fill="rgba(99, 102, 241, 0.15)"
                stroke="#6366f1"
                stroke-width="2"
              />
            )}
            {radarPoints().map((p, i) => (
              <g>
                <circle cx={p.x} cy={p.y} r="5" fill="#6366f1" stroke="#0f172a" stroke-width="2" />
                <text
                  x={150 + 120 * Math.cos((Math.PI * 2 * i) / 5 - Math.PI / 2)}
                  y={150 + 120 * Math.sin((Math.PI * 2 * i) / 5 - Math.PI / 2) + 4}
                  text-anchor="middle"
                  fill="#94a3b8"
                  style={{ 'font-size': '11px' }}
                >
                  {p.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      <div class="card-base p-6">
        <div class="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-5">
          效能热力日历 - {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}
        </div>
        <div class="grid grid-cols-7 gap-1.5 max-w-md">
          {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
            <div class="text-center text-xs text-slate-500 py-1.5 font-medium">{d}</div>
          ))}
          <For each={heatCalendar()}>
            {(cell) => (
              <div
                class="aspect-square rounded-lg flex items-center justify-center text-xs cursor-default transition-all hover:scale-105"
                style={{
                  'background-color': cell.inMonth ? heatColor(cell.score) : 'transparent',
                  color: cell.inMonth ? (cell.score > 50 ? '#fff' : '#94a3b8') : 'transparent',
                }}
                title={cell.inMonth ? `${cell.date}: 综合效能 ${Math.round(cell.score)}` : ''}
              >
                {cell.inMonth ? cell.day : ''}
              </div>
            )}
          </For>
        </div>
        <div class="flex items-center gap-3 mt-5 text-xs text-slate-500">
          <span>低</span>
          <div class="flex gap-1">
            {['#1e293b', '#334155', '#475569', '#6366f1', '#818cf8', '#a5b4fc'].map((c) => (
              <div class="w-6 h-6 rounded-md" style={{ 'background-color': c }} />
            ))}
          </div>
          <span>高</span>
        </div>
      </div>

      {baselineReport() && (
        <div class="card-base p-6">
          <div class="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-5">{periodLabel()}产能基线报告</div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <div>
              <div class="text-3xl font-semibold text-indigo-400 mb-1" style={{ 'font-family': "'JetBrains Mono', monospace" }}>
                {Math.round(baselineReport()!.avgFocus)}
              </div>
              <div class="text-xs text-slate-500">平均专注力</div>
            </div>
            <div>
              <div class="text-3xl font-semibold text-emerald-400 mb-1" style={{ 'font-family': "'JetBrains Mono', monospace" }}>
                {Math.round(baselineReport()!.avgCompletion)}%
              </div>
              <div class="text-xs text-slate-500">任务完成率</div>
            </div>
            <div>
              <div class="text-3xl font-semibold text-amber-400 mb-1" style={{ 'font-family': "'JetBrains Mono', monospace" }}>
                {Math.round(baselineReport()!.avgDeepFocus)}
              </div>
              <div class="text-xs text-slate-500">日均深度专注 (分)</div>
            </div>
            <div>
              <div class="text-3xl font-semibold text-violet-400 mb-1" style={{ 'font-family': "'JetBrains Mono', monospace" }}>
                {baselineReport()!.avgTasks.toFixed(1)}
              </div>
              <div class="text-xs text-slate-500">日均完成任务</div>
            </div>
          </div>
          <div class="border-t border-slate-700/50 pt-5">
            <div class="text-xs font-semibold text-slate-400 mb-3">改善建议</div>
            <div class="space-y-2">
              <For each={baselineReport()!.suggestions}>
                {(s) => (
                  <div class="flex items-start gap-3">
                    <span class="text-indigo-400 mt-0.5">▸</span>
                    <span class="text-sm text-slate-300">{s}</span>
                  </div>
                )}
              </For>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
