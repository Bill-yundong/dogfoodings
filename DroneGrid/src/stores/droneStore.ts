import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DroneState, Mission, PathOptimizationResult, AirspaceZone } from '@/types'
import { WeatherDynamics } from '@/core/WeatherDynamics'
import { MultiAgentPathOptimizer } from '@/core/MultiAgentPathOptimizer'
import { BlackBoxDatabase } from '@/core/BlackBoxDatabase'
import { SemanticSyncManager } from '@/core/SemanticSyncManager'
import { TrajectoryBase } from '@/core/TrajectoryBase'
import { generateId, vectorToGPS, vectorLerp, vectorDistance, vectorNormalize, vectorSub } from '@/utils/math'

export const useDroneStore = defineStore('drone', () => {
  const drones = ref<Map<string, DroneState>>(new Map())
  const missions = ref<Map<string, Mission>>(new Map())
  const airspaceZones = ref<AirspaceZone[]>([])
  const optimizationResults = ref<Map<string, PathOptimizationResult>>(new Map())

  const weatherDynamics = new WeatherDynamics(30, 15)
  const pathOptimizer = new MultiAgentPathOptimizer(weatherDynamics)
  const blackBoxDB = new BlackBoxDatabase()
  const semanticSync = new SemanticSyncManager()
  const trajectoryBase = new TrajectoryBase()

  const isInitialized = ref(false)
  const isSimulating = ref(false)
  const simulationSpeed = ref(1)
  const lastUpdateTime = ref(0)

  const droneList = computed(() => Array.from(drones.value.values()))
  const missionList = computed(() => Array.from(missions.value.values()))
  const activeDrones = computed(() => droneList.value.filter(d => d.status === 'flying'))

  async function init() {
    if (isInitialized.value) return
    
    await blackBoxDB.init()
    pathOptimizer.setAirspaceZones(airspaceZones.value)
    isInitialized.value = true
  }

  function addDrone(drone: Partial<DroneState> & { id: string }): DroneState {
    const defaultState: DroneState = {
      id: drone.id,
      position: { x: 0, y: 50, z: 0 },
      gps: { latitude: 39.9, longitude: 116.4, altitude: 50 },
      velocity: { x: 0, y: 0, z: 0 },
      acceleration: { x: 0, y: 0, z: 0 },
      battery: 100,
      status: 'idle',
      currentMission: null,
      heading: 0,
      altitude: 50
    }

    const newDrone = { ...defaultState, ...drone }
    drones.value.set(drone.id, newDrone)
    pathOptimizer.registerAgent(drone.id, newDrone)
    
    return newDrone
  }

  function removeDrone(droneId: string) {
    drones.value.delete(droneId)
    pathOptimizer.unregisterAgent(droneId)
    trajectoryBase.clearDroneData(droneId)
  }

  function addMission(mission: Omit<Mission, 'id' | 'status' | 'estimatedEnergy' | 'estimatedDuration'>): Mission {
    const id = generateId()
    const newMission: Mission = {
      ...mission,
      id,
      status: 'pending',
      estimatedEnergy: 0,
      estimatedDuration: 0
    }
    missions.value.set(id, newMission)
    return newMission
  }

  async function optimizeMissionPath(missionId: string, onProgress?: (progress: number) => void): Promise<PathOptimizationResult | null> {
    const mission = missions.value.get(missionId)
    const drone = drones.value.get(mission?.droneId || '')
    
    if (!mission || !drone) return null

    const result = await pathOptimizer.optimizePathAsync(mission, drone.position, onProgress)
    optimizationResults.value.set(missionId, result)
    
    mission.estimatedEnergy = result.estimatedEnergy
    mission.estimatedDuration = result.estimatedDuration
    
    return result
  }

  async function startMission(missionId: string): Promise<boolean> {
    const mission = missions.value.get(missionId)
    const drone = drones.value.get(mission?.droneId || '')
    
    if (!mission || !drone || drone.status !== 'idle') return false

    if (!optimizationResults.value.has(missionId)) {
      await optimizeMissionPath(missionId)
    }

    mission.status = 'in_progress'
    mission.startTime = Date.now()
    
    drone.status = 'flying'
    drone.currentMission = missionId
    
    trajectoryBase.startTrajectory(drone.id, missionId)
    
    const message = semanticSync.createMissionMessage('terminal', mission, 'create')
    semanticSync.send(message)

    return true
  }

  function updateDroneState(droneId: string, updates: Partial<DroneState>) {
    const drone = drones.value.get(droneId)
    if (!drone) return

    Object.assign(drone, updates)
    pathOptimizer.updateAgentState(droneId, drone)

    if (drone.status === 'flying') {
      trajectoryBase.addTrajectoryPoint(droneId, drone)
      
      const wind = weatherDynamics.getWindAt(drone.position)
      const log = trajectoryBase.generateBlackBoxLog(
        droneId,
        drone,
        wind,
        [0.5, 0.5, 0.5, 0.5]
      )
      blackBoxDB.addLog(log)
    }

    const message = semanticSync.createDroneStateMessage('terminal', drone)
    semanticSync.send(message)
  }

  function completeMission(missionId: string) {
    const mission = missions.value.get(missionId)
    const drone = drones.value.get(mission?.droneId || '')
    
    if (!mission || !drone) return

    mission.status = 'completed'
    mission.endTime = Date.now()
    
    drone.status = 'idle'
    drone.currentMission = null
    drone.velocity = { x: 0, y: 0, z: 0 }
    
    trajectoryBase.endTrajectory(drone.id)
    
    const message = semanticSync.createMissionMessage('terminal', mission, 'complete')
    semanticSync.send(message)
  }

  function simulateStep(deltaTime: number) {
    if (!isSimulating.value) return

    const dt = deltaTime * simulationSpeed.value
    
    weatherDynamics.update(dt)

    drones.value.forEach((drone) => {
      if (drone.status !== 'flying') return

      const mission = drone.currentMission ? missions.value.get(drone.currentMission) : null
      const path = drone.currentMission ? optimizationResults.value.get(drone.currentMission)?.optimizedPath : null
      
      if (!mission || !path || path.length === 0) return

      let currentWaypointIndex = 0
      let minDist = Infinity
      
      for (let i = 0; i < path.length; i++) {
        const dist = vectorDistance(drone.position, path[i])
        if (dist < minDist) {
          minDist = dist
          currentWaypointIndex = i
        }
      }

      if (currentWaypointIndex >= path.length - 1) {
        completeMission(mission.id)
        return
      }

      const target = path[Math.min(currentWaypointIndex + 5, path.length - 1)]
      const direction = vectorNormalize(vectorSub(target, drone.position))
      const speed = 8
      
      const wind = weatherDynamics.getWindAt(drone.position)
      const windRad = (wind.direction * Math.PI) / 180
      const windVector = {
        x: Math.sin(windRad) * wind.speed * 0.3,
        y: 0,
        z: Math.cos(windRad) * wind.speed * 0.3
      }

      const newVelocity = {
        x: direction.x * speed + windVector.x,
        y: direction.y * speed,
        z: direction.z * speed + windVector.z
      }

      const newPosition = {
        x: drone.position.x + newVelocity.x * dt,
        y: Math.max(5, Math.min(200, drone.position.y + newVelocity.y * dt)),
        z: drone.position.z + newVelocity.z * dt
      }

      const collision = pathOptimizer.checkCollisions(drone.id, newPosition)
      if (collision.hasCollision && collision.timeToCollision < 2) {
        const avoidDirection = vectorNormalize(vectorSub(drone.position, collision.position))
        newPosition.x += avoidDirection.x * 2
        newPosition.z += avoidDirection.z * 2
      }

      const heading = Math.atan2(newVelocity.x, newVelocity.z) * 180 / Math.PI
      
      const batteryConsumption = (speed * 0.1 + wind.turbulence * 0.5) * dt
      const newBattery = Math.max(0, drone.battery - batteryConsumption)

      updateDroneState(drone.id, {
        position: newPosition,
        velocity: newVelocity,
        acceleration: {
          x: (newVelocity.x - drone.velocity.x) / dt,
          y: (newVelocity.y - drone.velocity.y) / dt,
          z: (newVelocity.z - drone.velocity.z) / dt
        },
        battery: newBattery,
        heading,
        altitude: newPosition.y
      })

      if (newBattery <= 0) {
        emergencyLand(drone.id)
      }
    })

    lastUpdateTime.value = Date.now()
  }

  function emergencyLand(droneId: string) {
    const drone = drones.value.get(droneId)
    if (!drone) return

    drone.status = 'landing'
    
    const message = semanticSync.createAlertMessage(
      'terminal',
      droneId,
      'low_battery',
      'danger',
      { battery: drone.battery, action: 'emergency_land' }
    )
    semanticSync.send(message)

    setTimeout(() => {
      drone.status = 'idle'
      drone.velocity = { x: 0, y: 0, z: 0 }
      if (drone.currentMission) {
        const mission = missions.value.get(drone.currentMission)
        if (mission) {
          mission.status = 'failed'
          mission.endTime = Date.now()
        }
        drone.currentMission = null
      }
      trajectoryBase.endTrajectory(droneId)
    }, 3000)
  }

  function setAirspaceZones(zones: AirspaceZone[]) {
    airspaceZones.value = zones
    pathOptimizer.setAirspaceZones(zones)
  }

  function startSimulation() {
    isSimulating.value = true
  }

  function stopSimulation() {
    isSimulating.value = false
  }

  function setSimulationSpeed(speed: number) {
    simulationSpeed.value = Math.max(0.1, Math.min(10, speed))
  }

  return {
    drones,
    missions,
    airspaceZones,
    optimizationResults,
    isInitialized,
    isSimulating,
    simulationSpeed,
    lastUpdateTime,
    droneList,
    missionList,
    activeDrones,
    weatherDynamics,
    pathOptimizer,
    blackBoxDB,
    semanticSync,
    trajectoryBase,
    init,
    addDrone,
    removeDrone,
    addMission,
    optimizeMissionPath,
    startMission,
    updateDroneState,
    completeMission,
    simulateStep,
    emergencyLand,
    setAirspaceZones,
    startSimulation,
    stopSimulation,
    setSimulationSpeed
  }
})
