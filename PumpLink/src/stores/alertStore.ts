import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Alert, AlertSeverity } from '@/types'
import { getAlerts, addAlert, updateAlertStatus, getUnacknowledgedCount } from '@/database/alertStore'

export const useAlertStore = defineStore('alert', () => {
  const alerts = ref<Alert[]>([])
  const loading = ref(false)
  const filters = ref<{
    severity?: AlertSeverity
    status?: Alert['status']
  }>({})

  const unacknowledgedCount = ref(0)

  const criticalAlerts = computed(() => alerts.value.filter(a => a.severity === 'critical' || a.severity === 'error'))
  const pendingAlerts = computed(() => alerts.value.filter(a => a.status === 'pending'))

  async function loadAlerts(limit?: number) {
    loading.value = true
    try {
      alerts.value = await getAlerts(filters.value, limit)
      await refreshUnacknowledgedCount()
    } finally {
      loading.value = false
    }
  }

  async function refreshUnacknowledgedCount() {
    unacknowledgedCount.value = await getUnacknowledgedCount()
  }

  async function createAlert(alert: Omit<Alert, 'id' | 'timestamp'>) {
    const newAlert: Alert = {
      ...alert,
      id: `alert-${Date.now()}`,
      timestamp: Date.now()
    }
    await addAlert(newAlert)
    await loadAlerts()
  }

  async function acknowledgeAlert(id: string, acknowledgedBy: string) {
    await updateAlertStatus(id, 'acknowledged', acknowledgedBy)
    await loadAlerts()
  }

  async function resolveAlert(id: string) {
    await updateAlertStatus(id, 'resolved')
    await loadAlerts()
  }

  function setFilters(newFilters: typeof filters.value) {
    filters.value = newFilters
  }

  return {
    alerts,
    loading,
    filters,
    unacknowledgedCount,
    criticalAlerts,
    pendingAlerts,
    loadAlerts,
    refreshUnacknowledgedCount,
    createAlert,
    acknowledgeAlert,
    resolveAlert,
    setFilters
  }
})
