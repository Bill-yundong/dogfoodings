import { createMemo, For, Show, createSignal } from 'solid-js'
import { taskState, getWorkTasks, getPersonalTasks, addTask } from '~/stores/tasks'
import { optimizationState, updateWeights } from '~/stores/optimization'
import { focusState } from '~/stores/focus'
import { computePriorityMatrix, computeSystemMapping } from '~/engines/priority-mapper'
import { generateTimingRecommendations } from '~/engines/attention-timing'

export default function TaskMatrix() {
  const priorityMapping = createMemo(() => computePriorityMatrix(taskState.tasks))
  const systemMapping = createMemo(() => computeSystemMapping(taskState.tasks))
  const timingRecommendations = createMemo(() =>
    generateTimingRecommendations(taskState.tasks, focusState.hourlyProfile, optimizationState.weights)
  )

  const quadrants = [
    { key: 'urgent-important', label: '紧急且重要', sublabel: '立即执行', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)' },
    { key: 'not-urgent-important', label: '重要不紧急', sublabel: '计划执行', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.08)' },
    { key: 'urgent-not-important', label: '紧急不重要', sublabel: '快速处理', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.08)' },
    { key: 'not-urgent-not-important', label: '低优先级', sublabel: '考虑移除', color: '#64748b', bg: 'rgba(100, 116, 139, 0.08)' },
  ] as const

  const taskMap = createMemo(() => {
    const m = new Map<string, typeof taskState.tasks[0]>()
    taskState.tasks.forEach((t) => m.set(t.id, t))
    return m
  })

  const quadrantTasks = createMemo(() => {
    const result: Record<string, Array<{ task: typeof taskState.tasks[0]; rank: number }>> = {
      'urgent-important': [],
      'not-urgent-important': [],
      'urgent-not-important': [],
      'not-urgent-not-important': [],
    }
    for (const pm of priorityMapping()) {
      const task = taskMap().get(pm.taskId)
      if (task && (task.status === 'pending' || task.status === 'active')) {
        result[pm.quadrant].push({ task, rank: pm.priorityRank })
      }
    }
    return result
  })

  const [showTaskForm, setShowTaskForm] = createSignal(false)
  const [newTask, setNewTask] = createSignal({
    title: '',
    urgency: 0.5,
    importance: 0.5,
    focusNeed: 0.5,
    estimatedMinutes: 30,
    source: 'work' as 'work' | 'personal',
  })

  const handleWeightChange = (key: string, value: number) => {
    updateWeights({ [key]: value })
  }

  const formatTime = (hour: number) => `${String(hour).padStart(2, '0')}:00`

  return (
    <div class="space-y-6 max-w-6xl">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-slate-100">
            任务映射矩阵
          </h1>
          <p class="text-sm text-slate-400 mt-1">任务优先级与跨系统映射</p>
        </div>
        <button
          onClick={() => setShowTaskForm(!showTaskForm())}
          class="px-4 py-2.5 rounded-xl text-sm bg-slate-700/50 text-slate-200 hover:bg-slate-600/50 border border-slate-600/30 transition-all"
        >
          + 添加任务
        </button>
      </div>

      <Show when={showTaskForm()}>
        <div class="card-base p-6">
          <div class="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">新建任务</div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="md:col-span-2">
              <input
                type="text"
                placeholder="任务标题"
                value={newTask().title}
                onInput={(e) => setNewTask({ ...newTask(), title: e.currentTarget.value })}
                class="w-full px-4 py-3 rounded-xl bg-slate-700/50 border border-slate-600/30 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label class="flex flex-col gap-2">
                <span class="text-xs text-slate-400">紧急度 <span class="text-indigo-400 font-mono">{newTask().urgency.toFixed(1)}</span></span>
                <input
                  type="range" min="0" max="1" step="0.1"
                  value={newTask().urgency}
                  onInput={(e) => setNewTask({ ...newTask(), urgency: parseFloat(e.currentTarget.value) })}
                  class="slider-base"
                  style={{ 'accent-color': '#f59e0b' }}
                />
              </label>
            </div>
            <div>
              <label class="flex flex-col gap-2">
                <span class="text-xs text-slate-400">重要度 <span class="text-indigo-400 font-mono">{newTask().importance.toFixed(1)}</span></span>
                <input
                  type="range" min="0" max="1" step="0.1"
                  value={newTask().importance}
                  onInput={(e) => setNewTask({ ...newTask(), importance: parseFloat(e.currentTarget.value) })}
                  class="slider-base"
                  style={{ 'accent-color': '#6366f1' }}
                />
              </label>
            </div>
            <div>
              <label class="flex flex-col gap-2">
                <span class="text-xs text-slate-400">专注需求 <span class="text-emerald-400 font-mono">{newTask().focusNeed.toFixed(1)}</span></span>
                <input
                  type="range" min="0" max="1" step="0.1"
                  value={newTask().focusNeed}
                  onInput={(e) => setNewTask({ ...newTask(), focusNeed: parseFloat(e.currentTarget.value) })}
                  class="slider-base"
                  style={{ 'accent-color': '#10b981' }}
                />
              </label>
            </div>
            <div>
              <label class="flex flex-col gap-2">
                <span class="text-xs text-slate-400">来源</span>
                <select
                  value={newTask().source}
                  onChange={(e) => setNewTask({ ...newTask(), source: e.currentTarget.value as 'work' | 'personal' })}
                  class="px-4 py-2.5 rounded-xl bg-slate-700/50 border border-slate-600/30 text-slate-100 text-sm focus:outline-none"
                >
                  <option value="work">工作</option>
                  <option value="personal">个人</option>
                </select>
              </label>
            </div>
          </div>
          <div class="flex gap-2 mt-4">
            <button
              onClick={() => {
                if (newTask().title.trim()) {
                  addTask({
                    title: newTask().title,
                    urgency: newTask().urgency,
                    importance: newTask().importance,
                    focusNeed: newTask().focusNeed,
                    estimatedMinutes: newTask().estimatedMinutes,
                    source: newTask().source,
                    deadline: null,
                    status: 'pending',
                  })
                  setNewTask({ title: '', urgency: 0.5, importance: 0.5, focusNeed: 0.5, estimatedMinutes: 30, source: 'work' })
                  setShowTaskForm(false)
                }
              }}
              class="px-4 py-2 rounded-xl text-sm bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 transition-all"
            >
              确认添加
            </button>
            <button
              onClick={() => setShowTaskForm(false)}
              class="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      </Show>

      <div class="card-base p-6">
        <div class="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-5">优先级矩阵</div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <For each={quadrants}>
            {(q) => (
              <div class="rounded-2xl p-5 min-h-[140px]" style={{ background: q.bg, border: `1px solid ${q.color}22` }}>
                <div class="mb-3">
                  <span class="text-sm font-semibold" style={{ color: q.color }}>{q.label}</span>
                  <span class="block text-xs text-slate-500 mt-0.5">{q.sublabel}</span>
                </div>
                <div class="space-y-2">
                  <For each={quadrantTasks()[q.key]}>
                    {(item) => (
                      <div
                        class="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/40 text-xs"
                        style={{ 'border-left': `2px solid ${q.color}` }}
                      >
                        <span class="text-slate-300 flex-1 truncate">{item.task.title}</span>
                        <span class="text-slate-500 font-mono" style={{ 'font-size': '11px' }}>{item.task.estimatedMinutes}m</span>
                      </div>
                    )}
                  </For>
                  <Show when={quadrantTasks()[q.key].length === 0}>
                    <p class="text-xs text-slate-600 italic">暂无任务</p>
                  </Show>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div class="card-base p-6 lg:col-span-3">
          <div class="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">系统映射</div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <div class="text-xs font-medium text-sky-400 mb-3">工作软件</div>
              <div class="space-y-1.5">
                <For each={systemMapping().workTasks}>
                  {(task) => (
                    <div class="px-3 py-2 rounded-lg text-xs bg-sky-500/10 text-sky-300 border-l-2 border-sky-500 truncate">
                      {task.title}
                    </div>
                  )}
                </For>
              </div>
            </div>
            <div>
              <div class="text-xs font-medium text-violet-400 mb-3">个人效能</div>
              <div class="space-y-1.5">
                <For each={systemMapping().personalTasks}>
                  {(task) => (
                    <div class="px-3 py-2 rounded-lg text-xs bg-violet-500/10 text-violet-300 border-l-2 border-violet-500 truncate">
                      {task.title}
                    </div>
                  )}
                </For>
              </div>
            </div>
          </div>
          <Show when={systemMapping().crossReferences.length > 0}>
            <div class="mt-4 pt-4 border-t border-slate-700/50">
              <div class="text-xs text-slate-500 mb-2">关联映射 ({systemMapping().crossReferences.length})</div>
              <div class="space-y-1">
                <For each={systemMapping().crossReferences}>
                  {(ref) => {
                    const wTask = taskMap().get(ref.workId)
                    const pTask = taskMap().get(ref.personalId)
                    return (
                      <div class="text-xs text-slate-400">
                        <span class="text-sky-300">{wTask?.title}</span>
                        <span class="text-slate-600 mx-1">↔</span>
                        <span class="text-violet-300">{pTask?.title}</span>
                      </div>
                    )
                  }}
                </For>
              </div>
            </div>
          </Show>
        </div>

        <div class="lg:col-span-2 space-y-6">
          <div class="card-base p-6">
            <div class="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">权重调节</div>
            <div class="space-y-4">
              <For each={[
                { key: 'urgency', label: '紧急度', color: '#f59e0b', value: optimizationState.weights.urgency },
                { key: 'importance', label: '重要度', color: '#6366f1', value: optimizationState.weights.importance },
                { key: 'focusNeed', label: '专注需求', color: '#10b981', value: optimizationState.weights.focusNeed },
                { key: 'deadline', label: '截止时间', color: '#8b5cf6', value: optimizationState.weights.deadline },
              ]}>
                {(item) => (
                  <label class="flex items-center gap-3">
                    <span class="text-xs text-slate-400 w-16 shrink-0">{item.label}</span>
                    <input
                      type="range" min="0" max="1" step="0.05"
                      value={item.value}
                      onInput={(e) => handleWeightChange(item.key, parseFloat(e.currentTarget.value))}
                      class="flex-1 slider-base"
                      style={{ 'accent-color': item.color }}
                    />
                    <span class="text-xs w-10 text-right font-mono" style={{ color: item.color }}>
                      {item.value.toFixed(2)}
                    </span>
                  </label>
                )}
              </For>
            </div>
          </div>

          <div class="card-base p-6">
            <div class="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">执行时机推荐</div>
            <div class="space-y-2 max-h-56 overflow-y-auto">
              <For each={timingRecommendations()}>
                {(rec) => {
                  const task = taskMap().get(rec.taskId)
                  if (!task) return null
                  return (
                    <div class="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-slate-700/30">
                      <div class="text-center shrink-0">
                        <div class="text-sm font-semibold text-indigo-400 font-mono">{formatTime(rec.bestHour)}</div>
                        <div class="text-[10px] text-slate-500">推荐</div>
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="text-xs text-slate-200 truncate">{task.title}</div>
                        <div class="text-[11px] text-slate-500 mt-0.5">{rec.reasoning}</div>
                      </div>
                      <div class="text-[11px] text-slate-500 shrink-0">{rec.confidenceScore}%</div>
                    </div>
                  )
                }}
              </For>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
