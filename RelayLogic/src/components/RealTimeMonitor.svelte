<script>
  import { onMount, onDestroy } from 'svelte'
  import { systemStatus, faultRecords, deviceList } from '../store.js'
  import { FaultSlice } from '../models/FaultSlice.js'

  let alarms = []
  let logEntries = []
  let updateInterval

  function addAlarm(type, message) {
    const alarm = {
      id: Date.now(),
      type,
      message,
      timestamp: new Date().toLocaleTimeString(),
      acknowledged: false
    }
    alarms = [alarm, ...alarms].slice(0, 20)
  }

  function acknowledgeAlarm(id) {
    alarms = alarms.map(a => a.id === id ? { ...a, acknowledged: true } : a)
  }

  function addLog(message, level = 'info') {
    const entry = {
      id: Date.now(),
      message,
      level,
      timestamp: new Date().toLocaleTimeString()
    }
    logEntries = [entry, ...logEntries].slice(0, 50)
  }

  function simulateFault() {
    const device = $deviceList[Math.floor(Math.random() * $deviceList.length)]
    const fault = new FaultSlice({
      deviceId: device.id,
      deviceName: device.name,
      faultType: ['phase_a_ground', 'overcurrent', 'three_phase_short'][Math.floor(Math.random() * 3)],
      severity: ['medium', 'high', 'critical'][Math.floor(Math.random() * 3)]
    })

    faultRecords.update(records => [fault, ...records].slice(0, 100))
    addAlarm(fault.severity, `${device.name} 发生 ${fault.faultType} 故障`)
    addLog(`检测到故障: ${device.name} - ${fault.faultType}`, 'warning')
  }

  onMount(() => {
    addLog('系统启动完成', 'success')
    addLog('实时监控模块已激活', 'info')

    updateInterval = setInterval(() => {
      systemStatus.update(status => ({
        ...status,
        voltage: status.voltage + (Math.random() - 0.5) * 2,
        current: status.current + (Math.random() - 0.5) * 10,
        frequency: status.frequency + (Math.random() - 0.5) * 0.02,
        temperature: status.temperature + (Math.random() - 0.5) * 0.5
      }))

      if (Math.random() < 0.1) {
        addLog('周期性设备巡检完成', 'info')
      }
    }, 2000)
  })

  onDestroy(() => {
    clearInterval(updateInterval)
  })
</script>

<div class="monitor-container">
  <div class="panel-header">
    <h2>📊 实时监控面板</h2>
    <button class="btn btn-primary" onclick={simulateFault}>模拟故障</button>
  </div>

  <div class="monitor-grid">
    <div class="panel alarms-panel">
      <div class="panel-title">
        <span>🚨 告警信息</span>
        <span class="badge">{alarms.filter(a => !a.acknowledged).length}</span>
      </div>
      <div class="alarms-list">
        {#if alarms.length === 0}
          <div class="empty-state">暂无告警信息</div>
        {/if}
        {#each alarms as alarm}
          <div class="alarm-item {alarm.type} {alarm.acknowledged ? 'acknowledged' : ''}">
            <div class="alarm-content">
              <span class="alarm-time">{alarm.timestamp}</span>
              <span class="alarm-message">{alarm.message}</span>
            </div>
            {#if !alarm.acknowledged}
              <button class="btn btn-small" onclick={() => acknowledgeAlarm(alarm.id)}>确认</button>
            {/if}
          </div>
        {/each}
      </div>
    </div>

    <div class="panel devices-panel">
      <div class="panel-title">
        <span>🔧 设备状态</span>
        <span class="badge">{$deviceList.length}</span>
      </div>
      <div class="devices-grid">
        {#each $deviceList as device}
          <div class="device-card {device.status}">
            <div class="device-icon">{device.id.startsWith('CB') ? '🔌' : device.id.startsWith('TR') ? '⚙️' : '📟'}</div>
            <div class="device-name">{device.name}</div>
            <div class="device-health">健康度: {device.health}%</div>
            <div class="device-status-badge">{device.status}</div>
          </div>
        {/each}
      </div>
    </div>

    <div class="panel log-panel">
      <div class="panel-title">
        <span>📝 系统日志</span>
      </div>
      <div class="log-list">
        {#each logEntries as entry}
          <div class="log-entry {entry.level}">
            <span class="log-time">{entry.timestamp}</span>
            <span class="log-message">{entry.message}</span>
          </div>
        {/each}
      </div>
    </div>

    <div class="panel stats-panel">
      <div class="panel-title">
        <span>📈 统计信息</span>
      </div>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value">{alarms.length}</div>
          <div class="stat-label">总告警数</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{$faultRecords.length}</div>
          <div class="stat-label">故障记录</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{$deviceList.filter(d => d.status === 'online').length}</div>
          <div class="stat-label">在线设备</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">99.8%</div>
          <div class="stat-label">系统可用率</div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .monitor-container {
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

  .monitor-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }

  .panel {
    background: rgba(30, 41, 59, 0.9);
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, 0.2);
    overflow: hidden;
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

  .alarms-list, .log-list {
    max-height: 300px;
    overflow-y: auto;
    padding: 8px;
  }

  .alarm-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    margin: 4px 0;
    border-radius: 8px;
    background: rgba(239, 68, 68, 0.1);
    border-left: 3px solid #ef4444;
  }

  .alarm-item.high { border-left-color: #f59e0b; background: rgba(245, 158, 11, 0.1); }
  .alarm-item.medium { border-left-color: #eab308; background: rgba(234, 179, 8, 0.1); }
  .alarm-item.acknowledged { opacity: 0.6; }

  .alarm-time {
    font-size: 12px;
    color: #94a3b8;
    margin-right: 8px;
  }

  .alarm-message {
    color: #e2e8f0;
    font-size: 14px;
  }

  .devices-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    padding: 12px;
  }

  .device-card {
    padding: 16px;
    border-radius: 10px;
    background: rgba(30, 41, 59, 0.5);
    text-align: center;
    border: 1px solid rgba(148, 163, 184, 0.2);
  }

  .device-card.online { border-color: #22c55e; }
  .device-card.warning { border-color: #f59e0b; }

  .device-icon {
    font-size: 28px;
    margin-bottom: 8px;
  }

  .device-name {
    font-weight: 600;
    color: #e2e8f0;
    margin-bottom: 4px;
  }

  .device-health {
    font-size: 12px;
    color: #94a3b8;
    margin-bottom: 8px;
  }

  .device-status-badge {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 10px;
    background: #22c55e;
    color: white;
  }

  .device-card.warning .device-status-badge {
    background: #f59e0b;
  }

  .log-entry {
    padding: 8px 12px;
    margin: 2px 0;
    border-radius: 6px;
    font-size: 13px;
  }

  .log-entry.success { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
  .log-entry.warning { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
  .log-entry.info { background: rgba(59, 130, 246, 0.1); color: #60a5fa; }

  .log-time {
    color: #94a3b8;
    margin-right: 8px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    padding: 16px;
  }

  .stat-item {
    text-align: center;
    padding: 16px;
    background: rgba(59, 130, 246, 0.05);
    border-radius: 10px;
  }

  .stat-value {
    font-size: 28px;
    font-weight: 700;
    color: #60a5fa;
    margin-bottom: 4px;
  }

  .stat-label {
    font-size: 12px;
    color: #94a3b8;
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

  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  .btn-small {
    padding: 4px 8px;
    font-size: 12px;
    background: rgba(255, 255, 255, 0.1);
    color: #e2e8f0;
  }

  .empty-state {
    text-align: center;
    padding: 40px;
    color: #64748b;
  }
</style>
