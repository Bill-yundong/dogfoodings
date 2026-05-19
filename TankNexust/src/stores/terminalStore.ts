import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { EmergencyTerminal, Shelter, ResourceUnit, EvacuationTask } from '@/types/terminal'
import { nanoid } from 'nanoid'

export const useTerminalStore = defineStore('terminal', () => {
  const terminals = ref<EmergencyTerminal[]>([
    {
      id: 'term-001',
      name: 'A厂区',
      type: 'enterprise',
      position: { x: 300, y: -100 },
      population: 250,
      alertLevel: 'normal',
      evacuationStatus: 'idle'
    },
    {
      id: 'term-002',
      name: 'B厂区',
      type: 'enterprise',
      position: { x: 200, y: 200 },
      population: 180,
      alertLevel: 'normal',
      evacuationStatus: 'idle'
    },
    {
      id: 'term-003',
      name: '阳光社区',
      type: 'residential',
      position: { x: -300, y: -200 },
      population: 500,
      alertLevel: 'normal',
      evacuationStatus: 'idle'
    },
    {
      id: 'term-004',
      name: '园区小学',
      type: 'school',
      position: { x: -250, y: 100 },
      population: 800,
      alertLevel: 'normal',
      evacuationStatus: 'idle'
    },
    {
      id: 'term-005',
      name: '化工医院',
      type: 'hospital',
      position: { x: 400, y: 150 },
      population: 300,
      alertLevel: 'normal',
      evacuationStatus: 'idle'
    }
  ])

  const shelters = ref<Shelter[]>([
    {
      id: 'shelter-001',
      name: '北区避难所',
      position: { x: -500, y: -400 },
      capacity: 2000,
      currentOccupancy: 0,
      type: 'permanent',
      facilities: ['医疗', '通讯', '物资', '电力'],
      status: 'available'
    },
    {
      id: 'shelter-002',
      name: '南区避难所',
      position: { x: 500, y: -300 },
      capacity: 1500,
      currentOccupancy: 0,
      type: 'permanent',
      facilities: ['医疗', '通讯', '物资'],
      status: 'available'
    },
    {
      id: 'shelter-003',
      name: '东区临时安置点',
      position: { x: 0, y: 400 },
      capacity: 800,
      currentOccupancy: 0,
      type: 'temporary',
      facilities: ['通讯', '物资'],
      status: 'available'
    }
  ])

  const resources = ref<ResourceUnit[]>([
    {
      id: 'res-001',
      name: '消防一队',
      type: 'fire-truck',
      position: { x: -100, y: -300 },
      status: 'standby',
      personnel: 12,
      equipment: ['消防车', '云梯', '呼吸器']
    },
    {
      id: 'res-002',
      name: '消防二队',
      type: 'fire-truck',
      position: { x: 300, y: -200 },
      status: 'standby',
      personnel: 10,
      equipment: ['消防车', '防化服', '呼吸器']
    },
    {
      id: 'res-003',
      name: '医疗急救队',
      type: 'ambulance',
      position: { x: 100, y: -350 },
      status: 'standby',
      personnel: 8,
      equipment: ['救护车', '急救箱', '防毒面具']
    },
    {
      id: 'res-004',
      name: '危化品处置队',
      type: 'hazardous-material',
      position: { x: -200, y: -250 },
      status: 'standby',
      personnel: 15,
      equipment: ['防化车', '检测仪', '堵漏器材']
    },
    {
      id: 'res-005',
      name: '派出所',
      type: 'police',
      position: { x: 400, y: -400 },
      status: 'standby',
      personnel: 20,
      equipment: ['警车', '通讯设备']
    }
  ])

  const evacuationTasks = ref<EvacuationTask[]>([])

  const alertingTerminals = computed(() => {
    return terminals.value.filter(t => t.alertLevel !== 'normal')
  })

  const evacuatingTerminals = computed(() => {
    return terminals.value.filter(t => t.evacuationStatus !== 'idle')
  })

  const availableResources = computed(() => {
    return resources.value.filter(r => r.status === 'standby')
  })

  function updateTerminalAlert(id: string, alertLevel: EmergencyTerminal['alertLevel']) {
    const terminal = terminals.value.find(t => t.id === id)
    if (terminal) {
      terminal.alertLevel = alertLevel
      if (alertLevel === 'evacuate') {
        terminal.receivedTime = Date.now()
      }
    }
  }

  function updateTerminalEvacuationStatus(id: string, status: EmergencyTerminal['evacuationStatus']) {
    const terminal = terminals.value.find(t => t.id === id)
    if (terminal) {
      terminal.evacuationStatus = status
      if (status === 'completed') {
        terminal.completedTime = Date.now()
      }
    }
  }

  function setTerminalEvacuationRoute(id: string, route: any[]) {
    const terminal = terminals.value.find(t => t.id === id)
    if (terminal) {
      terminal.evacuationRoute = route
    }
  }

  function createEvacuationTask(terminalId: string, shelterId: string) {
    const terminal = terminals.value.find(t => t.id === terminalId)
    if (!terminal) return null

    const task: EvacuationTask = {
      id: `task-${nanoid(8)}`,
      terminalId,
      terminalName: terminal.name,
      startTime: Date.now(),
      status: 'pending',
      populationCount: terminal.population,
      shelterId,
      assignedResources: [],
      progress: 0
    }

    evacuationTasks.value.unshift(task)
    return task
  }

  function updateTaskProgress(taskId: string, progress: number) {
    const task = evacuationTasks.value.find(t => t.id === taskId)
    if (task) {
      task.progress = Math.min(100, Math.max(0, progress))
      if (progress >= 100) {
        task.status = 'completed'
        task.actualCompletionTime = Date.now()
      }
    }
  }

  function assignResourceToTask(taskId: string, resourceId: string) {
    const task = evacuationTasks.value.find(t => t.id === taskId)
    const resource = resources.value.find(r => r.id === resourceId)

    if (task && resource && !task.assignedResources.includes(resourceId)) {
      task.assignedResources.push(resourceId)
      resource.status = 'deployed'
      resource.currentTaskId = taskId
    }
  }

  function releaseResource(resourceId: string) {
    const resource = resources.value.find(r => r.id === resourceId)
    if (resource) {
      resource.status = 'returning'
      resource.currentTaskId = undefined
      setTimeout(() => {
        resource.status = 'standby'
      }, 5000)
    }
  }

  function updateShelterOccupancy(shelterId: string, count: number) {
    const shelter = shelters.value.find(s => s.id === shelterId)
    if (shelter) {
      shelter.currentOccupancy = Math.min(shelter.capacity, Math.max(0, count))
      if (shelter.currentOccupancy >= shelter.capacity) {
        shelter.status = 'full'
      } else {
        shelter.status = 'available'
      }
    }
  }

  function resetAllAlerts() {
    terminals.value.forEach(t => {
      t.alertLevel = 'normal'
      t.evacuationStatus = 'idle'
      t.receivedTime = undefined
      t.completedTime = undefined
      t.evacuationRoute = undefined
    })

    resources.value.forEach(r => {
      r.status = 'standby'
      r.currentTaskId = undefined
    })

    shelters.value.forEach(s => {
      s.currentOccupancy = 0
      s.status = 'available'
    })

    evacuationTasks.value = []
  }

  return {
    terminals,
    shelters,
    resources,
    evacuationTasks,
    alertingTerminals,
    evacuatingTerminals,
    availableResources,
    updateTerminalAlert,
    updateTerminalEvacuationStatus,
    setTerminalEvacuationRoute,
    createEvacuationTask,
    updateTaskProgress,
    assignResourceToTask,
    releaseResource,
    updateShelterOccupancy,
    resetAllAlerts
  }
})
