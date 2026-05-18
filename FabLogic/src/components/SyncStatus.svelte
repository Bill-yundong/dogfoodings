<script>
  import { synchronizer } from '../store/AMHSStore.js'
  import { SyncStatus } from '../types/amhs.js'

  let syncInfo = $state({ status: SyncStatus.OFFLINE, pending: 0, lastSync: null })

  const updateSyncStatus = () => {
    const sync = $synchronizer
    if (sync) {
      const status = sync.getStatus()
      syncInfo = {
        status: status.status,
        pending: status.pendingChanges,
        lastSync: status.lastSync
      }
    }
  }

  const statusConfig = {
    [SyncStatus.SYNCED]: { label: '已同步', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    [SyncStatus.SYNCING]: { label: '同步中', color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
    [SyncStatus.OFFLINE]: { label: '离线', color: 'text-slate-400', bg: 'bg-slate-500/20' },
    [SyncStatus.CONFLICT]: { label: '冲突', color: 'text-red-400', bg: 'bg-red-500/20' }
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return '-'
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  let intervalId

  $effect(() => {
    updateSyncStatus()
    intervalId = setInterval(updateSyncStatus, 2000)
    return () => clearInterval(intervalId)
  })
</script>

<div class="bg-slate-900/50 rounded-xl border border-slate-700/50 p-4">
  <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
    <span class="text-cyan-400">🔄</span>
    语义同步状态
  </h3>

  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <span class="text-sm text-slate-400">同步状态</span>
      <span class="px-2 py-1 rounded-full text-xs font-medium {statusConfig[syncInfo.status]?.bg} {statusConfig[syncInfo.status]?.color}">
        {statusConfig[syncInfo.status]?.label}
      </span>
    </div>

    <div class="flex items-center justify-between">
      <span class="text-sm text-slate-400">待同步变更</span>
      <span class="text-sm text-white font-mono">{syncInfo.pending}</span>
    </div>

    <div class="flex items-center justify-between">
      <span class="text-sm text-slate-400">最后同步</span>
      <span class="text-sm text-slate-300">{formatTime(syncInfo.lastSync)}</span>
    </div>

    <div class="pt-3 border-t border-slate-700/50">
      <div class="text-xs text-slate-500 space-y-1">
        <p>✓ IndexedDB 缓存已启用</p>
        <p>✓ 路网切片本地存储</p>
        <p>✓ 多终端语义同步</p>
      </div>
    </div>
  </div>
</div>
