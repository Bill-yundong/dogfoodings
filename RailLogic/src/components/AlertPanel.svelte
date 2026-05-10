<script lang="ts">
  import { alerts, unacknowledgedAlerts } from '../lib/stores';
  import type { Alert } from '../types';

  let allAlerts = $state<Alert[]>([]);
  let unacknowledged = $state<Alert[]>([]);

  $effect(() => {
    const unsub1 = alerts.subscribe((a) => {
      allAlerts = a;
    });
    const unsub2 = unacknowledgedAlerts.subscribe((a) => {
      unacknowledged = a;
    });
    return () => {
      unsub1();
      unsub2();
    };
  });

  function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString('zh-CN');
  }

  function getLevelBadgeClass(level: Alert['level']): string {
    switch (level) {
      case 'emergency': return 'alert-badge emergency';
      case 'critical': return 'alert-badge critical';
      case 'warning': return 'alert-badge warning';
      default: return 'alert-badge info';
    }
  }

  function getLevelText(level: Alert['level']): string {
    switch (level) {
      case 'emergency': return '紧急';
      case 'critical': return '严重';
      case 'warning': return '警告';
      default: return '信息';
    }
  }

  function getSourceText(source: Alert['source']): string {
    switch (source) {
      case 'pantograph': return '受电弓';
      case 'track': return '轨道';
      case 'trajectory': return '轨迹';
      default: return '系统';
    }
  }

  function getItemClass(alert: Alert): string {
    const classes = ['alert-item'];
    if (alert.level === 'critical' || alert.level === 'emergency') {
      classes.push('critical');
    } else if (alert.level === 'warning') {
      classes.push('warning');
    } else {
      classes.push('info');
    }
    if (alert.acknowledged) {
      classes.push('acknowledged');
    }
    return classes.join(' ');
  }

  function acknowledgeAlert(id: string): void {
    alerts.acknowledge(id);
  }
</script>

<div class="card">
  <div class="card-header">
    <span class="card-icon">⚠️</span>
    <h3 class="card-title">告警中心</h3>
    {#if unacknowledged.length > 0}
      <span class="card-badge">{unacknowledged.length}</span>
    {/if}
  </div>

  {#if allAlerts.length === 0}
    <div class="alert-empty">暂无告警</div>
  {:else}
    <div class="alert-list">
      {#each allAlerts.slice(0, 20) as alert (alert.id)}
        <div class="{getItemClass(alert)}">
          <div class="alert-content">
            <div class="alert-header">
              <span class="{getLevelBadgeClass(alert.level)}">{getLevelText(alert.level)}</span>
              <span class="alert-source">{getSourceText(alert.source)}</span>
              <span class="alert-time">{formatTime(alert.timestamp)}</span>
            </div>
            <div class="alert-message">{alert.message}</div>
            {#if alert.trainId || alert.mileage}
              <div class="alert-meta">
                {#if alert.trainId}列车: {alert.trainId}{/if}
                {#if alert.trainId && alert.mileage} | {/if}
                {#if alert.mileage}里程: K{(alert.mileage / 1000).toFixed(3)}{/if}
              </div>
            {/if}
          </div>
          {#if !alert.acknowledged}
            <button class="alert-action" onclick={() => acknowledgeAlert(alert.id)}>
              确认
            </button>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
