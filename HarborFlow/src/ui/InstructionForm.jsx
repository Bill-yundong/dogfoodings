import { createSignal } from 'solid-js'
import { InstructionType, dispatcher } from '../core'

export default function InstructionForm() {
  const [formData, setFormData] = createSignal({
    type: InstructionType.TRANSFER,
    containerId: `CNTR-${Math.floor(Math.random() * 10000)}`,
    sourceX: 0,
    sourceY: 0,
    targetX: 15,
    targetY: 15,
    priority: 1
  })

  const updateField = (field, value) => {
    setFormData({ ...formData(), [field]: value })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const tosData = {
      type: formData().type,
      containerId: formData().containerId,
      sourceLocation: { x: parseInt(formData().sourceX), y: parseInt(formData().sourceY) },
      targetLocation: { x: parseInt(formData().targetX), y: parseInt(formData().targetY) },
      priority: parseInt(formData().priority),
      metadata: { submittedBy: 'TOS System' }
    }

    try {
      const instruction = dispatcher.submitTOSInstruction(tosData)
      alert(`指令已提交: ${instruction.id}`)
      setFormData({
        type: InstructionType.TRANSFER,
        containerId: `CNTR-${Math.floor(Math.random() * 10000)}`,
        sourceX: 0,
        sourceY: 0,
        targetX: 15,
        targetY: 15,
        priority: 1
      })
    } catch (error) {
      alert('提交失败: ' + error.message)
    }
  }

  return (
    <div class="bg-white rounded-lg shadow-md p-4">
      <h2 class="text-lg font-semibold mb-4 text-gray-800">提交 TOS 指令</h2>
      <form onSubmit={handleSubmit} class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">指令类型</label>
            <select
              value={formData().type}
              onChange={(e) => updateField('type', e.target.value)}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={InstructionType.LOAD}>装货</option>
              <option value={InstructionType.UNLOAD}>卸货</option>
              <option value={InstructionType.TRANSFER}>转运</option>
              <option value={InstructionType.PARK}>停靠</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">集装箱编号</label>
            <input
              type="text"
              value={formData().containerId}
              onChange={(e) => updateField('containerId', e.target.value)}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例如: CNTR-0001"
              required
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">源位置</label>
            <div class="flex gap-2">
              <input
                type="number"
                min="0"
                max="19"
                value={formData().sourceX}
                onChange={(e) => updateField('sourceX', e.target.value)}
                class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="X"
                required
              />
              <input
                type="number"
                min="0"
                max="19"
                value={formData().sourceY}
                onChange={(e) => updateField('sourceY', e.target.value)}
                class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Y"
                required
              />
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">目标位置</label>
            <div class="flex gap-2">
              <input
                type="number"
                min="0"
                max="19"
                value={formData().targetX}
                onChange={(e) => updateField('targetX', e.target.value)}
                class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="X"
                required
              />
              <input
                type="number"
                min="0"
                max="19"
                value={formData().targetY}
                onChange={(e) => updateField('targetY', e.target.value)}
                class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Y"
                required
              />
            </div>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">优先级 (1-5)</label>
          <input
            type="range"
            min="1"
            max="5"
            value={formData().priority}
            onChange={(e) => updateField('priority', e.target.value)}
            class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div class="flex justify-between text-xs text-gray-500 mt-1">
            <span>低 (1)</span>
            <span>当前: {formData().priority}</span>
            <span>高 (5)</span>
          </div>
        </div>

        <button
          type="submit"
          class="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
        >
          提交指令
        </button>
      </form>
    </div>
  )
}
