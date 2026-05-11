<script>
  export let grid = [];
  export let nodes = [];
  export let connections = [];
  export let floodAreas = [];
  export let cellSize = 22;

  function getWaterDepth(cell) {
    return cell && typeof cell.waterDepth === 'number' ? cell.waterDepth : 0;
  }

  function getWaterColor(depth) {
    if (depth <= 0) return 'rgba(100, 150, 100, 0.3)';
    if (depth < 0.2) return 'rgba(100, 180, 255, 0.4)';
    if (depth < 0.4) return 'rgba(60, 140, 255, 0.6)';
    if (depth < 0.7) return 'rgba(40, 100, 255, 0.8)';
    if (depth < 1.2) return 'rgba(20, 60, 200, 0.9)';
    return 'rgba(10, 30, 150, 1)';
  }

  function getSeverityColor(severity) {
    switch (severity) {
      case 'low': return '#4ade80';
      case 'medium': return '#facc15';
      case 'high': return '#f97316';
      case 'critical': return '#ef4444';
      default: return '#94a3b8';
    }
  }

  $: width = grid.length > 0 && grid[0] ? grid[0].length * cellSize : 500;
  $: height = grid.length > 0 ? grid.length * cellSize : 500;
</script>

<div class="grid-container" style="width: {width}px; height: {height}px;">
  <svg class="pipe-network" width={width} height={height}>
    {#each connections as conn}
      {#if nodes.find(n => n.id === conn.from) && nodes.find(n => n.id === conn.to)}
        <line
          x1={nodes.find(n => n.id === conn.from).x * cellSize + cellSize / 2}
          y1={nodes.find(n => n.id === conn.from).y * cellSize + cellSize / 2}
          x2={nodes.find(n => n.id === conn.to).x * cellSize + cellSize / 2}
          y2={nodes.find(n => n.id === conn.to).y * cellSize + cellSize / 2}
          stroke="#64748b"
          stroke-width="3"
        />
      {/if}
    {/each}

    {#each nodes as node}
      <circle
        cx={node.x * cellSize + cellSize / 2}
        cy={node.y * cellSize + cellSize / 2}
        r="6"
        fill={node.type === 'outlet' ? '#22c55e' : node.type === 'inlet' ? '#3b82f6' : '#64748b'}
        stroke="#fff"
        stroke-width="2"
      />
    {/each}
  </svg>

  <div class="cell-layer">
    {#each grid as row, y}
      {#each row as cell, x}
        <div
          class="cell"
          style="
            left: {x * cellSize}px;
            top: {y * cellSize}px;
            width: {cellSize}px;
            height: {cellSize}px;
            background-color: {getWaterColor(getWaterDepth(cell))};
          "
          title="深度: {getWaterDepth(cell).toFixed(2)}m | 海拔: {(cell?.elevation || 0).toFixed(1)}m"
        />
      {/each}
    {/each}
  </div>

  <div class="flood-markers">
    {#each floodAreas as area}
      <div
        class="flood-marker"
        style="
          left: {area.centerX * cellSize + cellSize / 2}px;
          top: {area.centerY * cellSize + cellSize / 2}px;
          background-color: {getSeverityColor(area.severity)};
        "
        title="积水深度: {(area.maxDepth || 0).toFixed(2)}m | 等级: {area.severity}"
      />
    {/each}
  </div>
</div>

<style>
  .grid-container {
    position: relative;
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border-radius: 8px;
    overflow: hidden;
    border: 2px solid #334155;
  }

  .pipe-network {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1;
  }

  .cell-layer {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 2;
  }

  .cell {
    position: absolute;
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: background-color 0.3s ease;
    cursor: pointer;
  }

  .cell:hover {
    border-color: rgba(255, 255, 255, 0.5);
  }

  .flood-markers {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 3;
  }

  .flood-marker {
    position: absolute;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    box-shadow: 0 0 10px currentColor;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    50% { opacity: 0.7; transform: translate(-50%, -50%) scale(1.2); }
  }
</style>
