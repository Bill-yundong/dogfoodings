import { get, set, del, keys, entries } from 'idb-keyval'

const STORES = {
  focus_samples: "focusflow:focus_samples",
  focus_sessions: "focusflow:focus_sessions",
  tasks: "focusflow:tasks",
  efficiency_records: "focusflow:efficiency_records",
  optimization_weights: "focusflow:optimization_weights",
  allocations: "focusflow:allocations",
} as const

export async function saveFocusSamples(samples: Array<{ timestamp: number; value: number; type: string }>) {
  await set(STORES.focus_samples, samples)
}

export async function loadFocusSamples() {
  return await get<Array<{ timestamp: number; value: number; type: string }>>(STORES.focus_samples) ?? []
}

export async function saveFocusSession(session: Record<string, unknown>) {
  const sessions = await loadFocusSessions()
  sessions.push(session)
  await set(STORES.focus_sessions, sessions)
}

export async function loadFocusSessions() {
  return await get<Array<Record<string, unknown>>>(STORES.focus_sessions) ?? []
}

export async function saveTasks(tasks: Array<Record<string, unknown>>) {
  await set(STORES.tasks, tasks)
}

export async function loadTasks() {
  return await get<Array<Record<string, unknown>>>(STORES.tasks) ?? []
}

export async function saveEfficiencyRecords(records: Array<Record<string, unknown>>) {
  await set(STORES.efficiency_records, records)
}

export async function loadEfficiencyRecords() {
  return await get<Array<Record<string, unknown>>>(STORES.efficiency_records) ?? []
}

export async function saveOptimizationWeights(weights: Record<string, number>) {
  await set(STORES.optimization_weights, weights)
}

export async function loadOptimizationWeights() {
  return await get<Record<string, number>>(STORES.optimization_weights)
}

export async function saveAllocations(allocations: Array<Record<string, unknown>>) {
  await set(STORES.allocations, allocations)
}

export async function loadAllocations() {
  return await get<Array<Record<string, unknown>>>(STORES.allocations) ?? []
}

export async function clearAllData() {
  for (const key of Object.values(STORES)) {
    await del(key)
  }
}

export async function exportAllData() {
  const allEntries = await entries()
  return Object.fromEntries(allEntries)
}
