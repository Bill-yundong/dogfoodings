<script>
  let {
    materials = [],
    wallPressures = { left: 0, right: 0, bottom: 0 },
    segregationIndex = 0,
    onSelectBatch
  } = $props()

  let selectedBatch = $state(null)

  const getQualityColor = (quality) => {
    const colors = {
      excellent: '#10b981',
      good: '#3b82f6',
      fair: '#f59e0b',
      poor: '#ef4444'
    }
    return colors[quality] || '#6b7280'
  }

  const getPressureStatus = (pressure) => {
    if (pressure > 40000) return { text: '危险', color: '#ef4444' }
    if (pressure > 25000) return { text: '警告', color: '#f59e0b' }
    return { text: '正常', color: '#10b981' }
  }
</script>

<div class="quality-monitor">
  <h3>质量监控系统</h3>

  <div class="monitor-section">
    <h4>实时压力状态</h4>
    <div class="pressure-grid">
      <div class="pressure-item">
        <span class="pressure-label">左侧壁压</span>
        <span class="pressure-value" style="color: {getPressureStatus(wallPressures.left).color}">
          {(wallPressures.left / 1000).toFixed(1)} kN
        </span>
        <span class="pressure-badge" style="background: {getPressureStatus(wallPressures.left).color}">
          {getPressureStatus(wallPressures.left).text}
        </span>
      </div>
      <div class="pressure-item">
        <span class="pressure-label">右侧壁压</span>
        <span class="pressure-value" style="color: {getPressureStatus(wallPressures.right).color}">
          {(wallPressures.right / 1000).toFixed(1)} kN
        </span>
        <span class="pressure-badge" style="background: {getPressureStatus(wallPressures.right).color}">
          {getPressureStatus(wallPressures.right).text}
        </span>
      </div>
      <div class="pressure-item">
        <span class="pressure-label">底部压力</span>
        <span class="pressure-value" style="color: {getPressureStatus(wallPressures.bottom).color}">
          {(wallPressures.bottom / 1000).toFixed(1)} kN
        </span>
        <span class="pressure-badge" style="background: {getPressureStatus(wallPressures.bottom).color}">
          {getPressureStatus(wallPressures.bottom).text}
        </span>
      </div>
    </div>
  </div>

  <div class="monitor-section">
    <h4>偏析指数</h4>
    <div class="segregation-display">
      <div class="segregation-bar">
        <div 
          class="segregation-fill" 
          style="width: {segregationIndex * 100}%; background: {segregationIndex > 0.6 ? '#ef4444' : segregationIndex > 0.3 ? '#f59e0b' : '#10b981'}"
        />
      </div>
      <div class="segregation-labels">
        <span>均匀</span>
        <span>{(segregationIndex * 100).toFixed(1)}%</span>
        <span>偏析</span>
      </div>
    </div>
  </div>

  <div class="monitor-section">
    <h4>物料批次溯源</h4>
    <div class="batch-list">
      {#if materials.length === 0}
        <div class="empty-state">暂无批次数据</div>
      {:else}
        {#each materials.slice(-5).reverse() as material}
          <div 
            class="batch-item"
            class:active={selectedBatch?.batchId === material.batchId}
            on:click={() => {
              selectedBatch = material
              onSelectBatch?.(material)
            }}
          >
            <div class="batch-header">
              <span class="batch-id">{material.batchId}</span>
              <span class="batch-quality" style="background: {getQualityColor(material.quality)}">
                {material.quality}
              </span>
            </div>
            <div class="batch-info">
              <span class="batch-type">{material.type}</span>
              <span class="batch-time">{new Date(material.timestamp).toLocaleString()}</span>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>

  {#if selectedBatch}
    <div class="monitor-section">
      <h4>批次详情</h4>
      <div class="batch-detail">
        <div class="detail-row">
          <span class="detail-label">批次ID:</span>
          <span class="detail-value">{selectedBatch.batchId}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">物料类型:</span>
          <span class="detail-value">{selectedBatch.type}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">供应商:</span>
          <span class="detail-value">{selectedBatch.supplier}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">纯度:</span>
          <span class="detail-value">{selectedBatch.purity}%</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">湿度:</span>
          <span class="detail-value">{selectedBatch.moisture}%</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">质量等级:</span>
          <span class="detail-value" style="color: {getQualityColor(selectedBatch.quality)}">{selectedBatch.quality}</span>
        </div>
      </div>
    </div>
  {/if}

  <style>
    .quality-monitor {
      background: linear-gradient(135deg, #1a1f3a 0%, #0f1428 100%);
      border-radius: 12px;
      padding: 20px;
      border: 1px solid #2d3748;
      max-height: 600px;
      overflow-y: auto;
    }

    .quality-monitor::-webkit-scrollbar {
      width: 6px;
    }

    .quality-monitor::-webkit-scrollbar-track {
      background: #1e293b;
      border-radius: 3px;
    }

    .quality-monitor::-webkit-scrollbar-thumb {
      background: #4a5568;
      border-radius: 3px;
    }

    h3 {
      margin: 0 0 20px 0;
      color: #e2e8f0;
      font-size: 18px;
      font-weight: 600;
    }

    h4 {
      margin: 0 0 12px 0;
      color: #94a3b8;
      font-size: 14px;
      font-weight: 500;
    }

    .monitor-section {
      margin-bottom: 24px;
    }

    .pressure-grid {
      display: grid;
      gap: 8px;
    }

    .pressure-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(30, 41, 59, 0.5);
      padding: 12px;
      border-radius: 8px;
    }

    .pressure-label {
      color: #94a3b8;
      font-size: 13px;
    }

    .pressure-value {
      font-size: 14px;
      font-weight: 600;
    }

    .pressure-badge {
      padding: 4px 8px;
      border-radius: 4px;
      color: white;
      font-size: 11px;
      font-weight: 500;
    }

    .segregation-display {
      background: rgba(30, 41, 59, 0.5);
      padding: 16px;
      border-radius: 8px;
    }

    .segregation-bar {
      height: 12px;
      background: #1e293b;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 8px;
    }

    .segregation-fill {
      height: 100%;
      border-radius: 6px;
      transition: width 0.3s ease;
    }

    .segregation-labels {
      display: flex;
      justify-content: space-between;
      color: #64748b;
      font-size: 12px;
    }

    .batch-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .empty-state {
      text-align: center;
      padding: 20px;
      color: #64748b;
      font-size: 14px;
    }

    .batch-item {
      background: rgba(30, 41, 59, 0.5);
      padding: 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid transparent;
    }

    .batch-item:hover {
      background: rgba(30, 41, 59, 0.8);
      border-color: #4a5568;
    }

    .batch-item.active {
      border-color: #6366f1;
      background: rgba(99, 102, 241, 0.1);
    }

    .batch-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }

    .batch-id {
      color: #e2e8f0;
      font-size: 13px;
      font-weight: 500;
    }

    .batch-quality {
      padding: 3px 8px;
      border-radius: 4px;
      color: white;
      font-size: 10px;
      font-weight: 500;
    }

    .batch-info {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
    }

    .batch-type {
      color: #94a3b8;
    }

    .batch-time {
      color: #64748b;
    }

    .batch-detail {
      background: rgba(30, 41, 59, 0.5);
      padding: 16px;
      border-radius: 8px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #334155;
    }

    .detail-row:last-child {
      border-bottom: none;
    }

    .detail-label {
      color: #94a3b8;
      font-size: 13px;
    }

    .detail-value {
      color: #e2e8f0;
      font-size: 13px;
      font-weight: 500;
    }
  </style>
</div>
