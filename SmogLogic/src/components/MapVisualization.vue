<template>
  <div class="map-visualization">
    <div ref="mapContainer" class="map-container"></div>
    <div class="map-legend">
      <h4>PM2.5 浓度 (μg/m³)</h4>
      <div class="legend-gradient"></div>
      <div class="legend-labels">
        <span>0</span>
        <span>50</span>
        <span>100</span>
        <span>150</span>
        <span>200+</span>
      </div>
    </div>
    <div class="map-stats">
      <div class="stat-item">
        <span class="stat-label">粒子数量</span>
        <span class="stat-value">{{ particleCount }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">监测站点</span>
        <span class="stat-value">{{ stationCount }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Particle, GridPoint, MonitoringStation } from '../types'

const props = defineProps<{
  particles?: Particle[]
  grid?: GridPoint[][]
  stations?: MonitoringStation[]
}>()

const mapContainer = ref<HTMLElement>()
let map: L.Map | null = null
let particleLayer: L.CircleMarker[] = []
let gridLayer: L.Rectangle[] = []
let stationLayer: L.CircleMarker[] = []

const particleCount = ref(0)
const stationCount = ref(0)

onMounted(() => {
  if (!mapContainer.value) return
  
  map = L.map(mapContainer.value).setView([39.9042, 116.4074], 8)
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map)
})

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})

function getPM25Color(pm25: number): string {
  if (pm25 <= 35) return '#00e400'
  if (pm25 <= 75) return '#ffff00'
  if (pm25 <= 115) return '#ff7e00'
  if (pm25 <= 150) return '#ff0000'
  if (pm25 <= 250) return '#99004c'
  return '#7e0023'
}

watch(() => props.particles, (newParticles) => {
  if (!map || !newParticles) return
  
  particleLayer.forEach(p => map?.removeLayer(p))
  particleLayer = []
  
  newParticles.forEach(particle => {
    const marker = L.circleMarker([particle.lat, particle.lng], {
      radius: 3,
      fillColor: getPM25Color(particle.pm25),
      color: getPM25Color(particle.pm25),
      weight: 1,
      opacity: 0.8,
      fillOpacity: 0.6
    })
    marker.addTo(map!)
    particleLayer.push(marker)
  })
  
  particleCount.value = newParticles.length
}, { deep: true })

watch(() => props.grid, (newGrid) => {
  if (!map || !newGrid) return
  
  gridLayer.forEach(g => map?.removeLayer(g))
  gridLayer = []
  
  const resolution = 0.05
  
  newGrid.forEach(row => {
    row.forEach(point => {
      const bounds: L.LatLngBoundsExpression = [
        [point.lat - resolution / 2, point.lng - resolution / 2],
        [point.lat + resolution / 2, point.lng + resolution / 2]
      ]
      
      const rect = L.rectangle(bounds, {
        fillColor: getPM25Color(point.pm25),
        color: 'none',
        fillOpacity: 0.3,
        weight: 0
      })
      rect.addTo(map!)
      gridLayer.push(rect)
    })
  })
}, { deep: true })

watch(() => props.stations, (newStations) => {
  if (!map || !newStations) return
  
  stationLayer.forEach(s => map?.removeLayer(s))
  stationLayer = []
  
  newStations.forEach(station => {
    const marker = L.circleMarker([station.lat, station.lng], {
      radius: 8,
      fillColor: getPM25Color(station.pm25),
      color: '#fff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9
    })
    marker.bindPopup(`<b>${station.name}</b><br>PM2.5: ${station.pm25.toFixed(1)} μg/m³`)
    marker.addTo(map!)
    stationLayer.push(marker)
  })
  
  stationCount.value = newStations.length
}, { deep: true })
</script>

<style scoped>
.map-visualization {
  position: relative;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  height: 100%;
  min-height: 400px;
}

.map-container {
  width: 100%;
  height: 100%;
}

.map-legend {
  position: absolute;
  bottom: 16px;
  left: 16px;
  background: rgba(255,255,255,0.95);
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  z-index: 1000;
}

.map-legend h4 {
  margin: 0 0 8px 0;
  font-size: 12px;
  color: #333;
}

.legend-gradient {
  width: 200px;
  height: 10px;
  background: linear-gradient(to right, #00e400, #ffff00, #ff7e00, #ff0000, #99004c, #7e0023);
  border-radius: 4px;
}

.legend-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 10px;
  color: #666;
}

.map-stats {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(255,255,255,0.95);
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  z-index: 1000;
  display: flex;
  gap: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 11px;
  color: #666;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}
</style>
