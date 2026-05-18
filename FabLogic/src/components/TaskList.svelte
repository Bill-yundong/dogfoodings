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

<div class="max-h-80 overflow-y-auto">
  {#if Array.from($tasks.values()).length === 0}
    <div class="p-10 text-center">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center text-3xl opacity-50">
        📋
      </div>
      <p class="text-slate-500">暂无任务</p>
      <p class="text-xs text-slate-600 mt-1">点击"生成随机任务"开始</p>
    </div>
  {:else}
    {#each Array.from($tasks.values()).slice(-15).reverse() as task (task.id)}
      <div class="px-6 py-4 border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="font-mono text-sm text-cyan-400 font-medium">{task.id}</span>
            <span class="px-2 py-0.5 rounded-full text-xs font-medium {statusLabels[task.status]?.class}">
              {statusLabels[task.status]?.label}
            </span>
          </div>
          <span class="text-amber-400 text-sm">{'★'.repeat(task.priority)}</span>
        </div>
        <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div class="flex items-center gap-2">
            <span class="text-slate-500 text-xs">晶圆:</span>
            <span class="text-slate-300">{task.waferId || '-'}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-slate-500 text-xs">OHT:</span>
            <span class="text-slate-300">{task.ohtId || '-'}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-slate-500 text-xs">起点:</span>
            <span class="text-slate-300">{task.sourceNode}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-slate-500 text-xs">终点:</span>
            <span class="text-slate-300">{task.targetNode}</span>
          </div>
          <div class="col-span-2 flex items-center gap-2 pt-1">
            <span class="text-slate-500 text-xs">耗时:</span>
            <span class="text-emerald-400 font-medium">{formatTime(task.actualDuration)}</span>
          </div>
        </div>
      </div>
    {/each}
  {/if}
</div>
