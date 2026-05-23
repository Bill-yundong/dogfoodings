import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TopologySnapshot, CacheStrategy, StorageStats } from '@/types'
import { snapshotDB } from '@/utils/storage/indexedDB'

export const useSnapshotStore = defineStore('snapshot', () => {
  const snapshots = ref<TopologySnapshot[]>([])
  const currentSnapshot = ref<TopologySnapshot | null>(null)
  const storageStats = ref<StorageStats>({
    totalSize: 0,
    usedSize: 0,
    availableSize: 0,
    snapshotCount: 0,
    favoriteCount: 0,
    expiredCount: 0,
    largestSnapshots: []
  })
  const cacheStrategy = ref<CacheStrategy>({
    maxSnapshots: 50,
    maxAgeDays: 30,
    autoCleanup: true,
    compressionLevel: 6,
    cleanupThreshold: 0.8,
    preserveFavorites: true
  })
  const loading = ref(false)
  const error = ref<string | null>(null)

  const sortedSnapshots = computed(() => {
    return [...snapshots.value].sort((a, b) => b.createdAt - a.createdAt)
  })

  const usedSpacePercent = computed(() => {
    if (storageStats.value.totalSize === 0) return 0
    return (storageStats.value.usedSize / storageStats.value.totalSize) * 100
  })

  async function loadSnapshots() {
    loading.value = true
    error.value = null
    try {
      snapshots.value = await snapshotDB.getAll()
      await refreshStorageStats()
    } catch (e) {
      error.value = '加载快照列表失败'
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  async function loadSnapshot(id: string) {
    loading.value = true
    error.value = null
    try {
      const snapshot = await snapshotDB.getById(id)
      if (snapshot) {
        currentSnapshot.value = snapshot
        return snapshot
      }
    } catch (e) {
      error.value = '加载快照失败'
      console.error(e)
    } finally {
      loading.value = false
    }
    return null
  }

  async function createSnapshot(snapshot: TopologySnapshot) {
    try {
      await snapshotDB.add(snapshot)
      snapshots.value.unshift(snapshot)
      await refreshStorageStats()
      
      if (cacheStrategy.value.autoCleanup) {
        await performAutoCleanup()
      }
      
      return snapshot
    } catch (e) {
      error.value = '创建快照失败'
      console.error(e)
      return null
    }
  }

  async function removeSnapshot(id: string) {
    try {
      await snapshotDB.delete(id)
      snapshots.value = snapshots.value.filter(s => s.id !== id)
      if (currentSnapshot.value?.id === id) {
        currentSnapshot.value = null
      }
      await refreshStorageStats()
    } catch (e) {
      error.value = '删除快照失败'
      console.error(e)
    }
  }

  async function refreshStorageStats() {
    try {
      storageStats.value = await snapshotDB.getStats()
    } catch (e) {
      console.error('刷新存储统计失败', e)
    }
  }

  async function performAutoCleanup() {
    try {
      const deleted = await snapshotDB.cleanup(cacheStrategy.value)
      if (deleted > 0) {
        await loadSnapshots()
      }
      return deleted
    } catch (e) {
      console.error('自动清理失败', e)
      return 0
    }
  }

  async function clearOldSnapshotsByAge(ageDays: number) {
    try {
      const deleted = await snapshotDB.deleteExpired()
      await loadSnapshots()
      return deleted
    } catch (e) {
      error.value = '清理旧快照失败'
      console.error(e)
      return 0
    }
  }

  function updateCacheStrategy(strategy: Partial<CacheStrategy>) {
    cacheStrategy.value = { ...cacheStrategy.value, ...strategy }
  }

  async function exportSnapshot(id: string): Promise<Blob | null> {
    const snapshot = snapshots.value.find(s => s.id === id)
    if (!snapshot) return null

    try {
      const dataStr = JSON.stringify(snapshot, null, 2)
      return new Blob([dataStr], { type: 'application/json' })
    } catch (e) {
      error.value = '导出快照失败'
      console.error(e)
      return null
    }
  }

  async function importSnapshot(file: File): Promise<TopologySnapshot | null> {
    try {
      const text = await file.text()
      const snapshot = JSON.parse(text) as TopologySnapshot
      snapshot.id = `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      snapshot.createdAt = Date.now()
      
      await snapshotDB.add(snapshot)
      snapshots.value.unshift(snapshot)
      await refreshStorageStats()
      
      return snapshot
    } catch (e) {
      error.value = '导入快照失败'
      console.error(e)
      return null
    }
  }

  function clearCurrent() {
    currentSnapshot.value = null
  }

  function clearAll() {
    snapshots.value.forEach(s => snapshotDB.delete(s.id))
    snapshots.value = []
    currentSnapshot.value = null
    refreshStorageStats()
  }

  return {
    snapshots,
    currentSnapshot,
    storageStats,
    cacheStrategy,
    loading,
    error,
    sortedSnapshots,
    usedSpacePercent,
    loadSnapshots,
    loadSnapshot,
    createSnapshot,
    removeSnapshot,
    refreshStorageStats,
    performAutoCleanup,
    clearOldSnapshotsByAge,
    updateCacheStrategy,
    exportSnapshot,
    importSnapshot,
    clearCurrent,
    clearAll
  }
})
