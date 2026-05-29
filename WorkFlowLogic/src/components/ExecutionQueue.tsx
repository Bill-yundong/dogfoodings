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
  if (task.urgency >= 0.8) return '#ff8c00'
  if (task.importance >= 0.8) return '#00f0ff'
  if (task.focusNeed >= 0.8) return '#39ff14'
  return '#1a1d2e'
}

function StatusBadge(props: { status: string }) {
  const config = createMemo(() => {
    switch (props.status) {
      case 'active':
        return { text: '进行中', cls: 'bg-[#00f0ff]/20 text-[#00f0ff]', pulse: true }
      case 'completed':
        return { text: '✓ 已完成', cls: 'bg-[#39ff14]/20 text-[#39ff14]', pulse: false }
      case 'pending':
        return { text: '待处理', cls: 'bg-gray-500/20 text-gray-400', pulse: false }
      default:
        return { text: props.status, cls: 'bg-gray-500/20 text-gray-400', pulse: false }
    }
  })

  return (
    <span class={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${config().cls}`}>
      {config().pulse && <span class="w-1.5 h-1.5 rounded-full mr-1 bg-[#00f0ff] animate-pulse" />}
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
              class="flex items-stretch gap-3 rounded-lg bg-[#1a1d2e] p-3 border-l-[3px]"
              style={{ 'border-left-color': borderColor }}
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1.5">
                  <span class="text-sm text-white truncate">{task.title}</span>
                  <StatusBadge status={task.status} />
                </div>

                <div class="flex items-center gap-2 flex-wrap">
                  {task.urgency >= 0.8 && (
                    <span class="px-1.5 py-0.5 rounded text-[10px] bg-[#ff8c00]/20 text-[#ff8c00]">
                      紧急
                    </span>
                  )}
                  {task.importance >= 0.8 && (
                    <span class="px-1.5 py-0.5 rounded text-[10px] bg-[#00f0ff]/20 text-[#00f0ff]">
                      重要
                    </span>
                  )}
                  {task.focusNeed >= 0.8 && (
                    <span class="px-1.5 py-0.5 rounded text-[10px] bg-[#39ff14]/20 text-[#39ff14]">
                      深度
                    </span>
                  )}

                  <span
                    class={`px-1.5 py-0.5 rounded text-[10px] ${
                      task.source === 'work'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-[#c77dff]/20 text-[#c77dff]'
                    }`}
                  >
                    {task.source === 'work' ? '工作' : '个人'}
                  </span>

                  {task.recommendedSlot && (
                    <span class="px-1.5 py-0.5 rounded text-[10px] bg-gray-500/20 text-gray-300">
                      推荐: {formatSlotTime(task.recommendedSlot.start, task.recommendedSlot.end)}
                    </span>
                  )}
                </div>
              </div>

              <div class="flex flex-col items-end justify-center shrink-0">
                <span
                  class="text-lg font-semibold"
                  style={{ 'font-family': 'Orbitron, monospace', color: borderColor }}
                >
                  {task.estimatedMinutes}
                </span>
                <span class="text-[10px] text-gray-500">分钟</span>
              </div>
            </div>
          )
        }}
      </For>
    </div>
  )
}
