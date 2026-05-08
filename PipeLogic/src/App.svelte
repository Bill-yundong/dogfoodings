<script>
  import { onMount } from 'svelte'
  import PipelineNetwork from './components/PipelineNetwork.svelte'
  import FluidDynamicsEngine from './utils/FluidDynamicsEngine.js'
  import IndexedDBCache from './utils/IndexedDBCache.js'
  
  let pipelineData = []
  let pressureData = {}
  let leakPoints = []
  let isLoading = true
  let cache = null
  let engine = null
  
  onMount(async () => {
    // 初始化缓存
    cache = new IndexedDBCache('pipeline_cache')
    await cache.init()
    
    // 初始化流体动力学引擎
    engine = new FluidDynamicsEngine()
    
    // 加载管线数据
    await loadPipelineData()
    
    // 模拟压力数据
    await simulatePressureData()
    
    // 检测渗漏点
    detectLeakPoints()
    
    isLoading = false
  })
  
  async function loadPipelineData() {
    // 从缓存加载数据
    const cachedData = await cache.get('pipeline_data')
    if (cachedData) {
      pipelineData = cachedData
      return
    }
    
    // 生成模拟数据
    pipelineData = generateMockPipelineData()
    
    // 缓存数据
    await cache.set('pipeline_data', pipelineData)
  }
  
  function generateMockPipelineData() {
    const data = []
    // 生成10000个管线节点
    for (let i = 0; i < 10000; i++) {
      data.push({
        id: i,
        x: Math.random() * 1000,
        y: Math.random() * 1000,
        pressure: 5 + Math.random() * 10,
        flow: 1 + Math.random() * 5,
        diameter: 0.3 + Math.random() * 0.7
      })
    }
    return data
  }
  
  async function simulatePressureData() {
    // 模拟压力数据
    pressureData = await engine.simulate(pipelineData)
    
    // 缓存压力数据
    await cache.set('pressure_data', pressureData)
  }
  
  function detectLeakPoints() {
    // 检测渗漏点
    leakPoints = engine.detectLeaks(pressureData, pipelineData)
  }
</script>

<div class="app">
  <header>
    <h1>地下管网渗漏压力模拟系统</h1>
    <p>基于 Svelte 5 的流体动力学模拟与隐患点定位</p>
  </header>
  
  {#if isLoading}
    <div class="loading">加载中...</div>
  {:else}
    <main>
      <PipelineNetwork 
        pipelineData={pipelineData} 
        pressureData={pressureData} 
        leakPoints={leakPoints} 
      />
      
      <div class="stats">
        <div class="stat-item">
          <span class="label">总管线节点数:</span>
          <span class="value">{pipelineData.length}</span>
        </div>
        <div class="stat-item">
          <span class="label">检测到的渗漏点:</span>
          <span class="value">{leakPoints.length}</span>
        </div>
        <div class="stat-item">
          <span class="label">系统状态:</span>
          <span class="value">正常运行</span>
        </div>
      </div>
    </main>
  {/if}
  
  <footer>
    <p>© 2026 地下管网维护系统 | 基于 Svelte 5 开发</p>
  </footer>
</div>

<style>
  .app {
    font-family: Arial, sans-serif;
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
  }
  
  header {
    text-align: center;
    margin-bottom: 40px;
  }
  
  h1 {
    color: #333;
    font-size: 2.5rem;
  }
  
  .loading {
    text-align: center;
    padding: 100px;
    font-size: 1.5rem;
    color: #666;
  }
  
  .stats {
    display: flex;
    justify-content: space-around;
    margin-top: 40px;
    padding: 20px;
    background: #f5f5f5;
    border-radius: 8px;
  }
  
  .stat-item {
    text-align: center;
  }
  
  .label {
    display: block;
    font-size: 0.9rem;
    color: #666;
    margin-bottom: 5px;
  }
  
  .value {
    display: block;
    font-size: 1.5rem;
    font-weight: bold;
    color: #333;
  }
  
  footer {
    text-align: center;
    margin-top: 60px;
    padding: 20px;
    border-top: 1px solid #eee;
    color: #666;
  }
</style>