import { ref, onMounted } from 'vue'
import type { Tank, Chemical } from '@/types/tank'
import type { WeatherRecord, SimulationRecord } from '@/types/simulation'
import type { EmergencyTerminal, Shelter, ResourceUnit, EvacuationTask } from '@/types/terminal'
import {
  initDB,
  getAllTanks,
  saveTank,
  deleteTank,
  getAllChemicals,
  saveChemical,
  getAllTerminals,
  saveTerminal,
  updateTerminalStatus,
  getAllShelters,
  saveShelter,
  getAllResources,
  saveResource,
  getAllEvacuationTasks,
  saveEvacuationTask,
  clearAllData
} from '@/utils/db'

export function useIndexedDB() {
  const isReady = ref(false)
  const tanks = ref<Tank[]>([])
  const chemicals = ref<Chemical[]>([])
  const terminals = ref<EmergencyTerminal[]>([])
  const shelters = ref<Shelter[]>([])
  const resources = ref<ResourceUnit[]>([])
  const evacuationTasks = ref<EvacuationTask[]>([])
  const weatherRecords = ref<WeatherRecord[]>([])
  const simulationRecords = ref<SimulationRecord[]>([])
  const isLoading = ref(false)

  async function initialize() {
    try {
      await initDB()
      isReady.value = true
      await loadAllData()
    } catch (error) {
      console.error('Failed to initialize IndexedDB:', error)
    }
  }

  async function loadAllData() {
    isLoading.value = true
    try {
      tanks.value = await getAllTanks()
      chemicals.value = await getAllChemicals()
      terminals.value = await getAllTerminals()
      shelters.value = await getAllShelters()
      resources.value = await getAllResources()
      evacuationTasks.value = await getAllEvacuationTasks()
    } finally {
      isLoading.value = false
    }
  }

  async function addTank(tank: Tank) {
    await saveTank(tank)
    await loadTanks()
  }

  async function removeTank(id: string) {
    await deleteTank(id)
    await loadTanks()
  }

  async function loadTanks() {
    tanks.value = await getAllTanks()
  }

  async function addChemical(chemical: Chemical) {
    await saveChemical(chemical)
    chemicals.value = await getAllChemicals()
  }

  async function addTerminal(terminal: EmergencyTerminal) {
    await saveTerminal(terminal)
    terminals.value = await getAllTerminals()
  }

  async function updateTerminal(id: string, alertLevel: string, evacuationStatus: string) {
    await updateTerminalStatus(id, alertLevel, evacuationStatus)
    terminals.value = await getAllTerminals()
  }

  async function addShelter(shelter: Shelter) {
    await saveShelter(shelter)
    shelters.value = await getAllShelters()
  }

  async function addResource(resource: ResourceUnit) {
    await saveResource(resource)
    resources.value = await getAllResources()
  }

  async function addEvacuationTask(task: EvacuationTask) {
    await saveEvacuationTask(task)
    evacuationTasks.value = await getAllEvacuationTasks()
  }

  async function clearData() {
    await clearAllData()
    await loadAllData()
  }

  onMounted(() => {
    initialize()
  })

  return {
    isReady,
    isLoading,
    tanks,
    chemicals,
    terminals,
    shelters,
    resources,
    evacuationTasks,
    weatherRecords,
    simulationRecords,
    initialize,
    loadAllData,
    addTank,
    removeTank,
    addChemical,
    addTerminal,
    updateTerminal,
    addShelter,
    addResource,
    addEvacuationTask,
    clearData
  }
}
