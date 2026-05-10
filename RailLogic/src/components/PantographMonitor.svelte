<script lang="ts">
  import { latestPantographState, pantographStates } from '../lib/stores';
  import type { PantographContactState } from '../types';

  let latestState = $state<PantographContactState | null>(null);
  let historyStates = $state<PantographContactState[]>([]);

  $effect(() => {
    const unsub1 = latestPantographState.subscribe((state) => {
      latestState = state;
    });
    const unsub2 = pantographStates.subscribe((states) => {
      historyStates = states.slice(-20);
    });
    return () => {
      unsub1();
      unsub2();
    };
  });

  function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString('zh-CN');
  }

  function getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'normal': return 'status-badge normal';
      case 'warning': return 'status-badge warning';
      case 'critical': return 'status-badge critical';
      default: return 'status-badge';
    }
  }

  function getStatusText(status: string): string {
    switch (status) {
      case 'normal': return '正常';
      case 'warning': return '警告';
      case 'critical': return '危急';
      default: return '未知';
    }
  }

  function getStatusDotClass(status: string): string {
    switch (status) {
      case 'normal': return 'status-dot active pulse';
      case 'warning': return 'status-dot standby pulse';
      case 'critical': return 'status-dot error pulse';
      default: return 'status-dot';
    }
  }
</script>

<div class="card">
  <div class="card-header">
    <span class="card-icon">⚡</span>
    <h3 class="card-title">受电弓交互状态监测</h3>
  </div>

  {#if latestState}
    <div class="metrics-grid">
      <div class="metric">
        <div class="metric-label">接触力</div>
        <div class="metric-value">
          {latestState.contactForce.toFixed(1)}
          <span class="unit">N</span>
        </div>
      </div>
      <div class="metric">
        <div class="metric-label">磨损程度</div>
        <div class="metric-value warning">
          {latestState.wearLevel.toFixed(1)}
          <span class="unit">%</span>
        </div>
      </div>
      <div class="metric">
        <div class="metric-label">垂直位移</div>
        <div class="metric-value info">
          {latestState.verticalDisplacement.toFixed(2)}
          <span class="unit">mm</span>
        </div>
      </div>
      <div class="metric">
        <div class="metric-label">水平位移</div>
        <div class="metric-value info">
          {latestState.horizontalDisplacement.toFixed(2)}
          <span class="unit">mm</span>
        </div>
      </div>
    </div>

    <div class="metrics-grid">
      <div class="metric">
        <div class="metric-label">振动频率</div>
        <div class="metric-value primary">
          {latestState.vibrationFrequency.toFixed(1)}
          <span class="unit">Hz</span>
        </div>
      </div>
      <div class="metric">
        <div class="metric-label">温度</div>
        <div class="metric-value danger">
          {latestState.temperature.toFixed(1)}
          <span class="unit">°C</span>
        </div>
      </div>
      <div class="metric">
        <div class="metric-label">电弧检测</div>
        <div class="metric-value" class:danger={latestState.arcDetection} class:success={!latestState.arcDetection}>
          {latestState.arcDetection ? '检测到' : '未检测'}
        </div>
      </div>
      <div class="metric">
        <div class="metric-label">列车速度</div>
        <div class="metric-value success">
          {latestState.speed.toFixed(0)}
          <span class="unit">km/h</span>
        </div>
      </div>
    </div>

    <div class="status-indicator">
      <div class="status-dot {getStatusDotClass(latestState.status)}"></div>
      <span>状态: {getStatusText(latestState.status)}</span>
      <span style="margin-left: auto; color: var(--text-muted); font-size: 13px;">
        更新: {formatTime(latestState.timestamp)}
      </span>
    </div>
  {:else}
    <div class="alert-empty">等待受电弓数据...</div>
  {/if}

  {#if historyStates.length > 0}
    <div class="history-section">
      <div class="history-title">历史数据 (最近20条)</div>
      <div style="overflow-x: auto;">
        <table class="history-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>接触力</th>
              <th>磨损</th>
              <th>垂移</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {#each historyStates as state (state.id)}
              <tr>
                <td>{formatTime(state.timestamp)}</td>
                <td>{state.contactForce.toFixed(1)} N</td>
                <td>{state.wearLevel.toFixed(1)}%</td>
                <td>{state.verticalDisplacement.toFixed(2)} mm</td>
                <td>
                  <span class="{getStatusBadgeClass(state.status)}">
                    {getStatusText(state.status)}
                  </span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>
