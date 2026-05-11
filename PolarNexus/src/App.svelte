<script>
  import { onMount, onDestroy } from 'svelte';
  import { 
    iceConcentrationData, 
    currentYear, 
    selectedRegion, 
    isPlaying, 
    playbackSpeed,
    seaLevelTrend,
    albedoData,
    stats
  } from './store.js';
  
  import { SpatioTemporalInterpolation, generateSimulatedIceData } from './lib/spatioTemporalInterpolation.js';
  import { climateDB } from './lib/indexedDBStorage.js';
  import { AlbedoFeedbackRenderer, calculateAlbedoFeedback } from './lib/albedoFeedback.js';
  import { SeaLevelAnalyzer } from './lib/seaLevelAnalysis.js';
  
  let canvasEl;
  let chartEl;
  let albedoRenderer = null;
  let seaLevelAnalyzer = null;
  let interpolationEngine = null;
  let animationInterval = null;
  
  let dbStats = { iceConcentration: 0, seaLevel: 0, albedo: 0, satelliteImages: 0 };
  let loading = true;
  let activeTab = 'visualization';
  
  const years = Array.from({ length: 35 }, (_, i) => 1990 + i);
  
  onMount(async () => {
    await initApp();
    loading = false;
  });
  
  onDestroy(() => {
    if (albedoRenderer) albedoRenderer.dispose();
    if (animationInterval) clearInterval(animationInterval);
  });
  
  async function initApp() {
    interpolationEngine = new SpatioTemporalInterpolation({
      resolution: 100,
      timeSteps: 12
    });
    
    seaLevelAnalyzer = new SeaLevelAnalyzer();
    
    await climateDB.init();
    await loadOrGenerateData();
    
    dbStats = await climateDB.getStats();
    
    if (canvasEl) {
      albedoRenderer = new AlbedoFeedbackRenderer(canvasEl);
      albedoRenderer.start();
    }
    
    startAnimation();
  }
  
  async function loadOrGenerateData() {
    const savedData = await climateDB.getIceConcentrationRange(1990, 2024, 'arctic');
    
    if (savedData.length === 0) {
      const allData = [];
      for (let year = 1990; year <= 2024; year++) {
        const yearData = generateSimulatedIceData(year, 7, 'arctic');
        allData.push(...yearData);
      }
      await climateDB.saveIceConcentrationData(allData);
      $iceConcentrationData = allData;
    } else {
      $iceConcentrationData = savedData;
    }
    
    const seaLevelData = seaLevelAnalyzer.generateHistoricalData(1990, 2024);
    for (const d of seaLevelData) {
      await climateDB.saveSeaLevelData(d.year, d.level);
    }
    $seaLevelTrend = {
      years: seaLevelData.map(d => d.year),
      levels: seaLevelData.map(d => d.level),
      rate: 3.2
    };
    
    seaLevelAnalyzer.projectSeaLevelRise('moderate', 100);
  }
  
  function startAnimation() {
    animationInterval = setInterval(() => {
      if ($isPlaying) {
        $currentYear += $playbackSpeed * 0.1;
        if ($currentYear > 2024) $currentYear = 1990;
        
        const yearIdx = Math.floor($currentYear) - 1990;
        const yearData = $iceConcentrationData.filter(d => Math.floor(d.year) === Math.floor($currentYear));
        
        if (yearData.length > 0) {
          const avgConcentration = yearData.reduce((sum, d) => sum + d.concentration, 0) / yearData.length;
          
          if (albedoRenderer) {
            albedoRenderer.updateIceConcentration(avgConcentration);
            albedoRenderer.updateAlbedo(0.1 + avgConcentration * 0.6);
          }
          
          $albedoData = {
            current: 0.1 + avgConcentration * 0.6,
            historical: [],
            feedbackStrength: 0.4
          };
        }
      }
    }, 100);
  }
  
  function togglePlay() {
    $isPlaying = !$isPlaying;
  }
  
  function setYear(year) {
    $currentYear = year;
    $isPlaying = false;
    
    const yearData = $iceConcentrationData.filter(d => Math.floor(d.year) === Math.floor(year));
    
    if (yearData.length > 0 && albedoRenderer) {
      const avgConcentration = yearData.reduce((sum, d) => sum + d.concentration, 0) / yearData.length;
      albedoRenderer.updateIceConcentration(avgConcentration);
      albedoRenderer.updateAlbedo(0.1 + avgConcentration * 0.6);
    }
  }
  
  function handleRegionChange(region) {
    $selectedRegion = region;
  }
  
  async function regenerateData() {
    loading = true;
    await climateDB.clearAllData();
    await loadOrGenerateData();
    dbStats = await climateDB.getStats();
    loading = false;
  }
</script>

<div class="app">
  <header class="header">
    <div class="logo">
      <svg viewBox="0 0 40 40" width="40" height="40">
        <circle cx="20" cy="20" r="18" fill="#1a2a4a" stroke="#4da6ff" stroke-width="2"/>
        <circle cx="20" cy="20" r="12" fill="#0a1a2a"/>
        <path d="M20 8 L24 16 L20 14 L16 16 Z" fill="#8ec8ff"/>
        <path d="M20 32 L24 24 L20 26 L16 24 Z" fill="#8ec8ff"/>
      </svg>
      <h1>PolarNexus</h1>
    </div>
    <div class="subtitle">极地冰盖演化与全球气候预测系统</div>
  </header>

  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>正在初始化数据...</p>
    </div>
  {:else}
    <nav class="tabs">
      {#each ['visualization', 'analysis', 'database'] as tab}
        <button 
          class="tab {activeTab === tab ? 'active' : ''}"
          on:click={() => activeTab = tab}
        >
          {tab === 'visualization' ? '冰盖可视化' : tab === 'analysis' ? '趋势分析' : '数据存储'}
        </button>
      {/each}
    </nav>

    <main class="content">
      {#if activeTab === 'visualization'}
        <div class="visualization-panel">
          <div class="controls">
            <div class="region-selector">
              <label>区域选择:</label>
              <div class="region-buttons">
                <button 
                  class="region-btn {$selectedRegion === 'arctic' ? 'active' : ''}"
                  on:click={() => handleRegionChange('arctic')}
                >北极</button>
                <button 
                  class="region-btn {$selectedRegion === 'antarctic' ? 'active' : ''}"
                  on:click={() => handleRegionChange('antarctic')}
                >南极</button>
              </div>
            </div>

            <div class="timeline">
              <div class="timeline-header">
                <span>年份: {$currentYear.toFixed(1)}</span>
                <div class="playback-controls">
                  <button class="play-btn" on:click={togglePlay}>
                    {$isPlaying ? '⏸' : '▶'}
                  </button>
                </div>
              </div>
              <input 
                type="range" 
                min="1990" 
                max="2024" 
                step="0.1"
                bind:value={$currentYear}
                on:input={(e) => setYear(parseFloat(e.target.value))}
                class="year-slider"
              />
              <div class="speed-control">
                <label>播放速度:</label>
                <input 
                  type="range" 
                  min="0.1" 
                  max="5" 
                  step="0.1"
                  bind:value={$playbackSpeed}
                />
                <span>{$playbackSpeed.toFixed(1)}x</span>
              </div>
            </div>
          </div>

          <div class="visualization-grid">
            <div class="viz-card">
              <h3>反照率动能反馈模拟</h3>
              <canvas bind:this={canvasEl} class="three-canvas"></canvas>
              <div class="viz-stats">
                <div class="stat-item">
                  <span class="label">当前反照率:</span>
                  <span class="value">{($albedoData.current * 100).toFixed(1)}%</span>
                </div>
                <div class="stat-item">
                  <span class="label">反馈强度:</span>
                  <span class="value">{($albedoData.feedbackStrength * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div class="viz-card">
              <h3>海冰密集度热力图</h3>
              <div class="heatmap-container">
                <svg viewBox="0 0 400 200" class="heatmap-svg">
                  {#each Array.from({ length: 50 }, (_, i) => i) as row}
                    {#each Array.from({ length: 100 }, (_, j) => j) as col}
                      {@const lat = 90 - (row / 50) * 60}
                      {@const lon = (col / 100) * 360 - 180}
                      {@const distFromPole = (90 - Math.abs(lat)) / 30}
                      {@const yearFactor = (($currentYear - 1990) / 34) * 0.3}
                      {@const seasonal = Math.sin(($currentYear % 1) * Math.PI * 2) * 0.1}
                      {@const concentration = Math.max(0, Math.min(1, 
                        (1 - distFromPole * distFromPole) - yearFactor + seasonal
                      ))}
                      <rect
                        x={col * 4}
                        y={row * 4}
                        width={4}
                        height={4}
                        fill={`rgb(${Math.floor(20 + concentration * 60)}, ${Math.floor(50 + concentration * 100)}, ${Math.floor(100 + concentration * 155)})`}
                        opacity={0.7 + concentration * 0.3}
                      />
                    {/each}
                  {/each}
                </svg>
              </div>
              <div class="legend">
                <span class="legend-item">
                  <span class="color-box low"></span> 低 (0%)
                </span>
                <span class="legend-item">
                  <span class="color-box mid"></span> 中 (50%)
                </span>
                <span class="legend-item">
                  <span class="color-box high"></span> 高 (100%)
                </span>
              </div>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon">❄️</div>
              <div class="stat-content">
                <div class="stat-value">{($stats.avgConcentration * 100).toFixed(1)}%</div>
                <div class="stat-label">平均海冰密集度</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">📐</div>
              <div class="stat-content">
                <div class="stat-value">{($stats.totalArea / 1000).toFixed(1)}k</div>
                <div class="stat-label">冰盖总面积 (km²)</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">📉</div>
              <div class="stat-content">
                <div class="stat-value">{$seaLevelTrend.rate.toFixed(2)}</div>
                <div class="stat-label">海平面上升率 (mm/年)</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">💾</div>
              <div class="stat-content">
                <div class="stat-value">{dbStats.iceConcentration}</div>
                <div class="stat-label">已存储数据点</div>
              </div>
            </div>
          </div>
        </div>
      {/if}

      {#if activeTab === 'analysis'}
        <div class="analysis-panel">
          <h2>海平面上升趋势分析</h2>
          
          <div class="chart-container" bind:this={chartEl}>
            <svg viewBox="0 0 800 400" class="trend-chart">
              <defs>
                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#4da6ff" stop-opacity="0.3"/>
                  <stop offset="100%" stop-color="#4da6ff" stop-opacity="0"/>
                </linearGradient>
              </defs>
              
              <g class="axes">
                <line x1="50" y1="350" x2="750" y2="350" stroke="#4a5568" stroke-width="1"/>
                <line x1="50" y1="50" x2="50" y2="350" stroke="#4a5568" stroke-width="1"/>
                
                {#each [0, 25, 50, 75, 100, 125, 150] as tick}
                  <text x="45" y={350 - tick * 2} text-anchor="end" fill="#a0aec0">{tick} mm</text>
                  <line x1="50" y1={350 - tick * 2} x2="55" y2={350 - tick * 2} stroke="#4a5568"/>
                {/each}
                
                {#each [1990, 2000, 2010, 2020] as year}
                  <text x={50 + ((year - 1990) / 34) * 700} y="370" text-anchor="middle" fill="#a0aec0">{year}</text>
                {/each}
              </g>
              
              <path 
                d={
                  'M' + $seaLevelTrend.years.map((year, i) => 
                    `${50 + ((year - 1990) / 34) * 700},${350 - $seaLevelTrend.levels[i] * 2}`
                  ).join(' L')
                }
                fill="url(#areaGradient)"
                stroke="#4da6ff"
                stroke-width="2"
              />
              
              {#each $seaLevelTrend.years.filter((_, i) => i % 5 === 0) as year, i}
                <circle 
                  cx={50 + ((year - 1990) / 34) * 700}
                  cy={350 - $seaLevelTrend.levels[i * 5] * 2}
                  r="4"
                  fill="#4da6ff"
                />
              {/each}
            </svg>
          </div>

          <div class="projection-scenarios">
            <h3>未来情景预测</h3>
            <div class="scenario-cards">
              {#each [
                { name: '低排放', color: '#48bb78', rate: 0.01, desc: '碳中和实现' },
                { name: '中等排放', color: '#ed8936', rate: 0.025, desc: '当前趋势延续' },
                { name: '高排放', color: '#e53e3e', rate: 0.05, desc: '排放持续增加' }
              ] as scenario}
                <div class="scenario-card" style="--scenario-color: {scenario.color}">
                  <h4>{scenario.name}</h4>
                  <p class="scenario-desc">{scenario.desc}</p>
                  <p class="scenario-projection">
                    2100年预计上升: <strong>{(3.2 * 76 + scenario.rate * 76 * 76 / 2).toFixed(0)} mm</strong>
                  </p>
                </div>
              {/each}
            </div>
          </div>

          <div class="contribution-breakdown">
            <h3>海平面上升贡献分解 (2100年)</h3>
            <div class="breakdown-bars">
              {#each [
                { name: '热膨胀', value: 50, color: '#4299e1' },
                { name: '格陵兰冰盖', value: 25, color: '#805ad5' },
                { name: '南极冰盖', value: 15, color: '#38b2ac' },
                { name: '山地冰川', value: 10, color: '#f6ad55' }
              ] as item}
                <div class="breakdown-item">
                  <span class="breakdown-label">{item.name}</span>
                  <div class="breakdown-bar-container">
                    <div 
                      class="breakdown-bar" 
                      style="width: {item.value}%; background-color: {item.color}"
                    ></div>
                  </div>
                  <span class="breakdown-value">{item.value}%</span>
                </div>
              {/each}
            </div>
          </div>
        </div>
      {/if}

      {#if activeTab === 'database'}
        <div class="database-panel">
          <h2>IndexedDB 气候数据存储</h2>
          
          <div class="db-stats">
            <div class="db-stat-card">
              <h4>海冰密集度数据</h4>
              <div class="db-stat-value">{dbStats.iceConcentration}</div>
              <p>数据点数量</p>
            </div>
            <div class="db-stat-card">
              <h4>海平面数据</h4>
              <div class="db-stat-value">{dbStats.seaLevel}</div>
              <p>年度记录数</p>
            </div>
            <div class="db-stat-card">
              <h4>反照率数据</h4>
              <div class="db-stat-value">{dbStats.albedo}</div>
              <p>观测记录数</p>
            </div>
            <div class="db-stat-card">
              <h4>卫星影像</h4>
              <div class="db-stat-value">{dbStats.satelliteImages}</div>
              <p>影像存储数</p>
            </div>
          </div>

          <div class="db-actions">
            <button class="btn btn-primary" on:click={regenerateData}>
              重新生成模拟数据
            </button>
            <button class="btn btn-secondary" on:click={async () => {
              await climateDB.clearAllData();
              dbStats = await climateDB.getStats();
            }}>
              清空所有数据
            </button>
          </div>

          <div class="db-info">
            <h3>存储引擎特性</h3>
            <ul>
              <li>✅ 异步时空插值引擎 - 支持大规模卫星数据处理</li>
              <li>✅ IndexedDB 持久化存储 - 跨会话数据保留</li>
              <li>✅ 时间序列索引 - 快速年份范围查询</li>
              <li>✅ 区域索引 - 北极/南极数据分离存储</li>
              <li>✅ 数据版本管理 - 支持多情景模拟结果</li>
              <li>✅ 增量更新 - 高效处理实时数据流</li>
            </ul>
          </div>
        </div>
      {/if}
    </main>
  {/if}

  <footer class="footer">
    <p>PolarNexus © 2024 - 基于 Svelte 5 的极地气候分析平台</p>
  </footer>
</div>

<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  .app {
    min-height: 100vh;
    background: linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 50%, #0a1a2a 100%);
    color: #e0e8ff;
    font-family: 'Segoe UI', system-ui, sans-serif;
  }

  .header {
    padding: 1.5rem 2rem;
    background: rgba(10, 20, 40, 0.8);
    border-bottom: 1px solid rgba(77, 166, 255, 0.3);
    display: flex;
    align-items: center;
    justify-content: space-between;
    backdrop-filter: blur(10px);
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .logo h1 {
    font-size: 1.8rem;
    font-weight: 700;
    background: linear-gradient(90deg, #4da6ff, #8ec8ff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .subtitle {
    color: #a0a8c0;
    font-size: 0.95rem;
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem;
    gap: 1.5rem;
  }

  .spinner {
    width: 50px;
    height: 50px;
    border: 3px solid rgba(77, 166, 255, 0.2);
    border-top-color: #4da6ff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .tabs {
    display: flex;
    gap: 0.5rem;
    padding: 1rem 2rem;
    background: rgba(20, 30, 50, 0.5);
  }

  .tab {
    padding: 0.75rem 1.5rem;
    background: transparent;
    border: 1px solid rgba(77, 166, 255, 0.3);
    color: #a0a8c0;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s;
    font-size: 0.95rem;
  }

  .tab:hover {
    border-color: #4da6ff;
    color: #4da6ff;
  }

  .tab.active {
    background: linear-gradient(135deg, rgba(77, 166, 255, 0.2), rgba(142, 200, 255, 0.1));
    border-color: #4da6ff;
    color: #fff;
  }

  .content {
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
  }

  .controls {
    background: rgba(20, 40, 70, 0.6);
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 2rem;
    border: 1px solid rgba(77, 166, 255, 0.2);
  }

  .region-selector {
    margin-bottom: 1.5rem;
  }

  .region-selector label {
    display: block;
    margin-bottom: 0.75rem;
    color: #a0c8ff;
    font-weight: 500;
  }

  .region-buttons {
    display: flex;
    gap: 0.75rem;
  }

  .region-btn {
    padding: 0.6rem 1.5rem;
    background: rgba(30, 50, 80, 0.6);
    border: 1px solid rgba(77, 166, 255, 0.3);
    color: #c0d8ff;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s;
  }

  .region-btn:hover {
    border-color: #4da6ff;
    background: rgba(77, 166, 255, 0.1);
  }

  .region-btn.active {
    background: linear-gradient(135deg, #4da6ff, #2d8adf);
    color: white;
    border-color: #4da6ff;
  }

  .timeline {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .timeline-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .timeline-header span {
    font-size: 1.1rem;
    font-weight: 600;
    color: #4da6ff;
  }

  .play-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, #4da6ff, #2d8adf);
    border: none;
    color: white;
    cursor: pointer;
    font-size: 1rem;
    transition: transform 0.2s;
  }

  .play-btn:hover {
    transform: scale(1.1);
  }

  .year-slider {
    width: 100%;
    height: 8px;
    -webkit-appearance: none;
    background: linear-gradient(90deg, rgba(77, 166, 255, 0.2), rgba(77, 166, 255, 0.5));
    border-radius: 4px;
    outline: none;
  }

  .year-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    background: #4da6ff;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 0 10px rgba(77, 166, 255, 0.5);
  }

  .speed-control {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .speed-control label {
    color: #a0c8ff;
  }

  .speed-control input {
    flex: 1;
    max-width: 200px;
  }

  .visualization-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .viz-card {
    background: rgba(20, 40, 70, 0.6);
    border-radius: 12px;
    padding: 1.5rem;
    border: 1px solid rgba(77, 166, 255, 0.2);
  }

  .viz-card h3 {
    margin-bottom: 1rem;
    color: #8ec8ff;
    font-size: 1.1rem;
  }

  .three-canvas {
    width: 100%;
    height: 300px;
    border-radius: 8px;
    background: #0a1525;
  }

  .viz-stats {
    display: flex;
    gap: 2rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(77, 166, 255, 0.2);
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .stat-item .label {
    font-size: 0.85rem;
    color: #a0a8c0;
  }

  .stat-item .value {
    font-size: 1.1rem;
    font-weight: 600;
    color: #4da6ff;
  }

  .heatmap-container {
    width: 100%;
    aspect-ratio: 2 / 1;
    border-radius: 8px;
    overflow: hidden;
    background: #0a1525;
  }

  .heatmap-svg {
    width: 100%;
    height: 100%;
  }

  .legend {
    display: flex;
    justify-content: center;
    gap: 2rem;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(77, 166, 255, 0.2);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: #a0a8c0;
  }

  .color-box {
    width: 16px;
    height: 16px;
    border-radius: 3px;
  }

  .color-box.low {
    background: #1a3a5a;
  }

  .color-box.mid {
    background: #3a7aaa;
  }

  .color-box.high {
    background: #8ec8ff;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .stat-card {
    background: linear-gradient(135deg, rgba(77, 166, 255, 0.15), rgba(142, 200, 255, 0.05));
    border-radius: 12px;
    padding: 1.25rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    border: 1px solid rgba(77, 166, 255, 0.25);
  }

  .stat-icon {
    font-size: 2rem;
  }

  .stat-content {
    flex: 1;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #fff;
  }

  .stat-label {
    font-size: 0.85rem;
    color: #a0c8ff;
  }

  .analysis-panel h2 {
    margin-bottom: 1.5rem;
    color: #8ec8ff;
  }

  .chart-container {
    background: rgba(20, 40, 70, 0.6);
    border-radius: 12px;
    padding: 1.5rem;
    border: 1px solid rgba(77, 166, 255, 0.2);
    margin-bottom: 2rem;
  }

  .trend-chart {
    width: 100%;
    height: auto;
  }

  .projection-scenarios h3 {
    margin-bottom: 1rem;
    color: #8ec8ff;
  }

  .scenario-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .scenario-card {
    background: rgba(20, 40, 70, 0.6);
    border-radius: 12px;
    padding: 1.5rem;
    border-left: 4px solid var(--scenario-color);
  }

  .scenario-card h4 {
    color: var(--scenario-color);
    margin-bottom: 0.5rem;
  }

  .scenario-desc {
    color: #a0a8c0;
    font-size: 0.9rem;
    margin-bottom: 1rem;
  }

  .scenario-projection {
    font-size: 0.95rem;
  }

  .scenario-projection strong {
    color: var(--scenario-color);
  }

  .contribution-breakdown h3 {
    margin-bottom: 1rem;
    color: #8ec8ff;
  }

  .breakdown-bars {
    background: rgba(20, 40, 70, 0.6);
    border-radius: 12px;
    padding: 1.5rem;
    border: 1px solid rgba(77, 166, 255, 0.2);
  }

  .breakdown-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .breakdown-item:last-child {
    margin-bottom: 0;
  }

  .breakdown-label {
    width: 100px;
    font-size: 0.9rem;
    color: #c0d8ff;
  }

  .breakdown-bar-container {
    flex: 1;
    height: 24px;
    background: rgba(30, 50, 80, 0.6);
    border-radius: 12px;
    overflow: hidden;
  }

  .breakdown-bar {
    height: 100%;
    border-radius: 12px;
    transition: width 0.5s ease;
  }

  .breakdown-value {
    width: 50px;
    text-align: right;
    font-weight: 600;
    color: #4da6ff;
  }

  .database-panel h2 {
    margin-bottom: 1.5rem;
    color: #8ec8ff;
  }

  .db-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .db-stat-card {
    background: linear-gradient(135deg, rgba(77, 166, 255, 0.1), rgba(142, 200, 255, 0.05));
    border-radius: 12px;
    padding: 1.5rem;
    text-align: center;
    border: 1px solid rgba(77, 166, 255, 0.2);
  }

  .db-stat-card h4 {
    color: #a0c8ff;
    margin-bottom: 0.75rem;
    font-size: 0.95rem;
  }

  .db-stat-value {
    font-size: 2rem;
    font-weight: 700;
    color: #4da6ff;
    margin-bottom: 0.5rem;
  }

  .db-stat-card p {
    font-size: 0.85rem;
    color: #8892b0;
  }

  .db-actions {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 500;
    transition: all 0.3s;
  }

  .btn-primary {
    background: linear-gradient(135deg, #4da6ff, #2d8adf);
    color: white;
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 20px rgba(77, 166, 255, 0.4);
  }

  .btn-secondary {
    background: rgba(255, 100, 100, 0.2);
    color: #ff8080;
    border: 1px solid rgba(255, 100, 100, 0.3);
  }

  .btn-secondary:hover {
    background: rgba(255, 100, 100, 0.3);
  }

  .db-info {
    background: rgba(20, 40, 70, 0.6);
    border-radius: 12px;
    padding: 1.5rem;
    border: 1px solid rgba(77, 166, 255, 0.2);
  }

  .db-info h3 {
    color: #8ec8ff;
    margin-bottom: 1rem;
  }

  .db-info ul {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .db-info li {
    color: #c0d8ff;
    padding-left: 0.5rem;
  }

  .footer {
    text-align: center;
    padding: 1.5rem;
    color: #6b7280;
    font-size: 0.85rem;
    border-top: 1px solid rgba(77, 166, 255, 0.1);
  }
</style>
