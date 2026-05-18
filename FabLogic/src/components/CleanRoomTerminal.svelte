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
</script>

<div class="bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden">
  <div class="p-4 border-b border-slate-700/50">
    <h3 class="text-lg font-semibold text-white flex items-center gap-2">
      <span class="text-cyan-400">🏭</span>
      洁净室监控终端
    </h3>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
    <div>
      <h4 class="text-sm font-medium text-slate-300 mb-3">设备状态</h4>
      <div class="space-y-2">
        {#each equipmentList as eq (eq.id)}
          <div
            class="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-cyan-500/50 cursor-pointer transition-colors {selectedEquipment?.id === eq.id ? 'border-cyan-500' : ''}"
            onclick={() => selectedEquipment = selectedEquipment?.id === eq.id ? null : eq}
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-white">{eq.name}</p>
                <p class="text-xs text-slate-400">{eq.type}</p>
              </div>
              <span class="w-2 h-2 rounded-full {eq.status === 'running' ? 'bg-emerald-500' : eq.status === 'idle' ? 'bg-amber-500' : 'bg-red-500'}"></span>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <div>
      <h4 class="text-sm font-medium text-slate-300 mb-3">区域 OHT 状态</h4>
      <div class="space-y-2 max-h-48 overflow-y-auto">
        {#each Array.from($ohts.values()).slice(0, 6) as oht (oht.id)}
          <div class="p-2 bg-slate-800/50 rounded-lg flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full {ohtStatusColor(oht.status)}"></span>
              <span class="text-sm text-white">{oht.name}</span>
            </div>
            <span class="text-xs text-slate-400">
              {oht.position.x.toFixed(0)}, {oht.position.y.toFixed(0)}
            </span>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <div class="p-4 border-t border-slate-700/50">
    <h4 class="text-sm font-medium text-slate-300 mb-3">等待中的晶圆</h4>
    <div class="grid grid-cols-5 gap-2">
      {#each Array.from($wafers.values()).filter(w => w.status === WaferStatus.WAITING).slice(0, 10) as wafer (wafer.id)}
        <div class="aspect-square bg-slate-800/50 rounded-lg flex flex-col items-center justify-center p-1 border border-slate-700/50">
          <span class="text-lg">💎</span>
          <span class="text-[10px] text-slate-400 mt-1 font-mono">{wafer.id.slice(-4)}</span>
        </div>
      {/each}
    </div>
  </div>
</div>
