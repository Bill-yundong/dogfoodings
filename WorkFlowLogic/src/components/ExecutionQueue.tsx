import { createMemo, For } from 'solid-js'
import type { TaskItem } from '../types'

interface ExecutionQueueProps {
  tasks: TaskItem[]
}

function formatSlotTime(start: number, end: number): string {
  const sd = new Date(start)
  const ed = new Date(end)
  const sh = String(sd.getHours()).padStart(2, '0')
  const sm = String(sd.getMinutes()).padStart(2, '0')
  const eh = String(ed.getHours()).padStart(2, '0')
  const em = String(ed.getMinutes()).padStart(2, '0')
  return `${sh}:${sm}-${eh}:${em}`
}

function getPriorityColor(task: TaskItem): string {
  if (task.urgency >= 0.8) return '#f59e0b'
  if (task.importance >= 0.8) return '#6366f1'
  if (task.focusNeed >= 0.8) return '#10b981'
  return '#334155'
}

function StatusBadge(props: { status: string }) {
  const config = createMemo(() => {
    switch (props.status) {
      case 'active':
        return { text: '进行中', bg: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', pulse: true }
      case 'completed':
        return { text: '✓ 已完成', bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', pulse: false }
      case 'pending':
        return { text: '待处理', bg: 'rgba(100, 116, 139, 0.15)', color: '#94a3b8', pulse: false }
      default:
        return { text: props.status, bg: 'rgba(100, 116, 139, 0.15)', color: '#94a3b8', pulse: false }
    }
  })

  return (
    <span
      class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium"
      style={{ 'background-color': config().bg, color: config().color }}
    >
      {config().pulse && (
        <span
          class="w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse"
          style={{ 'background-color': '#6366f1' }}
        />
      )}
      {config().text}
    </span>
  )
}

export default function ExecutionQueue(props: ExecutionQueueProps) {
  const sorted = createMemo(() =>
    [...props.tasks].sort((a, b) => {
      const wa = a.urgency * 0.4 + a.importance * 0.35 + a.focusNeed * 0.25
      const wb = b.urgency * 0.4 + b.importance * 0.35 + b.focusNeed * 0.25
      return wb - wa
    })
  )

  return (
    <div class="flex flex-col gap-3">
      <For each={sorted()}>
        {(task) => {
          const borderColor = getPriorityColor(task)

          return (
            <div
              class="flex items-stretch gap-4 rounded-2xl bg-[#1e293b] p-4 transition-all duration-200 hover:bg-[#334155]/30 border border-[rgba(148,163,184,0.1)]"
              style={{ 'border-left': `3px solid ${borderColor}` }}
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2.5 mb-2">
                  <span class="text-sm font-medium text-[#f1f5f9] truncate">{task.title}</span>
                  <StatusBadge status={task.status} />
                </div>

                <div class="flex items-center gap-2 flex-wrap">
                  {task.urgency >= 0.8 && (
                    <span
                      class="px-2 py-0.5 rounded-full text-[11px] font-medium"
                      style={{ 'background-color': 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}
                    >
                      紧急
                    </span>
                  )}
                  {task.importance >= 0.8 && (
                    <span
                      class="px-2 py-0.5 rounded-full text-[11px] font-medium"
                      style={{ 'background-color': 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}
                    >
                      重要
                    </span>
                  )}
                  {task.focusNeed >= 0.8 && (
                    <span
                      class="px-2 py-0.5 rounded-full text-[11px] font-medium"
                      style={{ 'background-color': 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}
                    >
                      深度
                    </span>
                  )}

                  <span
                    class="px-2 py-0.5 rounded-full text-[11px] font-medium"
                    style={{
                      'background-color': task.source === 'work' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                      color: task.source === 'work' ? '#38bdf8' : '#8b5cf6',
                    }}
                  >
                    {task.source === 'work' ? '工作' : '个人'}
                  </span>

                  {task.recommendedSlot && (
                    <span
                      class="px-2 py-0.5 rounded-full text-[11px] font-medium"
                      style={{ 'background-color': 'rgba(100, 116, 139, 0.15)', color: '#94a3b8' }}
                    >
                      推荐: {formatSlotTime(task.recommendedSlot.start, task.recommendedSlot.end)}
                    </span>
                  )}
                </div>
              </div>

              <div class="flex flex-col items-end justify-center shrink-0">
                <span
                  class="text-xl font-semibold tracking-tight"
                  style={{ 'font-family': "'JetBrains Mono', 'SF Mono', monospace", color: borderColor }}
                >
                  {task.estimatedMinutes}
                </span>
                <span class="text-[11px] text-[#64748b]">分钟</span>
              </div>
            </div>
          )
        }}
      </For>
    </div>
  )
}
