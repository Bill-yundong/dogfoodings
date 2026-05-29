import { createMemo, For, createSignal } from 'solid-js'
import type { TimeSliceAllocation, TaskItem } from '../types'

interface TimeSliceBarProps {
  allocations: TimeSliceAllocation[]
  tasks: TaskItem[]
}

const QUALITY_COLORS: Record<string, string> = {
  peak: '#39ff14',
  normal: '#00f0ff',
  low: '#c77dff',
}

const START_HOUR = 8
const END_HOUR = 22
const TOTAL_MS = (END_HOUR - START_HOUR) * 3600000
const DAY_START_MS = (() => {
  const d = new Date()
  d.setHours(START_HOUR, 0, 0, 0)
  return d.getTime()
})()

function formatHour(h: number): string {
  return `${String(Math.floor(h)).padStart(2, '0')}:00`
}

function timestampToPercent(ts: number): number {
  return ((ts - DAY_START_MS) / TOTAL_MS) * 100
}

export default function TimeSliceBar(props: TimeSliceBarProps) {
  const [tooltip, setTooltip] = createSignal<{ title: string; x: number; y: number } | null>(null)

  const taskMap = createMemo(() => {
    const m = new Map<string, TaskItem>()
    props.tasks.forEach((t) => m.set(t.id, t))
    return m
  })

  const hourMarkers = createMemo(() => {
    const markers = []
    for (let h = START_HOUR; h <= END_HOUR; h++) markers.push(h)
    return markers
  })

  return (
    <div class="w-full">
      {props.allocations.length === 0 ? (
        <div class="flex items-center justify-center h-16 rounded-lg bg-[#1a1d2e] text-gray-500 text-sm">
          尚无分配方案
        </div>
      ) : (
        <div class="relative">
          <div class="relative h-10 rounded-lg bg-[#1a1d2e] overflow-hidden">
            <For each={props.allocations}>
              {(alloc) => {
                const left = createMemo(() => timestampToPercent(alloc.slot.start))
                const width = createMemo(() => timestampToPercent(alloc.slot.end) - timestampToPercent(alloc.slot.start))
                const color = QUALITY_COLORS[alloc.slot.quality] ?? '#00f0ff'
                const title = createMemo(() => taskMap().get(alloc.taskId)?.title ?? '')

                return (
                  <div
                    class="absolute top-0 h-full rounded-sm transition-opacity hover:opacity-80 cursor-pointer"
                    style={{
                      left: `${Math.max(0, left())}%`,
                      width: `${Math.max(0.5, width())}%`,
                      'background-color': color,
                      opacity: 0.75,
                    }}
                    onMouseEnter={(e) =>
                      setTooltip({ title: title(), x: e.clientX, y: e.clientY })
                    }
                    onMouseMove={(e) =>
                      setTooltip({ title: title(), x: e.clientX, y: e.clientY })
                    }
                    onMouseLeave={() => setTooltip(null)}
                  />
                )
              }}
            </For>
          </div>

          <div class="relative flex mt-2" style={{ height: '16px' }}>
            <For each={hourMarkers()}>
              {(h) => (
                <div
                  class="absolute text-[10px] text-gray-500"
                  style={{
                    left: `${((h - START_HOUR) / (END_HOUR - START_HOUR)) * 100}%`,
                    transform: 'translateX(-50%)',
                  }}
                >
                  {formatHour(h)}
                </div>
              )}
            </For>
          </div>
        </div>
      )}

      {tooltip() && (
        <div
          class="fixed z-50 px-3 py-1.5 rounded text-xs text-white pointer-events-none whitespace-nowrap"
          style={{
            'background-color': '#0a0e27',
            border: '1px solid #00f0ff',
            left: `${tooltip()!.x}px`,
            top: `${tooltip()!.y - 36}px`,
            transform: 'translateX(-50%)',
          }}
        >
          {tooltip()!.title}
        </div>
      )}
    </div>
  )
}
