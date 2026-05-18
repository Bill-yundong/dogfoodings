<script>
  import { tasks } from '../store/AMHSStore.js'
  import { TaskStatus } from '../types/amhs.js'

  const statusLabels = {
    [TaskStatus.PENDING]: { label: '等待中', class: 'bg-slate-500/20 text-slate-400' },
    [TaskStatus.ASSIGNED]: { label: '已分配', class: 'bg-amber-500/20 text-amber-400' },
    [TaskStatus.IN_PROGRESS]: { label: '进行中', class: 'bg-cyan-500/20 text-cyan-400' },
    [TaskStatus.COMPLETED]: { label: '已完成', class: 'bg-emerald-500/20 text-emerald-400' },
    [TaskStatus.FAILED]: { label: '失败', class: 'bg-red-500/20 text-red-400' },
    [TaskStatus.CANCELLED]: { label: '已取消', class: 'bg-slate-500/20 text-slate-400' }
  }

  const formatTime = (ms) => {
    if (!ms) return '-'
    return (ms / 1000).toFixed(1) + 's'
  }
</script>

<div class="bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden">
  <div class="p-4 border-b border-slate-700/50">
    <h3 class="text-lg font-semibold text-white flex items-center gap-2">
      <span class="text-cyan-400">📋</span>
      任务队列
    </h3>
  </div>
  <div class="max-h-80 overflow-y-auto">
    {#if Array.from($tasks.values()).length === 0}
      <div class="p-8 text-center text-slate-500">
        <p>暂无任务</p>
      </div>
    {:else}
      {#each Array.from($tasks.values()).slice(-15).reverse() as task (task.id)}
        <div class="p-3 border-b border-slate-700/30 hover:bg-slate-800/50 transition-colors">
          <div class="flex items-center justify-between mb-2">
            <span class="font-mono text-sm text-cyan-400">{task.id}</span>
            <span class="px-2 py-0.5 rounded-full text-xs font-medium {statusLabels[task.status]?.class}">
              {statusLabels[task.status]?.label}
            </span>
          </div>
          <div class="grid grid-cols-2 gap-2 text-xs text-slate-400">
            <div>
              <span class="text-slate-500">晶圆:</span> {task.waferId || '-'}
            </div>
            <div>
              <span class="text-slate-500">OHT:</span> {task.ohtId || '-'}
            </div>
            <div>
              <span class="text-slate-500">起点:</span> {task.sourceNode}
            </div>
            <div>
              <span class="text-slate-500">终点:</span> {task.targetNode}
            </div>
            <div>
              <span class="text-slate-500">优先级:</span>
              <span class="ml-1 text-amber-400">{'★'.repeat(task.priority)}</span>
            </div>
            <div>
              <span class="text-slate-500">耗时:</span> {formatTime(task.actualDuration)}
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>
