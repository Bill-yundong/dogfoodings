import { ref, computed, getCurrentInstance, onMounted } from 'vue'
import type { TopologySnapshot, CacheStrategy, StorageStats } from '@/types'
import { snapshotDB, pointCloudDB, initDB } from '@/utils/storage/indexedDB'

export function useIndexedDB() {
  const instance = getCurrentInstance()
  const snapshots = ref<TopologySnapshot[]>([])
  const isLoading = ref(false)
  const selectedSnapshotId = ref<string | null>(null)

  const storageStats = ref<StorageStats | null>(null)

  const cacheStrategy = ref<CacheStrategy>({
    maxStorageSize: 5 * 1024 * 1024 * 1024,
    autoCleanup: true,
    cleanupThreshold: 0.85,
    defaultExpiryDays: 7,
    preserveFavorites: true
  })

  const selectedSnapshot = computed(() =>
    snapshots.value.find(s => s.id === selectedSnapshotId.value) || null
  )

  const favoriteSnapshots = computed(() =>
    snapshots.value.filter(s => s.isFavorite)
  )

  const expiredSnapshots = computed(() => {
    const now = Date.now()
    return snapshots.value.filter(s => s.expiresAt && s.expiresAt < now)
  })

  async function initializeDB(): Promise<void> {
    await initDB()
    await loadSnapshots()
    await loadStorageStats()
  }

  async function loadSnapshots(filter?: SnapshotFilter): Promise<void> {
    isLoading.value = true
    try {
      const dbFilter: any = {}
      if (filter?.favoriteOnly) dbFilter.favoriteOnly = true
      if (filter?.dateFrom) dbFilter.dateFrom = filter.dateFrom
      if (filter?.dateTo) dbFilter.dateTo = filter.dateTo

      let result = await snapshotDB.getAll(dbFilter)

      if (filter?.search) {
        const search = filter.search.toLowerCase()
        result = result.filter(s =>
          s.name.toLowerCase().includes(search) ||
          s.description.toLowerCase().includes(search)
        )
      }

      if (filter?.pointCountRange) {
        const [min, max] = filter.pointCountRange
        result = result.filter(s =>
          s.pointCount >= min && s.pointCount <= max
        )
      }

      if (filter?.tags && filter.tags.length > 0) {
        result = result.filter(s =>
          filter.tags!.some(tag => s.tags.includes(tag))
        )
      }

      snapshots.value = result
    } catch (error) {
      console.error('加载快照失败:', error)
    } finally {
      isLoading.value = false
    }
  }

  async function loadStorageStats(): Promise<void> {
    try {
      storageStats.value = await snapshotDB.getStats()
    } catch (error) {
      console.error('加载存储统计失败:', error)
    }
  }

  async function getSnapshotById(id: string): Promise<TopologySnapshot | undefined> {
    return snapshotDB.getById(id)
  }

  async function createSnapshot(data: Omit<TopologySnapshot, 'id' | 'createdAt' | 'dataHash'>): Promise<string> {
    const now = Date.now()
    const snapshot: TopologySnapshot = {
      ...data,
      id: generateSnapshotId(),
      createdAt: now,
      dataHash: calculateHash(data.data.points)
    }

    const id = await snapshotDB.add(snapshot)
    await loadSnapshots()
    await loadStorageStats()

    return id
  }

  async function updateSnapshot(snapshot: TopologySnapshot): Promise<void> {
    await snapshotDB.update(snapshot)
    await loadSnapshots()
    await loadStorageStats()
  }

  async function toggleFavorite(snapshotId: string): Promise<void> {
    const snapshot = await snapshotDB.getById(snapshotId)
    if (!snapshot) return

    snapshot.isFavorite = !snapshot.isFavorite
    await snapshotDB.update(snapshot)
    await loadSnapshots()
  }

  async function updateSnapshotTags(snapshotId: string, tags: string[]): Promise<void> {
    const snapshot = await snapshotDB.getById(snapshotId)
    if (!snapshot) return

    snapshot.tags = tags
    await snapshotDB.update(snapshot)
    await loadSnapshots()
  }

  async function extendExpiry(snapshotId: string, days: number): Promise<void> {
    const snapshot = await snapshotDB.getById(snapshotId)
    if (!snapshot) return

    snapshot.expiresAt = Date.now() + days * 24 * 60 * 60 * 1000
    await snapshotDB.update(snapshot)
    await loadSnapshots()
  }

  async function deleteSnapshot(snapshotId: string): Promise<void> {
    await snapshotDB.delete(snapshotId)
    if (selectedSnapshotId.value === snapshotId) {
      selectedSnapshotId.value = null
    }
    await loadSnapshots()
    await loadStorageStats()
  }

  async function deleteExpiredSnapshots(): Promise<number> {
    const count = await snapshotDB.deleteExpired()
    if (count > 0) {
      await loadSnapshots()
      await loadStorageStats()
    }
    return count
  }

  async function runCleanup(): Promise<number> {
    const count = await snapshotDB.cleanup(cacheStrategy.value)
    if (count > 0) {
      await loadSnapshots()
      await loadStorageStats()
    }
    return count
  }

  async function clearAllSnapshots(): Promise<void> {
    for (const s of snapshots.value) {
      await snapshotDB.delete(s.id)
    }
    selectedSnapshotId.value = null
    await loadSnapshots()
    await loadStorageStats()
  }

  async function updateCacheStrategy(strategy: Partial<CacheStrategy>): Promise<void> {
    cacheStrategy.value = { ...cacheStrategy.value, ...strategy }
  }

  function selectSnapshot(snapshotId: string | null): void {
    selectedSnapshotId.value = snapshotId
  }

  function generateSnapshotId(): string {
    return 'snap_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
  }

  function calculateHash(buffer: ArrayBuffer): string {
    let hash = 0
    const view = new Uint8Array(buffer)
    for (let i = 0; i < Math.min(view.length, 10000); i++) {
      hash = ((hash << 5) - hash) + view[i]
      hash = hash & hash
    }
    return Math.abs(hash).toString(36) + '_' + Date.now().toString(36)
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
  }

  if (instance) {
    onMounted(() => {
      initializeDB()
    })
  }

  return {
    snapshots,
    isLoading,
    selectedSnapshotId,
    selectedSnapshot,
    storageStats,
    cacheStrategy,
    favoriteSnapshots,
    expiredSnapshots,
    initializeDB,
    loadSnapshots,
    loadStorageStats,
    getSnapshotById,
    createSnapshot,
    updateSnapshot,
    toggleFavorite,
    updateSnapshotTags,
    extendExpiry,
    deleteSnapshot,
    deleteExpiredSnapshots,
    runCleanup,
    clearAllSnapshots,
    updateCacheStrategy,
    selectSnapshot,
    formatBytes
  }
}
