import { createSignal, onCleanup } from 'solid-js'
import { InstructionStatus, InstructionType, dispatcher } from '../core'

const statusColors = {
  [InstructionStatus.PENDING]: 'bg-gray-500',
  [InstructionStatus.QUEUED]: 'bg-yellow-500',
  [InstructionStatus.ASSIGNED]: 'bg-blue-500',
  [InstructionStatus.EXECUTING]: 'bg-indigo-500',
  [InstructionStatus.COMPLETED]: 'bg-green-500',
  [InstructionStatus.FAILED]: 'bg-red-500',
  [InstructionStatus.CANCELLED]: 'bg-gray-600'
}

const statusLabels = {
  [InstructionStatus.PENDING]: '待处理',
  [InstructionStatus.QUEUED]: '已排队',
  [InstructionStatus.ASSIGNED]: '已分配',
  [InstructionStatus.EXECUTING]: '执行中',
  [InstructionStatus.COMPLETED]: '已完成',
  [InstructionStatus.FAILED]: '失败',
  [InstructionStatus.CANCELLED]: '已取消'
}

const typeLabels = {
  [InstructionType.LOAD]: '装货',
  [InstructionType.UNLOAD]: '卸货',
  [InstructionType.TRANSFER]: '转运',
  [InstructionType.PARK]: '停靠'
}

export default function InstructionList() {
  const [instructions, setInstructions] = createSignal([])
  const [selectedId, setSelectedId] = createSignal(null)

  const refreshInstructions = () => {
    setInstructions(dispatcher.getInstructions())
  }

  const unsubscribers = [
    dispatcher.addListener('instruction-added', refreshInstructions),
    dispatcher.addListener('instruction-updated', refreshInstructions)
  ]

  refreshInstructions()

  onCleanup(() => {
    unsubscribers.forEach(unsub => unsub())
  })

  const handleAssign = async (instr) => {
    try {
      await dispatcher.assignInstruction(instr.id)
    } catch (error) {
      alert(error.message)
    }
  }

  const handleExecute = async (instr) => {
    try {
      await dispatcher.planAndExecute(instr.id)
    } catch (error) {
      alert(error.message)
    }
  }

  const handleComplete = async (instr) => {
    try {
      await dispatcher.completeExecution(instr.id, true)
    } catch (error) {
      alert(error.message)
    }
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <div class="bg-white rounded-lg shadow-md p-4">
      <h2 class="text-lg font-semibold mb-4 text-gray-800">指令队列</h2>
      <div class="space-y-3 max-h-[500px] overflow-y-auto">
        {instructions().map(instr => (
          <div
            key={instr.id}
            class={`border rounded-lg p-3 cursor-pointer transition-all ${
              selectedId() === instr.id 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:bg-gray-50'
            }`}
            onClick={() => setSelectedId(selectedId() === instr.id ? null : instr.id)}
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-700">{instr.id}</span>
                <span class="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                  {typeLabels[instr.type]}
                </span>
                <span class="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded">
                  优先级: {instr.priority}
                </span>
              </div>
              <span class={`text-xs px-2 py-1 rounded text-white ${statusColors[instr.status]}`}>
                {statusLabels[instr.status]}
              </span>
            </div>
            
            <div class="text-sm text-gray-600 mb-2">
              <span class="text-gray-500">集装箱:</span>
              <span class="ml-1">{instr.containerId}</span>
              <span class="mx-2">→</span>
              <span class="text-gray-500">从</span>
              <span class="ml-1">({instr.sourceLocation.x}, {instr.sourceLocation.y})</span>
              <span class="mx-2">到</span>
              <span class="ml-1">({instr.targetLocation.x}, {instr.targetLocation.y})</span>
            </div>

            <div class="text-xs text-gray-500 mb-2">
              创建时间: {formatTime(instr.createdAt)}
              {instr.assignedAgvId && (
                <span class="ml-4">
                  分配 AGV: <span class="text-blue-600">{instr.assignedAgvId}</span>
                </span>
              )}
            </div>

            {selectedId() === instr.id && (
              <div class="mt-3 pt-3 border-t border-gray-200">
                <div class="flex gap-2">
                  {instr.status === InstructionStatus.PENDING && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAssign(instr) }}
                      class="px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition"
                    >
                      分配 AGV
                    </button>
                  )}
                  {instr.status === InstructionStatus.ASSIGNED && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleExecute(instr) }}
                      class="px-3 py-1.5 bg-indigo-500 text-white text-sm rounded hover:bg-indigo-600 transition"
                    >
                      规划并执行
                    </button>
                  )}
                  {instr.status === InstructionStatus.EXECUTING && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleComplete(instr) }}
                      class="px-3 py-1.5 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition"
                    >
                      标记完成
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {instructions().length === 0 && (
          <div class="text-center text-gray-500 py-8">
            <p class="mb-2">暂无指令</p>
            <p class="text-xs">使用下方表单提交新指令</p>
          </div>
        )}
      </div>
    </div>
  )
}
