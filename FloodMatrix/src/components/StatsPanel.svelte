<script>
  export let floodAreas = [];
  export let grid = [];
  export let nodes = [];

  function getWaterDepth(cell) {
    return cell && typeof cell.waterDepth === 'number' ? cell.waterDepth : 0;
  }

  $: totalWaterDepth = grid.length > 0 && grid[0] 
    ? grid.flat().reduce((sum, cell) => sum + getWaterDepth(cell), 0)
    : 0;
  $: avgWaterDepth = grid.length > 0 && grid[0] 
    ? totalWaterDepth / (grid.length * grid[0].length) 
    : 0;
  $: criticalCount = floodAreas.filter(a => a.severity === 'critical').length;
  $: highCount = floodAreas.filter(a => a.severity === 'high').length;
  $: mediumCount = floodAreas.filter(a => a.severity === 'medium').length;
  $: lowCount = floodAreas.filter(a => a.severity === 'low').length;
</script>

<div class="stats-panel">
  <h3>📊 实时数据</h3>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon">💧</div>
      <div class="stat-content">
        <p class="stat-value">{avgWaterDepth.toFixed(3)}m</p>
        <p class="stat-label">平均水深</p>
      </div>
    </div>

    <div class="stat-card warning">
      <div class="stat-icon">⚠️</div>
      <div class="stat-content">
        <p class="stat-value">{floodAreas.length}</p>
        <p class="stat-label">积水区域</p>
      </div>
    </div>

    <div class="stat-card critical">
      <div class="stat-icon">🚨</div>
      <div class="stat-content">
        <p class="stat-value">{criticalCount}</p>
        <p class="stat-label">严重积水</p>
      </div>
    </div>

    <div class="stat-card high">
      <div class="stat-icon">🔴</div>
      <div class="stat-content">
        <p class="stat-value">{highCount}</p>
        <p class="stat-label">高度积水</p>
      </div>
    </div>

    <div class="stat-card medium">
      <div class="stat-icon">🟠</div>
      <div class="stat-content">
        <p class="stat-value">{mediumCount}</p>
        <p class="stat-label">中度积水</p>
      </div>
    </div>

    <div class="stat-card low">
      <div class="stat-icon">🟢</div>
      <div class="stat-content">
        <p class="stat-value">{lowCount}</p>
        <p class="stat-label">轻度积水</p>
      </div>
    </div>
  </div>

  <div class="legend-section">
    <h4>图例说明</h4>
    <div class="legend-items">
      <div class="legend-item">
        <span class="legend-color" style="background: #4ade80"></span>
        <span>轻度 (&lt;0.3m)</span>
      </div>
      <div class="legend-item">
        <span class="legend-color" style="background: #facc15"></span>
        <span>中度 (0.3-0.6m)</span>
      </div>
      <div class="legend-item">
        <span class="legend-color" style="background: #f97316"></span>
        <span>高度 (0.6-1.0m)</span>
      </div>
      <div class="legend-item">
        <span class="legend-color" style="background: #ef4444"></span>
        <span>严重 (&gt;1.0m)</span>
      </div>
    </div>
  </div>
</div>

<style>
  .stats-panel {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border-radius: 12px;
    padding: 20px;
    color: #e2e8f0;
    border: 1px solid #334155;
  }

  h3 {
    margin: 0 0 15px 0;
    font-size: 1.2rem;
    color: #60a5fa;
  }

  h4 {
    margin: 20px 0 10px 0;
    font-size: 0.9rem;
    color: #94a3b8;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  .stat-card {
    background: rgba(30, 41, 59, 0.8);
    border-radius: 8px;
    padding: 12px;
    border: 1px solid #334155;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: all 0.2s ease;
  }

  .stat-card:hover {
    transform: translateY(-2px);
    border-color: #3b82f6;
  }

  .stat-card.critical {
    border-color: rgba(239, 68, 68, 0.5);
  }

  .stat-card.high {
    border-color: rgba(249, 115, 22, 0.5);
  }

  .stat-card.medium {
    border-color: rgba(250, 204, 21, 0.5);
  }

  .stat-card.low {
    border-color: rgba(74, 222, 128, 0.5);
  }

  .stat-card.warning {
    border-color: rgba(251, 191, 36, 0.5);
  }

  .stat-icon {
    font-size: 1.5rem;
  }

  .stat-value {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 700;
    color: #f1f5f9;
  }

  .stat-label {
    margin: 2px 0 0 0;
    font-size: 0.7rem;
    color: #94a3b8;
  }

  .legend-section {
    margin-top: 10px;
  }

  .legend-items {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.75rem;
    color: #94a3b8;
  }

  .legend-color {
    width: 12px;
    height: 12px;
    border-radius: 2px;
  }
</style>
