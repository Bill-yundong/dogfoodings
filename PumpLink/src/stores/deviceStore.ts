import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PumpDevice, RegionStats } from '@/types'
import { getAllDevices, getDeviceById, addDevice, addDevices, updateDevice, getDeviceStats, getRegionStats } from '@/database/deviceStore'

export const useDeviceStore = defineStore('device', () => {
  const devices = ref<PumpDevice[]>([])
  const selectedDevice = ref<PumpDevice | null>(null)
  const loading = ref(false)

  const stats = computed(() => {
    return getDeviceStats()
  })

  const runningCount = computed(() => devices.value.filter(d => d.currentStatus === 'running').length)
  const warningCount = computed(() => devices.value.filter(d => d.healthScore < 70 && d.healthScore >= 40).length)
  const criticalCount = computed(() => devices.value.filter(d => d.healthScore < 40).length)

  const regionStats = computed<RegionStats[]>(() => {
    const map = new Map<string, RegionStats>()
    devices.value.forEach(d => {
      if (!map.has(d.region)) {
        map.set(d.region, {
          region: d.region,
          deviceCount: 0,
          avgHealthScore: 0,
          runningCount: 0,
          warningCount: 0,
          faultCount: 0
        })
      }
      const stats = map.get(d.region)!
      stats.deviceCount++
      stats.avgHealthScore += d.healthScore
      if (d.currentStatus === 'running') stats.runningCount++
      if (d.healthScore < 70 && d.healthScore >= 40) stats.warningCount++
      if (d.currentStatus === 'fault' || d.healthScore < 40) stats.faultCount++
    })
    return Array.from(map.values()).map(s => ({
      ...s,
      avgHealthScore: Math.round(s.avgHealthScore / s.deviceCount)
    }))
  })

  async function loadAllDevices() {
    loading.value = true
    try {
      devices.value = await getAllDevices()
    } finally {
      loading.value = false
    }
  }

  async function loadDevice(id: string) {
    loading.value = true
    try {
      selectedDevice.value = await getDeviceById(id) || null
    } finally {
      loading.value = false
    }
  }

  async function saveDevice(device: PumpDevice) {
    await addDevice(device)
    await loadAllDevices()
  }

  async function saveDevices(newDevices: PumpDevice[]) {
    await addDevices(newDevices)
    await loadAllDevices()
  }

  async function updateDeviceStatus(id: string, updates: Partial<PumpDevice>) {
    await updateDevice(id, updates)
    const idx = devices.value.findIndex(d => d.id === id)
    if (idx !== -1) {
      devices.value[idx] = { ...devices.value[idx], ...updates }
    }
  }

  function selectDevice(device: PumpDevice | null) {
    selectedDevice.value = device
  }

  return {
    devices,
    selectedDevice,
    loading,
    stats,
    runningCount,
    warningCount,
    criticalCount,
    regionStats,
    loadAllDevices,
    loadDevice,
    saveDevice,
    saveDevices,
    updateDeviceStatus,
    selectDevice
  }
})
