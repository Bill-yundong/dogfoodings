<script lang="ts">
  import { systemStatus, isMonitoring } from '../lib/stores';
  import type { SystemStatus as SystemStatusType } from '../types';

  let statusData = $state<SystemStatusType | null>(null);
  let monitoringState = $state(false);

  $effect(() => {
    const unsub1 = systemStatus.subscribe((s) => {
      statusData = s;
    });
    const unsub2 = isMonitoring.subscribe((m) => {
      monitoringState = m;
    });
    return () => {
      unsub1();
      unsub2();
    };
  });

  $effect(() => {
    const interval = setInterval(() => {
      systemStatus.refresh();
    }, 2000);
    return () => clearInterval(interval);
  });

  function getStatusDotClass(status: string): string {
    switch (status) {
      case 'active': return 'status-dot active';
      case 'standby': return 'status-dot standby';
      case 'error': return 'status-dot error';
      default: return 'status-dot';
    }
  }

  function getStatusText(status: string): string {
    switch (status) {
      case 'active': return '运行中';
      case 'standby': return '待机';
      case 'error': return '错误';
      default: return '未知';
    }
  }

  function formatTime(timestamp: number): string {
    if (timestamp === 0) return '未同步';
    return new Date(timestamp).toLocaleTimeString('zh-CN');
  }
</script>

<div class="card">
  <div class="card-header">
    <span class="card-icon">🖥️</span>
    <h3 class="card-title">系统状态</h3>
  </div>

  {#if statusData}
    <div class="status-grid">
      <div class="status-card">
        <div class="status-card-title">接触网检测系统</div>
        <div class="status-card-content">
          <div class="{getStatusDotClass(statusData.catenarySystem.status)}"></div>
          <span class="status-card-value">{getStatusText(statusData.catenarySystem.status)}</span>
        </div>
        <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
          数据质量: {statusData.catenarySystem.dataQuality.toFixed(1)}%
        </div>
      </div>

      <div class="status-card">
        <div class="status-card-title">行车保障系统</div>
        <div class="status-card-content">
          <div class="{getStatusDotClass(statusData.operationSystem.status)}"></div>
          <span class="status-card-value">{getStatusText(statusData.operationSystem.status)}</span>
        </div>
        <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
          数据质量: {statusData.operationSystem.dataQuality.toFixed(1)}%
        </div>
      </div>
    </div>

    <div class="database-status">
      <div class="status-card-title" style="margin-bottom: 8px;">数据库状态</div>
      <div class="database-status-grid">
        <div>
          <div style="font-size: 11px; color: var(--text-muted);">连接</div>
          <div style="color: var(--accent-success); font-weight: 600;">已连接</div>
        </div>
        <div>
          <div style="font-size: 11px; color: var(--text-muted);">缓存使用</div>
          <div style="color: var(--accent-secondary); font-weight: 600;">
            {statusData.databaseStatus.cacheUsage.toFixed(2)}%
          </div>
        </div>
        <div>
          <div style="font-size: 11px; color: var(--text-muted);">清理时间</div>
          <div style="color: var(--text-secondary); font-weight: 600;">
            {statusData.databaseStatus.lastCleanup === 0
              ? '未执行'
              : formatTime(statusData.databaseStatus.lastCleanup)}
          </div>
        </div>
      </div>
    </div>

    <div class="monitoring-status">
      <span style="color: var(--text-secondary);">监测状态</span>
      <div class="status-card-content">
        <div class="status-dot {monitoringState ? 'active pulse' : ''}" style="background: var(--text-muted);"></div>
        <span class="status-card-value">{monitoringState ? '运行中' : '已停止'}</span>
      </div>
    </div>
  {:else}
    <div class="alert-empty">加载中...</div>
  {/if}
</div>
