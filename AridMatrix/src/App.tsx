import { Component, createSignal, onMount, onCleanup, createEffect } from 'solid-js'
import { WindSandSimulationEngine } from './engine/WindSandSimulationEngine'
import type { Dune, VegetationZone, SimulationConfig } from './types'

const generateInitialDunes = (): Dune[] => {
  const dunes: Dune[] = []
  for (let i = 0; i < 15; i++) {
    dunes.push({
      id: `dune-${i}`,
      position: {
        x: 50 + Math.random() * 700,
        y: 50 + Math.random() * 500
      },
      height: 2 + Math.random() * 8,
      volume: 100 + Math.random() * 500,
      migrationRate: 0,
      direction: Math.random() * 360
    })
  }
  return dunes
}

const generateInitialVegetation = (): VegetationZone[] => {
  return [
    {
      id: 'veg-1',
      position: { x: 200, y: 200 },
      radius: 80,
      coverage: 0.3,
      type: 'shrub',
      growthRate: 0.005
    },
    {
      id: 'veg-2',
      position: { x: 500, y: 350 },
      radius: 100,
      coverage: 0.2,
      type: 'tree',
      growthRate: 0.003
    },
    {
      id: 'veg-3',
      position: { x: 650, y: 150 },
      radius: 60,
      coverage: 0.4,
      type: 'grass',
      growthRate: 0.008
    }
  ]
}

const defaultConfig: SimulationConfig = {
  timeScale: 10,
  windIntensity: 1,
  erosionFactor: 0.1,
  depositionFactor: 0.05
}

const App: Component = () => {
  const [engine, setEngine] = createSignal<WindSandSimulationEngine | null>(null)
  const [dunes, setDunes] = createSignal<Dune[]>([])
  const [vegetationZones, setVegetationZones] = createSignal<VegetationZone[]>([])
  const [coverageRate, setCoverageRate] = createSignal(0)
  const [simulationTime, setSimulationTime] = createSignal(0)
  const [status, setStatus] = createSignal<'idle' | 'running' | 'paused' | 'stopped'>('idle')
  const [windSpeed, setWindSpeed] = createSignal(8)
  const [timeScale, setTimeScale] = createSignal(10)
  let canvasRef: HTMLCanvasElement | undefined

  onMount(() => {
    const newEngine = new WindSandSimulationEngine(
      generateInitialDunes(),
      generateInitialVegetation(),
      defaultConfig
    )

    newEngine.subscribe((state) => {
      setDunes(state.dunes)
      setVegetationZones(state.vegetationZones)
      setCoverageRate(state.coverageRate)
      setSimulationTime(state.currentTime)
      setStatus(state.status)
    })

    setEngine(newEngine)
    drawCanvas()
  })

  onCleanup(() => {
    engine()?.destroy()
  })

  const drawCanvas = () => {
    const canvas = canvasRef
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#1e293b'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    vegetationZones().forEach(zone => {
      const gradient = ctx.createRadialGradient(
        zone.position.x, zone.position.y, 0,
        zone.position.x, zone.position.y, zone.radius
      )
      const alpha = 0.3 + zone.coverage * 0.5
      gradient.addColorStop(0, `rgba(34, 197, 94, ${alpha})`)
      gradient.addColorStop(1, 'rgba(34, 197, 94, 0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(zone.position.x, zone.position.y, zone.radius, 0, Math.PI * 2)
      ctx.fill()
    })

    dunes().forEach(dune => {
      const size = Math.min(30, 10 + dune.height * 2)
      const gradient = ctx.createRadialGradient(
        dune.position.x, dune.position.y, 0,
        dune.position.x, dune.position.y, size
      )
      gradient.addColorStop(0, '#d4a574')
      gradient.addColorStop(0.7, '#c4956a')
      gradient.addColorStop(1, '#a67c52')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.ellipse(dune.position.x, dune.position.y, size, size * 0.6, 0, 0, Math.PI * 2)
      ctx.fill()
    })
  }

  createEffect(() => {
    if (dunes().length > 0) {
      drawCanvas()
    }
  })

  const startSimulation = async () => {
    await engine()?.prestart()
  }

  const pauseSimulation = () => {
    engine()?.pause()
  }

  const resumeSimulation = () => {
    engine()?.resume()
  }

  const stopSimulation = () => {
    engine()?.stop()
  }

  const handleWindSpeedChange = (value: number) => {
    setWindSpeed(value)
    engine()?.setWeather({ windSpeed: value })
  }

  const handleTimeScaleChange = (value: number) => {
    setTimeScale(value)
    engine()?.setConfig({ timeScale: value })
  }

  return (
    <div class="app-container">
      <header class="header">
        <h1>🌵 AridMatrix - 荒漠化防治工程成效评估系统</h1>
        <span class={`status-badge ${status()}`}>
          {status() === 'running' ? '● 模拟运行中' : status() === 'paused' ? '● 已暂停' : '● 已停止'}
        </span>
      </header>

      <div class="main-content">
        <aside class="sidebar left">
          <h2 class="panel-title">📊 实时数据</h2>
          
          <div class="stat-card">
            <div class="stat-value">{(coverageRate() * 100).toFixed(1)}%</div>
            <div class="stat-label">植被覆盖度</div>
            <div class="progress-bar">
              <div class="progress-fill" style={{ width: `${coverageRate() * 100}%` }}></div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-value">{simulationTime().toFixed(1)}s</div>
            <div class="stat-label">模拟时长</div>
          </div>

          <div class="stat-card">
            <div class="stat-value">{dunes().length}</div>
            <div class="stat-label">监测沙丘数量</div>
          </div>

          <div class="stat-card">
            <div class="stat-value">{vegetationZones().length}</div>
            <div class="stat-label">植被区域</div>
          </div>

          <h2 class="panel-title" style="margin-top: 2rem;">🌤️ 天气参数</h2>
          
          <div class="slider-container">
            <label>风速: {windSpeed()} m/s</label>
            <input
              type="range"
              min="0"
              max="20"
              value={windSpeed()}
              onInput={(e) => handleWindSpeedChange(Number(e.target.value))}
            />
          </div>
        </aside>

        <div class="center-panel">
          <div class="visualization-area">
            <div class="canvas-container">
              <canvas
                ref={canvasRef}
                class="simulation-canvas"
                width="800"
                height="600"
              />
            </div>
          </div>

          <div class="control-bar">
            <button
              class="btn btn-primary"
              onClick={startSimulation}
              disabled={status() === 'running'}
            >
              ▶ 开始模拟
            </button>
            <button
              class="btn btn-secondary"
              onClick={pauseSimulation}
              disabled={status() !== 'running'}
            >
              ⏸ 暂停
            </button>
            <button
              class="btn btn-secondary"
              onClick={resumeSimulation}
              disabled={status() !== 'paused'}
            >
              ▶ 继续
            </button>
            <button
              class="btn btn-secondary"
              onClick={stopSimulation}
              disabled={status() === 'stopped' || status() === 'idle'}
            >
              ⏹ 停止
            </button>

            <div class="slider-container" style="max-width: 200px;">
              <label>时间缩放: {timeScale()}x</label>
              <input
                type="range"
                min="1"
                max="50"
                value={timeScale()}
                onInput={(e) => handleTimeScaleChange(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <aside class="sidebar right">
          <h2 class="panel-title">📋 工程信息</h2>
          
          <div class="timeline-container">
            <div class="timeline-item">
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <div class="timeline-value">造林工程 A-001</div>
                <div class="timeline-date">林业局: 西北局</div>
                <div class="timeline-date">承包商: 绿源公司</div>
              </div>
            </div>

            <div class="timeline-item">
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <div class="timeline-value">固沙屏障安装</div>
                <div class="timeline-date">进度: 65%</div>
                <div class="timeline-date">目标覆盖度: 45%</div>
              </div>
            </div>

            <div class="timeline-item">
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <div class="timeline-value">植被种植阶段</div>
                <div class="timeline-date">灌木: 12,000 株</div>
                <div class="timeline-date">乔木: 3,500 株</div>
              </div>
            </div>
          </div>

          <h2 class="panel-title" style="margin-top: 2rem;">🔄 语义同步状态</h2>
          
          <div class="stat-card">
            <div style="font-size: 0.875rem; margin-bottom: 0.5rem;">
              <div>林业局版本: v1.0.2</div>
              <div>承包商版本: v1.0.2</div>
              <div>冲突数量: 0</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default App