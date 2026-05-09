import { createSignal, onCleanup } from 'solid-js'
import { InstructionStatus, DeviceStatus, DeviceType, dispatcher, pathPlanner } from '../core'

export default function StatsPanel() {
  const [stats, setStats] = createSignal({
    totalDevices: 0,
    agvCount: 0,
    idleDevices: 0,
    movingDevices: 0,
    chargingDevices: 0,
    totalInstructions: 0,
    pendingInstructions: 0,
    executingInstructions: 0,
    completedInstructions: 0,
    pathQueueSize: 0
  })

  const refreshStats = async () => {
    const devices = await dispatcher.getAllDevices()
    const instructions = dispatcher.getInstructions()

    setStats({
      totalDevices: devices.length,
      agvCount: devices.filter(d => d.type === DeviceType.AGV).length,
      idleDevices: devices.filter(d => d.status === DeviceStatus.IDLE).length,
      movingDevices: devices.filter(d => d.status === DeviceStatus.MOVING).length,
      chargingDevices: devices.filter(d => d.status === DeviceStatus.CHARGING).length,
      totalInstructions: instructions.length,
      pendingInstructions: instructions.filter(i => 
        i.status === InstructionStatus.PENDING || i.status === InstructionStatus.QUEUED
      ).length,
      executingInstructions: instructions.filter(i => 
        i.status === InstructionStatus.ASSIGNED || i.status === InstructionStatus.EXECUTING
      ).length,
      completedInstructions: instructions.filter(i => 
        i.status === InstructionStatus.COMPLETED
      ).length,
      pathQueueSize: pathPlanner.getQueueSize()
    })
  }

  const unsubscribers = [
    dispatcher.addListener('instruction-added', refreshStats),
    dispatcher.addListener('instruction-updated', refreshStats),
    dispatcher.addListener('path-planned', refreshStats),
    dispatcher.addListener('path-failed', refreshStats)
  ]

  refreshStats()
  const interval = setInterval(refreshStats, 2000)

  onCleanup(() => {
    unsubscribers.forEach(unsub => unsub())
    clearInterval(interval)
  })

  return (
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
        <div class="text-3xl font-bold">{stats().agvCount}</div>
        <div class="text-sm opacity-80">可用 AGV</div>
      </div>
      
      <div class="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
        <div class="text-3xl font-bold">{stats().idleDevices}</div>
        <div class="text-sm opacity-80">空闲设备</div>
      </div>
      
      <div class="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-4 text-white">
        <div class="text-3xl font-bold">{stats().movingDevices}</div>
        <div class="text-sm opacity-80">运行中设备</div>
      </div>
      
      <div class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
        <div class="text-3xl font-bold">{stats().pendingInstructions}</div>
        <div class="text-sm opacity-80">待处理指令</div>
      </div>

      <div class="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg p-4 text-white">
        <div class="text-3xl font-bold">{stats().executingInstructions}</div>
        <div class="text-sm opacity-80">执行中指令</div>
      </div>
      
      <div class="bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg p-4 text-white">
        <div class="text-3xl font-bold">{stats().completedInstructions}</div>
        <div class="text-sm opacity-80">已完成指令</div>
      </div>
      
      <div class="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white">
        <div class="text-3xl font-bold">{stats().pathQueueSize}</div>
        <div class="text-sm opacity-80">规划队列</div>
      </div>
      
      <div class="bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg p-4 text-white">
        <div class="text-3xl font-bold">{stats().chargingDevices}</div>
        <div class="text-sm opacity-80">充电中设备</div>
      </div>
    </div>
  )
}
