<script lang="ts">
  import { latestTrackParameter, trackParameters } from '../lib/stores';
  import type { TrackGeometryParameter } from '../types';

  let latestParam = $state<TrackGeometryParameter | null>(null);
  let historyParams = $state<TrackGeometryParameter[]>([]);

  $effect(() => {
    const unsub1 = latestTrackParameter.subscribe((param) => {
      latestParam = param;
    });
    const unsub2 = trackParameters.subscribe((params) => {
      historyParams = params.slice(-10);
    });
    return () => {
      unsub1();
      unsub2();
    };
  });

  function formatMileage(mileage: number): string {
    return (mileage / 1000).toFixed(2);
  }

  function getConditionClass(condition: string): string {
    switch (condition) {
      case 'excellent': return 'condition-excellent';
      case 'good': return 'condition-good';
      case 'fair': return 'condition-fair';
      case 'poor': return 'condition-poor';
      default: return '';
    }
  }

  function getConditionText(condition: string): string {
    switch (condition) {
      case 'excellent': return '优秀';
      case 'good': return '良好';
      case 'fair': return '一般';
      case 'poor': return '较差';
      default: return '未知';
    }
  }
</script>

<div class="card">
  <div class="card-header">
    <span class="card-icon">🛤️</span>
    <h3 class="card-title">轨道几何参数监测</h3>
  </div>

  {#if latestParam}
    <div class="metrics-grid">
      <div class="metric">
        <div class="metric-label">轨距</div>
        <div class="metric-value">
          {latestParam.gauge.toFixed(2)}
          <span class="unit">mm</span>
        </div>
        <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
          偏差: {(latestParam.gauge - 1435).toFixed(2)} mm
        </div>
      </div>
      <div class="metric">
        <div class="metric-label">方向</div>
        <div class="metric-value info">
          {latestParam.alignment.toFixed(2)}
          <span class="unit">mm</span>
        </div>
      </div>
      <div class="metric">
        <div class="metric-label">高低</div>
        <div class="metric-value info">
          {latestParam.profile.toFixed(2)}
          <span class="unit">mm</span>
        </div>
      </div>
      <div class="metric">
        <div class="metric-label">扭曲</div>
        <div class="metric-value warning">
          {latestParam.twist.toFixed(2)}
          <span class="unit">mm</span>
        </div>
      </div>
      <div class="metric">
        <div class="metric-label">超高</div>
        <div class="metric-value primary">
          {latestParam.cant.toFixed(1)}
          <span class="unit">mm</span>
        </div>
      </div>
      <div class="metric">
        <div class="metric-label">欠超高</div>
        <div class="metric-value success">
          {latestParam.cantDeficiency.toFixed(1)}
          <span class="unit">mm</span>
        </div>
      </div>
    </div>

    <div class="metrics-grid">
      <div class="metric">
        <div class="metric-label">里程位置</div>
        <div class="metric-value primary">K{formatMileage(latestParam.mileage)}</div>
      </div>
      <div class="metric">
        <div class="metric-label">限速</div>
        <div class="metric-value warning">
          {latestParam.speedLimit.toFixed(0)}
          <span class="unit">km/h</span>
        </div>
      </div>
      <div class="metric">
        <div class="metric-label">轨道状况</div>
        <div class="metric-value {getConditionClass(latestParam.condition)}">
          {getConditionText(latestParam.condition)}
        </div>
      </div>
      <div class="metric">
        <div class="metric-label">环境温度</div>
        <div class="metric-value">
          {latestParam.temperature.toFixed(1)}
          <span class="unit">°C</span>
        </div>
      </div>
    </div>
  {:else}
    <div class="alert-empty">等待轨道参数数据...</div>
  {/if}

  {#if historyParams.length > 0}
    <div class="history-section">
      <div class="history-title">历史轨道参数</div>
      <div class="history-grid">
        <div class="header">里程</div>
        <div class="header">轨距</div>
        <div class="header">方向</div>
        <div class="header">高低</div>
        <div class="header">状况</div>

        {#each historyParams as param (param.id)}
          <div class="cell">K{formatMileage(param.mileage)}</div>
          <div class="cell">{param.gauge.toFixed(1)} mm</div>
          <div class="cell">{param.alignment.toFixed(1)} mm</div>
          <div class="cell">{param.profile.toFixed(1)} mm</div>
          <div class="cell {getConditionClass(param.condition)}">
            {getConditionText(param.condition)}
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
