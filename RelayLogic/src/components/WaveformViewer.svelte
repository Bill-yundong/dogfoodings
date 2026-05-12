<script>
  import { onMount } from 'svelte'
  import { waveformStorage } from '../services/WaveformStorage.js'

  let waveforms = $state([])
  let selectedWaveform = $state(null)
  let isLoading = $state(false)
  let stats = $state(null)

  async function loadWaveforms() {
    isLoading = true
    waveforms = await waveformStorage.getRecentWaveforms(50)
    stats = await waveformStorage.getStorageStatistics()
    isLoading = false
  }

  async function generateSampleData() {
    isLoading = true
    await waveformStorage.generateAndSaveSampleData(100)
    await loadWaveforms()
  }

  async function clearData() {
    await waveformStorage.clearAllWaveforms()
    waveforms = []
    selectedWaveform = null
    stats = await waveformStorage.getStorageStatistics()
  }

  function selectWaveform(waveform) {
    selectedWaveform = waveform
  }

  function formatTime(timestamp) {
    return new Date(timestamp).toLocaleString()
  }

  onMount(() => {
    loadWaveforms()
  })
</script>

<div class="waveform-container">
  <div class="panel-header">
    <h2>📈 故障录波查看器</h2>
    <div class="action-buttons">
      <button class="btn btn-primary" onclick={generateSampleData}>生成示例数据</button>
      <button class="btn btn-secondary" onclick={loadWaveforms}>刷新</button>
      <button class="btn btn-danger" onclick={clearData}>清空</button>
    </div>
  </div>

  {#if stats}
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-label">总记录数</span>
        <span class="stat-value">{stats.totalCount}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">存储限制</span>
        <span class="stat-value">{stats.storageLimit}</span>
      </div>
      {#if stats.timeRange.newest}
        <div class="stat-item">
          <span class="stat-label">最新记录</span>
          <span class="stat-value">{formatTime(stats.timeRange.newest)}</span>
        </div>
      {/if}
    </div>
  {/if}

  <div class="content-grid">
    <div class="panel list-panel">
      <div class="panel-title">
        <span>故障录波列表</span>
        <span class="badge">{waveforms.length}</span>
      </div>
      <div class="waveform-list">
        {#if isLoading}
          <div class="loading">加载中...</div>
        {:else if waveforms.length === 0}
          <div class="empty-state">暂无录波数据，点击"生成示例数据"创建测试数据</div>
        {/if}
        {#each waveforms as waveform}
          <div 
            class="waveform-item {selectedWaveform?.id === waveform.id ? 'selected' : ''}"
            onclick={() => selectWaveform(waveform)}
          >
            <div class="waveform-header">
              <span class="device-name">{waveform.deviceName}</span>
              <span class="severity-badge {waveform.severity}">{waveform.severity}</span>
            </div>
            <div class="waveform-info">
              <span class="fault-type">{waveform.faultType}</span>
              <span class="time">{formatTime(waveform.timestamp)}</span>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <div class="panel detail-panel">
      <div class="panel-title">
        <span>波形详情</span>
      </div>
      {#if selectedWaveform}
        <div class="waveform-detail">
          <div class="detail-section">
            <h4>基本信息</h4>
            <div class="detail-grid">
              <div class="detail-row">
                <span class="label">设备ID</span>
                <span class="value">{selectedWaveform.deviceId}</span>
              </div>
              <div class="detail-row">
                <span class="label">设备名称</span>
                <span class="value">{selectedWaveform.deviceName}</span>
              </div>
              <div class="detail-row">
                <span class="label">故障类型</span>
                <span class="value">{selectedWaveform.faultType}</span>
              </div>
              <div class="detail-row">
                <span class="label">故障相</span>
                <span class="value">{selectedWaveform.faultPhase || '-'}</span>
              </div>
              <div class="detail-row">
                <span class="label">严重程度</span>
                <span class="value severity {selectedWaveform.severity}">{selectedWaveform.severity}</span>
              </div>
              <div class="detail-row">
                <span class="label">状态</span>
                <span class="value">{selectedWaveform.status}</span>
              </div>
            </div>
          </div>

          {#if selectedWaveform.voltage?.length > 0}
            <div class="detail-section">
              <h4>电压波形采样</h4>
              <div class="waveform-preview">
                <svg viewBox="0 0 400 100" class="mini-chart">
                  {#each selectedWaveform.voltage.slice(0, 100) as sample, i}
                    <line 
                      x1={i * 4} y1={50 - sample.phaseA / 10}
                      x2={(i + 1) * 4} y2={50 - (selectedWaveform.voltage[i + 1]?.phaseA || sample.phaseA) / 10}
                      stroke="#3b82f6" stroke-width="1.5"
                    />
                  {/each}
                </svg>
                <div class="chart-legend">
                  <span class="legend-dot" style="background: #3b82f6"></span>
                  <span>A相电压</span>
                </div>
              </div>
            </div>
          {/if}

          {#if selectedWaveform.current?.length > 0}
            <div class="detail-section">
              <h4>电流波形采样</h4>
              <div class="waveform-preview">
                <svg viewBox="0 0 400 100" class="mini-chart">
                  {#each selectedWaveform.current.slice(0, 100) as sample, i}
                    <line 
                      x1={i * 4} y1={50 - sample.phaseA / 20}
                      x2={(i + 1) * 4} y2={50 - (selectedWaveform.current[i + 1]?.phaseA || sample.phaseA) / 20}
                      stroke="#ef4444" stroke-width="1.5"
                    />
                  {/each}
                </svg>
                <div class="chart-legend">
                  <span class="legend-dot" style="background: #ef4444"></span>
                  <span>A相电流</span>
                </div>
              </div>
            </div>
          {/if}
        </div>
      {:else}
        <div class="empty-state">选择一条录波记录查看详情</div>
      {/if}
    </div>
  </div>
</div>

<style>
  .waveform-container {
    padding: 20px;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .panel-header h2 {
    color: #e2e8f0;
    font-size: 20px;
    margin: 0;
  }

  .action-buttons {
    display: flex;
    gap: 10px;
  }

  .stats-bar {
    display: flex;
    gap: 30px;
    padding: 16px;
    background: rgba(30, 41, 59, 0.9);
    border-radius: 12px;
    margin-bottom: 20px;
    border: 1px solid rgba(148, 163, 184, 0.2);
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .stat-label {
    font-size: 12px;
    color: #94a3b8;
  }

  .stat-value {
    font-size: 16px;
    font-weight: 600;
    color: #e2e8f0;
  }

  .content-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }

  .panel {
    background: rgba(30, 41, 59, 0.9);
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, 0.2);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .panel-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: rgba(59, 130, 246, 0.1);
    border-bottom: 1px solid rgba(148, 163, 184, 0.2);
    color: #e2e8f0;
    font-weight: 600;
  }

  .badge {
    background: #3b82f6;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 12px;
  }

  .waveform-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    max-height: 500px;
  }

  .waveform-item {
    padding: 12px;
    margin: 4px 0;
    border-radius: 8px;
    background: rgba(59, 130, 246, 0.05);
    border: 1px solid rgba(59, 130, 246, 0.1);
    cursor: pointer;
    transition: all 0.2s;
  }

  .waveform-item:hover {
    background: rgba(59, 130, 246, 0.1);
  }

  .waveform-item.selected {
    background: rgba(59, 130, 246, 0.2);
    border-color: #3b82f6;
  }

  .waveform-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .device-name {
    font-weight: 600;
    color: #e2e8f0;
    font-size: 14px;
  }

  .severity-badge {
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    color: white;
  }

  .severity-badge.critical { background: #dc2626; }
  .severity-badge.high { background: #ef4444; }
  .severity-badge.medium { background: #f59e0b; }
  .severity-badge.low { background: #22c55e; }

  .waveform-info {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #94a3b8;
  }

  .waveform-detail {
    padding: 16px;
    overflow-y: auto;
    max-height: 500px;
  }

  .detail-section {
    margin-bottom: 24px;
  }

  .detail-section h4 {
    color: #94a3b8;
    font-size: 12px;
    text-transform: uppercase;
    margin-bottom: 12px;
  }

  .detail-grid {
    display: grid;
    gap: 8px;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 12px;
    background: rgba(59, 130, 246, 0.05);
    border-radius: 6px;
  }

  .detail-row .label {
    color: #94a3b8;
    font-size: 13px;
  }

  .detail-row .value {
    color: #e2e8f0;
    font-size: 13px;
    font-weight: 500;
  }

  .detail-row .value.severity.critical { color: #dc2626; }
  .detail-row .value.severity.high { color: #ef4444; }
  .detail-row .value.severity.medium { color: #f59e0b; }
  .detail-row .value.severity.low { color: #22c55e; }

  .waveform-preview {
    padding: 16px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
  }

  .mini-chart {
    width: 100%;
    height: 100px;
  }

  .chart-legend {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    font-size: 12px;
    color: #94a3b8;
  }

  .legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .btn {
    padding: 8px 16px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s;
  }

  .btn-primary {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.1);
    color: #e2e8f0;
  }

  .btn-danger {
    background: rgba(239, 68, 68, 0.2);
    color: #fca5a5;
  }

  .empty-state, .loading {
    text-align: center;
    padding: 60px 20px;
    color: #64748b;
  }
</style>
