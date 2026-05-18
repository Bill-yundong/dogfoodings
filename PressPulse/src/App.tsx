import { Component, createSignal, createEffect, For } from 'solid-js'
import { DieHealthRecord } from './types'
import { DieCard } from './components/DieCard'
import { StressChart } from './components/StressChart'
import { HealthGauge } from './components/HealthGauge'
import { initDB, getAllDieRecords, saveDieRecord, getDieCount } from './db'
import { defaultPredictor, createEmptyStressAccumulation, generateSampleLoadData } from './utils/fatigue'
import { AsyncRainflowCounter } from './utils/rainflow'
import { synchronizer, publishStressUpdate } from './utils/sync'

const App: Component = () => {
  const [dies, setDies] = createSignal<DieHealthRecord[]>([])
  const [selectedDie, setSelectedDie] = createSignal<DieHealthRecord | null>(null)
  const [isLoading, setIsLoading] = createSignal(true)
  const [processingStatus, setProcessingStatus] = createSignal('')

  createEffect(async () => {
    await initDB()
    await loadDieData()
    synchronizer.startAutoSync()
    setIsLoading(false)
  })

  async function loadDieData() {
    const records = await getAllDieRecords()
    if (records.length === 0) {
      await generateSampleData()
    }
    const updatedRecords = await getAllDieRecords()
    setDies(updatedRecords)
  }

  async function generateSampleData() {
    const sampleDies: DieHealthRecord[] = []
    const models = ['CR12MOV-001', 'SKD11-002', 'D2-003', 'CR12MOV-004', 'SKD11-005']
    
    for (let i = 0; i < 5; i++) {
      const stressAccumulation = createEmptyStressAccumulation()
      const loadData = generateSampleLoadData(1000 + i * 200, 200 + i * 30, 60)
      const counter = new AsyncRainflowCounter()
      const cycles = await counter.processLoadData(loadData as any)
      const finalCycles = await counter.flush()
      const allCycles = [...cycles, ...finalCycles]
      
      const updatedAccumulation = defaultPredictor.updateStressAccumulation(
        stressAccumulation,
        allCycles
      )
      
      const health = defaultPredictor.calculateHealthIndex(updatedAccumulation.damageAccumulated)
      const remainingLife = defaultPredictor.predictRemainingLife(
        updatedAccumulation.damageAccumulated,
        250
      )
      const daysSinceInstall = 30 + i * 15
      const failureProb = defaultPredictor.calculateFailureProbability(
        updatedAccumulation.damageAccumulated,
        daysSinceInstall
      )

      sampleDies.push({
        id: `die_${i + 1}`,
        name: `冲压模具 #${i + 1}`,
        model: models[i],
        installDate: Date.now() - daysSinceInstall * 24 * 60 * 60 * 1000,
        lastMaintenanceDate: Date.now() - (5 + i * 3) * 24 * 60 * 60 * 1000,
        currentHealth: health,
        predictedRemainingLife: remainingLife.days,
        failureProbability: failureProb,
        stressAccumulation: updatedAccumulation,
        sensorIds: [`sensor_${i}_001`, `sensor_${i}_002`],
        maintenanceHistory: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    }

    for (const die of sampleDies) {
      await saveDieRecord(die)
    }
  }

  async function processNewSensorData() {
    const die = selectedDie()
    if (!die) return

    setProcessingStatus('处理传感器数据中...')
    
    try {
      const loadData = generateSampleLoadData(500, 250, 80)
      const counter = new AsyncRainflowCounter()
      const cycles = await counter.processLoadData(loadData as any)
      const finalCycles = await counter.flush()
      const allCycles = [...cycles, ...finalCycles]

      const newAccumulation = defaultPredictor.updateStressAccumulation(
        die.stressAccumulation,
        allCycles
      )
      
      const newHealth = defaultPredictor.calculateHealthIndex(newAccumulation.damageAccumulated)
      const newRemainingLife = defaultPredictor.predictRemainingLife(
        newAccumulation.damageAccumulated,
        250
      )
      const daysSinceInstall = (Date.now() - die.installDate) / (1000 * 60 * 60 * 24)
      const newFailureProb = defaultPredictor.calculateFailureProbability(
        newAccumulation.damageAccumulated,
        daysSinceInstall
      )

      const updatedDie: DieHealthRecord = {
        ...die,
        currentHealth: newHealth,
        predictedRemainingLife: newRemainingLife.days,
        failureProbability: newFailureProb,
        stressAccumulation: newAccumulation,
        updatedAt: Date.now(),
      }

      await saveDieRecord(updatedDie)
      await publishStressUpdate(die.id, { stressAccumulation: newAccumulation })
      
      setDies(prev => prev.map(d => d.id === die.id ? updatedDie : d))
      setSelectedDie(updatedDie)
      setProcessingStatus('处理完成！')
      
      setTimeout(() => setProcessingStatus(''), 2000)
    } catch (error) {
      setProcessingStatus('处理失败：' + (error as Error).message)
    }
  }

  function showDieDetails(die: DieHealthRecord) {
    setSelectedDie(die)
  }

  function closeDetails() {
    setSelectedDie(null)
  }

  const getHealthColor = (health: number) => {
    if (health >= 70) return '#10b981'
    if (health >= 40) return '#f59e0b'
    return '#ef4444'
  }

  const averageHealth = () => {
    const dieList = dies()
    if (dieList.length === 0) return 0
    return dieList.reduce((sum, d) => sum + d.currentHealth, 0) / dieList.length
  }

  return (
    <div style={{
      'min-height': '100vh',
      'background': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'padding': '24px',
    }}>
      <div style={{ 'max-width': '1400px', 'margin': '0 auto' }}>
        <header style={{
          'background': 'white',
          'border-radius': '16px',
          'padding': '24px',
          'margin-bottom': '24px',
          'box-shadow': '0 10px 40px -10px rgba(0, 0, 0, 0.2)',
        }}>
          <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
            <div>
              <h1 style={{ margin: 0, 'font-size': '28px', 'font-weight': 700, color: '#1f2937' }}>
                PressPulse - 冲压模具疲劳寿命监测系统
              </h1>
              <p style={{ margin: '8px 0 0 0', color: '#6b7280', 'font-size': '14px' }}>
                基于雨流计数法的实时应力监测与寿命预测
              </p>
            </div>
            <div style={{ display: 'flex', gap: '16px', 'align-items': 'center' }}>
              <div style={{
                'background': '#f3f4f6',
                'padding': '12px 20px',
                'border-radius': '8px',
                'text-align': 'center',
              }}>
                <p style={{ margin: 0, 'font-size': '12px', color: '#6b7280' }}>模具总数</p>
                <p style={{ margin: '4px 0 0 0', 'font-size': '24px', 'font-weight': 700, color: '#1f2937' }}>
                  {dies().length}
                </p>
              </div>
              <div style={{
                'background': '#f3f4f6',
                'padding': '12px 20px',
                'border-radius': '8px',
                'text-align': 'center',
              }}>
                <p style={{ margin: 0, 'font-size': '12px', color: '#6b7280' }}>平均健康度</p>
                <p style={{
                  margin: '4px 0 0 0',
                  'font-size': '24px',
                  'font-weight': 700,
                  color: getHealthColor(averageHealth()),
                }}>
                  {averageHealth().toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </header>

        <div style={{ display: 'grid', 'grid-template-columns': '1fr 2fr', gap: '24px' }}>
          <div>
            <div style={{
              'background': 'white',
              'border-radius': '16px',
              'padding': '20px',
              'box-shadow': '0 10px 40px -10px rgba(0, 0, 0, 0.2)',
              'margin-bottom': '24px',
            }}>
              <h2 style={{ margin: '0 0 16px 0', 'font-size': '18px', 'font-weight': 600, color: '#1f2937' }}>
                系统健康度
              </h2>
              <div style={{ display: 'flex', 'justify-content': 'center' }}>
                <HealthGauge value={averageHealth()} size={180} />
              </div>
              <div style={{ 'margin-top': '20px' }}>
                <button
                  onClick={loadDieData}
                  style={{
                    'width': '100%',
                    'padding': '12px',
                    'background': '#667eea',
                    color: 'white',
                    'border': 'none',
                    'border-radius': '8px',
                    'font-size': '14px',
                    'font-weight': 500,
                    'cursor': 'pointer',
                    'transition': 'background 0.2s',
                    ':hover': {
                      'background': '#5a67d8',
                    },
                  }}
                >
                  刷新数据
                </button>
              </div>
            </div>

            <div style={{
              'background': 'white',
              'border-radius': '16px',
              'padding': '20px',
              'box-shadow': '0 10px 40px -10px rgba(0, 0, 0, 0.2)',
            }}>
              <h2 style={{ margin: '0 0 16px 0', 'font-size': '18px', 'font-weight': 600, color: '#1f2937' }}>
                同步状态
              </h2>
              <div style={{ display: 'flex', 'flex-direction': 'column', gap: '12px' }}>
                <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>待同步项</span>
                  <span style={{ 'font-weight': 600 }}>{synchronizer.syncStatus().pendingChanges}</span>
                </div>
                <div style={{ display: 'flex', 'justify-content': 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>同步状态</span>
                  <span style={{ 'font-weight': 600, color: '#10b981' }}>
                    {synchronizer.syncStatus().syncState === 'idle' ? '空闲' :
                     synchronizer.syncStatus().syncState === 'syncing' ? '同步中' : '错误'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div style={{
              'background': 'white',
              'border-radius': '16px',
              'padding': '20px',
              'box-shadow': '0 10px 40px -10px rgba(0, 0, 0, 0.2)',
            }}>
              <h2 style={{ margin: '0 0 20px 0', 'font-size': '18px', 'font-weight': 600, color: '#1f2937' }}>
                模具列表
              </h2>
              <div style={{
                display: 'grid',
                'grid-template-columns': 'repeat(2, 1fr)',
                gap: '20px',
              }}>
                <For each={dies()}>
                  {(die) => <DieCard record={die} onClick={() => showDieDetails(die)} />}
                </For>
              </div>
            </div>
          </div>
        </div>

        {selectedDie() && (
          <div style={{
            'position': 'fixed',
            'top': 0,
            'left': 0,
            'right': 0,
            'bottom': 0,
            'background': 'rgba(0, 0, 0, 0.5)',
            'display': 'flex',
            'justify-content': 'center',
            'align-items': 'center',
            'z-index': 1000,
          }}>
            <div style={{
              'background': 'white',
              'border-radius': '16px',
              'padding': '24px',
              'width': '90%',
              'max-width': '800px',
              'max-height': '90vh',
              'overflow-y': 'auto',
            }}>
              <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'margin-bottom': '20px' }}>
                <h2 style={{ margin: 0, 'font-size': '24px', 'font-weight': 600, color: '#1f2937' }}>
                  {selectedDie()!.name} - 详细信息
                </h2>
                <button
                  onClick={closeDetails}
                  style={{
                    'background': 'none',
                    'border': 'none',
                    'font-size': '24px',
                    'cursor': 'pointer',
                    color: '#6b7280',
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ display: 'grid', 'grid-template-columns': '1fr 2fr', gap: '24px', 'margin-bottom': '24px' }}>
                <div style={{ display: 'flex', 'justify-content': 'center' }}>
                  <HealthGauge value={selectedDie()!.currentHealth} size={160} label="健康度" />
                </div>
                <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '16px' }}>
                  <div style={{ 'background': '#f9fafb', 'padding': '16px', 'border-radius': '8px' }}>
                    <p style={{ margin: 0, 'font-size': '12px', color: '#6b7280' }}>剩余寿命</p>
                    <p style={{ margin: '4px 0 0 0', 'font-size': '24px', 'font-weight': 700, color: '#1f2937' }}>
                      {selectedDie()!.predictedRemainingLife} 天
                    </p>
                  </div>
                  <div style={{ 'background': '#f9fafb', 'padding': '16px', 'border-radius': '8px' }}>
                    <p style={{ margin: 0, 'font-size': '12px', color: '#6b7280' }}>失效概率</p>
                    <p style={{ margin: '4px 0 0 0', 'font-size': '24px', 'font-weight': 700, color: '#1f2937' }}>
                      {(selectedDie()!.failureProbability * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div style={{ 'background': '#f9fafb', 'padding': '16px', 'border-radius': '8px' }}>
                    <p style={{ margin: 0, 'font-size': '12px', color: '#6b7280' }}>累计周期</p>
                    <p style={{ margin: '4px 0 0 0', 'font-size': '24px', 'font-weight': 700, color: '#1f2937' }}>
                      {selectedDie()!.stressAccumulation.totalCycles.toFixed(0)}
                    </p>
                  </div>
                  <div style={{ 'background': '#f9fafb', 'padding': '16px', 'border-radius': '8px' }}>
                    <p style={{ margin: 0, 'font-size': '12px', color: '#6b7280' }}>累计损伤</p>
                    <p style={{ margin: '4px 0 0 0', 'font-size': '24px', 'font-weight': 700, color: '#1f2937' }}>
                      {(selectedDie()!.stressAccumulation.damageAccumulated * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ 'margin-bottom': '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', 'font-size': '16px', 'font-weight': 600, color: '#1f2937' }}>
                  应力分布
                </h3>
                <StressChart cycles={selectedDie()!.stressAccumulation.cycleHistory.slice(0, 20)} />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={processNewSensorData}
                  style={{
                    'flex': 1,
                    'padding': '14px',
                    'background': '#10b981',
                    color: 'white',
                    'border': 'none',
                    'border-radius': '8px',
                    'font-size': '14px',
                    'font-weight': 500,
                    'cursor': 'pointer',
                    'transition': 'background 0.2s',
                    ':hover': {
                      'background': '#059669',
                    },
                  }}
                >
                  模拟传感器数据处理
                </button>
                <button
                  onClick={closeDetails}
                  style={{
                    'padding': '14px 24px',
                    'background': '#6b7280',
                    color: 'white',
                    'border': 'none',
                    'border-radius': '8px',
                    'font-size': '14px',
                    'font-weight': 500,
                    'cursor': 'pointer',
                    'transition': 'background 0.2s',
                    ':hover': {
                      'background': '#4b5563',
                    },
                  }}
                >
                  关闭
                </button>
              </div>

              {processingStatus() && (
                <div style={{
                  'margin-top': '16px',
                  'padding': '12px',
                  'background': '#f0fdf4',
                  'border': '1px solid #86efac',
                  'border-radius': '8px',
                  'text-align': 'center',
                  color: '#166534',
                }}>
                  {processingStatus()}
                </div>
              )}
            </div>
          </div>
        )}

        <footer style={{
          'margin-top': '24px',
          'text-align': 'center',
          color: 'rgba(255, 255, 255, 0.8)',
          'font-size': '14px',
        }}>
          <p>PressPulse © 2024 - 冲压模具疲劳寿命演化系统 | 基于 SolidJS + IndexedDB</p>
        </footer>
      </div>
    </div>
  )
}

export default App
