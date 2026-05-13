<script>
  import { onMount, onDestroy, $state, $effect } from 'svelte'
  import SiloCanvas from './lib/components/SiloCanvas.svelte'
  import ControlPanel from './lib/components/ControlPanel.svelte'
  import QualityMonitor from './lib/components/QualityMonitor.svelte'
  import ProductionSchedule from './lib/components/ProductionSchedule.svelte'
  import { DEMEngine } from './lib/dem/DEMEngine.js'
  import { MaterialDB } from './lib/database/MaterialDB.js'

  let particles = $state([])
  let wallPressures = $state({ left: 0, right: 0, bottom: 0 })
  let segregationIndex = $state(0)
  let isRunning = $state(false)
  let materials = $state([])
  let schedules = $state([])

  let demEngine
  let materialDB
  let animationFrame

  const materialConfig = {
    ore: { density: 2.8, radius: 12 },
    gravel: { density: 2.2, radius: 10 },
    sand: { density: 1.6, radius: 6 },
    cement: { density: 3.1, radius: 4 },
    coal: { density: 1.3, radius: 8 }
  }

  onMount(async () => {
    demEngine = new DEMEngine(500, 600)
    materialDB = new MaterialDB()
    
    try {
      await materialDB.init()
      const savedMaterials = await materialDB.getAllMaterials()
      materials = savedMaterials
      
      await addSampleMaterials()
    } catch (e) {
      console.log('IndexedDB not available, using in-memory storage')
    }
  })

  onDestroy(() => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame)
    }
    if (demEngine) {
      demEngine.stop()
    }
  })

  async function addSampleMaterials() {
    const sampleMaterials = [
      {
        batchId: 'BATCH-001',
        type: 'ore',
        supplier: '宝山矿业',
        purity: 92.5,
        moisture: 3.2,
        quality: 'excellent',
        timestamp: Date.now() - 86400000
      },
      {
        batchId: 'BATCH-002',
        type: 'gravel',
        supplier: '华东砂石',
        purity: 88.0,
        moisture: 4.5,
        quality: 'good',
        timestamp: Date.now() - 43200000
      },
      {
        batchId: 'BATCH-003',
        type: 'sand',
        supplier: '江河建材',
        purity: 85.5,
        moisture: 5.8,
        quality: 'fair',
        timestamp: Date.now()
      }
    ]

    for (const mat of sampleMaterials) {
      try {
        await materialDB.addMaterial(mat)
      } catch (e) {
      }
    }
    
    materials = await materialDB.getAllMaterials()
  }

  async function addMaterial(type, count) {
    const config = materialConfig[type]
    
    for (let i = 0; i < count; i++) {
      const x = 100 + Math.random() * 300
      const y = 50 + Math.random() * 50
      
      demEngine.addParticle(x, y, config.radius, config.density, type)
    }
    
    particles = demEngine.particles.map(p => ({
      id: p.id,
      x: p.x,
      y: p.y,
      radius: p.radius,
      color: p.color,
      type: p.type,
      vx: p.vx,
      vy: p.vy
    }))
  }

  async function startSimulation() {
    isRunning = true
    
    async function simulate() {
      if (!isRunning) return
      
      const result = await demEngine.step(0.016)
      particles = result.particles
      wallPressures = result.wallPressures
      segregationIndex = demEngine.getSegregationIndex()
      
      animationFrame = requestAnimationFrame(simulate)
    }
    
    simulate()
  }

  function stopSimulation() {
    isRunning = false
    if (animationFrame) {
      cancelAnimationFrame(animationFrame)
    }
  }

  function resetSimulation() {
    stopSimulation()
    demEngine = new DEMEngine(500, 600)
    particles = []
    wallPressures = { left: 0, right: 0, bottom: 0 }
    segregationIndex = 0
  }

  async function handleScheduleAdd(schedule) {
    schedules = [...schedules, schedule]
    
    const material = {
      batchId: `BATCH-${Date.now()}`,
      type: schedule.materialType,
      supplier: '自动调度',
      purity: 85 + Math.random() * 10,
      moisture: 3 + Math.random() * 4,
      quality: ['poor', 'fair', 'good', 'excellent'][Math.floor(Math.random() * 4)],
      timestamp: Date.now()
    }
    
    try {
      await materialDB.addMaterial(material)
      materials = await materialDB.getAllMaterials()
    } catch (e) {
      materials = [...materials, material]
    }
  }
</script>

<div class="app">
  <header class="header">
    <div class="header-content">
      <div class="logo">
        <div class="logo-icon">🏭</div>
        <div class="logo-text">
          <h1>SiloLogic</h1>
          <p>工业料仓物料偏析模拟系统</p>
        </div>
      </div>
      <div class="header-stats">
        <div class="stat">
          <span class="stat-label">粒子数</span>
          <span class="stat-value">{particles.length}</span>
        </div>
        <div class="stat">
          <span class="stat-label">批次</span>
          <span class="stat-value">{materials.length}</span>
        </div>
        <div class="stat">
          <span class="stat-label">状态</span>
          <span class="stat-value" style="color: {isRunning ? '#10b981' : '#f59e0b'}">
            {isRunning ? '运行中' : '已暂停'}
          </span>
        </div>
      </div>
    </div>
  </header>

  <main class="main-content">
    <div class="grid-container">
      <div class="panel-left">
        <ControlPanel
          {isRunning}
          particleCount={particles.length}
          onStart={startSimulation}
          onStop={stopSimulation}
          onReset={resetSimulation}
          onAddMaterial={addMaterial}
        />
      </div>

      <div class="panel-center">
        <div class="canvas-wrapper">
          <SiloCanvas
            width={500}
            height={600}
            {particles}
            {wallPressures}
          />
        </div>
        <div class="canvas-info">
          <div class="info-item">
            <span class="info-label">DEM离散元算法 | 空间哈希优化</span>
          </div>
        </div>
      </div>

      <div class="panel-right-top">
        <QualityMonitor
          {materials}
          {wallPressures}
          {segregationIndex}
        />
      </div>

      <div class="panel-right-bottom">
        <ProductionSchedule
          {schedules}
          onScheduleAdd={handleScheduleAdd}
        />
      </div>
    </div>
  </main>

  <style>
    .app {
      min-height: 100vh;
      background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1428 100%);
    }

    .header {
      background: rgba(10, 14, 39, 0.95);
      border-bottom: 1px solid #2d3748;
      padding: 16px 32px;
      backdrop-filter: blur(10px);
    }

    .header-content {
      max-width: 1600px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .logo-icon {
      font-size: 40px;
    }

    .logo-text h1 {
      margin: 0;
      color: #e2e8f0;
      font-size: 24px;
      font-weight: 700;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .logo-text p {
      margin: 0;
      color: #94a3b8;
      font-size: 12px;
    }

    .header-stats {
      display: flex;
      gap: 32px;
    }

    .stat {
      text-align: center;
    }

    .stat-label {
      display: block;
      color: #64748b;
      font-size: 12px;
      margin-bottom: 4px;
    }

    .stat-value {
      color: #e2e8f0;
      font-size: 18px;
      font-weight: 600;
    }

    .main-content {
      max-width: 1600px;
      margin: 0 auto;
      padding: 24px 32px;
    }

    .grid-container {
      display: grid;
      grid-template-columns: 280px 540px 1fr;
      grid-template-rows: auto auto;
      gap: 20px;
    }

    .panel-left {
      grid-row: 1 / 3;
    }

    .panel-center {
      grid-row: 1 / 3;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .canvas-wrapper {
      background: rgba(30, 41, 59, 0.3);
      border-radius: 12px;
      padding: 20px;
      border: 1px solid #2d3748;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .canvas-info {
      text-align: center;
      padding: 8px;
    }

    .info-label {
      color: #64748b;
      font-size: 12px;
    }

    .panel-right-top {
      grid-column: 3;
      grid-row: 1;
    }

    .panel-right-bottom {
      grid-column: 3;
      grid-row: 2;
    }

    @media (max-width: 1400px) {
      .grid-container {
        grid-template-columns: 280px 540px;
        grid-template-rows: auto auto auto;
      }
      
      .panel-right-top,
      .panel-right-bottom {
        grid-column: 1 / 3;
      }
    }
  </style>
</div>
