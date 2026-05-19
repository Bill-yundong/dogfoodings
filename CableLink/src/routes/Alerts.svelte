<script lang="ts">
  import { alertStore } from '@/stores/alerts';
  import type { AlertStatus, AlertSeverity, AlertRecord } from '@/types';
  import AlertItem from '@/components/alerts/AlertItem.svelte';

  let filterStatus = $state<AlertStatus | 'all'>('all');
  let filterSeverity = $state<AlertSeverity | 'all'>('all');

  const statusOptions: Array<{ value: AlertStatus | 'all'; label: string }> = [
    { value: 'all', label: '全部状态' },
    { value: 'active', label: '待处理' },
    { value: 'acknowledged', label: '已确认' },
    { value: 'resolved', label: '已解决' }
  ];

  const severityOptions: Array<{ value: AlertSeverity | 'all'; label: string }> = [
    { value: 'all', label: '全部级别' },
    { value: 'danger', label: '严重' },
    { value: 'warning', label: '警告' },
    { value: 'info', label: '信息' }
  ];

  $effect(() => {
    alertStore.loadInitialAlerts();
  });

  const filteredAlerts = () => {
    return alertStore.alerts.filter((alert: AlertRecord) => {
      if (filterStatus !== 'all' && alert.status !== filterStatus) return false;
      if (filterSeverity !== 'all' && alert.severity !== filterSeverity) return false;
      return true;
    });
  };

  const countBySeverity = (severity: AlertSeverity) =>
    alertStore.alerts.filter((a: AlertRecord) => a.severity === severity && a.status === 'active').length;
</script>

<div class="p-6 space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-white">告警中心</h1>
      <p class="text-gray-400 mt-1">告警管理与应急处置</p>
    </div>
    <div class="flex items-center gap-4 text-sm">
      <span class="flex items-center gap-2 text-danger-red">
        <span class="w-2 h-2 rounded-full bg-danger-red animate-pulse"></span>
        严重: {countBySeverity('danger')}
      </span>
      <span class="flex items-center gap-2 text-warning-orange">
        <span class="w-2 h-2 rounded-full bg-warning-orange"></span>
        警告: {countBySeverity('warning')}
      </span>
      <span class="flex items-center gap-2 text-tech-cyan">
        <span class="w-2 h-2 rounded-full bg-tech-cyan"></span>
        信息: {countBySeverity('info')}
      </span>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
    <div class="panel p-4 flex items-center gap-4">
      <div class="w-12 h-12 rounded-xl bg-danger-red/20 flex items-center justify-center text-2xl">
        🚨
      </div>
      <div>
        <p class="text-xs text-gray-400">待处理告警</p>
        <p class="text-2xl font-bold text-danger-red font-mono">
          {alertStore.getAlertsByStatus('active').length}
        </p>
      </div>
    </div>
    <div class="panel p-4 flex items-center gap-4">
      <div class="w-12 h-12 rounded-xl bg-warning-orange/20 flex items-center justify-center text-2xl">
        ⚠️
      </div>
      <div>
        <p class="text-xs text-gray-400">处理中</p>
        <p class="text-2xl font-bold text-warning-orange font-mono">
          {alertStore.getAlertsByStatus('acknowledged').length}
        </p>
      </div>
    </div>
    <div class="panel p-4 flex items-center gap-4">
      <div class="w-12 h-12 rounded-xl bg-safe-green/20 flex items-center justify-center text-2xl">
        ✅
      </div>
      <div>
        <p class="text-xs text-gray-400">已解决</p>
        <p class="text-2xl font-bold text-safe-green font-mono">
          {alertStore.getAlertsByStatus('resolved').length}
        </p>
      </div>
    </div>
    <div class="panel p-4 flex items-center gap-4">
      <div class="w-12 h-12 rounded-xl bg-tech-cyan/20 flex items-center justify-center text-2xl">
        📊
      </div>
      <div>
        <p class="text-xs text-gray-400">告警总数</p>
        <p class="text-2xl font-bold text-tech-cyan font-mono">
          {alertStore.alerts.length}
        </p>
      </div>
    </div>
  </div>

  <div class="flex flex-wrap items-center gap-4">
    <div class="flex items-center gap-2">
      <label class="text-sm text-gray-400">状态:</label>
      <select
        bind:value={filterStatus}
        class="px-3 py-2 bg-space-light border border-tech-cyan/30 rounded-lg text-white text-sm focus:outline-none focus:border-tech-cyan"
      >
        {#each statusOptions as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </div>
    <div class="flex items-center gap-2">
      <label class="text-sm text-gray-400">级别:</label>
      <select
        bind:value={filterSeverity}
        class="px-3 py-2 bg-space-light border border-tech-cyan/30 rounded-lg text-white text-sm focus:outline-none focus:border-tech-cyan"
      >
        {#each severityOptions as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </div>
    <button
      onclick={() => alertStore.loadMore()}
      disabled={alertStore.isLoading}
      class="btn-secondary text-sm"
    >
      加载更多
    </button>
  </div>

  <div class="panel-glow p-5">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-white">告警列表</h3>
      <span class="text-sm text-gray-400">显示 {filteredAlerts().length} 条记录</span>
    </div>

    {#if alertStore.isLoading && alertStore.alerts.length === 0}
      <div class="text-center py-12">
        <div class="animate-spin w-8 h-8 border-2 border-tech-cyan border-t-transparent rounded-full mx-auto mb-4"></div>
        <p class="text-gray-400">正在加载告警数据...</p>
      </div>
    {:else if filteredAlerts().length === 0}
      <div class="text-center py-12">
        <div class="text-5xl mb-4">✅</div>
        <p class="text-gray-400">暂无符合条件的告警记录</p>
      </div>
    {:else}
      <div class="space-y-3 max-h-[600px] overflow-y-auto">
        {#each filteredAlerts() as alert (alert.id)}
          <AlertItem {alert} />
        {/each}
      </div>
    {/if}
  </div>
</div>
