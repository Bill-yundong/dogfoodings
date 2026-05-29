import { createMemo, For, Show, createSignal } from 'solid-js'
import { taskState, getWorkTasks, getPersonalTasks, updateTask, addTask } from '~/stores/tasks'
import { optimizationState, updateWeights } from '~/stores/optimization'
import { focusState } from '~/stores/focus'
import { computePriorityMatrix, computeSystemMapping } from '~/engines/priority-mapper'
import { generateTimingRecommendations } from '~/engines/attention-timing'

export default function TaskMatrix() {
  const priorityMapping = createMemo(() => computePriorityMatrix(taskState.tasks))
  const systemMapping = createMemo(() => computeSystemMapping(taskState.tasks))
  const timingRecommendations = createMemo(() =>
    generateTimingRecommendations(
      taskState.tasks,
      focusState.hourlyProfile,
      optimizationState.weights
    )
  )

  const quadrants = [
    { key: 'urgent-important', label: '紧急且重要', sublabel: '立即执行', color: '#ff8c00', bg: 'rgba(255,140,0,0.08)' },
    { key: 'not-urgent-important', label: '重要不紧急', sublabel: '计划执行', color: '#00f0ff', bg: 'rgba(0,240,255,0.08)' },
    { key: 'urgent-not-important', label: '紧急不重要', sublabel: '委托/快速处理', color: '#c77dff', bg: 'rgba(199,125,255,0.08)' },
    { key: 'not-urgent-not-important', label: '不紧急不重要', sublabel: '考虑移除', color: '#6b7280', bg: 'rgba(107,114,128,0.08)' },
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
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-white" style={{ 'font-family': 'Orbitron, monospace' }}>
            任务映射矩阵
          </h1>
          <p class="text-sm text-gray-500 mt-1">任务优先级与跨系统映射</p>
        </div>
        <button
          onClick={() => setShowTaskForm(!showTaskForm())}
          class="px-4 py-2 rounded-lg text-sm border border-[#00f0ff] text-[#00f0ff] hover:bg-[#00f0ff]/10 transition-colors"
        >
          + 添加任务
        </button>
      </div>

      <Show when={showTaskForm()}>
        <div class="glass-card rounded-xl p-5 space-y-4">
          <span class="section-title">新建任务</span>
          <div class="grid grid-cols-2 gap-4">
            <div class="col-span-2">
              <input
                type="text"
                placeholder="任务标题"
                value={newTask().title}
                onInput={(e) => setNewTask({ ...newTask(), title: e.currentTarget.value })}
                class="w-full px-3 py-2 rounded-lg bg-[#1a1d2e] border border-[#00f0ff]/20 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#00f0ff]/50"
              />
            </div>
            <label class="flex flex-col gap-1">
              <span class="text-xs text-gray-400">紧急度 ({newTask().urgency.toFixed(1)})</span>
              <input
                type="range"
                min="0" max="1" step="0.1"
                value={newTask().urgency}
                onInput={(e) => setNewTask({ ...newTask(), urgency: parseFloat(e.currentTarget.value) })}
                class="accent-[#ff8c00]"
              />
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-xs text-gray-400">重要度 ({newTask().importance.toFixed(1)})</span>
              <input
                type="range"
                min="0" max="1" step="0.1"
                value={newTask().importance}
                onInput={(e) => setNewTask({ ...newTask(), importance: parseFloat(e.currentTarget.value) })}
                class="accent-[#00f0ff]"
              />
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-xs text-gray-400">专注需求 ({newTask().focusNeed.toFixed(1)})</span>
              <input
                type="range"
                min="0" max="1" step="0.1"
                value={newTask().focusNeed}
                onInput={(e) => setNewTask({ ...newTask(), focusNeed: parseFloat(e.currentTarget.value) })}
                class="accent-[#39ff14]"
              />
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-xs text-gray-400">来源</span>
              <select
                value={newTask().source}
                onChange={(e) => setNewTask({ ...newTask(), source: e.currentTarget.value as 'work' | 'personal' })}
                class="px-3 py-2 rounded-lg bg-[#1a1d2e] border border-[#00f0ff]/20 text-white text-sm focus:outline-none"
              >
                <option value="work">工作</option>
                <option value="personal">个人</option>
              </select>
            </label>
          </div>
          <div class="flex gap-2">
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
              class="px-4 py-2 rounded-lg bg-[#00f0ff]/20 text-[#00f0ff] text-sm hover:bg-[#00f0ff]/30 transition-colors"
            >
              确认添加
            </button>
            <button
              onClick={() => setShowTaskForm(false)}
              class="px-4 py-2 rounded-lg text-gray-400 text-sm hover:text-gray-200 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      </Show>

      <div class="glass-card rounded-xl p-5">
        <span class="section-title">优先级矩阵</span>
        <div class="grid grid-cols-2 gap-4">
          <For each={quadrants}>
            {(q) => (
              <div class="rounded-lg p-4 min-h-[160px]" style={{ background: q.bg, border: `1px solid ${q.color}22` }}>
                <div class="mb-3">
                  <span class="text-sm font-medium" style={{ color: q.color }}>{q.label}</span>
                  <span class="block text-[10px] text-gray-500">{q.sublabel}</span>
                </div>
                <div class="space-y-2">
                  <For each={quadrantTasks()[q.key]}>
                    {(item) => (
                      <div
                        class="px-2.5 py-1.5 rounded-md bg-black/20 text-xs border-l-2"
                      >
                        <span class="text-gray-300 flex-1 truncate">{item.task.title}</span>
                        <span class="text-[10px] text-gray-500">{item.task.estimatedMinutes}min</span>
                      </div>
                    )}
                  </For>
                  <Show when={quadrantTasks()[q.key].length === 0}>
                    <p class="text-[10px] text-gray-600 italic">暂无任务</p>
                  </Show>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="glass-card rounded-xl p-5">
          <span class="section-title">系统映射</span>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <div class="text-xs text-blue-400 mb-2 font-medium">工作软件</div>
              <div class="space-y-1.5">
                <For each={systemMapping().workTasks}>
                  {(task) => (
                    <div class="px-2.5 py-1.5 rounded-md bg-blue-500/10 text-xs text-blue-300 border-l-2 border-blue-400 truncate">
                      {task.title}
                    </div>
                  )}
                </For>
              </div>
            </div>
            <div>
              <div class="text-xs text-[#c77dff] mb-2 font-medium">个人效能</div>
              <div class="space-y-1.5">
                <For each={systemMapping().personalTasks}>
                  {(task) => (
                    <div class="px-2.5 py-1.5 rounded-md bg-[#c77dff]/10 text-xs text-[#c77dff] border-l-2 border-[#c77dff] truncate">
                      {task.title}
                    </div>
                  )}
                </For>
              </div>
            </div>
          </div>
          <Show when={systemMapping().crossReferences.length > 0}>
            <div class="mt-4 pt-3 border-t border-gray-700/30">
              <div class="text-[10px] text-gray-500 mb-1">关联映射 ({systemMapping().crossReferences.length})</div>
              <For each={systemMapping().crossReferences}>
                {(ref) => {
                  const wTask = taskMap().get(ref.workId)
                  const pTask = taskMap().get(ref.personalId)
                  return (
                    <div class="text-[10px] text-gray-400 mb-1">
                      <span class="text-blue-300">{wTask?.title}</span>
                      <span class="text-gray-600 mx-1">↔</span>
                      <span class="text-[#c77dff]">{pTask?.title}</span>
                      <span class="text-gray-600 ml-1">({ref.relationType})</span>
                    </div>
                  )
                }}
              </For>
            </div>
          </Show>
        </div>

        <div class="space-y-6">
          <div class="glass-card rounded-xl p-5">
            <span class="section-title">权重调节</span>
            <div class="space-y-4">
              <For each={[
                { key: 'urgency', label: '紧急度', color: '#ff8c00', value: optimizationState.weights.urgency },
                { key: 'importance', label: '重要度', color: '#00f0ff', value: optimizationState.weights.importance },
                { key: 'focusNeed', label: '专注需求', color: '#39ff14', value: optimizationState.weights.focusNeed },
                { key: 'deadline', label: '截止时间', color: '#c77dff', value: optimizationState.weights.deadline },
              ]}>
                {(item) => (
                  <label class="flex items-center gap-3">
                    <span class="text-xs text-gray-400 w-16">{item.label}</span>
                    <input
                      type="range"
                      min="0" max="1" step="0.05"
                      value={item.value}
                      onInput={(e) => handleWeightChange(item.key, parseFloat(e.currentTarget.value))}
                      class="flex-1"
                      style={{ 'accent-color': item.color }}
                    />
                    <span class="text-xs w-8 text-right" style={{ color: item.color }}>
                      {item.value.toFixed(2)}
                    </span>
                  </label>
                )}
              </For>
            </div>
          </div>

          <div class="glass-card rounded-xl p-5">
            <span class="section-title">执行时机推荐</span>
            <div class="space-y-2 max-h-64 overflow-y-auto">
              <For each={timingRecommendations()}>
                {(rec) => {
                  const task = taskMap().get(rec.taskId)
                  if (!task) return null
                  return (
                    <div class="flex items-start gap-3 px-3 py-2 rounded-lg bg-[#1a1d2e]">
                      <div class="text-center shrink-0">
                        <div class="text-sm font-bold text-[#00f0ff]" style={{ 'font-family': 'Orbitron, monospace' }}>
                          {formatTime(rec.bestHour)}
                        </div>
                        <div class="text-[10px] text-gray-500">推荐时段</div>
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="text-xs text-white truncate">{task.title}</div>
                        <div class="text-[10px] text-gray-500 mt-0.5">{rec.reasoning}</div>
                      </div>
                      <div class="text-[10px] text-gray-400 shrink-0">{rec.confidenceScore}%</div>
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
