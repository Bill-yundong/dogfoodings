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

<div class="max-h-96 overflow-y-auto">
  {#each Array.from($ohts.values()) as oht (oht.id)}
    <div
      class="px-6 py-4 border-b border-slate-700/30 hover:bg-slate-800/30 cursor-pointer transition-colors {selectedOHT?.id === oht.id ? 'bg-slate-800/50' : ''}"
      onclick={() => selectedOHT = selectedOHT?.id === oht.id ? null : oht}
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-xl shadow-lg">
            🚗
          </div>
          <div>
            <p class="font-semibold text-white">{oht.name}</p>
            <p class="text-xs text-slate-500">{oht.id}</p>
          </div>
        </div>
        <span class="px-2.5 py-1 rounded-full text-xs font-medium {statusLabels[oht.status]?.class}">
          {statusLabels[oht.status]?.label}
        </span>
      </div>

      {#if selectedOHT?.id === oht.id}
        <div class="mt-4 pt-4 border-t border-slate-700/30">
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div class="bg-slate-800/30 rounded-lg p-3">
              <p class="text-xs text-slate-500 mb-1">位置</p>
              <p class="text-slate-200 font-mono text-sm">({oht.position.x.toFixed(1)}, {oht.position.y.toFixed(1)})</p>
            </div>
            <div class="bg-slate-800/30 rounded-lg p-3">
              <p class="text-xs text-slate-500 mb-1">速度</p>
              <p class="text-slate-200">{oht.speed} m/s</p>
            </div>
            <div class="bg-slate-800/30 rounded-lg p-3">
              <p class="text-xs text-slate-500 mb-1">电量</p>
              <p class="text-emerald-400">{oht.batteryLevel}%</p>
            </div>
            <div class="bg-slate-800/30 rounded-lg p-3">
              <p class="text-xs text-slate-500 mb-1">版本</p>
              <p class="text-slate-200">v{oht.version}</p>
            </div>
            {#if oht.payload}
              <div class="col-span-2 bg-slate-800/30 rounded-lg p-3">
                <p class="text-xs text-slate-500 mb-1">运载</p>
                <p class="text-cyan-400 font-medium">{oht.payload}</p>
              </div>
            {/if}
            {#if oht.currentTaskId}
              <div class="col-span-2 bg-slate-800/30 rounded-lg p-3">
                <p class="text-xs text-slate-500 mb-1">当前任务</p>
                <p class="text-amber-400 font-medium font-mono">{oht.currentTaskId}</p>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  {/each}
</div>
