import { onMount } from 'solid-js'
import { SystemProvider, useSystemStore } from '@/context/SystemContext'
import MonitorCenter from '@/components/MonitorCenter'
import SmartTerminal from '@/components/SmartTerminal'

function AppContent() {
  const store = useSystemStore()

  onMount(() => {
    store.initializeSystem()
  })

  return (
    <div class="h-screen w-screen overflow-hidden">
      {store.isLoading() ? (
        <div class="h-full flex flex-col items-center justify-center bg-slate-950">
          <div class="text-6xl mb-4 animate-bounce">🔥</div>
          <h1 class="text-2xl font-bold text-white mb-2">FireLink</h1>
          <p class="text-slate-400">智能火灾逃生指引系统正在启动...</p>
          <div class="mt-6 w-64 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r from-red-500 to-orange-500 animate-pulse" style="width: 60%"></div>
          </div>
        </div>
      ) : (
        <>
          {store.userMode() === 'monitor' ? <MonitorCenter /> : <SmartTerminal />}
        </>
      )}
    </div>
  )
}

export default function App() {
  return (
    <SystemProvider>
      <AppContent />
    </SystemProvider>
  )
}
