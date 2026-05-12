<script>
  import { onMount } from 'svelte'
  import { alignmentService } from '../services/SemanticAlignment.js'
  import { FaultSlice } from '../models/FaultSlice.js'

  let alignmentStats = null
  let deviceOpsData = ''
  let realTimeData = ''
  let alignmentResult = null
  let isAligning = false

  function generateSampleData() {
    const timestamp = Date.now()
    
    deviceOpsData = JSON.stringify({
      deviceId: 'CB-001',
      deviceName: '断路器 A',
      faultType: '过流保护',
      faultPhase: 'A',
      severity: '紧急',
      status: '故障',
      tripTime: timestamp - 100,
      clearTime: timestamp
    }, null, 2)

    realTimeData = JSON.stringify({
      deviceId: 'CB-001',
      deviceName: 'Breaker A',
      faultType: 'Overcurrent',
      faultPhase: 'A',
      severity: 'High',
      status: 'Fault',
      timestamp: timestamp
    }, null, 2)
  }

  async function performAlignment() {
    isAligning = true
    try {
      const deviceOpsSlice = new FaultSlice(JSON.parse(deviceOpsData))
      const realTimeSlice = new FaultSlice(JSON.parse(realTimeData))
      
      alignmentResult = alignmentService.alignFaultSlices(deviceOpsSlice, realTimeSlice)
      alignmentStats = alignmentService.getAlignmentStatistics()
    } catch (e) {
      console.error('对齐失败:', e)
    }
    isAligning = false
  }

  function clearResult() {
    alignmentResult = null
  }

  onMount(() => {
    generateSampleData()
    alignmentStats = alignmentService.getAlignmentStatistics()
  })
</script>

<div class="alignment-container">
  <div class="panel-header">
    <h2>🔗 语义对齐模块</h2>
    <button class="btn btn-primary" onclick={generateSampleData}>生成示例数据</button>
  </div>

  {#if alignmentStats}
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-label">已对齐记录</span>
        <span class="stat-value">{alignmentStats.totalAligned}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">平均置信度</span>
        <span class="stat-value">{(alignmentStats.averageConfidence * 100).toFixed(1)}%</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">设备运维源</span>
        <span class="stat-value">{alignmentStats.sources?.deviceOps || 0}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">实时监控源</span>
        <span class="stat-value">{alignmentStats.sources?.realTimeMonitor || 0}</span>
      </div>
    </div>
  {/if}

  <div class="content-grid">
    <div class="panel source-panel">
      <div class="panel-title">设备运维系统数据 (中文)</div>
      <textarea 
        class="data-textarea" 
        bind:value={deviceOpsData}
        placeholder="输入设备运维系统的故障数据 JSON..."
      />
    </div>

    <div class="panel source-panel">
      <div class="panel-title">实时监控系统数据 (英文)</div>
      <textarea 
        class="data-textarea" 
        bind:value={realTimeData}
        placeholder="输入实时监控系统的故障数据 JSON..."
      />
    </div>
  </div>

  <div class="action-section">
    <button class="btn btn-large btn-primary" disabled={isAligning} onclick={performAlignment}>
      {isAligning ? '对齐中...' : '🔗 执行语义对齐'}
    </button>
    <button class="btn btn-large btn-secondary" onclick={clearResult}>清除结果</button>
  </div>

  {#if alignmentResult}
    <div class="panel result-panel">
      <div class="panel-title">
        <span>对齐结果</span>
        {#if alignmentResult.aligned}
          <span class="badge success">对齐成功</span>
        {:else}
          <span class="badge error">对齐失败</span>
        {/if}
      </div>

      <div class="result-content">
        {#if alignmentResult.aligned}
          <div class="result-grid">
            <div class="result-section">
              <h4>对齐置信度</h4>
              <div class="confidence-bar">
                <div 
                  class="confidence-fill" 
                  style="width: {alignmentResult.confidence * 100}%"
                ></div>
                <span class="confidence-text">{(alignmentResult.confidence * 100).toFixed(1)}%</span>
              </div>
            </div>

            <div class="result-section">
              <h4>时间差</h4>
              <div class="result-value">{alignmentResult.timeDiff} ms</div>
            </div>

            {#if alignmentResult.unifiedSlice}
              <div class="result-section full-width">
                <h4>统一语义标签</h4>
                <div class="tags-container">
                  {#each alignmentResult.unifiedSlice.semanticTags || [] as tag}
                    <span class="semantic-tag">{tag}</span>
                  {/each}
                </div>
              </div>

              <div class="result-section full-width">
                <h4>统一数据实体</h4>
                <pre class="json-preview">{JSON.stringify(alignmentResult.unifiedSlice.toJSON(), null, 2)}</pre>
              </div>
            {/if}
          </div>
        {:else}
          <div class="error-message">
            <p>对齐失败原因: {alignmentResult.reason}</p>
            <p class="hint">请确保两个数据源的设备ID、故障类型和时间戳保持一致</p>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <div class="panel mapping-panel">
    <div class="panel-title">语义映射规则</div>
    <div class="mapping-content">
      <div class="mapping-section">
        <h4>故障类型映射</h4>
        <div class="mapping-table">
          <div class="mapping-row header">
            <span>设备运维 (中文)</span>
            <span class="arrow">→</span>
            <span>统一语义</span>
            <span class="arrow">→</span>
            <span>实时监控 (英文)</span>
          </div>
          <div class="mapping-row">
            <span>过流保护</span>
            <span class="arrow">→</span>
            <span class="unified">overcurrent_condition</span>
            <span class="arrow">→</span>
            <span>Overcurrent</span>
          </div>
          <div class="mapping-row">
            <span>断路器跳闸</span>
            <span class="arrow">→</span>
            <span class="unified">circuit_breaker_operation</span>
            <span class="arrow">→</span>
            <span>Breaker Trip</span>
          </div>
          <div class="mapping-row">
            <span>差动保护</span>
            <span class="arrow">→</span>
            <span class="unified">differential_protection_event</span>
            <span class="arrow">→</span>
            <span>Differential</span>
          </div>
        </div>
      </div>

      <div class="mapping-section">
        <h4>严重程度映射</h4>
        <div class="mapping-table">
          <div class="mapping-row header">
            <span>设备运维 (中文)</span>
            <span class="arrow">→</span>
            <span>统一语义</span>
            <span class="arrow">→</span>
            <span>实时监控 (英文)</span>
          </div>
          <div class="mapping-row">
            <span>事故</span>
            <span class="arrow">→</span>
            <span class="unified">critical</span>
            <span class="arrow">→</span>
            <span>Critical</span>
          </div>
          <div class="mapping-row">
            <span>紧急</span>
            <span class="arrow">→</span>
            <span class="unified">high</span>
            <span class="arrow">→</span>
            <span>High</span>
          </div>
          <div class="mapping-row">
            <span>重要</span>
            <span class="arrow">→</span>
            <span class="unified">medium</span>
            <span class="arrow">→</span>
            <span>Medium</span>
          </div>
          <div class="mapping-row">
            <span>一般</span>
            <span class="arrow">→</span>
            <span class="unified">low</span>
            <span class="arrow">→</span>
            <span>Low</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .alignment-container {
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

  .stats-bar {
    display: flex;
    gap: 30px;
    padding: 16px;
    background: rgba(30, 41, 59, 0.9);
    border-radius: 12px;
    margin-bottom: 20px;
    border: 1px solid rgba(148, 163, 184, 0.2);
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .stat-label {
    font-size: 12px;
    color: #94a3b8;
  }

  .stat-value {
    font-size: 16px;
    font-weight: 600;
    color: #e2e8f0;
  }

  .content-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 20px;
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

  .badge {
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: bold;
    color: white;
  }

  .badge.success { background: #22c55e; }
  .badge.error { background: #ef4444; }

  .data-textarea {
    width: 100%;
    height: 250px;
    padding: 16px;
    background: rgba(0, 0, 0, 0.2);
    border: none;
    color: #e2e8f0;
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 12px;
    line-height: 1.5;
    resize: none;
  }

  .data-textarea:focus {
    outline: none;
    box-shadow: inset 0 0 0 2px rgba(59, 130, 246, 0.5);
  }

  .action-section {
    display: flex;
    justify-content: center;
    gap: 16px;
    margin-bottom: 20px;
  }

  .btn {
    padding: 10px 20px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s;
  }

  .btn-large {
    padding: 14px 28px;
    font-size: 16px;
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

  .result-panel {
    margin-bottom: 20px;
  }

  .result-content {
    padding: 20px;
  }

  .result-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }

  .result-section {
    background: rgba(59, 130, 246, 0.05);
    padding: 16px;
    border-radius: 8px;
  }

  .result-section.full-width {
    grid-column: 1 / -1;
  }

  .result-section h4 {
    color: #94a3b8;
    font-size: 12px;
    text-transform: uppercase;
    margin-bottom: 12px;
  }

  .result-value {
    font-size: 24px;
    font-weight: 700;
    color: #60a5fa;
  }

  .confidence-bar {
    position: relative;
    height: 24px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 12px;
    overflow: hidden;
  }

  .confidence-fill {
    height: 100%;
    background: linear-gradient(90deg, #22c55e, #3b82f6);
    border-radius: 12px;
    transition: width 0.3s ease;
  }

  .confidence-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-weight: 600;
    font-size: 12px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }

  .tags-container {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .semantic-tag {
    padding: 6px 12px;
    background: rgba(139, 92, 246, 0.2);
    border: 1px solid rgba(139, 92, 246, 0.5);
    border-radius: 16px;
    color: #a78bfa;
    font-size: 12px;
    font-weight: 500;
  }

  .json-preview {
    max-height: 300px;
    overflow-y: auto;
    padding: 16px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    color: #94a3b8;
    font-size: 11px;
    line-height: 1.5;
    margin: 0;
  }

  .error-message {
    text-align: center;
    padding: 40px;
    color: #fca5a5;
  }

  .error-message p {
    margin: 8px 0;
  }

  .error-message .hint {
    color: #94a3b8;
    font-size: 13px;
  }

  .mapping-panel {
    margin-top: 20px;
  }

  .mapping-content {
    padding: 20px;
  }

  .mapping-section {
    margin-bottom: 24px;
  }

  .mapping-section h4 {
    color: #94a3b8;
    font-size: 12px;
    text-transform: uppercase;
    margin-bottom: 12px;
  }

  .mapping-table {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .mapping-row {
    display: grid;
    grid-template-columns: 1fr auto 1fr auto 1fr;
    gap: 12px;
    align-items: center;
    padding: 12px;
    background: rgba(59, 130, 246, 0.05);
    border-radius: 8px;
    font-size: 13px;
  }

  .mapping-row.header {
    background: rgba(59, 130, 246, 0.1);
    font-weight: 600;
    color: #94a3b8;
  }

  .mapping-row .arrow {
    color: #60a5fa;
    font-weight: bold;
  }

  .mapping-row .unified {
    color: #a78bfa;
    font-weight: 600;
    font-family: monospace;
  }
</style>
