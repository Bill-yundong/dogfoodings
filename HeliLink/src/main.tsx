import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { SeedDataService } from '@/services/seedData'
import { useWeatherStore } from '@/store/weatherStore'
import { useAlertStore } from '@/store/alertStore'
import { db } from '@/db'

function Bootstrap() {
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { init: initWeather } = useWeatherStore()
  const { init: initAlerts } = useAlertStore()

  useEffect(() => {
    const init = async () => {
      try {
        const seedSuccess = await SeedDataService.initialize()
        if (!seedSuccess) {
          console.warn('种子数据初始化可能失败，但继续运行')
        }

        await initWeather()
        await initAlerts()

        const alerts = await db.alerts.filter(a => !a.acknowledged).toArray()
        const alertStore = useAlertStore.getState()
        alertStore.setAlerts(alerts)

        setIsReady(true)
      } catch (e) {
        console.error('初始化失败:', e)
        setError(e instanceof Error ? e.message : '未知错误')
        setIsReady(true)
      }
    }

    init()
  }, [initWeather, initAlerts])

  if (!isReady) {
    return (
      <div className="min-h-screen bg-[#0a0e17] flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#1B998B] border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Orbitron', sans-serif" }}>
          HELILINK
        </h2>
        <p className="text-gray-400">正在初始化系统...</p>
        <p className="text-gray-500 text-sm mt-2">加载平台、海缆与气象数据</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0e17] flex flex-col items-center justify-center p-8">
        <div className="text-red-500 text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-white mb-2">系统初始化警告</h2>
        <p className="text-gray-400 text-center max-w-md mb-4">{error}</p>
        <p className="text-gray-500 text-sm">系统将继续运行，但部分功能可能受限</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-[#1B998B] text-white rounded hover:bg-[#0d5c53] transition-colors"
        >
          重试
        </button>
      </div>
    )
  }

  return (
    <StrictMode>
      <App />
    </StrictMode>
  )
}

createRoot(document.getElementById('root')!).render(<Bootstrap />)
