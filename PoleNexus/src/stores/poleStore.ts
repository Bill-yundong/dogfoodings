import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PoleNode, EnergyData, Statistics } from '@/types'
import { poleStore as indexedDBPoleStore, energyStore, logStore, commandStore } from '@/services/indexedDB'
import { useSyncService } from '@/services/syncService'
import { generateId } from '@/utils/helpers'

export const usePoleStore = defineStore('pole', () => {
  const poles = ref<PoleNode[]>([])
  const loading = ref(false)
  const selectedPoleId = ref<string | null>(null)

  const syncService = useSyncService()

  const selectedPole = computed(() => {
    if (!selectedPoleId.value) return null
    return poles.value.find(p => p.id === selectedPoleId.value) || null
  })

  const statistics = computed<Statistics>(() => {
    const total = poles.value.length
    const online = poles.value.filter(p => p.status === 'online').length
    const offline = poles.value.filter(p => p.status === 'offline').length
    const warning = poles.value.filter(p => p.status === 'warning').length
    const activeCommands = poles.value.filter(p => p.dimmingMode === 'energy_saving').length
    
    const totalEnergy = poles.value.reduce((sum, p) => sum + (p.power * 24 / 1000), 0)
    const energySaved = poles.value
      .filter(p => p.brightness < 100)
      .reduce((sum, p) => sum + ((100 - p.brightness) / 100) * 100 * 24 / 1000, 0)
    const avgBrightness = poles.value.length > 0
      ? poles.value.reduce((sum, p) => sum + p.brightness, 0) / poles.value.length
      : 0

    return {
      totalPoles: total,
      onlinePoles: online,
      offlinePoles: offline,
      warningPoles: warning,
      totalEnergyToday: totalEnergy,
      energySavedToday: energySaved,
      averageBrightness: Math.round(avgBrightness),
      activeCommands,
    }
  })

  async function loadPoles(): Promise<void> {
    loading.value = true
    try {
      poles.value = await indexedDBPoleStore.getAll()
      if (poles.value.length === 0) {
        await initializeMockData()
      }
    } finally {
      loading.value = false
    }
  }

  async function initializeMockData(): Promise<void> {
    const zoneNames = ['东区', '西区', '南区', '北区', '中心区']
    const baseLatitude = 39.9
    const baseLongitude = 116.4
    const mockPoles: PoleNode[] = []

    for (let i = 0; i < 100; i++) {
      const zoneIndex = i % 5
      const statusRoll = Math.random()
      let status: PoleNode['status']
      if (statusRoll > 0.95) {
        status = 'offline'
      } else if (statusRoll > 0.9) {
        status = 'warning'
      } else {
        status = 'online'
      }

      mockPoles.push({
        id: `pole-${i + 1}`,
        name: `灯杆-${String(i + 1).padStart(4, '0')}`,
        location: `${zoneNames[zoneIndex]}路第${Math.floor(i / 5) + 1}号`,
        position: {
          latitude: baseLatitude + (Math.random() - 0.5) * 0.1,
          longitude: baseLongitude + (Math.random() - 0.5) * 0.1,
        },
        status,
        brightness: status === 'offline' ? 0 : Math.floor(Math.random() * 100),
        temperature: 15 + Math.random() * 20,
        humidity: 40 + Math.random() * 40,
        power: status === 'offline' ? 0 : 50 + Math.random() * 50,
        isOn: status !== 'offline' && Math.random() > 0.3,
        dimmingMode: ['manual', 'auto', 'energy_saving'][Math.floor(Math.random() * 3)] as PoleNode['dimmingMode'],
        lastHeartbeat: Date.now() - Math.random() * 3600000,
        createdAt: Date.now() - Math.random() * 365 * 24 * 3600000,
        updatedAt: Date.now() - Math.random() * 86400000,
        zoneId: `zone-${zoneIndex + 1}`,
      })
    }

    await indexedDBPoleStore.bulkPut(mockPoles)
    poles.value = mockPoles

    const energyDataList: EnergyData[] = []
    for (const pole of mockPoles) {
      for (let h = 0; h < 24; h++) {
        energyDataList.push({
          id: generateId(),
          poleId: pole.id,
          timestamp: Date.now() - (24 - h) * 3600000,
          power: pole.power * (0.8 + Math.random() * 0.4),
          voltage: 220 + (Math.random() - 0.5) * 10,
          current: (pole.power / 220) * (0.8 + Math.random() * 0.4),
          powerFactor: 0.85 + Math.random() * 0.15,
          energyConsumption: pole.power / 1000,
          cumulativeEnergy: Math.random() * 1000,
        })
      }
    }
    await energyStore.bulkPut(energyDataList)
  }

  async function updatePole(pole: PoleNode): Promise<void> {
    const index = poles.value.findIndex(p => p.id === pole.id)
    if (index !== -1) {
      poles.value[index] = { ...pole, updatedAt: Date.now() }
      await indexedDBPoleStore.put(poles.value[index])
      syncService.emitStatusChange(poles.value[index])
    }
  }

  async function togglePole(poleId: string): Promise<void> {
    const pole = poles.value.find(p => p.id === poleId)
    if (pole) {
      pole.isOn = !pole.isOn
      pole.brightness = pole.isOn ? (pole.brightness || 50) : 0
      await updatePole(pole)
    }
  }

  async function setBrightness(poleId: string, brightness: number): Promise<void> {
    const pole = poles.value.find(p => p.id === poleId)
    if (pole) {
      pole.brightness = Math.max(0, Math.min(100, brightness))
      pole.isOn = brightness > 0
      await updatePole(pole)
    }
  }

  function selectPole(poleId: string | null): void {
    selectedPoleId.value = poleId
  }

  function getPolesByZone(zoneId: string): PoleNode[] {
    return poles.value.filter(p => p.zoneId === zoneId)
  }

  function getPolesByStatus(status: PoleNode['status']): PoleNode[] {
    return poles.value.filter(p => p.status === status)
  }

  async function refreshPoleStatus(): Promise<void> {
    for (const pole of poles.value) {
      if (pole.status !== 'offline') {
        pole.temperature = 15 + Math.random() * 20
        pole.humidity = 40 + Math.random() * 40
        pole.lastHeartbeat = Date.now()
        await indexedDBPoleStore.put(pole)
        syncService.emitStatusChange(pole)
      }
    }
  }

  syncService.on('status_change', (event) => {
    const updatedPole = event.payload as PoleNode
    const index = poles.value.findIndex(p => p.id === updatedPole.id)
    if (index !== -1) {
      poles.value[index] = updatedPole
    }
  })

  return {
    poles,
    loading,
    selectedPoleId,
    selectedPole,
    statistics,
    loadPoles,
    updatePole,
    togglePole,
    setBrightness,
    selectPole,
    getPolesByZone,
    getPolesByStatus,
    refreshPoleStatus,
  }
})