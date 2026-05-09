import { createResource } from 'solid-js'
import { DeviceStatus, DeviceType, dispatcher } from '../core'

const statusColors = {
  [DeviceStatus.IDLE]: 'bg-green-500',
  [DeviceStatus.MOVING]: 'bg-blue-500',
  [DeviceStatus.LOADING]: 'bg-yellow-500',
  [DeviceStatus.UNLOADING]: 'bg-orange-500',
  [DeviceStatus.CHARGING]: 'bg-purple-500',
  [DeviceStatus.MAINTENANCE]: 'bg-gray-500',
  [DeviceStatus.ERROR]: 'bg-red-500'
}

const statusLabels = {
  [DeviceStatus.IDLE]: '空闲',
  [DeviceStatus.MOVING]: '移动中',
  [DeviceStatus.LOADING]: '装货中',
  [DeviceStatus.UNLOADING]: '卸货中',
  [DeviceStatus.CHARGING]: '充电中',
  [DeviceStatus.MAINTENANCE]: '维护中',
  [DeviceStatus.ERROR]: '故障'
}

const typeLabels = {
  [DeviceType.AGV]: 'AGV',
  [DeviceType.RTG]: 'RTG',
  [DeviceType.STS]: 'STS'
}

export default function DeviceList() {
  const [devices, { refetch }] = createResource(async () => {
    return await dispatcher.getAllDevices()
  })

  setInterval(() => {
    refetch()
  }, 2000)

  return (
    <div class="bg-white rounded-lg shadow-md p-4">
      <h2 class="text-lg font-semibold mb-4 text-gray-800">设备状态</h2>
      <div class="space-y-3">
        {devices()?.map(device => (
          <div key={device.id} class="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-700">{device.id}</span>
                <span class="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                  {typeLabels[device.type]}
                </span>
              </div>
              <span class={`text-xs px-2 py-1 rounded text-white ${statusColors[device.status]}`}>
                {statusLabels[device.status]}
              </span>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm text-gray-600">
              <div>
                <span class="text-gray-500">位置:</span>
                <span class="ml-1">({device.position.x}, {device.position.y})</span>
              </div>
              <div>
                <span class="text-gray-500">电量:</span>
                <span class="ml-1">{device.battery}%</span>
              </div>
              {device.currentTask && (
                <div class="col-span-2">
                  <span class="text-gray-500">当前任务:</span>
                  <span class="ml-1 text-blue-600">{device.currentTask}</span>
                </div>
              )}
            </div>
          </div>
        ))}
        {devices()?.length === 0 && (
          <div class="text-center text-gray-500 py-4">暂无设备数据</div>
        )}
      </div>
    </div>
  )
}
