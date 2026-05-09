<script>
  import { onMount, onDestroy } from 'svelte'
  import { dataSync } from '../lib/sync/dataSync.js'
  import { TurnoverPredictor } from '../lib/ml/randomForest.js'
  import { 
    getAllParkingSpaces, 
    getAllZones,
    getPredictions
  } from '../lib/database/indexedDB.js'

  let zones = $state([])
  let parkingSpaces = $state([])
  let selectedDestination = $state(null)
  let navigationMode = $state(false)
  let currentRoute = $state(null)
  let recommendedParking = $state([])
  let searchQuery = $state('')
  let navigationSystem = null
  let arrivalTime = $state(null)
  let selectedParking = $state(null)
  
  const predictor = new TurnoverPredictor()

  const getAvailabilityColor = (space) => {
    if (!space.totalSpaces) return 'gray'
    const rate = space.occupiedSpaces / space.totalSpaces
    if (rate >= 0.9) return '#ef4444'
    if (rate >= 0.7) return '#f59e0b'
    if (rate >= 0.5) return '#eab308'
    return '#22c55e'
  }

  const getAvailabilityText = (space) => {
    if (!space.totalSpaces) return '未知'
    const rate = space.occupiedSpaces / space.totalSpaces
    if (rate >= 0.9) return '紧张'
    if (rate >= 0.7) return '繁忙'
    if (rate >= 0.5) return '正常'
    return '充足'
  }

  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const findRecommendedParking = async (destination) => {
    if (!destination) return []
    
    const relevantSpaces = parkingSpaces.filter(s => s.zoneId === destination.id)
    const now = Date.now()
    const arrivalTime = now + 30 * 60 * 1000
    
    let predictions = await getPredictions(destination.id)
    const futurePredictions = predictions.filter(p => p.predictionTime >= now)
    
    const scored = relevantSpaces.map(space => {
      let predictedAvailability = space.totalSpaces - space.occupiedSpaces
      
      if (futurePredictions.length > 0) {
        const closestPrediction = futurePredictions.reduce((prev, curr) => 
          Math.abs(curr.predictionTime - arrivalTime) < Math.abs(prev.predictionTime - arrivalTime) ? curr : prev
        )
        predictedAvailability = Math.floor(space.totalSpaces * (1 - closestPrediction.predictedOccupancy))
      }
      
      const currentDistance = calculateDistance(
        destination.lat, destination.lng,
        destination.lat + 0.001, destination.lng
      )
      
      const score = predictedAvailability + (space.type === 'indoor' ? 5 : 0) - space.pricePerHour
      
      return {
        ...space,
        predictedAvailability: Math.max(0, predictedAvailability),
        score,
        distance: (Math.random() * 1 + 0.2).toFixed(1),
        walkTime: Math.floor(Math.random() * 10 + 3)
      }
    })
    
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  }

  const selectDestination = async (zone) => {
    selectedDestination = zone
    navigationMode = false
    currentRoute = null
    selectedParking = null
    recommendedParking = await findRecommendedParking(zone)
  }

  const startNavigation = (parking) => {
    selectedParking = parking
    navigationMode = true
    
    const estimatedMinutes = 25 + Math.floor(Math.random() * 15)
    arrivalTime = new Date(Date.now() + estimatedMinutes * 60 * 1000)
    
    currentRoute = {
      destination: selectedDestination.name,
      parking: parking.name,
      distance: parking.distance,
      estimatedTime: estimatedMinutes,
      price: parking.pricePerHour.toFixed(1)
    }
    
    if (navigationSystem) {
      navigationSystem.send({
        type: 'route-update',
        data: {
          destination: selectedDestination,
          parking,
          estimatedArrival: arrivalTime.getTime()
        }
      })
    }
  }

  const endNavigation = () => {
    navigationMode = false
    currentRoute = null
    selectedParking = null
  }

  const simulateRealtimeUpdates = async () => {
    if (navigationMode && selectedDestination) {
      recommendedParking = await findRecommendedParking(selectedDestination)
    }
  }

  const filteredZones = $derived(() => {
    if (!searchQuery) return zones
    const query = searchQuery.toLowerCase()
    return zones.filter(zone => 
      zone.name.toLowerCase().includes(query) ||
      zone.description.toLowerCase().includes(query)
    )
  })

  const handleSyncUpdate = (data) => {
    console.log('Navigation received update:', data)
    
    if (data.type === 'parking-updated') {
      const idx = parkingSpaces.findIndex(s => s.id === data.data.id)
      if (idx !== -1) {
        parkingSpaces[idx] = data.data
      }
    } else if (data.type === 'parking-status-response') {
      parkingSpaces = data.data
    }
  }

  onMount(async () => {
    navigationSystem = dataSync.registerSystem(
      'navigation-main', 
      'navigation', 
      handleSyncUpdate
    )
    
    zones = await getAllZones()
    parkingSpaces = await getAllParkingSpaces()
    
    if (zones.length === 0) {
      zones = [
        { id: 'zone-1', name: '市中心商圈', description: '核心商业区', capacity: 500, lat: 39.9042, lng: 116.4074 },
        { id: 'zone-2', name: '科技园区', description: '高新技术产业区', capacity: 800, lat: 39.9847, lng: 116.3060 },
        { id: 'zone-3', name: '住宅区', description: '居民生活区', capacity: 300, lat: 39.9339, lng: 116.4521 },
        { id: 'zone-4', name: '交通枢纽', description: '火车站/地铁站', capacity: 1200, lat: 39.9028, lng: 116.4273 },
        { id: 'zone-5', name: '休闲娱乐区', description: '餐饮娱乐场所', capacity: 400, lat: 39.9148, lng: 116.4106 }
      ]
    }
    
    setInterval(simulateRealtimeUpdates, 5000)
  })

  onDestroy(() => {
    if (navigationSystem) {
      navigationSystem.unregister()
    }
  })
</script>

<div class="navigation-app">
  <header class="nav-header">
    <h1>🚗 智能停车导航</h1>
    {#if navigationMode}
      <div class="nav-status active">
        <span class="nav-indicator"></span>
        <span>导航中</span>
      </div>
    {:else}
      <div class="nav-status">
        <span class="nav-indicator idle"></span>
        <span>就绪</span>
      </div>
    {/if}
  </header>

  {#if navigationMode && currentRoute}
    <div class="active-navigation">
      <div class="navigation-card">
        <div class="route-info">
          <div class="route-destination">
            <div class="icon">📍</div>
            <div>
              <div class="label">目的地</div>
              <div class="value">{currentRoute.destination}</div>
            </div>
          </div>
          <div class="route-arrow">→</div>
          <div class="route-parking">
            <div class="icon">🅿️</div>
            <div>
              <div class="label">推荐泊位</div>
              <div class="value">{currentRoute.parking}</div>
            </div>
          </div>
        </div>
        
        <div class="route-stats">
          <div class="stat">
            <div class="stat-value">{currentRoute.estimatedTime}分钟</div>
            <div class="stat-label">预计到达</div>
          </div>
          <div class="stat">
            <div class="stat-value">{arrivalTime ? arrivalTime.toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'}) : '--'}</div>
            <div class="stat-label">到达时间</div>
          </div>
          <div class="stat">
            <div class="stat-value">¥{currentRoute.price}/时</div>
            <div class="stat-label">预计费用</div>
          </div>
        </div>
        
        <button class="end-nav-btn" onclick={endNavigation}>
          结束导航
        </button>
      </div>
      
      {#if selectedParking}
        <div class="parking-detail-card">
          <h3>泊位详情</h3>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">状态</span>
              <span class="status-badge" style="background: {getAvailabilityColor(selectedParking)}20; color: {getAvailabilityColor(selectedParking)}">
                {getAvailabilityText(selectedParking)}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">可用车位</span>
              <span class="detail-value">{selectedParking.predictedAvailability || selectedParking.totalSpaces - selectedParking.occupiedSpaces}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">类型</span>
              <span class="detail-value">{selectedParking.type === 'indoor' ? '室内' : '室外'}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">距离</span>
              <span class="detail-value">{selectedParking.distance}km</span>
            </div>
          </div>
        </div>
      {/if}
    </div>
  {:else}
    <div class="search-section">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input 
          type="text" 
          bind:value={searchQuery}
          placeholder="搜索目的地或区域..."
          class="search-input"
        />
      </div>
    </div>

    <div class="destination-grid">
      {#each filteredZones() as zone}
        <button 
          type="button"
          class="destination-card {selectedDestination?.id === zone.id ? 'selected' : ''}"
          onclick={() => selectDestination(zone)}
        >
          <div class="card-header">
            <div class="zone-name">{zone.name}</div>
            <div class="zone-capacity">{zone.capacity} 泊位</div>
          </div>
          <div class="zone-desc">{zone.description}</div>
          
          {#if selectedDestination?.id === zone.id}
            <div class="zone-stats">
              {#each parkingSpaces.filter(s => s.zoneId === zone.id).slice(0, 3) as space}
                <div class="mini-status">
                  <div class="mini-bar" style="background: {getAvailabilityColor(space)}">
                    <div 
                      class="mini-bar-fill" 
                      style="width: {space.occupiedSpaces / space.totalSpaces * 100}%"
                    ></div>
                  </div>
                  <span class="mini-text">{getAvailabilityText(space)}</span>
                </div>
              {/each}
            </div>
          {/if}
        </button>
      {/each}
    </div>

    {#if selectedDestination && recommendedParking.length > 0}
      <div class="recommendations-section">
        <h2>🎯 推荐泊位</h2>
        <div class="recommendations-list">
          {#each recommendedParking as parking, index}
            <button 
              type="button"
              class="parking-option {selectedParking?.id === parking.id ? 'selected' : ''}"
              onclick={() => startNavigation(parking)}
            >
              <div class="rank-badge">#{index + 1}</div>
              <div class="parking-info">
                <div class="parking-name">{parking.name}</div>
                <div class="parking-meta">
                  <span>{parking.type === 'indoor' ? '🏠 室内' : '🌞 室外'}</span>
                  <span>•</span>
                  <span>🚶 {parking.walkTime}分钟</span>
                  <span>•</span>
                  <span>📏 {parking.distance}km</span>
                </div>
              </div>
              <div class="parking-availability">
                <div class="availability-bar">
                  <div 
                    class="availability-fill" 
                    style="width: {100 - (parking.occupiedSpaces / parking.totalSpaces * 100)}%; background: {getAvailabilityColor(parking)}"
                  ></div>
                </div>
                <div class="availability-info">
                  <span class="available-count">{parking.predictedAvailability || parking.totalSpaces - parking.occupiedSpaces}</span>
                  <span class="total-count">/ {parking.totalSpaces}</span>
                </div>
              </div>
              <div class="parking-price">¥{parking.pricePerHour.toFixed(1)}/时</div>
            </button>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .navigation-app {
    padding: 24px;
    max-width: 900px;
    margin: 0 auto;
  }

  .nav-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }

  .nav-header h1 {
    font-size: 28px;
    font-weight: 700;
    color: #fff;
    margin: 0;
  }

  .nav-status {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: rgba(59, 130, 246, 0.1);
    border-radius: 20px;
    color: #60a5fa;
  }

  .nav-status.active {
    background: rgba(34, 197, 94, 0.1);
    color: #22c55e;
  }

  .nav-indicator {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #3b82f6;
    animation: pulse 2s infinite;
  }

  .nav-indicator.idle {
    background: #6b7280;
    animation: none;
  }

  .nav-status.active .nav-indicator {
    background: #22c55e;
    box-shadow: 0 0 10px #22c55e;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .search-section {
    margin-bottom: 24px;
  }

  .search-box {
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 16px 24px;
    gap: 16px;
  }

  .search-icon {
    font-size: 20px;
  }

  .search-input {
    flex: 1;
    background: transparent;
    border: none;
    color: #fff;
    font-size: 16px;
    outline: none;
  }

  .search-input::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  .destination-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }

  .destination-card {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border-radius: 16px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.3s ease;
    border: 2px solid transparent;
  }

  .destination-card:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .destination-card.selected {
    background: rgba(59, 130, 246, 0.2);
    border-color: #3b82f6;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .zone-name {
    font-weight: 600;
    color: #fff;
    font-size: 16px;
  }

  .zone-capacity {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    background: rgba(255, 255, 255, 0.1);
    padding: 4px 8px;
    border-radius: 8px;
  }

  .zone-desc {
    color: rgba(255, 255, 255, 0.6);
    font-size: 13px;
  }

  .zone-stats {
    display: flex;
    gap: 12px;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .mini-status {
    flex: 1;
  }

  .mini-bar {
    height: 6px;
    border-radius: 3px;
    margin-bottom: 4px;
    overflow: hidden;
  }

  .mini-bar-fill {
    height: 100%;
    background: rgba(0, 0, 0, 0.3);
  }

  .mini-text {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
  }

  .recommendations-section h2 {
    font-size: 20px;
    font-weight: 700;
    color: #fff;
    margin: 0 0 16px 0;
  }

  .recommendations-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .parking-option {
    display: grid;
    grid-template-columns: auto 1fr auto auto;
    align-items: center;
    gap: 16px;
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border-radius: 16px;
    padding: 16px 20px;
    cursor: pointer;
    transition: all 0.3s ease;
    border: 2px solid transparent;
  }

  .parking-option:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .parking-option.selected {
    background: rgba(34, 197, 94, 0.15);
    border-color: #22c55e;
  }

  .rank-badge {
    width: 32px;
    height: 32px;
    background: linear-gradient(135deg, #3b82f6, #60a5fa);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    color: #fff;
    font-size: 14px;
  }

  .parking-info {
    min-width: 0;
  }

  .parking-name {
    font-weight: 600;
    color: #fff;
    font-size: 15px;
    margin-bottom: 4px;
  }

  .parking-meta {
    display: flex;
    gap: 8px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
    flex-wrap: wrap;
  }

  .parking-availability {
    width: 120px;
  }

  .availability-bar {
    height: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 4px;
  }

  .availability-fill {
    height: 100%;
    transition: width 0.3s ease;
  }

  .availability-info {
    display: flex;
    justify-content: center;
    gap: 2px;
    font-size: 12px;
  }

  .available-count {
    color: #22c55e;
    font-weight: 600;
  }

  .total-count {
    color: rgba(255, 255, 255, 0.5);
  }

  .parking-price {
    font-weight: 600;
    color: #f59e0b;
    font-size: 14px;
    white-space: nowrap;
  }

  .active-navigation {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .navigation-card {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(59, 130, 246, 0.1));
    backdrop-filter: blur(10px);
    border-radius: 20px;
    padding: 24px;
    border: 1px solid rgba(34, 197, 94, 0.3);
  }

  .route-info {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
  }

  .route-destination,
  .route-parking {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .route-arrow {
    font-size: 24px;
    color: rgba(255, 255, 255, 0.4);
  }

  .icon {
    width: 48px;
    height: 48px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
  }

  .label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
    margin-bottom: 2px;
  }

  .value {
    font-weight: 600;
    color: #fff;
    font-size: 15px;
  }

  .route-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 24px;
  }

  .stat {
    text-align: center;
    padding: 16px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
  }

  .stat-value {
    font-size: 20px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 4px;
  }

  .stat-label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
  }

  .end-nav-btn {
    width: 100%;
    padding: 14px;
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 12px;
    font-weight: 600;
    font-size: 15px;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .end-nav-btn:hover {
    background: rgba(239, 68, 68, 0.3);
  }

  .parking-detail-card {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border-radius: 20px;
    padding: 24px;
  }

  .parking-detail-card h3 {
    font-size: 18px;
    font-weight: 700;
    color: #fff;
    margin: 0 0 16px 0;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .detail-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .detail-label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
  }

  .detail-value {
    font-size: 16px;
    font-weight: 600;
    color: #fff;
  }

  .status-badge {
    display: inline-block;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
  }

  @media (max-width: 768px) {
    .navigation-app {
      padding: 16px;
    }

    .destination-grid {
      grid-template-columns: 1fr;
    }

    .parking-option {
      grid-template-columns: auto 1fr;
      gap: 12px;
    }

    .parking-availability,
    .parking-price {
      grid-column: span 2;
    }

    .parking-availability {
      width: 100%;
    }

    .route-info {
      flex-direction: column;
      align-items: flex-start;
    }

    .route-arrow {
      transform: rotate(90deg);
    }

    .route-stats {
      grid-template-columns: 1fr;
    }
  }
</style>
