<script lang="ts">
  import { dataStore } from '../services/dataStore';
  import type { CrackPoint, TrendSimulation, InterpolationResult } from '../types';
  import { SEVERITY_COLORS, SEVERITY_LABELS } from '../types';

  type InterpolationService = typeof import('../services/interpolation').interpolationService;

  let { interpolationService }: { interpolationService: InterpolationService } = $props();

  let selectedCrack = $state<CrackPoint | null>(null);
  let targetDate = $state('');
  let selectedMethod = $state('kriging');
  let isSimulating = $state(false);
  let interpolationResult = $state<InterpolationResult | null>(null);
  let activeSimulations = $state<TrendSimulation[]>([]);
  let selectedSimulation = $state<TrendSimulation | null>(null);
  let resultMode = $state<'single' | 'trend'>('single');
  let currentStepIndex = $state(0);

  const cracks = $derived(dataStore.getCracks());
  const methods = $derived(interpolationService.getAvailableMethods());

  function getToday(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  function getFutureDate(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN');
  }

  function getConfidenceColor(confidence: number): string {
    if (confidence >= 0.7) return '#10b981';
    if (confidence >= 0.5) return '#f59e0b';
    return '#ef4444';
  }

  function getSimulationTypeLabel(type: 'trend' | 'single'): string {
    return type === 'trend' ? '趋势模拟 (180天)' : '单次预测';
  }

  function getSimulationTypeBadgeClass(type: 'trend' | 'single'): string {
    return type === 'trend' ? 'type-trend' : 'type-single';
  }

  async function runInterpolation() {
    if (!selectedCrack || !targetDate) return;

    isSimulating = true;
    try {
      resultMode = 'single';
      interpolationResult = await interpolationService.interpolateCrack(
        selectedCrack,
        targetDate,
        selectedMethod as any
      );
      selectedSimulation = null;
      activeSimulations = interpolationService.getAllSimulations();
    } finally {
      isSimulating = false;
    }
  }

  async function runTrendSimulation() {
    if (!selectedCrack) return;

    isSimulating = true;
    try {
      const simulation = await interpolationService.startTrendSimulation(
        selectedCrack,
        selectedCrack.detectionDate,
        getFutureDate(180),
        30,
        selectedMethod as any
      );

      interpolationService.onSimulationComplete(simulation.id, (completedSim) => {
        if (completedSim.status === 'completed' && completedSim.steps.length > 0) {
          selectedSimulation = completedSim;
          resultMode = 'trend';
          currentStepIndex = completedSim.steps.length - 1;
          interpolationResult = completedSim.steps[currentStepIndex];
        }
        activeSimulations = interpolationService.getAllSimulations();
      });

      const updateProgress = () => {
        const sim = interpolationService.getSimulation(simulation.id);
        if (sim) {
          activeSimulations = interpolationService.getAllSimulations();
          if (sim.status === 'running') {
            setTimeout(updateProgress, 500);
          }
        }
      };
      setTimeout(updateProgress, 500);

    } finally {
      isSimulating = false;
    }
  }

  function selectSimulation(sim: TrendSimulation) {
    selectedSimulation = sim;
    if (sim.simulationType === 'trend') {
      resultMode = 'trend';
      currentStepIndex = Math.max(0, sim.steps.length - 1);
      if (sim.steps.length > 0) {
        interpolationResult = sim.steps[currentStepIndex];
      }
    } else if (sim.steps.length > 0) {
      resultMode = 'single';
      interpolationResult = sim.steps[0];
    }
  }

  function goToStep(index: number) {
    if (selectedSimulation && selectedSimulation.steps[index]) {
      currentStepIndex = index;
      interpolationResult = selectedSimulation.steps[index];
    }
  }

  $effect(() => {
    activeSimulations = interpolationService.getAllSimulations();
  });
</script>

<div class="simulation-panel">
  <div class="grid grid-2">
    <div class="card">
      <h3 class="card-title">参数设置</h3>

      <div class="form-group">
        <label>选择裂缝</label>
        <select bind:value={selectedCrack}>
          <option value={null}>-- 请选择 --</option>
          {#each cracks as crack}
            <option value={crack}>
              {crack.id} - {crack.roadSection} ({SEVERITY_LABELS[crack.severity]})
            </option>
          {/each}
        </select>
      </div>

      <div class="form-group">
        <label>插值方法</label>
        <select bind:value={selectedMethod}>
          {#each methods as method}
            <option value={method}>{interpolationService.getMethodDescription(method as any)}</option>
          {/each}
        </select>
      </div>

      <div class="form-group">
        <label>目标预测日期</label>
        <input
          type="date"
          bind:value={targetDate}
          min={selectedCrack ? selectedCrack.detectionDate : getToday()}
        />
      </div>

      <div class="button-group">
        <button
          class="btn btn-primary"
          onclick={runInterpolation}
          disabled={!selectedCrack || !targetDate || isSimulating}
        >
          {isSimulating ? '计算中...' : '单次预测'}
        </button>
        <button
          class="btn btn-secondary"
          onclick={runTrendSimulation}
          disabled={!selectedCrack || isSimulating}
        >
          趋势模拟 (180天)
        </button>
      </div>

      {#if selectedCrack}
        <div class="crack-info">
          <h4>当前裂缝信息</h4>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">严重程度</span>
              <span class="info-value" style="color: {SEVERITY_COLORS[selectedCrack.severity]}">
                {SEVERITY_LABELS[selectedCrack.severity]}
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">检测日期</span>
              <span class="info-value">{formatDate(selectedCrack.detectionDate)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">当前长度</span>
              <span class="info-value">{selectedCrack.length.toFixed(1)} cm</span>
            </div>
            <div class="info-item">
              <span class="info-label">当前宽度</span>
              <span class="info-value">{selectedCrack.width.toFixed(1)} mm</span>
            </div>
          </div>
        </div>
      {/if}
    </div>

    <div class="card">
      <h3 class="card-title">
        预测结果
        {#if resultMode === 'trend' && selectedSimulation && selectedSimulation.steps.length > 0}
          <span class="step-indicator">
            步骤 {currentStepIndex + 1} / {selectedSimulation.steps.length}
          </span>
        {/if}
      </h3>

      {#if interpolationResult}
        <div class="result-panel">
          <div class="confidence-bar">
            <span class="confidence-label">预测置信度</span>
            <span
              class="confidence-value"
              style="color: {getConfidenceColor(interpolationResult.confidence)}"
            >
              {(interpolationResult.confidence * 100).toFixed(0)}%
            </span>
          </div>

          <div class="prediction-stats">
            <div class="stat-card">
              <span class="stat-label">预测日期</span>
              <span class="stat-value">{formatDate(interpolationResult.targetDate)}</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">预测长度</span>
              <span class="stat-value highlight">
                {interpolationResult.predictedLength.toFixed(1)} cm
                {#if selectedCrack}
                  <span class="change">
                    ({interpolationResult.predictedLength > selectedCrack.length ? '+' : ''}
                    {(interpolationResult.predictedLength - selectedCrack.length).toFixed(1)} cm)
                  </span>
                {/if}
              </span>
            </div>
            <div class="stat-card">
              <span class="stat-label">预测宽度</span>
              <span class="stat-value highlight">
                {interpolationResult.predictedWidth.toFixed(1)} mm
                {#if selectedCrack}
                  <span class="change">
                    ({interpolationResult.predictedWidth > selectedCrack.width ? '+' : ''}
                    {(interpolationResult.predictedWidth - selectedCrack.width).toFixed(1)} mm)
                  </span>
                {/if}
              </span>
            </div>
          </div>

          {#if resultMode === 'trend' && selectedSimulation}
            <div class="time-slider">
              <input
                type="range"
                min="0"
                max={Math.max(0, selectedSimulation.steps.length - 1)}
                bind:value={currentStepIndex}
                oninput={() => goToStep(currentStepIndex)}
              />
              <div class="slider-labels">
                <span>{formatDate(selectedSimulation.startDate)}</span>
                <span>{formatDate(selectedSimulation.endDate)}</span>
              </div>
            </div>
          {/if}

          <div class="visualization-area">
            <h4>演化轨迹预测</h4>
            <svg viewBox="0 0 400 200" class="trajectory-svg">
              {#if selectedCrack}
                <rect x="10" y="10" width="380" height="180" fill="#f1f5f9" rx="4"/>
                <line x1="20" y1="100" x2="380" y2="100" stroke="#cbd5e1" stroke-width="1"/>

                {#if resultMode === 'trend' && selectedSimulation}
                  {#each selectedSimulation.steps.slice(0, 10) as step, i}
                    <circle
                      cx={20 + (i * 36)}
                      cy={100 + (step.predictedPoints[0]?.y - selectedCrack.coordinate.y) * 0.5}
                      r="4"
                      fill={i <= currentStepIndex ? '#3b82f6' : '#cbd5e1'}
                      opacity={0.3 + (i / 10) * 0.7}
                    />
                  {/each}
                {:else}
                  {#each interpolationResult.predictedPoints.slice(0, 10) as point, i}
                    <circle
                      cx={20 + (i * 36)}
                      cy={100 + (point.y - selectedCrack.coordinate.y) * 0.5}
                      r="4"
                      fill={i === 0 ? '#10b981' : i === interpolationResult.predictedPoints.length - 1 ? '#ef4444' : '#3b82f6'}
                      opacity={0.3 + (i / interpolationResult.predictedPoints.length) * 0.7}
                    />
                  {/each}
                {/if}
              {/if}
            </svg>
          </div>

          <div class="method-info">
            <span class="method-label">使用方法:</span>
            <span class="method-value">{interpolationResult.method}</span>
          </div>
        </div>
      {:else}
        <div class="empty-state">
          <span class="empty-icon">📈</span>
          <p>设置参数并运行预测</p>
        </div>
      {/if}
    </div>
  </div>

  <div class="card">
    <h3 class="card-title">模拟任务列表</h3>
    {#if activeSimulations.length > 0}
      <div class="simulation-list">
        {#each activeSimulations as sim}
          <div
            class={`simulation-item ${selectedSimulation?.id === sim.id ? 'selected' : ''}`}
            onclick={() => selectSimulation(sim)}
          >
            <div class="simulation-header">
              <div class="simulation-id-group">
                <span class="simulation-id">{sim.id}</span>
                <span class={`type-badge ${getSimulationTypeBadgeClass(sim.simulationType)}`}>
                  {getSimulationTypeLabel(sim.simulationType)}
                </span>
              </div>
              <span class={`status-badge ${sim.status === 'completed' ? 'status-normal' : sim.status === 'running' ? 'status-warning' : 'status-danger'}`}>
                {sim.status === 'running' ? '运行中' : sim.status === 'completed' ? '已完成' : '错误'}
              </span>
            </div>
            <div class="simulation-info">
              <span>裂缝: {sim.crackId}</span>
              <span>方法: {sim.method}</span>
              {#if sim.simulationType === 'trend'}
                <span>期间: {formatDate(sim.startDate)} ~ {formatDate(sim.endDate)}</span>
              {:else}
                <span>日期: {formatDate(sim.startDate)}</span>
              {/if}
              <span>步骤: {sim.steps.length}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: {sim.progress}%"></div>
            </div>
            <span class="progress-text">{sim.progress}%</span>
          </div>
        {/each}
      </div>
    {:else}
      <div class="no-data">暂无模拟任务</div>
    {/if}
  </div>
</div>

<style>
  .simulation-panel {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .card-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 16px;
    color: var(--text-primary);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .step-indicator {
    font-size: 13px;
    font-weight: 500;
    color: var(--primary-color);
    background: #eff6ff;
    padding: 4px 12px;
    border-radius: 4px;
  }

  .form-group {
    margin-bottom: 16px;
  }

  .form-group label {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    color: var(--text-secondary);
  }

  select, input[type="date"] {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    font-size: 14px;
    background: white;
  }

  select:focus, input[type="date"]:focus {
    outline: none;
    border-color: var(--primary-color);
  }

  .button-group {
    display: flex;
    gap: 12px;
    margin-bottom: 24px;
  }

  .button-group .btn {
    flex: 1;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .crack-info {
    background: #f8fafc;
    padding: 16px;
    border-radius: 8px;
  }

  .crack-info h4 {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 12px;
    color: var(--text-primary);
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .info-label {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .info-value {
    font-size: 14px;
    font-weight: 600;
  }

  .result-panel {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .confidence-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #f8fafc;
    border-radius: 8px;
  }

  .confidence-label {
    font-size: 14px;
    color: var(--text-secondary);
  }

  .confidence-value {
    font-size: 20px;
    font-weight: 700;
  }

  .prediction-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  .stat-card {
    background: #f8fafc;
    padding: 12px;
    border-radius: 8px;
    text-align: center;
  }

  .stat-label {
    display: block;
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 4px;
  }

  .stat-value {
    display: block;
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .stat-value.highlight {
    color: var(--primary-color);
  }

  .change {
    font-size: 11px;
    font-weight: 500;
    color: var(--text-secondary);
    margin-left: 4px;
  }

  .time-slider {
    background: #f8fafc;
    padding: 16px;
    border-radius: 8px;
  }

  .time-slider input[type="range"] {
    width: 100%;
    margin-bottom: 8px;
    cursor: pointer;
  }

  .slider-labels {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--text-secondary);
  }

  .visualization-area {
    background: #f8fafc;
    padding: 16px;
    border-radius: 8px;
  }

  .visualization-area h4 {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 12px;
    color: var(--text-primary);
  }

  .trajectory-svg {
    width: 100%;
    height: 150px;
  }

  .method-info {
    text-align: center;
    font-size: 13px;
    color: var(--text-secondary);
  }

  .method-label {
    font-weight: 500;
  }

  .method-value {
    font-family: monospace;
    background: #e0e7ff;
    padding: 2px 8px;
    border-radius: 4px;
    margin-left: 8px;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 350px;
    color: var(--text-secondary);
  }

  .empty-icon {
    font-size: 48px;
    margin-bottom: 12px;
  }

  .simulation-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .simulation-item {
    background: #f8fafc;
    padding: 16px;
    border-radius: 8px;
    cursor: pointer;
    border: 2px solid transparent;
    transition: all 0.2s;
  }

  .simulation-item:hover {
    border-color: var(--primary-color);
  }

  .simulation-item.selected {
    border-color: var(--primary-color);
    background: #eff6ff;
  }

  .simulation-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .simulation-id-group {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .simulation-id {
    font-weight: 600;
    font-size: 14px;
  }

  .type-badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
  }

  .type-trend {
    background: #dbeafe;
    color: #1e40af;
  }

  .type-single {
    background: #fef3c7;
    color: #92400e;
  }

  .simulation-info {
    display: flex;
    gap: 16px;
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  .progress-bar {
    height: 8px;
    background: #e2e8f0;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 8px;
  }

  .progress-fill {
    height: 100%;
    background: var(--primary-color);
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .progress-text {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .no-data {
    text-align: center;
    color: var(--text-secondary);
    font-size: 14px;
    padding: 40px;
  }
</style>
