<script>
  import { onMount, onDestroy } from 'svelte'
  import { dataSync } from '../lib/sync/dataSync.js'
  import { TurnoverPredictor } from '../lib/ml/randomForest.js'
  import { 
    getAllParkingSpaces, 
    getAllZones, 
    getZoneOccupancyHistory,
    savePrediction
  } from '../lib/database/indexedDB.js'

  let zones = $state([])
  let parkingSpaces = $state([])
  let selectedZone = $state(null)
  let stats = $state({
    totalSpaces: 0,
    occupiedSpaces: 0,
    availableSpaces: 0,
    occupancyRate: 0,
    zones: 0
  })
  let isTraining = $state(false)
  let trainingProgress = $state(0)
  let predictions = $state([])
  let showPredictions = $state(false)
  
  const predictor = new TurnoverPredictor()
  let municipalSystem = null
  let historyData = []

  const initializeSampleData = async () => {
    const sampleZones = [
      { id: 'zone-1', name: '市中心商圈', description: '核心商业区', capacity: 500, lat: 39.9042, lng: 116.4074 },
      { id: 'zone-2', name: '科技园区', description: '高新技术产业区', capacity: 800, lat: 39.9847, lng: 116.3060 },
      { id: 'zone-3', name: '住宅区', description: '居民生活区', capacity: 300, lat: 39.9339, lng: 116.4521 },
      { id: 'zone-4', name: '交通枢纽', description: '火车站/地铁站', capacity: 1200, lat: 39.9028, lng: 116.4273 },
      { id: 'zone-5', name: '休闲娱乐区', description: '餐饮娱乐场所', capacity: 400, lat: 39.9148, lng: 116.4106 }
    ]

    const sampleSpaces = []
    let spaceId = 0
    
    for (const zone of sampleZones) {
      const spaceCount = Math.min(zone.capacity, 20)
      for (let i = 0; i < spaceCount; i++) {
        const occupied = Math.random() > 0.4
        sampleSpaces.push({
          id: `space-${spaceId++}`,
          zoneId: zone.id,
          name: `${zone.name} - 泊位${i + 1}`,
          totalSpaces: zone.capacity / spaceCount,
          occupiedSpaces: occupied ? Math.floor(zone.capacity / spaceCount * 0.7) : Math.floor(zone.capacity / spaceCount * 0.3),
          status: occupied ? 'occupied' : 'available',
          pricePerHour: 10 + Math.random() * 20,
          address: zone.description,
          type: Math.random() > 0.5 ? 'indoor' : 'outdoor'
        })
      }
    }

    for (const zone of sampleZones) {
      await dataSync.registerSystem('municipal-' + zone.id, 'municipal', () => {})
    }

    return { zones: sampleZones, spaces: sampleSpaces }
  }

  const generateHistoryData = (zones) => {
    const history = []
    const now = Date.now()
    
    for (let hour = 0; hour < 168; hour++) {
      for (const zone of zones) {
        const time = now - (168 - hour) * 60 * 60 * 1000
        const date = new Date(time)
        const hourOfDay = date.getHours()
        const dayOfWeek = date.getDay()
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
        
        let baseRate = 0.5
        if (isWeekend) {
          if (hourOfDay >= 10 && hourOfDay <= 20) baseRate = 0.8
          else baseRate = 0.4
        } else {
          if ((hourOfDay >= 7 && hourOfDay <= 9) || (hourOfDay >= 17 && hourOfDay <= 19)) baseRate = 0.9
          else if (hourOfDay >= 9 && hourOfDay <= 17) baseRate = 0.6
          else baseRate = 0.2
        }
        
        baseRate += (Math.random() - 0.5) * 0.2
        baseRate = Math.max(0, Math.min(1, baseRate))
        
        history.push({
          spaceId: zone.id + '-aggregated',
          zoneId: zone.id,
          occupancyRate: baseRate,
          occupiedSpaces: Math.floor(zone.capacity * baseRate),
          totalSpaces: zone.capacity,
          status: baseRate > 0.7 ? 'busy' : baseRate > 0.3 ? 'normal' : 'idle',
          timestamp: time
        })
      }
    }
    
    return history
  }

  const updateStats = () => {
    let total = 0
    let occupied = 0
    
    for (const space of parkingSpaces) {
      total += space.totalSpaces || 1
      occupied += space.occupiedSpaces || 0
    }
    
    stats = {
      totalSpaces: total,
      occupiedSpaces: occupied,
      availableSpaces: total - occupied,
      occupancyRate: total > 0 ? (occupied / total) * 100 : 0,
      zones: zones.length
    }
  }

  const selectZone = (zone) => {
    selectedZone = zone
    showPredictions = false
  }

  const trainModel = async () => {
    if (!selectedZone || isTraining) return
    
    isTraining = true
    trainingProgress = 0
    
    try {
      const zoneHistory = historyData.filter(h => h.zoneId === selectedZone.id)
      
      await predictor.train(zoneHistory, (progress) => {
        trainingProgress = Math.round(progress)
      })
      
      await generatePredictions()
      
    } catch (error) {
      console.error('Training error:', error)
    } finally {
      isTraining = false
    }
  }

  const generatePredictions = async () => {
    if (!selectedZone) return
    
    const now = Date.now()
    const startTime = now
    const endTime = now + 24 * 60 * 60 * 1000
    
    const zoneHistory = historyData.filter(h => h.zoneId === selectedZone.id)
    
    const predicted = await predictor.predictTurnoverForPeriod(
      zoneHistory,
      startTime,
      endTime,
      60
    )
    
    predictions = predicted.map(p => ({
      ...p,
      zoneId: selectedZone.id,
      predictionTime: p.timestamp
    }))
    
    for (const pred of predictions) {
      await savePrediction({
        zoneId: selectedZone.id,
        predictionTime: pred.timestamp,
        predictedOccupancy: pred.predictedOccupancy,
        predictedTurnover: pred.predictedTurnover,
        createdAt: Date.now()
      })
    }
    
    showPredictions = true
  }

  const simulateOccupancyUpdate = async () => {
    const updates = []
    
    for (const space of parkingSpaces) {
      const change = Math.floor((Math.random() - 0.5) * 10)
      const newOccupied = Math.max(0, Math.min(space.totalSpaces, space.occupiedSpaces + change))
      
      updates.push({
        id: space.id,
        zoneId: space.zoneId,
        name: space.name,
        totalSpaces: space.totalSpaces,
        occupiedSpaces: newOccupied,
        status: newOccupied / space.totalSpaces > 0.8 ? 'full' : 
                newOccupied / space.totalSpaces > 0.5 ? 'busy' : 'available',
        pricePerHour: space.pricePerHour,
        address: space.address,
        type: space.type
      })
    }
    
    parkingSpaces = updates
    updateStats()
    
    if (municipalSystem) {
      municipalSystem.send({
        type: 'parking-update',
        data: updates
      })
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'full': return 'status-full'
      case 'busy': return 'status-busy'
      case 'occupied': return 'status-busy'
      case 'available': return 'status-available'
      case 'idle': return 'status-idle'
      default: return 'status-available'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'full': return '已满'
      case 'busy': return '繁忙'
      case 'occupied': return '占用'
      case 'available': return '可用'
      case 'idle': return '空闲'
      default: return '未知'
    }
  }

  onMount(async () => {
    municipalSystem = dataSync.registerSystem('municipal-main', 'municipal', (data) => {
      console.log('Municipal received:', data)
    })
    
    const savedZones = await getAllZones()
    const savedSpaces = await getAllParkingSpaces()
    
    if (savedZones.length === 0 || savedSpaces.length === 0) {
      const sample = await initializeSampleData()
      zones = sample.zones
      parkingSpaces = sample.spaces
    } else {
      zones = savedZones
      parkingSpaces = savedSpaces
    }
    
    historyData = generateHistoryData(zones)
    updateStats()
    
    setInterval(simulateOccupancyUpdate, 10000)
  })

  onDestroy(() => {
    if (municipalSystem) {
      municipalSystem.unregister()
    }
  })
</script>

<div class="dashboard">
  <header class="dashboard-header">
    <h1>市政管理控制台</h1>
    <div class="sync-status">
      <span class="sync-indicator connected"></span>
      <span>实时同步中</span>
    </div>
  </header>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon total">🅿️</div>
      <div class="stat-info">
        <div class="stat-value">{stats.totalSpaces}</div>
        <div class="stat-label">总泊位</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon occupied">🚗</div>
      <div class="stat-info">
        <div class="stat-value">{stats.occupiedSpaces}</div>
        <div class="stat-label">已占用</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon available">✅</div>
      <div class="stat-info">
        <div class="stat-value">{stats.availableSpaces}</div>
        <div class="stat-label">可用</div>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon rate">📊</div>
      <div class="stat-info">
        <div class="stat-value">{stats.occupancyRate.toFixed(1)}%</div>
        <div class="stat-label">周转率</div>
      </div>
    </div>
  </div>

  <div class="main-content">
    <div class="zones-panel">
      <h2>区域管理</h2>
      <div class="zones-list">
        {#each zones as zone}
          <button 
            type="button"
            class="zone-item {selectedZone?.id === zone.id ? 'selected' : ''}"
            onclick={() => selectZone(zone)}
          >
            <div class="zone-name">{zone.name}</div>
            <div class="zone-meta">
              <span>{zone.capacity} 泊位</span>
            </div>
          </button>
        {/each}
      </div>
    </div>

    <div class="details-panel">
      {#if selectedZone}
        <div class="zone-details">
          <h3>{selectedZone.name}</h3>
          <p class="zone-description">{selectedZone.description}</p>
          
          <div class="zone-actions">
            <button 
              class="btn-primary {isTraining ? 'disabled' : ''}"
              onclick={trainModel}
              disabled={isTraining}
            >
              {isTraining ? `训练中 ${trainingProgress}%` : '训练预测模型'}
            </button>
            <button 
              class="btn-secondary"
              onclick={generatePredictions}
              disabled={isTraining}
            >
              生成预测
            </button>
          </div>

          {#if showPredictions && predictions.length > 0}
            <div class="predictions-section">
              <h4>24小时周转率预测</h4>
              <div class="prediction-chart">
                {#each predictions as prediction}
                  <div class="prediction-bar" style="height: {prediction.predictedTurnover * 100}%">
                    <div class="bar-fill"></div>
                  </div>
                {/each}
              </div>
              <div class="prediction-legend">
                <span class="legend-item"><span class="legend-color turnover"></span>周转率</span>
                <span class="legend-item"><span class="legend-color occupancy"></span>占用率</span>
              </div>
            </div>
          {/if}

          <div class="parking-list">
            <h4>泊位状态</h4>
            <div class="parking-items">
              {#each parkingSpaces.filter(s => s.zoneId === selectedZone.id) as space}
                <div class="parking-item">
                  <div class="parking-info">
                    <span class="parking-name">{space.name}</span>
                    <span class="parking-type">{space.type === 'indoor' ? '室内' : '室外'}</span>
                  </div>
                  <div class="parking-status">
                    <span class={`status-badge ${getStatusColor(space.status)}`}>
                      {getStatusText(space.status)}
                    </span>
                    <span class="occupancy-info">
                      {space.occupiedSpaces}/{space.totalSpaces}
                    </span>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>
      {:else}
        <div class="empty-state">
          <div class="empty-icon">📍</div>
          <p>请选择一个区域查看详情</p>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .zone-item,
  .destination-card,
  .parking-option {
    appearance: none;
    -webkit-appearance: none;
    border: none;
    text-align: left;
    font-family: inherit;
    font-size: inherit;
    color: inherit;
  }

  .dashboard {
    padding: 24px;
    max-width: 1600px;
    margin: 0 auto;
  }

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }

  .dashboard-header h1 {
    font-size: 28px;
    font-weight: 700;
    color: #fff;
    margin: 0;
  }

  .sync-status {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: rgba(34, 197, 94, 0.1);
    border-radius: 20px;
    color: #22c55e;
  }

  .sync-indicator {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  .sync-indicator.connected {
    background: #22c55e;
    box-shadow: 0 0 10px #22c55e;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    margin-bottom: 24px;
  }

  .stat-card {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border-radius: 16px;
    padding: 24px;
    display: flex;
    align-items: center;
    gap: 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .stat-icon {
    width: 56px;
    height: 56px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
  }

  .stat-icon.total { background: rgba(59, 130, 246, 0.2); }
  .stat-icon.occupied { background: rgba(239, 68, 68, 0.2); }
  .stat-icon.available { background: rgba(34, 197, 94, 0.2); }
  .stat-icon.rate { background: rgba(168, 85, 247, 0.2); }

  .stat-info {
    display: flex;
    flex-direction: column;
  }

  .stat-value {
    font-size: 32px;
    font-weight: 700;
    color: #fff;
  }

  .stat-label {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.6);
  }

  .main-content {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 24px;
  }

  .zones-panel {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border-radius: 16px;
    padding: 24px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    height: fit-content;
  }

  .zones-panel h2 {
    font-size: 18px;
    font-weight: 600;
    color: #fff;
    margin: 0 0 16px 0;
  }

  .zones-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .zone-item {
    padding: 16px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    border: 2px solid transparent;
  }

  .zone-item:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .zone-item.selected {
    background: rgba(59, 130, 246, 0.2);
    border-color: #3b82f6;
  }

  .zone-name {
    font-weight: 600;
    color: #fff;
    margin-bottom: 4px;
  }

  .zone-meta {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
  }

  .details-panel {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border-radius: 16px;
    padding: 24px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    min-height: 500px;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 400px;
    color: rgba(255, 255, 255, 0.4);
  }

  .empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
  }

  .zone-details h3 {
    font-size: 24px;
    font-weight: 700;
    color: #fff;
    margin: 0 0 8px 0;
  }

  .zone-description {
    color: rgba(255, 255, 255, 0.6);
    margin: 0 0 24px 0;
  }

  .zone-actions {
    display: flex;
    gap: 12px;
    margin-bottom: 32px;
  }

  .btn-primary, .btn-secondary {
    padding: 12px 24px;
    border-radius: 10px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.3s ease;
    border: none;
  }

  .btn-primary {
    background: #3b82f6;
    color: #fff;
  }

  .btn-primary:hover:not(.disabled) {
    background: #2563eb;
  }

  .btn-primary.disabled {
    background: rgba(59, 130, 246, 0.5);
    cursor: not-allowed;
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .predictions-section {
    margin-bottom: 32px;
  }

  .predictions-section h4 {
    font-size: 16px;
    font-weight: 600;
    color: #fff;
    margin: 0 0 16px 0;
  }

  .prediction-chart {
    display: flex;
    align-items: flex-end;
    gap: 4px;
    height: 150px;
    background: rgba(0, 0, 0, 0.2);
    padding: 16px;
    border-radius: 12px;
    overflow-x: auto;
  }

  .prediction-bar {
    flex: 1;
    min-width: 20px;
    display: flex;
    align-items: flex-end;
    background: rgba(59, 130, 246, 0.1);
    border-radius: 4px 4px 0 0;
  }

  .bar-fill {
    width: 100%;
    background: linear-gradient(to top, #3b82f6, #60a5fa);
    border-radius: 4px 4px 0 0;
    height: 100%;
    transition: height 0.3s ease;
  }

  .prediction-legend {
    display: flex;
    gap: 24px;
    margin-top: 16px;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.7);
  }

  .legend-color {
    width: 16px;
    height: 16px;
    border-radius: 4px;
  }

  .legend-color.turnover { background: linear-gradient(to top, #3b82f6, #60a5fa); }
  .legend-color.occupancy { background: rgba(239, 68, 68, 0.5); }

  .parking-list h4 {
    font-size: 16px;
    font-weight: 600;
    color: #fff;
    margin: 0 0 16px 0;
  }

  .parking-items {
    display: grid;
    gap: 12px;
  }

  .parking-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
  }

  .parking-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .parking-name {
    font-weight: 600;
    color: #fff;
  }

  .parking-type {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
  }

  .parking-status {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .status-badge {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
  }

  .status-full { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
  .status-busy { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
  .status-available { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
  .status-idle { background: rgba(107, 114, 128, 0.2); color: #9ca3af; }

  .occupancy-info {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
    font-weight: 600;
  }

  @media (max-width: 1200px) {
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .main-content {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 768px) {
    .dashboard {
      padding: 16px;
    }

    .stats-grid {
      grid-template-columns: 1fr;
    }

    .dashboard-header h1 {
      font-size: 22px;
    }
  }
</style>
