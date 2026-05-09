import { onMount, createSignal, onCleanup } from 'solid-js'
import { dispatcher } from './core'
import StatsPanel from './ui/StatsPanel'
import DeviceList from './ui/DeviceList'
import InstructionList from './ui/InstructionList'
import InstructionForm from './ui/InstructionForm'

function App() {
  const [isInitialized, setIsInitialized] = createSignal(false)
  const [error, setError] = createSignal(null)
  const [activeTab, setActiveTab] = createSignal('instructions')

  onMount(async () => {
    try {
      await dispatcher.init()
      setIsInitialized(true)
    } catch (err) {
      console.error('Failed to initialize dispatcher:', err)
      setError(err.message)
    }
  })

  const tabs = [
    { id: 'instructions', label: '指令管理', icon: '📋' },
    { id: 'devices', label: '设备监控', icon: '🤖' },
    { id: 'form', label: '提交指令', icon: '➕' }
  ]

  return (
    <div class="min-h-screen bg-gray-100">
      <header class="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg">
        <div class="max-w-7xl mx-auto px-4 py-6">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl md:text-3xl font-bold">🚢 HarborFlow</h1>
              <p class="text-blue-100 mt-1">自动化码头调度中枢</p>
            </div>
            <div class="text-right">
              <div class={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                isInitialized() ? 'bg-green-500' : 'bg-yellow-500'
              }`}>
                <span class={`w-2 h-2 rounded-full ${
                  isInitialized() ? 'bg-green-200 animate-pulse' : 'bg-yellow-200'
                }`}></span>
                {isInitialized() ? '系统运行中' : '初始化中...'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {error() && (
        <div class="max-w-7xl mx-auto px-4 mt-4">
          <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            <strong class="font-bold">系统错误：</strong>
            <span class="block sm:inline ml-2">{error()}</span>
          </div>
        </div>
      )}

      <main class="max-w-7xl mx-auto px-4 py-6">
        {isInitialized() && (
          <>
            <StatsPanel />

            <div class="bg-white rounded-lg shadow-md mb-6">
              <div class="border-b border-gray-200">
                <nav class="flex">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      class={`px-6 py-4 text-sm font-medium transition-colors ${
                        activeTab() === tab.id
                          ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span class="mr-2">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div class={activeTab() === 'instructions' ? 'lg:col-span-2' : 'lg:col-span-3'}>
                {activeTab() === 'instructions' && <InstructionList />}
                {activeTab() === 'devices' && <DeviceList />}
                {activeTab() === 'form' && <InstructionForm />}
              </div>
              
              {activeTab() !== 'form' && (
                <div class="lg:col-span-1">
                  {activeTab() === 'instructions' ? (
                    <InstructionForm />
                  ) : (
                    <div class="bg-white rounded-lg shadow-md p-4">
                      <h2 class="text-lg font-semibold mb-4 text-gray-800">系统说明</h2>
                      <div class="space-y-4 text-sm text-gray-600">
                        <div>
                          <h3 class="font-medium text-gray-700">🔄 指令流转</h3>
                          <p class="mt-1">TOS 指令 → 分配 AGV → 路径规划 → 执行 → 完成</p>
                        </div>
                        <div>
                          <h3 class="font-medium text-gray-700">🗺️ 路径规划</h3>
                          <p class="mt-1">采用 A* 算法，支持异步任务队列和优先级处理</p>
                        </div>
                        <div>
                          <h3 class="font-medium text-gray-700">💾 状态缓存</h3>
                          <p class="mt-1">使用 IndexedDB 持久化设备状态快照</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {!isInitialized() && !error() && (
          <div class="text-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p class="text-gray-500">正在初始化调度系统...</p>
          </div>
        )}
      </main>

      <footer class="bg-gray-800 text-gray-400 py-4 mt-8">
        <div class="max-w-7xl mx-auto px-4 text-center text-sm">
          <p>HarborFlow - 自动化码头调度中枢 © 2024</p>
        </div>
      </footer>
    </div>
  )
}

export default App
