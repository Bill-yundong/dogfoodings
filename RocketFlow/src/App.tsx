import { Component, onMount, onCleanup, createSignal } from 'solid-js'
import { CommandCenter } from './pages/CommandCenter'
import { FillingControl } from './pages/FillingControl'
import { SafetyMonitor } from './pages/SafetyMonitor'
import { DataReplay } from './pages/DataReplay'
import { state } from './store/useSimulationStore'
import { waveformManager } from './db/timeSeries'
import { Monitor, Settings, Shield, History, Rocket, AlertTriangle } from 'lucide-solid'

const App: Component = () => {
  const [currentPath, setCurrentPath] = createSignal(window.location.hash.slice(1) || '/')
  const [dbReady, setDbReady] = createSignal(false)
  const [dbError, setDbError] = createSignal<string | null>(null)

  onMount(async () => {
    try {
      await waveformManager.init()
      setDbReady(true)
      waveformManager.startAutoWrite()
    } catch (error) {
      console.error('Failed to initialize database:', error)
      setDbError(error instanceof Error ? error.message : 'Unknown error')
    }

    const handleHashChange = () => {
      setCurrentPath(window.location.hash.slice(1) || '/')
    }
    window.addEventListener('hashchange', handleHashChange)
  })

  onCleanup(() => {
    waveformManager.destroy()
  })

  const navItems = [
    { path: '/', label: '指挥大屏', icon: Monitor },
    { path: '/control', label: '加注控制', icon: Settings },
    { path: '/safety', label: '安全防爆', icon: Shield },
    { path: '/replay', label: '数据复盘', icon: History },
  ]

  const isActive = (path: string) => {
    const current = currentPath()
    if (path === '/') return current === '/'
    return current.startsWith(path)
  }

  const handleNavClick = (e: MouseEvent, path: string) => {
    e.preventDefault()
    window.location.hash = path
  }

  return (
    <div class="min-h-screen bg-space-deep text-gray-100 font-sans">
      <header class="bg-space-blue/80 backdrop-blur-md border-b border-lox-blue/30 sticky top-0 z-50">
        <div class="max-w-[1920px] mx-auto px-6 h-16 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="relative">
              <Rocket class="w-8 h-8 text-lox-blue" />
              <div class="absolute -top-1 -right-1 w-3 h-3 bg-lh2-cyan rounded-full animate-pulse" />
            </div>
            <div>
              <h1 class="text-xl font-bold font-orbitron tracking-wider text-white">
                ROCKET<span class="text-lox-blue">FLOW</span>
              </h1>
              <p class="text-xs text-gray-400 font-mono">
                运载火箭推进剂加注仿真系统 v1.0
              </p>
            </div>
          </div>

          <nav class="flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <a
                  href={`#${item.path}`}
                  onClick={(e) => handleNavClick(e, item.path)}
                  class={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-300 ${
                    isActive(item.path)
                      ? 'bg-lox-blue/20 text-lox-blue border border-lox-blue/50 shadow-lg shadow-lox-blue/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon class="w-4 h-4" />
                  <span class="text-sm font-medium">{item.label}</span>
                </a>
              )
            })}
          </nav>

          <div class="flex items-center gap-4">
            {state.currentPhase === 'EMERGENCY_STOP' && (
              <div class="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/50 rounded-lg animate-pulse">
                <AlertTriangle class="w-4 h-4 text-red-400" />
                <span class="text-xs font-bold text-red-400">紧急停车</span>
              </div>
            )}
            <div class="flex items-center gap-3">
              <div class={`w-2 h-2 rounded-full ${state.isRunning ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
              <span class="text-xs font-mono text-gray-400">
                {state.isRunning ? '运行中' : '待机'}
              </span>
            </div>
            <div class="h-8 w-px bg-gray-700" />
            <div class="text-right">
              <div class="text-xs text-gray-400">发射倒计时</div>
              <div class="font-mono text-lg font-bold text-lox-blue">
                T-{(state.countdown / 1000).toFixed(1)}s
              </div>
            </div>
          </div>
        </div>
      </header>

      <main class="max-w-[1920px] mx-auto p-6">
        {dbError() && (
          <div class="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
            <div class="flex items-center gap-2 text-red-400">
              <AlertTriangle class="w-5 h-5" />
              <span class="font-bold">数据库初始化失败</span>
            </div>
            <p class="mt-2 text-sm text-red-300">{dbError()}</p>
            <p class="mt-1 text-xs text-red-400/70">部分数据持久化功能将不可用，但仿真功能仍可正常运行</p>
          </div>
        )}
        
        {!dbReady() && !dbError() && (
          <div class="flex flex-col items-center justify-center py-20">
            <div class="w-12 h-12 border-4 border-lox-blue/30 border-t-lox-blue rounded-full animate-spin mb-4" />
            <p class="text-gray-400 font-mono">正在初始化数据库...</p>
          </div>
        )}
        
        {(dbReady() || dbError()) && (
          <>
            {currentPath() === '/' && <CommandCenter />}
            {currentPath() === '/control' && <FillingControl />}
            {currentPath() === '/safety' && <SafetyMonitor />}
            {currentPath() === '/replay' && <DataReplay />}
          </>
        )}
      </main>

      <footer class="bg-space-blue/50 border-t border-gray-800 py-3 mt-8">
        <div class="max-w-[1920px] mx-auto px-6 flex items-center justify-between text-xs text-gray-500">
          <div class="font-mono">
            © 2025 RocketFlow Simulation System | 航天工业级仿真平台
          </div>
          <div class="flex items-center gap-4 font-mono">
            <span>氧路: {state.oxygen.flowRate > 0 ? '加注中' : '待命'}</span>
            <span>氢路: {state.hydrogen.flowRate > 0 ? '加注中' : '待命'}</span>
            <span>
              阶段: {state.currentPhase}
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
