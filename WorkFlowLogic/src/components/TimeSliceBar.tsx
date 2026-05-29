import { createMemo, For, createSignal } from 'solid-js'
import type { TimeSliceAllocation, TaskItem } from '../types'

interface TimeSliceBarProps {
  allocations: TimeSliceAllocation[]
  tasks: TaskItem[]
}

const QUALITY_COLORS: Record<string, string> = {
  peak: '#10b981',
  normal: '#6366f1',
  low: '#94a3b8',
}

const START_HOUR = 8
const END_HOUR = 22
const TOTAL_MS = (END_HOUR - START_HOUR) * 3600000

function getDayStart(): number {
  const d = new Date()
  d.setHours(START_HOUR, 0, 0, 0)
  return d.getTime()
}

function formatHour(h: number): string {
  return `${String(Math.floor(h)).padStart(2, '0')}:00`
}

function timestampToPercent(ts: number, dayStart: number): number {
  return ((ts - dayStart) / TOTAL_MS) * 100
}

export default function TimeSliceBar(props: TimeSliceBarProps) {
  const [tooltip, setTooltip] = createSignal<{ title: string; x: number; y: number } | null>(null)
  const dayStart = createMemo(() => getDayStart())

  const taskMap = createMemo(() => {
    const m = new Map<string, TaskItem>()
    props.tasks.forEach((t) => m.set(t.id, t))
    return m
  })

  const hourMarkers = createMemo(() => {
    const markers = []
    for (let h = START_HOUR; h <= END_HOUR; h += 2) markers.push(h)
    return markers
  })

  return (
    <div class="w-full">
      {props.allocations.length === 0 ? (
        <div class="flex items-center justify-center h-12 rounded-xl bg-[#1e293b] text-[#64748b] text-sm border border-[rgba(148,163,184,0.1)]">
          尚无分配方案
        </div>
      ) : (
        <div class="relative">
          <div class="relative h-11 rounded-xl bg-[#1e293b] overflow-hidden border border-[rgba(148,163,184,0.1)]">
            <For each={props.allocations}>
              {(alloc) => {
                const left = createMemo(() => timestampToPercent(alloc.slot.start, dayStart()))
                const width = createMemo(() => timestampToPercent(alloc.slot.end, dayStart()) - timestampToPercent(alloc.slot.start, dayStart()))
                const color = QUALITY_COLORS[alloc.slot.quality] ?? '#6366f1'
                const title = createMemo(() => taskMap().get(alloc.taskId)?.title ?? '')

                return (
                  <div
                    class="absolute top-0 h-full transition-all duration-200 hover:opacity-90 cursor-pointer"
                    style={{
                      left: `${Math.max(0, left())}%`,
                      width: `${Math.max(0.5, width())}%`,
                      'background-color': color,
                      opacity: 0.85,
                      'box-shadow': `inset 0 1px 0 rgba(255,255,255,0.1)`,
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

          <div class="relative flex mt-2" style={{ height: '18px' }}>
            <For each={hourMarkers()}>
              {(h) => (
                <div
                  class="absolute text-[11px] text-[#64748b] font-medium"
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
          class="fixed z-50 px-3 py-2 rounded-lg text-xs text-[#f1f5f9] pointer-events-none whitespace-nowrap shadow-lg"
          style={{
            'background-color': '#1e293b',
            border: '1px solid rgba(148,163,184,0.15)',
            left: `${tooltip()!.x}px`,
            top: `${tooltip()!.y - 42}px`,
            transform: 'translateX(-50%)',
          }}
        >
          {tooltip()!.title}
        </div>
      )}
    </div>
  )
}
