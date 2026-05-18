<script>
  import { ohts } from '../store/AMHSStore.js'
  import { OHTStatus } from '../types/amhs.js'

  let selectedOHT = $state(null)

  const statusLabels = {
    [OHTStatus.IDLE]: { label: '空闲', class: 'bg-emerald-500/20 text-emerald-400' },
    [OHTStatus.MOVING]: { label: '运行中', class: 'bg-cyan-500/20 text-cyan-400' },
    [OHTStatus.LOADING]: { label: '装载中', class: 'bg-amber-500/20 text-amber-400' },
    [OHTStatus.UNLOADING]: { label: '卸载中', class: 'bg-amber-500/20 text-amber-400' },
    [OHTStatus.PARKED]: { label: '停泊', class: 'bg-slate-500/20 text-slate-400' },
    [OHTStatus.ERROR]: { label: '故障', class: 'bg-red-500/20 text-red-400' },
    [OHTStatus.MAINTENANCE]: { label: '维护', class: 'bg-purple-500/20 text-purple-400' }
  }
</script>

<div class="bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden">
  <div class="p-4 border-b border-slate-700/50">
    <h3 class="text-lg font-semibold text-white flex items-center gap-2">
      <span class="text-cyan-400">🤖</span>
      OHT 机器人列表
    </h3>
  </div>
  <div class="max-h-96 overflow-y-auto">
    {#each Array.from($ohts.values()) as oht (oht.id)}
      <div
        class="p-3 border-b border-slate-700/30 hover:bg-slate-800/50 cursor-pointer transition-colors {selectedOHT?.id === oht.id ? 'bg-slate-800/70' : ''}"
        onclick={() => selectedOHT = selectedOHT?.id === oht.id ? null : oht}
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-lg">
              🚗
            </div>
            <div>
              <p class="font-medium text-white">{oht.name}</p>
              <p class="text-xs text-slate-400">{oht.id}</p>
            </div>
          </div>
          <span class="px-2 py-1 rounded-full text-xs font-medium {statusLabels[oht.status]?.class}">
            {statusLabels[oht.status]?.label}
          </span>
        </div>

        {#if selectedOHT?.id === oht.id}
          <div class="mt-3 pt-3 border-t border-slate-700/30 text-sm">
            <div class="grid grid-cols-2 gap-2 text-slate-300">
              <div>
                <span class="text-slate-500">位置:</span>
                <span class="ml-1">({oht.position.x.toFixed(1)}, {oht.position.y.toFixed(1)})</span>
              </div>
              <div>
                <span class="text-slate-500">速度:</span>
                <span class="ml-1">{oht.speed} m/s</span>
              </div>
              <div>
                <span class="text-slate-500">电量:</span>
                <span class="ml-1">{oht.batteryLevel}%</span>
              </div>
              <div>
                <span class="text-slate-500">版本:</span>
                <span class="ml-1">v{oht.version}</span>
              </div>
              {#if oht.payload}
                <div class="col-span-2">
                  <span class="text-slate-500">运载:</span>
                  <span class="ml-1 text-cyan-400">{oht.payload}</span>
                </div>
              {/if}
              {#if oht.currentTaskId}
                <div class="col-span-2">
                  <span class="text-slate-500">任务:</span>
                  <span class="ml-1 text-amber-400">{oht.currentTaskId}</span>
                </div>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>
