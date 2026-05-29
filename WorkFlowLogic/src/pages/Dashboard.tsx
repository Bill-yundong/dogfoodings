import { createMemo, createEffect } from 'solid-js'
import FocusGauge from '~/components/FocusGauge'
import TimeSliceBar from '~/components/TimeSliceBar'
import ExecutionQueue from '~/components/ExecutionQueue'
import ProductivityCurve from '~/components/ProductivityCurve'
import { focusState } from '~/stores/focus'
import { taskState, getPendingTasks } from '~/stores/tasks'
import { optimizationState } from '~/stores/optimization'
import { allocateTimeSlices } from '~/engines/time-slice'
import { setAllocations } from '~/stores/optimization'

export default function Dashboard() {
  const pendingTasks = createMemo(() => getPendingTasks())

  const allocations = createMemo(() =>
    allocateTimeSlices(
      taskState.tasks,
      focusState.hourlyProfile,
      optimizationState.weights
    )
  )

  createEffect(() => {
    setAllocations(allocations())
  })

  const todayStats = createMemo(() => ({
    totalTasks: taskState.tasks.length,
    pendingCount: pendingTasks().length,
    completedCount: taskState.tasks.filter((t) => t.status === 'completed').length,
    deepFocusMin: Math.round(focusState.todayDeepFocusMinutes),
    distractionCount: focusState.todayDistractions.length,
  }))

  const formatDate = () => {
    return new Date().toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    })
  }

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-[#f1f5f9] tracking-tight">
            效能驾驶舱
          </h1>
          <p class="text-sm text-[#94a3b8] mt-1">{formatDate()}</p>
        </div>
        <div class="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#1e293b] border border-[rgba(148,163,184,0.1)]">
          <span
            class={`w-2.5 h-2.5 rounded-full ${
              focusState.isTracking
                ? 'bg-[#10b981] animate-pulse'
                : 'bg-[#64748b]'
            }`}
          />
          <span class="text-sm text-[#94a3b8] font-medium">
            {focusState.isTracking ? '专注追踪中' : '未启动追踪'}
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div class="card-base p-6 flex flex-col items-center justify-center">
          <span class="section-title self-start">专注力指数</span>
          <FocusGauge value={focusState.currentFocus} />
        </div>

        <div class="card-base p-6 lg:col-span-3">
          <span class="section-title">今日时间片分配</span>
          <TimeSliceBar
            allocations={optimizationState.allocations}
            tasks={taskState.tasks}
          />
          <div class="mt-6">
            <ProductivityCurve
              hourlyProfile={focusState.hourlyProfile}
              currentFocus={focusState.currentFocus}
            />
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div class="card-base p-5 text-center">
          <div
            class="text-3xl font-bold text-[#f1f5f9]"
            style={{ 'font-family': "'JetBrains Mono', 'SF Mono', monospace" }}
          >
            {todayStats().totalTasks}
          </div>
          <div class="text-sm text-[#94a3b8] mt-1.5">总任务数</div>
        </div>
        <div class="card-base p-5 text-center">
          <div
            class="text-3xl font-bold text-[#6366f1]"
            style={{ 'font-family': "'JetBrains Mono', 'SF Mono', monospace" }}
          >
            {todayStats().pendingCount}
          </div>
          <div class="text-sm text-[#94a3b8] mt-1.5">待执行</div>
        </div>
        <div class="card-base p-5 text-center">
          <div
            class="text-3xl font-bold text-[#10b981]"
            style={{ 'font-family': "'JetBrains Mono', 'SF Mono', monospace" }}
          >
            {todayStats().completedCount}
          </div>
          <div class="text-sm text-[#94a3b8] mt-1.5">已完成</div>
        </div>
        <div class="card-base p-5 text-center">
          <div
            class="text-3xl font-bold text-[#f59e0b]"
            style={{ 'font-family': "'JetBrains Mono', 'SF Mono', monospace" }}
          >
            {todayStats().deepFocusMin}
          </div>
          <div class="text-sm text-[#94a3b8] mt-1.5">深度专注(分)</div>
        </div>
        <div class="card-base p-5 text-center">
          <div
            class="text-3xl font-bold text-[#ef4444]"
            style={{ 'font-family': "'JetBrains Mono', 'SF Mono', monospace" }}
          >
            {todayStats().distractionCount}
          </div>
          <div class="text-sm text-[#94a3b8] mt-1.5">干扰次数</div>
        </div>
      </div>

      <div class="card-base p-6">
        <span class="section-title">执行队列</span>
        <ExecutionQueue tasks={pendingTasks()} />
      </div>
    </div>
  )
}
