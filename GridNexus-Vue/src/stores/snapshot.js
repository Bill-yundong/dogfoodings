import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import snapshotBus from '@/utils/snapshotBus'
import { generateHistoricalSnapshots } from '@/utils/mockData'

export const useSnapshotStore = defineStore('snapshot', () => {
  const snapshots = ref([])
  const currentSnapshot = ref(null)
  const isLoading = ref(false)
  const totalCount = ref(0)
  const searchParams = ref({
    startTime: null,
    endTime: null,
    substationId: null,
    type: null,
    limit: 50,
    offset: 0
  })

  const latestSnapshot = computed(() => {
    return snapshots.value[0] || null
  })

  async function init() {
    await snapshotBus.init()
    
    const existing = await snapshotBus.getSnapshots({ limit: 1 })
    if (existing.length === 0) {
      const mockSnapshots = generateHistoricalSnapshots(7)
      for (const snap of mockSnapshots) {
        await snapshotBus.saveSnapshot(snap)
      }
    }
    
    await loadSnapshots()
  }

  async function loadSnapshots(params = {}) {
    isLoading.value = true
    try {
      Object.assign(searchParams.value, params)
      snapshots.value = await snapshotBus.getSnapshots(searchParams.value)
      totalCount.value = snapshots.value.length
    } finally {
      isLoading.value = false
    }
  }

  async function getSnapshotById(id) {
    isLoading.value = true
    try {
      currentSnapshot.value = await snapshotBus.getSnapshot(id)
      return currentSnapshot.value
    } finally {
      isLoading.value = false
    }
  }

  async function saveSnapshot(data) {
    const id = await snapshotBus.saveSnapshot(data)
    await loadSnapshots()
    return id
  }

  async function deleteSnapshot(id) {
    await snapshotBus.deleteSnapshot(id)
    await loadSnapshots()
  }

  async function getLatestForSubstation(substationId) {
    return snapshotBus.getLatestSnapshot(substationId)
  }

  async function getLoadTrend(substationId, hours = 24) {
    const endTime = Date.now()
    const startTime = endTime - hours * 3600 * 1000
    
    const data = await snapshotBus.getSnapshots({
      startTime,
      endTime,
      substationId,
      type: 'load_snapshot',
      limit: 1000
    })

    return data.map(s => ({
      timestamp: s.timestamp,
      time: new Date(s.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      load: s.data?.load || 0,
      capacity: s.data?.capacity || 0,
      ratio: s.data?.ratio || 0
    }))
  }

  async function clearOldSnapshots(retentionDays = 90) {
    await snapshotBus.clearOldSnapshots(retentionDays)
    await loadSnapshots()
  }

  function on(event, callback) {
    snapshotBus.on(event, callback)
  }

  function off(event, callback) {
    snapshotBus.off(event, callback)
  }

  return {
    snapshots,
    currentSnapshot,
    isLoading,
    totalCount,
    searchParams,
    latestSnapshot,
    init,
    loadSnapshots,
    getSnapshotById,
    saveSnapshot,
    deleteSnapshot,
    getLatestForSubstation,
    getLoadTrend,
    clearOldSnapshots,
    on,
    off
  }
})
