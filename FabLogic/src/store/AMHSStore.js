import { writable, derived, get } from 'svelte/store'
import { OHT } from '../models/OHT.js'
import { Wafer } from '../models/Wafer.js'
import { Task } from '../models/Task.js'
import { RoadNetwork } from '../models/RoadNetwork.js'
import { PathOptimizer } from '../engine/PathOptimizer.js'
import { MultiAgentCoordinator } from '../engine/MultiAgentCoordinator.js'
import { SemanticSynchronizer } from '../sync/SemanticSync.js'
import { db } from '../db/IndexedDB.js'
import { OHTStatus, TaskStatus, NodeType } from '../types/amhs.js'

export const ohts = writable(new Map())
export const wafers = writable(new Map())
export const tasks = writable(new Map())
export const roadNetwork = writable(null)
export const pathOptimizer = writable(null)
export const coordinator = writable(null)
export const synchronizer = writable(null)
export const isInitialized = writable(false)
export const isSimulating = writable(false)
export const simulationSpeed = writable(1)
export const alerts = writable([])
export const stats = writable({
  totalOHTs: 0,
  activeOHTs: 0,
  idleOHTs: 0,
  pendingTasks: 0,
  completedTasks: 0,
  avgDeliveryTime: 0
})

let simulationInterval = null

function _addAlert(type, message) {
  const alert = {
    id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    type,
    message,
    timestamp: Date.now()
  }
  alerts.update(list => [alert, ...list].slice(0, 50))
}

function _generateSampleNetwork(network) {
  for (let i = 1; i <= 8; i++) {
    network.addNode({
      id: `LP-${i}`,
      type: NodeType.LOAD_PORT,
      x: 100 + (i - 1) * 80,
      y: 50,
      z: 3,
      name: `Load Port ${i}`,
      equipmentId: `EQP-${String(i).padStart(3, '0')}`
    })
  }

  for (let i = 1; i <= 4; i++) {
    network.addNode({
      id: `STORAGE-${i}`,
      type: NodeType.STORAGE,
      x: 150 + (i - 1) * 200,
      y: 400,
      z: 3,
      name: `Storage ${i}`,
      capacity: 50
    })
  }

  for (let i = 1; i <= 12; i++) {
    network.addNode({
      id: `INT-${i}`,
      type: NodeType.INTERSECTION,
      x: 100 + ((i - 1) % 6) * 100,
      y: 150 + Math.floor((i - 1) / 6) * 100,
      z: 3,
      name: `Intersection ${i}`
    })
  }

  for (let i = 1; i <= 4; i++) {
    network.addNode({
      id: `PARK-${i}`,
      type: NodeType.PARKING,
      x: 50 + (i - 1) * 180,
      y: 500,
      z: 3,
      name: `Parking ${i}`
    })
  }

  for (let i = 1; i <= 8; i++) {
    network.addEdge({ from: `LP-${i}`, to: `INT-${((i - 1) % 6) + 1}` })
  }

  for (let i = 1; i <= 6; i++) {
    network.addEdge({ from: `INT-${i}`, to: `INT-${i + 6}` })
  }

  for (let i = 1; i <= 4; i++) {
    network.addEdge({ from: `INT-${i + 6}`, to: `STORAGE-${i}` })
  }

  for (let i = 1; i <= 4; i++) {
    network.addEdge({ from: `INT-${i + 6}`, to: `PARK-${i}` })
  }

  for (let i = 1; i < 6; i++) {
    network.addEdge({ from: `INT-${i}`, to: `INT-${i + 1}` })
  }
  for (let i = 7; i < 12; i++) {
    network.addEdge({ from: `INT-${i}`, to: `INT-${i + 1}` })
  }
}

function _setupCoordinatorEvents(coord) {
  coord.on('task:assigned', ({ task, oht, path }) => {
    tasks.update(map => {
      map.set(task.id, task)
      return new Map(map)
    })
    ohts.update(map => {
      map.set(oht.id, oht)
      return new Map(map)
    })
    _addAlert('info', `任务 ${task.id} 已分配给 ${oht.name}`)
  })

  coord.on('task:completed', (task) => {
    tasks.update(map => {
      map.set(task.id, task)
      return new Map(map)
    })
    wafers.update(map => {
      const wafer = map.get(task.waferId)
      if (wafer) {
        wafer.processStep++
        wafer.updateStatus(wafer.processStep >= wafer.totalSteps ? 'completed' : 'waiting', task.targetNode)
        map.set(wafer.id, wafer)
      }
      return new Map(map)
    })
    _addAlert('success', `任务 ${task.id} 已完成`)
  })

  coord.on('task:failed', ({ task, reason }) => {
    _addAlert('error', `任务 ${task.id} 失败: ${reason}`)
  })

  coord.on('oht:updated', (oht) => {
    ohts.update(map => {
      map.set(oht.id, oht)
      return new Map(map)
    })
  })

  coord.on('conflict:resolved', ({ conflict, delayedTask }) => {
    _addAlert('warning', `检测到冲突，任务 ${delayedTask} 延迟处理`)
  })
}

function _updateStats() {
  const ohtMap = get(ohts)
  const taskMap = get(tasks)

  const ohtArray = Array.from(ohtMap.values())
  const taskArray = Array.from(taskMap.values())
  const completedTasks = taskArray.filter(t => t.status === TaskStatus.COMPLETED)

  const avgDeliveryTime = completedTasks.length > 0
    ? completedTasks.reduce((sum, t) => sum + (t.actualDuration || 0), 0) / completedTasks.length
    : 0

  stats.set({
    totalOHTs: ohtArray.length,
    activeOHTs: ohtArray.filter(o => o.status === OHTStatus.MOVING).length,
    idleOHTs: ohtArray.filter(o => o.status === OHTStatus.IDLE).length,
    errorOHTs: ohtArray.filter(o => o.status === OHTStatus.ERROR).length,
    pendingTasks: taskArray.filter(t => t.status === TaskStatus.PENDING).length,
    completedTasks: completedTasks.length,
    failedTasks: taskArray.filter(t => t.status === TaskStatus.FAILED).length,
    avgDeliveryTime: Math.round(avgDeliveryTime / 1000)
  })
}

export async function init(config = {}) {
  await db.init()

  const network = new RoadNetwork({
    id: 'fab-main',
    name: 'Fab Main Network',
    tileSize: 100
  })
  _generateSampleNetwork(network)
  roadNetwork.set(network)

  const optimizer = new PathOptimizer(network)
  pathOptimizer.set(optimizer)

  const coord = new MultiAgentCoordinator(optimizer)
  coordinator.set(coord)

  const sync = new SemanticSynchronizer({ syncInterval: 3000 })
  synchronizer.set(sync)

  const ohtCount = config.ohtCount || 8
  const sampleOHTs = new Map()
  for (let i = 0; i < ohtCount; i++) {
    const oht = new OHT({
      id: `OHT-${String(i + 1).padStart(3, '0')}`,
      name: `OHT ${i + 1}`,
      status: OHTStatus.IDLE,
      currentNode: `PARK-${i % 4 + 1}`,
      position: { x: 100 + (i % 4) * 150, y: 100 + Math.floor(i / 4) * 200, z: 3 }
    })
    sampleOHTs.set(oht.id, oht)
    coord.registerOHT(oht)
  }
  ohts.set(sampleOHTs)

  const waferCount = config.waferCount || 20
  const sampleWafers = new Map()
  const loadPorts = network.getNodesByType(NodeType.LOAD_PORT)
  for (let i = 0; i < waferCount; i++) {
    const wafer = new Wafer({
      id: `WFR-${String(i + 1).padStart(4, '0')}`,
      lotId: `LOT-${String(Math.floor(i / 5) + 1).padStart(3, '0')}`,
      productType: ['Logic', 'Memory', 'RF'][i % 3],
      currentLocation: loadPorts[i % loadPorts.length].id,
      priority: Math.floor(Math.random() * 3) + 1,
      processStep: 0,
      totalSteps: 5 + Math.floor(Math.random() * 10)
    })
    sampleWafers.set(wafer.id, wafer)
  }
  wafers.set(sampleWafers)

  tasks.set(new Map())

  _setupCoordinatorEvents(coord)
  sync.start()

  isInitialized.set(true)
}

export function createTransportTask(waferId, sourceNode, targetNode, priority = 1) {
  const task = new Task({
    type: 'transport',
    waferId,
    sourceNode,
    targetNode,
    priority
  })

  tasks.update(map => {
    map.set(task.id, task)
    return new Map(map)
  })

  const coord = get(coordinator)
  if (coord) {
    coord.submitTask(task)
  }

  return task
}

export function generateRandomTasks(count = 5) {
  const waferMap = get(wafers)
  const waferList = Array.from(waferMap.values()).filter(w => w.status !== 'completed')
  const network = get(roadNetwork)
  const loadPorts = network.getNodesByType(NodeType.LOAD_PORT)
  const storages = network.getNodesByType(NodeType.STORAGE)
  const allDestinations = [...loadPorts, ...storages]

  for (let i = 0; i < count && i < waferList.length; i++) {
    const wafer = waferList[i]
    const source = wafer.currentLocation
    let target = allDestinations[Math.floor(Math.random() * allDestinations.length)].id

    while (target === source) {
      target = allDestinations[Math.floor(Math.random() * allDestinations.length)].id
    }

    createTransportTask(wafer.id, source, target, wafer.priority)
  }
}

export function startSimulation() {
  if (simulationInterval) return

  const coord = get(coordinator)
  if (coord) coord.start()

  isSimulating.set(true)

  simulationInterval = setInterval(() => {
    const speed = get(simulationSpeed)
    const ohtMap = get(ohts)
    const network = get(roadNetwork)
    const coord = get(coordinator)

    if (!network || !coord) return

    ohtMap.forEach(oht => {
      if (oht.status === OHTStatus.MOVING && oht.currentPath.length > 0) {
        const currentIdx = oht.pathIndex
        const nextIdx = Math.min(currentIdx + 1, oht.currentPath.length - 1)
        const currentNodeId = oht.currentPath[currentIdx]
        const nextNodeId = oht.currentPath[nextIdx]

        const currentNode = network.getNode(currentNodeId)
        const nextNode = network.getNode(nextNodeId)

        if (currentNode && nextNode) {
          const progress = Math.min(1, 0.1 * speed)
          const newX = currentNode.x + (nextNode.x - currentNode.x) * progress
          const newY = currentNode.y + (nextNode.y - currentNode.y) * progress

          oht.updatePosition(newX, newY, currentNode.z || 3)

          if (Math.random() < 0.05 * speed) {
            oht.pathIndex = nextIdx
            oht.currentNode = nextNodeId

            if (nextIdx >= oht.currentPath.length - 1) {
              const taskId = oht.currentTaskId
              coord.completeTask(taskId)
            }
          }
        }
      }
    })

    ohts.set(new Map(ohtMap))
    _updateStats()

    if (Math.random() < 0.02 * speed) {
      generateRandomTasks(1)
    }
  }, 100)
}

export function stopSimulation() {
  if (simulationInterval) {
    clearInterval(simulationInterval)
    simulationInterval = null
  }
  const coord = get(coordinator)
  if (coord) coord.stop()
  isSimulating.set(false)
}

export function setSimulationSpeed(speed) {
  simulationSpeed.set(Math.max(0.1, Math.min(10, speed)))
}

export function clearAlerts() {
  alerts.set([])
}

export async function reset() {
  stopSimulation()
  ohts.set(new Map())
  wafers.set(new Map())
  tasks.set(new Map())
  alerts.set([])
  isInitialized.set(false)
  await db.clearAll()
}
