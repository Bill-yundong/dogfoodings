import type { Component } from 'solid-js'
import { onMount, createMemo, createEffect } from 'solid-js'
import { createSimulationStore } from './store/simulationStore'
import { initDatabase, saveVisibilitySnapshot, createVisibilitySnapshot } from './core/database'
import { GlobeCanvas } from './components/GlobeCanvas'
import { SatelliteList } from './components/SatelliteList'
import { GroundStationList } from './components/GroundStationList'
import { ControlPanel } from './components/ControlPanel'
import { VisibilityPanel } from './components/VisibilityPanel'
import { SatelliteInfo } from './components/SatelliteInfo'
import { formatDateTime } from './utils/format'

const App: Component = () => {
  const store = createSimulationStore()

  onMount(async () => {
    try {
      await initDatabase()
      console.log('Database initialized successfully')
    } catch (error) {
      console.error('Failed to initialize database:', error)
    }
    store.initWorker()
  })

  const handlePredictVisibility = async () => {
    store.predictVisibility(24)
  }

  const selectedSatellitePosition = createMemo(() => {
    const sat = store.selectedSatellite()
    if (!sat) return undefined
    return store.positions().find(p => p.satelliteId === sat.id)
  })

  createEffect(() => {
    const satId = store.selectedSatelliteId()
    const sat = store.selectedSatellite()
    const allPositions = store.positions()
    const pos = selectedSatellitePosition()
    
    console.log('[App] ========== 响应式更新 ==========')
    console.log('[App] selectedSatelliteId:', satId)
    console.log('[App] selectedSatellite:', sat?.name)
    console.log('[App] 所有 positions 数量:', allPositions.length)
    console.log('[App] 所有 positions:', allPositions.map(p => ({ id: p.satelliteId, alt: p.state.altitude })))
    console.log('[App] selectedSatellitePosition:', pos ? { id: pos.satelliteId, alt: pos.state.altitude } : 'undefined')
    console.log('[App] ================================')
  })

  const handleSaveSnapshot = async () => {
    if (store.visibilityWindows().length === 0) {
      alert('请先预测通视时间窗')
      return
    }

    const snapshot = createVisibilitySnapshot(
      store.visibilityWindows(),
      store.stations().map(s => s.id),
      store.satellites().filter(s => s.active).map(s => s.id),
      {
        start: store.currentTime(),
        end: store.currentTime() + 24 * 3600 * 1000
      }
    )

    try {
      const id = await saveVisibilitySnapshot(snapshot)
      alert(`通视快照已保存，ID: ${id}`)
    } catch (error) {
      console.error('Failed to save snapshot:', error)
      alert('保存失败')
    }
  }

  return (
    <div class="app">
      <header class="app-header">
        <h1>🛰️ SatellitePulse - 卫星星座通视仿真系统</h1>
        <div class="header-info">
          <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              'border-radius': '50%',
              'background-color': store.isSimulating() ? 'var(--accent-secondary)' : 'var(--text-secondary)',
              'box-shadow': store.isSimulating() ? '0 0 8px var(--accent-secondary)' : 'none',
              animation: store.isSimulating() ? 'pulse 2s infinite' : 'none'
            }} />
            <span>{store.isSimulating() ? '仿真运行中' : '仿真已暂停'}</span>
          </div>
          <div class="time-display">
            {formatDateTime(store.currentTime())}
          </div>
        </div>
      </header>

      <main class="app-main">
        <aside class="sidebar">
          <div class="sidebar-section">
            <h2>卫星列表 ({store.satellites().filter(s => s.active).length}/{store.satellites().length})</h2>
            <SatelliteList
              getSatellites={store.satellites}
              getPositions={store.positions}
              getSelectedId={store.selectedSatelliteId}
              onSelect={store.setSelectedSatelliteId}
              onToggle={store.toggleSatellite}
            />
          </div>

          <div class="sidebar-section">
            <h2>卫星详情</h2>
            <SatelliteInfo
              getSatellite={store.selectedSatellite}
              getPosition={selectedSatellitePosition}
            />
          </div>

          <div class="sidebar-section">
            <h2>地面测控站 ({store.stations().length})</h2>
            <GroundStationList
              getStations={store.stations}
              getSelectedId={store.selectedStationId}
              onSelect={store.setSelectedStationId}
            />
          </div>

          <div class="sidebar-section">
            <h2>仿真控制</h2>
            <ControlPanel
              timeSpeed={store.config().timeSpeed}
              isSimulating={store.isSimulating()}
              onSpeedChange={store.updateTimeSpeed}
              onStart={store.startSimulation}
              onStop={store.stopSimulation}
              onPredictVisibility={handlePredictVisibility}
              isLoading={store.isLoading()}
            />
            <button
              class="btn btn-secondary"
              style={{ width: '100%', 'margin-top': '8px' }}
              onClick={handleSaveSnapshot}
              disabled={store.visibilityWindows().length === 0}
            >
              💾 保存通视快照
            </button>
          </div>
        </aside>

        <div class="canvas-container">
          <GlobeCanvas
            positions={store.positions()}
            stations={store.stations()}
            satelliteColors={store.satelliteColorsMap()}
            selectedStationId={store.selectedStationId()}
            isSimulating={store.isSimulating()}
          />
          
          {store.isLoading() && (
            <div class="loading-overlay">
              <div style={{ 'text-align': 'center' }}>
                <div class="loading-spinner" style={{ margin: '0 auto 16px' }} />
                <div style={{ color: 'var(--text-secondary)' }}>正在计算通视时间窗...</div>
              </div>
            </div>
          )}

          <VisibilityPanel
            windows={store.visibilityWindows()}
            currentTime={store.currentTime()}
            onPredictVisibility={handlePredictVisibility}
            isLoading={store.isLoading()}
          />
        </div>
      </main>
    </div>
  )
}

export default App
