<script lang="ts">
  import type { SystemStatus } from '$lib/types';

  let { status }: { status: SystemStatus } = $props();

  const statusConfig: Record<SystemStatus, { label: string; class: string; dot: string }> = {
    running: {
      label: '运行中',
      class: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      dot: 'bg-emerald-400'
    },
    warning: {
      label: '告警',
      class: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      dot: 'bg-amber-400 animate-pulse'
    },
    error: {
      label: '故障',
      class: 'bg-red-500/20 text-red-400 border-red-500/30',
      dot: 'bg-red-400 animate-pulse'
    },
    offline: {
      label: '离线',
      class: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
      dot: 'bg-slate-400'
    }
  };
</script>

<span class="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium {statusConfig[status].class}">
  <span class="w-2 h-2 rounded-full {statusConfig[status].dot}"></span>
  {statusConfig[status].label}
</span>
