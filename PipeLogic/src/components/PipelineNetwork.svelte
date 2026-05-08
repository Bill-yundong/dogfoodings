<script>
  let { pipelineData, pressureData, leakPoints } = $props()
  
  function getPressureColor(pressure) {
    if (pressure < 3) return '#ff4444' // 低压力
    if (pressure < 7) return '#ffbb33' // 中等压力
    return '#00C851' // 正常压力
  }
  
  function getLeakIntensity(leak) {
    return leak.intensity || 1
  }
</script>

<div class="pipeline-network">
  <h2>管网压力分布</h2>
  <div class="network-container">
    <svg width="1000" height="1000" viewBox="0 0 1000 1000">
      <!-- 绘制管线 -->
      {#each pipelineData.slice(0, 1000) as node, index}
        {#if index < pipelineData.length - 1}
          <line 
            x1={node.x} 
            y1={node.y} 
            x2={pipelineData[index + 1].x} 
            y2={pipelineData[index + 1].y} 
            stroke={getPressureColor(pressureData[node.id] || node.pressure)} 
            stroke-width="2" 
          />
        {/if}
      {/each}
      
      <!-- 绘制节点 -->
      {#each pipelineData.slice(0, 1000) as node}
        <circle 
          cx={node.x} 
          cy={node.y} 
          r="3" 
          fill={getPressureColor(pressureData[node.id] || node.pressure)} 
        />
      {/each}
      
      <!-- 标记渗漏点 -->
      {#each leakPoints as leak}
        <circle 
          cx={leak.x} 
          cy={leak.y} 
          r={5 + getLeakIntensity(leak) * 3} 
          fill="#ff0000" 
          opacity="0.7" 
        />
        <circle 
          cx={leak.x} 
          cy={leak.y} 
          r={10 + getLeakIntensity(leak) * 5} 
          fill="#ff0000" 
          opacity="0.3" 
        />
      {/each}
    </svg>
  </div>
  
  <div class="legend">
    <div class="legend-item">
      <div class="color-box" style="background-color: #00C851"></div>
      <span>正常压力</span>
    </div>
    <div class="legend-item">
      <div class="color-box" style="background-color: #ffbb33"></div>
      <span>中等压力</span>
    </div>
    <div class="legend-item">
      <div class="color-box" style="background-color: #ff4444"></div>
      <span>低压力</span>
    </div>
    <div class="legend-item">
      <div class="color-box" style="background-color: #ff0000; opacity: 0.7"></div>
      <span>渗漏点</span>
    </div>
  </div>
</div>

<style>
  .pipeline-network {
    margin: 20px 0;
  }
  
  h2 {
    color: #333;
    margin-bottom: 20px;
  }
  
  .network-container {
    border: 1px solid #ddd;
    border-radius: 8px;
    overflow: auto;
    background: #f9f9f9;
  }
  
  svg {
    display: block;
  }
  
  .legend {
    display: flex;
    gap: 20px;
    margin-top: 20px;
    padding: 10px;
    background: #f5f5f5;
    border-radius: 8px;
  }
  
  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .color-box {
    width: 20px;
    height: 20px;
    border-radius: 4px;
  }
</style>