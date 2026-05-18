import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { HealthSnapshot } from '@/types'
import { getSnapshotsByDevice, addSnapshot, getLatestSnapshot, getSnapshotsByTimeRange, getSnapshotCount } from '@/database/snapshotStore'

export const useSnapshotStore = defineStore('snapshot', () => {
  const snapshots = ref<HealthSnapshot[]>([])
  const currentSnapshot = ref<HealthSnapshot | null>(null)
  const loading = ref(false)
  const totalCount = ref(0)

  async function loadSnapshots(deviceId: string, limit?: number, offset?: number) {
    loading.value = true
    try {
      snapshots.value = await getSnapshotsByDevice(deviceId, limit, offset)
      totalCount.value = await getSnapshotCount(deviceId)
    } finally {
      loading.value = false
    }
  }

  async function loadLatestSnapshot(deviceId: string) {
    currentSnapshot.value = await getLatestSnapshot(deviceId) || null
  }

  async function loadSnapshotsByTimeRange(deviceId: string, startTime: number, endTime: number) {
    loading.value = true
    try {
      snapshots.value = await getSnapshotsByTimeRange(deviceId, startTime, endTime)
    } finally {
      loading.value = false
    }
  }

  async function saveSnapshot(snapshot: HealthSnapshot) {
    await addSnapshot(snapshot)
  }

  function selectSnapshot(snapshot: HealthSnapshot | null) {
    currentSnapshot.value = snapshot
  }

  return {
    snapshots,
    currentSnapshot,
    loading,
    totalCount,
    loadSnapshots,
    loadLatestSnapshot,
    loadSnapshotsByTimeRange,
    saveSnapshot,
    selectSnapshot
  }
})
