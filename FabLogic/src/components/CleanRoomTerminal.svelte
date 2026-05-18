<script>
  import { ohts, wafers } from '../store/AMHSStore.js'
  import { OHTStatus, WaferStatus } from '../types/amhs.js'

  let selectedEquipment = $state(null)

  const equipmentList = [
    { id: 'EQP-001', name: '光刻机 A1', type: 'Lithography', status: 'running' },
    { id: 'EQP-002', name: '刻蚀机 E1', type: 'Etching', status: 'running' },
    { id: 'EQP-003', name: '沉积机 D1', type: 'Deposition', status: 'idle' },
    { id: 'EQP-004', name: '清洗机 C1', type: 'Cleaning', status: 'maintenance' }
  ]

  const ohtStatusColor = (status) => {
    const colors = {
      [OHTStatus.MOVING]: 'bg-cyan-500',
      [OHTStatus.IDLE]: 'bg-emerald-500',
      [OHTStatus.LOADING]: 'bg-amber-500',
      [OHTStatus.UNLOADING]: 'bg-amber-500',
      [OHTStatus.ERROR]: 'bg-red-500'
    }
    return colors[status] || 'bg-slate-500'
  }

  const equipmentStatusLabel = (status) => {
    const labels = {
      running: { label: '运行中', class: 'bg-emerald-500/20 text-emerald-400' },
      idle: { label: '空闲', class: 'bg-amber-500/20 text-amber-400' },
      maintenance: { label: '维护', class: 'bg-red-500/20 text-red-400' }
    }
    return labels[status] || labels.idle
  }
</script>

<div class="space-y-6">
  <div>
    <h4 class="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
      <span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
      生产设备状态
    </h4>
    <div class="space-y-2">
      {#each equipmentList as eq (eq.id)}
        <div
          class="p-4 bg-slate-800/30 rounded-xl border border-slate-700/30 hover:border-cyan-500/30 cursor-pointer transition-all duration-200 {selectedEquipment?.id === eq.id ? 'border-cyan-500/50 bg-slate-800/50' : ''}"
          onclick={() => selectedEquipment = selectedEquipment?.id === eq.id ? null : eq}
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-lg">
                ⚙️
              </div>
              <div>
                <p class="text-sm font-semibold text-white">{eq.name}</p>
                <p class="text-xs text-slate-500">{eq.type}</p>
              </div>
            </div>
            <span class="px-2.5 py-1 rounded-full text-xs font-medium {equipmentStatusLabel(eq.status).class}">
              {equipmentStatusLabel(eq.status).label}
            </span>
          </div>
          {#if selectedEquipment?.id === eq.id}
            <div class="mt-4 pt-4 border-t border-slate-700/30 grid grid-cols-2 gap-3">
              <div class="bg-slate-900/50 rounded-lg p-3">
                <p class="text-xs text-slate-500 mb-1">当前批次</p>
                <p class="text-sm text-cyan-400 font-mono">LOT-{Math.floor(Math.random() * 9000) + 1000}</p>
              </div>
              <div class="bg-slate-900/50 rounded-lg p-3">
                <p class="text-xs text-slate-500 mb-1">完成进度</p>
                <p class="text-sm text-emerald-400">{Math.floor(Math.random() * 50) + 50}%</p>
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <div>
    <h4 class="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
      <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
      区域 OHT 状态
    </h4>
    <div class="space-y-2 max-h-48 overflow-y-auto">
      {#each Array.from($ohts.values()).slice(0, 6) as oht (oht.id)}
        <div class="p-3 bg-slate-800/30 rounded-xl border border-slate-700/30 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="relative flex h-2.5 w-2.5">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full {ohtStatusColor(oht.status)} opacity-60"></span>
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 {ohtStatusColor(oht.status)}"></span>
            </span>
            <div>
              <p class="text-sm font-medium text-white">{oht.name}</p>
              <p class="text-xs text-slate-500">{oht.id}</p>
            </div>
          </div>
          <span class="text-xs text-slate-400 font-mono">
            ({oht.position.x.toFixed(0)}, {oht.position.y.toFixed(0)})
          </span>
        </div>
      {/each}
    </div>
  </div>

  <div>
    <h4 class="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
      <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
      等待中的晶圆
    </h4>
    <div class="grid grid-cols-5 gap-2">
      {#each Array.from($wafers.values()).filter(w => w.status === WaferStatus.WAITING).slice(0, 10) as wafer (wafer.id)}
        <div class="aspect-square bg-slate-800/30 rounded-xl flex flex-col items-center justify-center p-2 border border-slate-700/30 hover:border-amber-500/30 transition-colors">
          <span class="text-xl">💎</span>
          <span class="text-[10px] text-slate-400 mt-1 font-mono">{wafer.id.slice(-4)}</span>
        </div>
      {/each}
      {#if Array.from($wafers.values()).filter(w => w.status === WaferStatus.WAITING).length === 0}
        <div class="col-span-5 py-8 text-center text-slate-500 text-sm">
          暂无等待中的晶圆
        </div>
      {/if}
    </div>
  </div>
</div>
