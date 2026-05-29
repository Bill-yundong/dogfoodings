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
    completedCount: taskState.tasks.filter((t) => t.status === "completed").length,
    deepFocusMin: Math.round(focusState.todayDeepFocusMinutes),
    distractionCount: focusState.todayDistractions.length,
  }))

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-white" style={{ 'font-family': 'Orbitron, monospace' }}>
            效能驾驶舱
          </h1>
          <p class="text-sm text-gray-500 mt-1">
            {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <span
            class={`w-2.5 h-2.5 rounded-full ${focusState.isTracking ? 'bg-[#39ff14] animate-pulse' : 'bg-gray-600'}`}
          />
          <span class="text-xs text-gray-400">
            {focusState.isTracking ? '专注追踪中' : '未启动追踪'}
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div class="glass-card rounded-xl p-5 flex flex-col items-center justify-center">
          <span class="section-title self-start">专注力指数</span>
          <FocusGauge value={focusState.currentFocus} />
        </div>

        <div class="glass-card rounded-xl p-5 lg:col-span-3">
          <span class="section-title">今日时间片分配</span>
          <TimeSliceBar allocations={optimizationState.allocations} tasks={taskState.tasks} />
          <div class="mt-4">
            <ProductivityCurve hourlyProfile={focusState.hourlyProfile} currentFocus={focusState.currentFocus} />
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div class="glass-card rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-white" style={{ 'font-family': 'Orbitron, monospace' }}>
            {todayStats().totalTasks}
          </div>
          <div class="text-xs text-gray-500 mt-1">总任务数</div>
        </div>
        <div class="glass-card rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-[#00f0ff]" style={{ 'font-family': 'Orbitron, monospace' }}>
            {todayStats().pendingCount}
          </div>
          <div class="text-xs text-gray-500 mt-1">待执行</div>
        </div>
        <div class="glass-card rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-[#39ff14]" style={{ 'font-family': 'Orbitron, monospace' }}>
            {todayStats().completedCount}
          </div>
          <div class="text-xs text-gray-500 mt-1">已完成</div>
        </div>
        <div class="glass-card rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-[#ff8c00]" style={{ 'font-family': 'Orbitron, monospace' }}>
            {todayStats().deepFocusMin}
          </div>
          <div class="text-xs text-gray-500 mt-1">深度专注(分)</div>
        </div>
        <div class="glass-card rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-[#c77dff]" style={{ 'font-family': 'Orbitron, monospace' }}>
            {todayStats().distractionCount}
          </div>
          <div class="text-xs text-gray-500 mt-1">干扰次数</div>
        </div>
      </div>

      <div class="glass-card rounded-xl p-5">
        <span class="section-title">执行队列</span>
        <ExecutionQueue tasks={pendingTasks()} />
      </div>
    </div>
  )
}
