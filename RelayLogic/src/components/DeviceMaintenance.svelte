<script>
  import { deviceList } from '../store.js'

  let selectedDevice = null
  let maintenanceLog = []

  function selectDevice(device) {
    selectedDevice = device
  }

  function performMaintenance(device) {
    const log = {
      id: Date.now(),
      deviceId: device.id,
      deviceName: device.name,
      type: '预防性维护',
      timestamp: new Date().toLocaleString(),
      operator: '系统管理员',
      result: '完成'
    }
    maintenanceLog = [log, ...maintenanceLog]

    deviceList.update(devices => 
      devices.map(d => 
        d.id === device.id 
          ? { ...d, health: Math.min(100, d.health + 15), status: 'online' }
          : d
      )
    )
  }

  function getHealthColor(health) {
    if (health >= 90) return '#22c55e'
    if (health >= 70) return '#f59e0b'
    return '#ef4444'
  }

  function getStatusBadgeClass(status) {
    switch (status) {
      case 'online': return 'status-online'
      case 'warning': return 'status-warning'
      case 'offline': return 'status-offline'
      default: return 'status-unknown'
    }
  }
</script>

<div class="maintenance-container">
  <div class="panel-header">
    <h2>🔧 设备运维管理</h2>
  </div>

  <div class="content-grid">
    <div class="panel devices-panel">
      <div class="panel-title">
        <span>设备列表</span>
        <span class="badge">{$deviceList.length}</span>
      </div>
      <div class="devices-list">
        {#each $deviceList as device}
          <div 
            class="device-card {selectedDevice?.id === device.id ? 'selected' : ''}"
            onclick={() => selectDevice(device)}
          >
            <div class="device-icon">
              {device.id.startsWith('CB') ? '🔌' : device.id.startsWith('TR') ? '⚙️' : device.id.startsWith('RL') ? '📟' : '📦'}
            </div>
            <div class="device-info">
              <div class="device-name">{device.name}</div>
              <div class="device-id">{device.id}</div>
              <div class="device-health-bar">
                <div 
                  class="health-fill" 
                  style="width: {device.health}%; background: {getHealthColor(device.health)}"
                ></div>
                <span class="health-text">{device.health}%</span>
              </div>
            </div>
            <div class="device-status {getStatusBadgeClass(device.status)}">
              {device.status}
            </div>
          </div>
        {/each}
      </div>
    </div>

    <div class="panel detail-panel">
      <div class="panel-title">设备详情</div>
      {#if selectedDevice}
        <div class="device-detail">
          <div class="detail-header">
            <div class="detail-icon">
              {selectedDevice.id.startsWith('CB') ? '🔌' : selectedDevice.id.startsWith('TR') ? '⚙️' : '📟'}
            </div>
            <div class="detail-title">
              <h3>{selectedDevice.name}</h3>
              <p class="device-id">{selectedDevice.id}</p>
            </div>
            <div class="detail-status {getStatusBadgeClass(selectedDevice.status)}">
              {selectedDevice.status === 'online' ? '在线运行' : selectedDevice.status === 'warning' ? '告警状态' : '离线'}
            </div>
          </div>

          <div class="detail-section">
            <h4>健康状况</h4>
            <div class="health-display">
              <div class="health-chart">
                <svg viewBox="0 0 120 120" class="health-ring">
                  <circle cx="60" cy="60" r="50" stroke="rgba(0,0,0,0.3)" stroke-width="12" fill="none" />
                  <circle 
                    cx="60" cy="60" r="50" 
                    stroke={getHealthColor(selectedDevice.health)} 
                    stroke-width="12" 
                    fill="none"
                    stroke-dasharray={`${selectedDevice.health * 3.14} 314`}
                    stroke-linecap="round"
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                <div class="health-value">{selectedDevice.health}%</div>
              </div>
              <div class="health-info">
                <p>上次维护: {selectedDevice.lastMaintenance}</p>
                <p class="health-hint">
                  {selectedDevice.health >= 90 ? '设备运行良好' : selectedDevice.health >= 70 ? '建议安排维护' : '需要立即维护'}
                </p>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h4>运维操作</h4>
            <div class="action-buttons">
              <button class="btn btn-primary" onclick={() => performMaintenance(selectedDevice)}>
                🛠️ 执行预防性维护
              </button>
              <button class="btn btn-secondary">📋 查看维护历史</button>
              <button class="btn btn-secondary">📊 生成运维报告</button>
            </div>
          </div>

          <div class="detail-section">
            <h4>设备参数</h4>
            <div class="params-grid">
              <div class="param-item">
                <span class="param-label">设备类型</span>
                <span class="param-value">{selectedDevice.id.startsWith('CB') ? '断路器' : selectedDevice.id.startsWith('TR') ? '变压器' : '保护装置'}</span>
              </div>
              <div class="param-item">
                <span class="param-label">运行状态</span>
                <span class="param-value">{selectedDevice.status === 'online' ? '正常运行' : '告警'}</span>
              </div>
              <div class="param-item">
                <span class="param-label">安装日期</span>
                <span class="param-value">2024-01-15</span>
              </div>
              <div class="param-item">
                <span class="param-label">运行时长</span>
                <span class="param-value">4852 小时</span>
              </div>
            </div>
          </div>
        </div>
      {:else}
        <div class="empty-state">选择一个设备查看详情</div>
      {/if}
    </div>
  </div>

  {#if maintenanceLog.length > 0}
    <div class="panel log-panel">
      <div class="panel-title">
        <span>最近维护记录</span>
        <span class="badge">{maintenanceLog.length}</span>
      </div>
      <div class="log-list">
        {#each maintenanceLog as log}
          <div class="log-item">
            <span class="log-time">{log.timestamp}</span>
            <span class="log-device">{log.deviceName}</span>
            <span class="log-type">{log.type}</span>
            <span class="log-operator">{log.operator}</span>
            <span class="log-result">{log.result}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .maintenance-container {
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

  .content-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 20px;
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

  .devices-list {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    max-height: 500px;
  }

  .device-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    margin-bottom: 8px;
    border-radius: 10px;
    background: rgba(59, 130, 246, 0.05);
    border: 1px solid rgba(59, 130, 246, 0.1);
    cursor: pointer;
    transition: all 0.2s;
  }

  .device-card:hover {
    background: rgba(59, 130, 246, 0.1);
  }

  .device-card.selected {
    background: rgba(59, 130, 246, 0.2);
    border-color: #3b82f6;
  }

  .device-icon {
    font-size: 32px;
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(59, 130, 246, 0.2);
    border-radius: 10px;
  }

  .device-info {
    flex: 1;
  }

  .device-name {
    font-weight: 600;
    color: #e2e8f0;
    font-size: 14px;
    margin-bottom: 2px;
  }

  .device-id {
    font-size: 12px;
    color: #94a3b8;
    margin-bottom: 8px;
  }

  .device-health-bar {
    position: relative;
    height: 16px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    overflow: hidden;
  }

  .health-fill {
    height: 100%;
    border-radius: 8px;
    transition: width 0.3s ease;
  }

  .health-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-weight: 600;
    font-size: 10px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }

  .device-status {
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    color: white;
    text-transform: uppercase;
  }

  .status-online { background: #22c55e; }
  .status-warning { background: #f59e0b; }
  .status-offline { background: #ef4444; }
  .status-unknown { background: #64748b; }

  .device-detail {
    padding: 20px;
    overflow-y: auto;
    max-height: 500px;
  }

  .detail-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
    padding-bottom: 20px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  }

  .detail-icon {
    font-size: 48px;
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(59, 130, 246, 0.2);
    border-radius: 16px;
  }

  .detail-title h3 {
    margin: 0 0 4px 0;
    color: #e2e8f0;
    font-size: 20px;
  }

  .detail-title .device-id {
    color: #94a3b8;
    font-size: 14px;
    margin: 0;
  }

  .detail-status {
    margin-left: auto;
    padding: 8px 16px;
    border-radius: 16px;
    font-size: 12px;
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

  .health-display {
    display: flex;
    align-items: center;
    gap: 24px;
  }

  .health-chart {
    position: relative;
    width: 120px;
    height: 120px;
  }

  .health-ring {
    width: 100%;
    height: 100%;
  }

  .health-value {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 24px;
    font-weight: 700;
    color: #e2e8f0;
  }

  .health-info p {
    margin: 4px 0;
    color: #94a3b8;
    font-size: 14px;
  }

  .health-hint {
    color: #f59e0b !important;
    font-weight: 500;
  }

  .action-buttons {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .btn {
    padding: 12px 16px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s;
    text-align: left;
  }

  .btn-primary {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.1);
    color: #e2e8f0;
  }

  .params-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .param-item {
    padding: 12px;
    background: rgba(59, 130, 246, 0.05);
    border-radius: 8px;
  }

  .param-label {
    display: block;
    font-size: 11px;
    color: #94a3b8;
    margin-bottom: 4px;
  }

  .param-value {
    font-size: 14px;
    font-weight: 600;
    color: #e2e8f0;
  }

  .log-panel {
    margin-top: 20px;
  }

  .log-list {
    padding: 12px;
  }

  .log-item {
    display: grid;
    grid-template-columns: 180px 1fr 1fr 1fr 80px;
    gap: 12px;
    padding: 12px 16px;
    margin-bottom: 4px;
    background: rgba(59, 130, 246, 0.05);
    border-radius: 8px;
    font-size: 13px;
    color: #e2e8f0;
  }

  .log-time {
    color: #94a3b8;
  }

  .log-device {
    font-weight: 600;
  }

  .log-result {
    color: #22c55e;
    font-weight: 600;
  }

  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #64748b;
  }
</style>
