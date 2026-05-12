<script>
  import { systemStatus } from '../store.js'

  function getStatusColor() {
    switch ($systemStatus.status) {
      case 'normal': return 'bg-green-500'
      case 'warning': return 'bg-yellow-500'
      case 'critical': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  function getStatusText() {
    switch ($systemStatus.status) {
      case 'normal': return '系统正常'
      case 'warning': return '系统告警'
      case 'critical': return '系统故障'
      default: return '未知状态'
    }
  }
</script>

<header class="header">
  <div class="logo-section">
    <span class="logo-icon">⚡</span>
    <h1 class="title">RelayLogic</h1>
    <span class="subtitle">变电站继电保护装置监控系统</span>
  </div>

  <div class="status-section">
    <div class="status-indicator">
      <span class="status-dot {getStatusColor()}"></span>
      <span class="status-text">{getStatusText()}</span>
    </div>

    <div class="metrics">
      <div class="metric">
        <span class="metric-label">电压</span>
        <span class="metric-value">{$systemStatus.voltage.toFixed(1)} kV</span>
      </div>
      <div class="metric">
        <span class="metric-label">电流</span>
        <span class="metric-value">{$systemStatus.current.toFixed(1)} A</span>
      </div>
      <div class="metric">
        <span class="metric-label">频率</span>
        <span class="metric-value">{$systemStatus.frequency.toFixed(2)} Hz</span>
      </div>
      <div class="metric">
        <span class="metric-label">温度</span>
        <span class="metric-value">{$systemStatus.temperature.toFixed(1)} °C</span>
      </div>
    </div>
  </div>
</header>

<style>
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
    border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  }

  .logo-section {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .logo-icon {
    font-size: 32px;
  }

  .title {
    font-size: 24px;
    font-weight: 700;
    color: #60a5fa;
    margin: 0;
  }

  .subtitle {
    font-size: 14px;
    color: #94a3b8;
    margin-left: 8px;
  }

  .status-section {
    display: flex;
    align-items: center;
    gap: 32px;
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .status-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  .status-text {
    font-size: 14px;
    font-weight: 500;
    color: #e2e8f0;
  }

  .metrics {
    display: flex;
    gap: 24px;
  }

  .metric {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .metric-label {
    font-size: 12px;
    color: #94a3b8;
  }

  .metric-value {
    font-size: 16px;
    font-weight: 600;
    color: #e2e8f0;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
</style>
