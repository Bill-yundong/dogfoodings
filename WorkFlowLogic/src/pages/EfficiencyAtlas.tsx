import { createMemo, For, createSignal } from 'solid-js'
import { efficiencyState, setPeriod, getFilteredRecords, getAverageMetrics } from '~/stores/efficiency'

export default function EfficiencyAtlas() {
  const filteredRecords = createMemo(() => getFilteredRecords())
  const avgMetrics = createMemo(() => getAverageMetrics())

  const radarDimensions = [
    { key: 'focusScore', label: '专注深度', color: '#00f0ff' },
    { key: 'taskCompletionRate', label: '任务完成率', color: '#39ff14' },
    { key: 'timeUtilization', label: '时间利用率', color: '#ff8c00' },
    { key: 'rhythmStability', label: '节奏稳定性', color: '#c77dff' },
    { key: 'recoveryEfficiency', label: '恢复效率', color: '#00f0ff' },
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
    const r = 110
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

  const radarPath = createMemo(() => {
    const pts = radarPoints()
    if (pts.length === 0) return ''
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'
  })

  const W = 600
  const H = 280
  const PX = 50
  const PY = 20
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
    if (score === 0) return '#1a1d2e'
    if (score < 30) return '#1a2a3e'
    if (score < 50) return '#0a3d5c'
    if (score < 70) return '#0070a0'
    if (score < 85) return '#00b0d0'
    return '#00f0ff'
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
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-white" style={{ 'font-family': 'Orbitron, monospace' }}>
            效能图谱
          </h1>
          <p class="text-sm text-gray-500 mt-1">长周期效能分析与产能基线报告</p>
        </div>
        <div class="flex gap-1">
          <For each={[7, 30, 90] as const}>
            {(p) => (
              <button
                onClick={() => setPeriod(p)}
                class={`px-3 py-1.5 rounded text-xs transition-colors ${
                  efficiencyState.selectedPeriod === p
                    ? 'bg-[#00f0ff]/20 text-[#00f0ff]'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {p}天
              </button>
            )}
          </For>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="glass-card rounded-xl p-5">
          <span class="section-title">{periodLabel()}效能趋势</span>
          <svg viewBox={`0 0 ${W} ${H}`} class="w-full" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#00f0ff" stop-opacity="0.15" />
                <stop offset="100%" stop-color="#00f0ff" stop-opacity="0" />
              </linearGradient>
            </defs>
            {[0, 25, 50, 75, 100].map((l) => (
              <line
                x1={PX} y1={PY + PH - (l / 100) * PH}
                x2={W - PX} y2={PY + PH - (l / 100) * PH}
                stroke="#1a1d2e" stroke-width="1"
              />
            ))}
            {trendAreaPath() && <path d={trendAreaPath()} fill="url(#trendFill)" />}
            {trendPath() && <path d={trendPath()} fill="none" stroke="#00f0ff" stroke-width="2" />}
            {completionPath() && (
              <path d={completionPath()} fill="none" stroke="#39ff14" stroke-width="1.5" stroke-dasharray="4 3" />
            )}
            {[0, 25, 50, 75, 100].map((l) => (
              <text x={PX - 6} y={PY + PH - (l / 100) * PH + 3} text-anchor="end" fill="#6b7280" style={{ 'font-size': '9px' }}>
                {l}
              </text>
            ))}
          </svg>
          <div class="flex items-center gap-4 mt-2 text-xs">
            <span class="flex items-center gap-1"><span class="w-3 h-0.5 bg-[#00f0ff] inline-block" /> 专注力</span>
            <span class="flex items-center gap-1"><span class="w-3 h-0.5 bg-[#39ff14] inline-block" style={{ 'border-top': '1px dashed #39ff14' }} /> 完成率</span>
          </div>
        </div>

        <div class="glass-card rounded-xl p-5 flex flex-col items-center">
          <span class="section-title self-start">效能雷达</span>
          <svg width="300" height="300" viewBox="0 0 300 300">
            {radarDimensions.map((_, i) => {
              const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2
              return (
                <line
                  x1="150" y1="150"
                  x2={150 + 110 * Math.cos(angle)}
                  y2={150 + 110 * Math.sin(angle)}
                  stroke="#1a1d2e" stroke-width="1"
                />
              )
            })}
            {[0.25, 0.5, 0.75, 1].map((ratio) => {
              const pts = Array.from({ length: 5 }, (_, i) => {
                const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2
                return `${150 + 110 * ratio * Math.cos(angle)},${150 + 110 * ratio * Math.sin(angle)}`
              })
              return <polygon points={pts.join(' ')} fill="none" stroke="#1a1d2e" stroke-width="1" />
            })}
            {radarPath() && (
              <polygon
                points={radarPoints().map((p) => `${p.x},${p.y}`).join(' ')}
                fill="rgba(0, 240, 255, 0.12)"
                stroke="#00f0ff"
                stroke-width="2"
              />
            )}
            {radarPoints().map((p, i) => (
              <g>
                <circle cx={p.x} cy={p.y} r="4" fill="#00f0ff" stroke="#0a0e27" stroke-width="2" />
                <text
                  x={150 + 130 * Math.cos((Math.PI * 2 * i) / 5 - Math.PI / 2)}
                  y={150 + 130 * Math.sin((Math.PI * 2 * i) / 5 - Math.PI / 2) + 4}
                  text-anchor="middle"
                  fill="#9ca3af"
                  style={{ 'font-size': '10px' }}
                >
                  {p.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      <div class="glass-card rounded-xl p-5">
        <span class="section-title">效能热力日历 - {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}</span>
        <div class="grid grid-cols-7 gap-1.5 mt-2">
          {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
            <div class="text-center text-[10px] text-gray-500 py-1">{d}</div>
          ))}
          <For each={heatCalendar()}>
            {(cell) => (
              <div
                class="aspect-square rounded-sm flex items-center justify-center text-[10px] cursor-default transition-opacity hover:opacity-80"
                style={{
                  'background-color': cell.inMonth ? heatColor(cell.score) : 'transparent',
                  color: cell.score > 50 ? '#fff' : cell.inMonth ? '#6b7280' : 'transparent',
                }}
                title={cell.inMonth ? `${cell.date}: 综合效能 ${Math.round(cell.score)}` : ''}
              >
                {cell.inMonth ? cell.day : ''}
              </div>
            )}
          </For>
        </div>
        <div class="flex items-center gap-2 mt-3 text-[10px] text-gray-500">
          <span>低</span>
          <div class="flex gap-0.5">
            {['#1a1d2e', '#1a2a3e', '#0a3d5c', '#0070a0', '#00b0d0', '#00f0ff'].map((c) => (
              <div class="w-4 h-3 rounded-sm" style={{ 'background-color': c }} />
            ))}
          </div>
          <span>高</span>
        </div>
      </div>

      {baselineReport() && (
        <div class="glass-card rounded-xl p-5">
          <span class="section-title">{periodLabel()}产能基线报告</span>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div class="text-center">
              <div class="text-xl font-bold text-[#00f0ff]" style={{ 'font-family': 'Orbitron, monospace' }}>
                {Math.round(baselineReport()!.avgFocus)}
              </div>
              <div class="text-[10px] text-gray-500 mt-0.5">平均专注力</div>
            </div>
            <div class="text-center">
              <div class="text-xl font-bold text-[#39ff14]" style={{ 'font-family': 'Orbitron, monospace' }}>
                {Math.round(baselineReport()!.avgCompletion)}%
              </div>
              <div class="text-[10px] text-gray-500 mt-0.5">完成率</div>
            </div>
            <div class="text-center">
              <div class="text-xl font-bold text-[#ff8c00]" style={{ 'font-family': 'Orbitron, monospace' }}>
                {Math.round(baselineReport()!.avgDeepFocus)}
              </div>
              <div class="text-[10px] text-gray-500 mt-0.5">日均深度专注(分)</div>
            </div>
            <div class="text-center">
              <div class="text-xl font-bold text-[#c77dff]" style={{ 'font-family': 'Orbitron, monospace' }}>
                {baselineReport()!.avgTasks.toFixed(1)}
              </div>
              <div class="text-[10px] text-gray-500 mt-0.5">日均完成任务</div>
            </div>
          </div>
          <div class="border-t border-gray-700/30 pt-3">
            <div class="text-xs text-gray-400 mb-2">改善建议</div>
            <For each={baselineReport()!.suggestions}>
              {(s) => (
                <div class="flex items-start gap-2 mb-1.5">
                  <span class="text-[#00f0ff] mt-0.5">▸</span>
                  <span class="text-xs text-gray-300">{s}</span>
                </div>
              )}
            </For>
          </div>
        </div>
      )}
    </div>
  )
}
