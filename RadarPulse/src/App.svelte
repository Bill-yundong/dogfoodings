<script>
  import { onMount, onDestroy } from 'svelte'
  import RadarCanvas from './components/RadarCanvas.svelte'
  import { ForecastEngine, generateMockRadarData } from './utils/forecastEngine.js'
  import { RadarHistoryDB } from './utils/radarHistoryDB.js'

  let radarData = $state([])
  let forecastData = $state([])
  let currentFrame = $state(0)
  let isPlaying = $state(false)
  let forecastMinutes = $state(30)
  let isForecasting = $state(false)
  let alertLevel = $state('normal')
  let alertMessage = $state('')
  let width = 800
  let height = 600
  
  const db = new RadarHistoryDB()
  const forecastEngine = new ForecastEngine()

  async function init() {
    await db.init()
    await forecastEngine.init()
    
    radarData = generateMockRadarData(50, 20)
    
    await db.saveBatch('radar_frames', [...radarData].map((data, idx) => ({
      id: Date.now() + idx,
      data: [...data],
      timestamp: Date.now() + idx * 60000,
      type: 'observed'
    })))
    
    runForecast()
  }

  function runForecast() {
    if (radarData.length < 2) return
    
    isForecasting = true
    forecastEngine.computeForecast(radarData, forecastMinutes, (results) => {
      forecastData = results
      isForecasting = false
      checkAlerts(results)
    })
  }

  function checkAlerts(forecasts) {
    if (!forecasts || forecasts.length === 0) return
    
    const latestForecast = forecasts[forecasts.length - 1]
    const maxDbz = Math.max(...latestForecast.data)
    
    if (maxDbz >= 45) {
      alertLevel = 'critical'
      alertMessage = '极端暴雨预警！请立即采取防汛措施！'
    } else if (maxDbz >= 35) {
      alertLevel = 'warning'
      alertMessage = '暴雨预警！请注意防范强降水。'
    } else if (maxDbz >= 25) {
      alertLevel = 'caution'
      alertMessage = '中等降水预警。'
    } else {
      alertLevel = 'normal'
      alertMessage = '天气状况正常。'
    }
  }

  function togglePlay() {
    isPlaying = !isPlaying
  }

  function prevFrame() {
    currentFrame = Math.max(0, currentFrame - 1)
  }

  function nextFrame() {
    currentFrame = Math.min(radarData.length - 1, currentFrame + 1)
  }

  function viewForecast(minute) {
    const forecast = forecastData.find(f => f.minute === minute)
    if (forecast) {
      radarData = [forecast.data]
      currentFrame = 0
    }
  }

  async function loadHistory() {
    const history = await db.queryByTimeRange('radar_frames', Date.now() - 3600000, Date.now())
    if (history.length > 0) {
      radarData = history.map(h => h.data)
      currentFrame = 0
    }
  }

  async function clearHistory() {
    await db.clearStore('radar_frames')
    radarData = generateMockRadarData(50, 20)
    currentFrame = 0
  }

  onMount(() => {
    init()
  })

  onDestroy(() => {
    forecastEngine.destroy()
  })
</script>

<div class="app">
  <header class="header">
    <h1>🌧️ RadarPulse - 气象预警与应急防汛系统</h1>
    <div class="alert-banner {alertLevel}">
      <span class="alert-icon">{alertLevel === 'critical' ? '🚨' : alertLevel === 'warning' ? '⚠️' : alertLevel === 'caution' ? 'ℹ️' : '✅'}</span>
      <span class="alert-text">{alertMessage}</span>
    </div>
  </header>

  <main class="main-content">
    <section class="radar-section">
      <div class="controls">
        <button onclick={prevFrame} disabled={isPlaying}>⏮️ 上一帧</button>
        <button onclick={togglePlay} class={isPlaying ? 'playing' : ''}>
          {isPlaying ? '⏸️ 暂停' : '▶️ 播放'}
        </button>
        <button onclick={nextFrame} disabled={isPlaying}>⏭️ 下一帧</button>
        <button onclick={runForecast} disabled={isForecasting} class="forecast-btn">
          {isForecasting ? '🔄 计算中...' : '🔮 重新预报'}
        </button>
      </div>
      
      <div class="frame-info">
        <span>当前帧: {currentFrame + 1} / {radarData.length}</span>
        <span>时间: {new Date(Date.now() + currentFrame * 60000).toLocaleTimeString()}</span>
      </div>

      <RadarCanvas 
        {radarData} 
        {forecastData} 
        {currentFrame} 
        {isPlaying} 
        {width} 
        {height} 
      />
    </section>

    <aside class="sidebar">
      <div class="panel">
        <h3>📊 分钟级降水预报</h3>
        <div class="forecast-timeline">
          {#each forecastData as forecast}
            <button 
              class="forecast-item"
              onclick={() => viewForecast(forecast.minute)}
            >
              <span class="minute">{forecast.minute}分钟</span>
              <span class="intensity">
                最大强度: {Math.round(Math.max(...forecast.data))} dBZ
              </span>
            </button>
          {/each}
        </div>
      </div>

      <div class="panel">
        <h3>💾 历史数据管理</h3>
        <div class="history-controls">
          <button onclick={loadHistory}>📥 加载历史</button>
          <button onclick={clearHistory} class="danger">🗑️ 清除历史</button>
        </div>
      </div>

      <div class="panel">
        <h3>⚙️ 预报设置</h3>
        <div class="setting">
          <label>预报时长: {forecastMinutes} 分钟</label>
          <input 
            type="range" 
            bind:value={forecastMinutes} 
            min={5} 
            max={60} 
            step={5}
            onchange={runForecast}
          />
        </div>
      </div>

      <div class="panel">
        <h3>📋 系统状态</h3>
        <div class="status-item">
          <span class="status-label">Worker状态:</span>
          <span class="status-value ok">运行中</span>
        </div>
        <div class="status-item">
          <span class="status-label">IndexedDB:</span>
          <span class="status-value ok">已连接</span>
        </div>
        <div class="status-item">
          <span class="status-label">预报引擎:</span>
          <span class="status-value {isForecasting ? 'warning' : 'ok'}">
            {isForecasting ? '计算中' : '就绪'}
          </span>
        </div>
      </div>
    </aside>
  </main>
</div>

<style>
  .app {
    min-height: 100vh;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    color: #fff;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .header {
    padding: 20px;
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
  }

  .header h1 {
    margin: 0 0 15px 0;
    font-size: 24px;
    font-weight: 600;
  }

  .alert-banner {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 20px;
    border-radius: 8px;
    font-weight: 500;
  }

  .alert-banner.normal {
    background: linear-gradient(90deg, #27ae60, #2ecc71);
  }

  .alert-banner.caution {
    background: linear-gradient(90deg, #f39c12, #e67e22);
  }

  .alert-banner.warning {
    background: linear-gradient(90deg, #e74c3c, #c0392b);
  }

  .alert-banner.critical {
    background: linear-gradient(90deg, #8e44ad, #9b59b6);
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  .alert-icon {
    font-size: 20px;
  }

  .main-content {
    display: flex;
    gap: 20px;
    padding: 20px;
  }

  .radar-section {
    flex: 1;
  }

  .controls {
    display: flex;
    gap: 10px;
    margin-bottom: 15px;
    flex-wrap: wrap;
  }

  button {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    background: linear-gradient(135deg, #3498db, #2980b9);
    color: white;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(52, 152, 219, 0.4);
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  button.playing {
    background: linear-gradient(135deg, #e74c3c, #c0392b);
  }

  button.forecast-btn {
    background: linear-gradient(135deg, #9b59b6, #8e44ad);
    margin-left: auto;
  }

  button.danger {
    background: linear-gradient(135deg, #e74c3c, #c0392b);
  }

  .frame-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 15px;
    padding: 10px 15px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    font-size: 14px;
  }

  .sidebar {
    width: 320px;
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .panel {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 15px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .panel h3 {
    margin: 0 0 15px 0;
    font-size: 16px;
    font-weight: 600;
    color: #3498db;
  }

  .forecast-timeline {
    max-height: 300px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .forecast-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    padding: 10px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    width: 100%;
    text-align: left;
  }

  .forecast-item:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  .minute {
    font-weight: 600;
    font-size: 14px;
  }

  .intensity {
    font-size: 12px;
    opacity: 0.8;
  }

  .history-controls {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .setting {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .setting label {
    font-size: 14px;
  }

  .setting input[type="range"] {
    width: 100%;
    cursor: pointer;
  }

  .status-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 14px;
  }

  .status-item:last-child {
    border-bottom: none;
  }

  .status-label {
    opacity: 0.7;
  }

  .status-value.ok {
    color: #2ecc71;
    font-weight: 500;
  }

  .status-value.warning {
    color: #f39c12;
    font-weight: 500;
  }

  ::-webkit-scrollbar {
    width: 6px;
  }

  ::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }

  ::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
</style>
