<script>
  import { onMount } from 'svelte'
  import { faultTreeData } from '../store.js'
  import { faultTreeSimulator } from '../services/FaultTreeSimulator.js'

  let isSimulating = $state(false)
  let simulationResult = $state(null)
  let selectedNode = $state(null)

  onMount(() => {
    const data = faultTreeSimulator.createStandardFaultTree()
    faultTreeData.set(data)
  })

  async function startSimulation() {
    isSimulating = true
    const initialTriggers = ['BASIC-001', 'BASIC-003']
    simulationResult = await faultTreeSimulator.simulateEvolutionAsync(initialTriggers)
    faultTreeData.set(faultTreeSimulator.getFaultTreeData())
    isSimulating = false
  }

  function resetSimulation() {
    faultTreeSimulator.resetSimulation()
    faultTreeData.set(faultTreeSimulator.getFaultTreeData())
    simulationResult = null
  }

  let predictionResult = $state(null)

  function predictRisk() {
    const initialNode = selectedNode?.id || 'BASIC-001'
    predictionResult = faultTreeSimulator.predictCascadingRisk([initialNode])
  }

  function clearPrediction() {
    predictionResult = null
  }

  function getNodeColor(node) {
    if (node.status === 'triggered') return '#ef4444'
    if (node.type === 'top') return '#8b5cf6'
    if (node.type === 'and') return '#f59e0b'
    if (node.type === 'or') return '#3b82f6'
    return '#22c55e'
  }

  function getRiskColor(level) {
    switch (level) {
      case 'low': return '#22c55e'
      case 'medium': return '#f59e0b'
      case 'high': return '#ef4444'
      case 'critical': return '#dc2626'
      default: return '#64748b'
    }
  }

  function getNodeX(node) {
    const xMap = {
      'TOP-001': 400,
      'AND-001': 250, 'AND-002': 550,
      'OR-001': 150, 'OR-002': 350,
      'BASIC-001': 50, 'BASIC-002': 130, 'BASIC-007': 210,
      'BASIC-003': 290, 'BASIC-004': 370, 'BASIC-008': 450,
      'BASIC-005': 490, 'BASIC-006': 610
    }
    return xMap[node.id] || 400
  }

  function getNodeY(node) {
    const yMap = {
      'TOP-001': 50,
      'AND-001': 150, 'AND-002': 150,
      'OR-001': 250, 'OR-002': 250,
      'BASIC-001': 350, 'BASIC-002': 350, 'BASIC-007': 350,
      'BASIC-003': 350, 'BASIC-004': 350, 'BASIC-008': 350,
      'BASIC-005': 350, 'BASIC-006': 350
    }
    return yMap[node.id] || 200
  }
</script>

<div class="faulttree-container">
  <div class="panel-header">
    <h2>🌳 故障树演化分析</h2>
    <div class="action-buttons">
      <button class="btn btn-primary" disabled={isSimulating} onclick={startSimulation}>
        {isSimulating ? '模拟中...' : '开始模拟'}
      </button>
      <button class="btn btn-secondary" onclick={predictRisk}>风险预测</button>
      <button class="btn btn-secondary" onclick={resetSimulation}>重置</button>
    </div>
  </div>

  <div class="content-grid">
    <div class="panel tree-panel">
      <div class="panel-title">故障树结构</div>
      <div class="tree-visualization">
        <svg viewBox="0 0 800 500" class="tree-svg">
          {#each $faultTreeData.edges as edge}
            {@const fromNode = $faultTreeData.nodes.find(n => n.id === edge.from)}
            {@const toNode = $faultTreeData.nodes.find(n => n.id === edge.to)}
            {#if fromNode && toNode}
              {@const fromX = getNodeX(fromNode)}
              {@const fromY = getNodeY(fromNode)}
              {@const toX = getNodeX(toNode)}
              {@const toY = getNodeY(toNode)}
              <line x1={fromX} y1={fromY} x2={toX} y2={toY} stroke={getNodeColor(fromNode)} stroke-width="2" opacity="0.6" />
            {/if}
          {/each}

          {#each $faultTreeData.nodes as node}
            <g transform="translate({getNodeX(node)}, {getNodeY(node)})">
              <circle r="28" fill={getNodeColor(node)} opacity={node.status === 'triggered' ? 1 : 0.7} stroke="#fff" stroke-width="2" />
              <text text-anchor="middle" dy="4" fill="white" font-size="10" font-weight="bold">
                {node.name.slice(0, 4)}
              </text>
            </g>
          {/each}
        </svg>
      </div>
    </div>

    <div class="panel info-panel">
      <div class="panel-title">
        <span>风险等级</span>
        <span class="risk-badge" style="background: {getRiskColor($faultTreeData.riskLevel)}">
          {$faultTreeData.riskLevel.toUpperCase()}
        </span>
      </div>

      <div class="info-content">
        <div class="info-section">
          <h4>节点统计</h4>
          <div class="stat-row">
            <span>基础事件节点</span>
            <span>{$faultTreeData.nodes.filter(n => n.type === 'basic').length}</span>
          </div>
          <div class="stat-row">
            <span>逻辑门节点</span>
            <span>{$faultTreeData.nodes.filter(n => n.type === 'and' || n.type === 'or').length}</span>
          </div>
          <div class="stat-row">
            <span>已触发节点</span>
            <span class="critical">{$faultTreeData.nodes.filter(n => n.status === 'triggered').length}</span>
          </div>
        </div>

        <div class="info-section">
          <h4>节点图例</h4>
          <div class="legend-item">
            <span class="legend-dot" style="background: #22c55e"></span>
            <span>基础事件</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot" style="background: #3b82f6"></span>
            <span>OR 门</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot" style="background: #f59e0b"></span>
            <span>AND 门</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot" style="background: #8b5cf6"></span>
            <span>顶事件</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot" style="background: #ef4444"></span>
            <span>已触发</span>
          </div>
        </div>

        {#if simulationResult}
          <div class="info-section">
            <h4>模拟结果</h4>
            <div class="stat-row">
              <span>连锁故障数</span>
              <span class="warning">{simulationResult.timeline.length}</span>
            </div>
            <div class="stat-row">
              <span>最终风险等级</span>
              <span style="color: {getRiskColor(simulationResult.finalRisk)}; font-weight: bold;">
                {simulationResult.finalRisk.toUpperCase()}
              </span>
            </div>
          </div>
        {/if}

        {#if predictionResult}
          <div class="info-section prediction-section">
            <div class="section-header">
              <h4>🎯 风险预测结果</h4>
              <button class="btn-clear" onclick={clearPrediction}>×</button>
            </div>
            <div class="stat-row">
              <span>总风险值</span>
              <span class="critical">{(predictionResult.totalRisk * 100).toFixed(2)}%</span>
            </div>
            <div class="stat-row">
              <span>影响节点数</span>
              <span>{predictionResult.affectedNodes.length}</span>
            </div>
            <div class="risk-path-list">
              <h5>风险传播路径：</h5>
              {#each predictionResult.riskPath as path, index}
                <div class="path-item">
                  <span class="path-index">{index + 1}</span>
                  <span class="path-text">{path.fromName} → {path.toName}</span>
                  <span class="path-risk">{(path.risk * 100).toFixed(2)}%</span>
                </div>
              {/each}
            </div>
            <div class="affected-nodes">
              <h5>影响的节点：</h5>
              <div class="nodes-tags">
                {#each predictionResult.affectedNodes as nodeId}
                  <span class="node-tag">{nodeId}</span>
                {/each}
              </div>
            </div>
          </div>
        {:else}
          <div class="info-section prediction-hint">
            <h4>💡 提示</h4>
            <p class="hint-text">点击"风险预测"按钮查看连锁故障风险分析</p>
          </div>
        {/if}
      </div>
    </div>

    <div class="panel timeline-panel">
      <div class="panel-title">演化时间线</div>
      <div class="timeline-list">
        {#if $faultTreeData.timeline?.length === 0}
          <div class="empty-state">暂无演化记录，点击"开始模拟"查看</div>
        {/if}
        {#each $faultTreeData.timeline || [] as event}
          <div class="timeline-item {event.event}">
            <span class="timeline-step">Step {event.step}</span>
            <span class="timeline-content">
              {event.event === 'cascading' ? `${event.nodeName} 被 ${event.sourceNodeName} 触发` : event.nodeName + ' 初始触发'}
            </span>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  .faulttree-container {
    padding: 20px;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .panel-header h2 {
    color: #e2e8f0;
    font-size: 20px;
    margin: 0;
  }

  .action-buttons {
    display: flex;
    gap: 10px;
  }

  .content-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    grid-template-rows: 1fr auto;
    gap: 20px;
  }

  .panel {
    background: rgba(30, 41, 59, 0.9);
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, 0.2);
    overflow: hidden;
  }

  .panel-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: rgba(59, 130, 246, 0.1);
    border-bottom: 1px solid rgba(148, 163, 184, 0.2);
    color: #e2e8f0;
    font-weight: 600;
  }

  .risk-badge {
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: bold;
    color: white;
  }

  .tree-visualization {
    padding: 20px;
    height: 400px;
  }

  .tree-svg {
    width: 100%;
    height: 100%;
  }

  .info-content {
    padding: 16px;
  }

  .info-section {
    margin-bottom: 20px;
  }

  .info-section h4 {
    color: #94a3b8;
    font-size: 12px;
    text-transform: uppercase;
    margin-bottom: 12px;
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    color: #e2e8f0;
    font-size: 14px;
  }

  .stat-row .critical { color: #ef4444; font-weight: bold; }
  .stat-row .warning { color: #f59e0b; font-weight: bold; }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 0;
    color: #e2e8f0;
    font-size: 13px;
  }

  .legend-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }

  .timeline-panel {
    grid-column: 1 / -1;
  }

  .timeline-list {
    max-height: 200px;
    overflow-y: auto;
    padding: 12px;
  }

  .timeline-item {
    display: flex;
    gap: 16px;
    padding: 10px 12px;
    margin: 4px 0;
    border-radius: 8px;
    background: rgba(59, 130, 246, 0.1);
    border-left: 3px solid #3b82f6;
  }

  .timeline-item.cascading {
    border-left-color: #f59e0b;
    background: rgba(245, 158, 11, 0.1);
  }

  .timeline-step {
    font-size: 12px;
    color: #94a3b8;
    min-width: 60px;
  }

  .timeline-content {
    color: #e2e8f0;
    font-size: 14px;
  }

  .btn {
    padding: 8px 16px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s;
  }

  .btn-primary {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.1);
    color: #e2e8f0;
  }

  .empty-state {
    text-align: center;
    padding: 40px;
    color: #64748b;
  }

  .prediction-section {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%);
    border-radius: 10px;
    padding: 16px;
    border: 1px solid rgba(139, 92, 246, 0.2);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .section-header h4 {
    margin: 0;
    color: #e2e8f0;
    font-size: 14px;
    text-transform: none;
  }

  .btn-clear {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    color: #94a3b8;
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .btn-clear:hover {
    background: rgba(255, 255, 255, 0.2);
    color: #e2e8f0;
  }

  .risk-path-list {
    margin-top: 16px;
  }

  .risk-path-list h5,
  .affected-nodes h5 {
    margin: 0 0 10px 0;
    color: #94a3b8;
    font-size: 12px;
    text-transform: uppercase;
  }

  .path-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
    margin-bottom: 6px;
    font-size: 13px;
    color: #e2e8f0;
  }

  .path-index {
    background: #8b5cf6;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: bold;
    color: white;
  }

  .path-text {
    flex: 1;
  }

  .path-risk {
    color: #ef4444;
    font-weight: 600;
  }

  .nodes-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .node-tag {
    background: rgba(59, 130, 246, 0.2);
    color: #3b82f6;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
  }

  .prediction-hint {
    text-align: center;
    padding: 20px;
    background: rgba(59, 130, 246, 0.05);
    border-radius: 10px;
    border: 1px dashed rgba(59, 130, 246, 0.2);
  }

  .prediction-hint h4 {
    margin-bottom: 8px;
    color: #e2e8f0;
    text-transform: none;
    font-size: 14px;
  }

  .hint-text {
    margin: 0;
    color: #64748b;
    font-size: 13px;
  }

  .affected-nodes {
    margin-top: 16px;
  }
</style>
