<script>
  import { onMount, onDestroy } from 'svelte';
  import { anomalyDB } from '../lib/storage/AnomalyDatabase.js';
  import { boilerSimulator } from '../lib/simulator/BoilerDataSimulator.js';
  import { oxygenHistory } from '../lib/stores/boilerStore.js';
  import RealtimeChart from './RealtimeChart.svelte';

  let snapshots = [];
  let selectedSnapshot = null;
  let waveformData = [];
  let isLoading = false;
  let activeTab = 'history';
  let triggerType = 'oxygen_high';
  let triggerDuration = 30;
  let replayData = [];
  let isReplaying = false;
  let replayIndex = 0;
  let replayInterval = null;
  let comparisonData = {
    before: null,
    during: null,
    after: null
  };

  onMount(async () => {
    await loadSnapshots();
    generateDemoSnapshots();
  });

  onDestroy(() => {
    stopReplay();
  });

  async function loadSnapshots() {
    isLoading = true;
    try {
      snapshots = await anomalyDB.getAnomalySnapshots({ limit: 20 });
    } catch (error) {
      console.error('Failed to load snapshots:', error);
    } finally {
      isLoading = false;
    }
  }

  async function generateDemoSnapshots() {
    const anomalyTypes = ['oxygen_high', 'oxygen_low', 'temperature_spike', 'instability'];
    for (let i = 0; i < 5; i++) {
      const type = anomalyTypes[i % anomalyTypes.length];
      const timestamp = Date.now() - (i + 1) * 3600000;
      const waveform = generateWaveformData(type, timestamp);
      await anomalyDB.saveAnomalySnapshot({
        timestamp,
        type,
        severity: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
        description: getAnomalyDescription(type),
        duration: 30 + Math.floor(Math.random() * 60),
        efficiencyBefore: 92 + Math.random() * 3,
        efficiencyAfter: 88 + Math.random() * 3,
        rootCause: getRootCause(type),
        actionsTaken: getActionsTaken(type)
      }, waveform);
    }
    await loadSnapshots();
  }

  function generateWaveformData(type, baseTimestamp) {
    const waveforms = [];
    const params = ['oxygen', 'temperature', 'pressure', 'co', 'nox'];
    for (let i = 0; i < 60; i++) {
      const t = baseTimestamp + i * 1000;
      params.forEach(param => {
        let value;
        const baseValue = getBaseValue(param);
        if (i > 10 && i < 40) {
          value = getAnomalyValue(param, type, i - 10);
        } else {
          value = baseValue + (Math.random() - 0.5) * getNoiseLevel(param);
        }
        waveforms.push({
          parameter: param,
          timestamp: t,
          value,
          unit: getUnit(param)
        });
      });
    }
    return waveforms;
  }

  function getBaseValue(param) {
    const bases = { oxygen: 4.2, temperature: 900, pressure: 14, co: 25, nox: 65 };
    return bases[param];
  }

  function getNoiseLevel(param) {
    const noises = { oxygen: 0.3, temperature: 10, pressure: 1, co: 5, nox: 10 };
    return noises[param];
  }

  function getAnomalyValue(param, type, step) {
    const progress = step / 30;
    const peak = Math.sin(progress * Math.PI);
    switch (type) {
      case 'oxygen_high':
        if (param === 'oxygen') return 4.2 + peak * 3.5;
        if (param === 'temperature') return 900 - peak * 30;
        if (param === 'co') return 25 + peak * 60;
        break;
      case 'oxygen_low':
        if (param === 'oxygen') return Math.max(0.5, 4.2 - peak * 2.5);
        if (param === 'temperature') return 900 + peak * 50;
        if (param === 'co') return 25 + peak * 100;
        break;
      case 'temperature_spike':
        if (param === 'temperature') return 900 + peak * 120;
        if (param === 'nox') return 65 + peak * 150;
        break;
      case 'instability':
        if (param === 'oxygen') return 4.2 + (Math.random() - 0.5) * 4;
        if (param === 'temperature') return 900 + (Math.random() - 0.5) * 80;
        if (param === 'pressure') return 14 + (Math.random() - 0.5) * 6;
        break;
    }
    return getBaseValue(param);
  }

  function getUnit(param) {
    const units = { oxygen: '%', temperature: '°C', pressure: 'Pa', co: 'ppm', nox: 'mg/m³' };
    return units[param];
  }

  function getAnomalyDescription(type) {
    const descriptions = {
      oxygen_high: '烟气氧含量异常升高，可能存在送风量过大或燃料供给不足',
      oxygen_low: '烟气氧含量异常降低，可能存在燃烧不充分或配风不足',
      temperature_spike: '炉膛温度骤升，可能存在燃料突变或配风异常',
      instability: '燃烧参数剧烈波动，系统稳定性下降'
    };
    return descriptions[type];
  }

  function getRootCause(type) {
    const causes = {
      oxygen_high: '送风机频率偏高，燃料流量偏低',
      oxygen_low: '一次风量不足，燃料流量过大',
      temperature_spike: '燃料热值突变，二次风调节滞后',
      instability: '引送风配比失调，燃烧工况不稳定'
    };
    return causes[type];
  }

  function getActionsTaken(type) {
    const actions = {
      oxygen_high: ['降低送风机频率 5Hz', '增加燃料流量 3t/h', '优化氧含量设定值'],
      oxygen_low: ['增加一次风量 10kNm³/h', '减少燃料流量 2t/h', '检查燃烧器状态'],
      temperature_spike: ['增加二次风量', '降低燃料流量', '调整引风配比'],
      instability: ['稳定引送风配比', '优化燃烧参数', '检查煤质变化']
    };
    return actions[type];
  }

  async function selectSnapshot(snapshot) {
    selectedSnapshot = snapshot;
    waveformData = await anomalyDB.getWaveformBySnapshotId(snapshot.id);
    calculateComparisonData();
  }

  function calculateComparisonData() {
    if (!selectedSnapshot || waveformData.length === 0) return;
    const grouped = {};
    waveformData.forEach(p => {
      if (!grouped[p.parameter]) grouped[p.parameter] = [];
      grouped[p.parameter].push(p);
    });
    Object.keys(grouped).forEach(param => {
      const data = grouped[param].sort((a, b) => a.timestamp - b.timestamp);
      const third = Math.floor(data.length / 3);
      comparisonData[param] = {
        before: average(data.slice(0, third)),
        during: average(data.slice(third, 2 * third)),
        after: average(data.slice(2 * third))
      };
    });
  }

  function average(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((sum, p) => sum + p.value, 0) / arr.length;
  }

  function getParameterWaveform(param) {
    return waveformData.filter(p => p.parameter === param).sort((a, b) => a.timestamp - b.timestamp);
  }

  function triggerAnomaly() {
    boilerSimulator.triggerAnomaly(triggerType, triggerDuration);
  }

  async function saveCurrentAnomaly() {
    const currentData = $oxygenHistory.slice(-60);
    const waveform = [];
    currentData.forEach(point => {
      waveform.push(
        { parameter: 'oxygen', timestamp: point.timestamp, value: point.value, unit: '%' },
        { parameter: 'temperature', timestamp: point.timestamp, value: point.temperature, unit: '°C' },
        { parameter: 'efficiency', timestamp: point.timestamp, value: point.efficiency, unit: '%' },
        { parameter: 'pressure', timestamp: point.timestamp, value: point.pressure, unit: 'Pa' }
      );
    });
    const anomalyType = detectAnomalyType(currentData);
    await anomalyDB.saveAnomalySnapshot({
      timestamp: Date.now(),
      type: anomalyType,
      severity: 'medium',
      description: `手动保存的${anomalyType}异常事件`,
      duration: currentData.length,
      efficiencyBefore: currentData[0]?.efficiency || 0,
      efficiencyAfter: currentData[currentData.length - 1]?.efficiency || 0,
      rootCause: '待分析',
      actionsTaken: []
    }, waveform);
    await loadSnapshots();
  }

  function detectAnomalyType(data) {
    const avgOxygen = average(data.map(d => ({ value: d.oxygen || d.value })));
    if (avgOxygen > 6) return 'oxygen_high';
    if (avgOxygen < 2) return 'oxygen_low';
    return 'instability';
  }

  function startReplay() {
    if (!selectedSnapshot || waveformData.length === 0) return;
    stopReplay();
    replayData = waveformData.filter(p => p.parameter === 'oxygen').sort((a, b) => a.timestamp - b.timestamp);
    replayIndex = 0;
    isReplaying = true;
    replayInterval = setInterval(() => {
      if (replayIndex < replayData.length) {
        replayIndex++;
      } else {
        stopReplay();
      }
    }, 200);
  }

  function stopReplay() {
    isReplaying = false;
    replayIndex = 0;
    if (replayInterval) {
      clearInterval(replayInterval);
      replayInterval = null;
    }
  }

  function exportData() {
    const dataStr = JSON.stringify(selectedSnapshot, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `anomaly-${selectedSnapshot.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const anomalyTypeLabels = {
    oxygen_high: { label: '氧含量过高', color: 'text-blue-400', bg: 'bg-blue-500/20' },
    oxygen_low: { label: '氧含量过低', color: 'text-orange-400', bg: 'bg-orange-500/20' },
    temperature_spike: { label: '温度骤升', color: 'text-red-400', bg: 'bg-red-500/20' },
    instability: { label: '燃烧不稳定', color: 'text-yellow-400', bg: 'bg-yellow-500/20' }
  };

  const severityLabels = {
    high: { label: '严重', color: 'text-red-400' },
    medium: { label: '中等', color: 'text-yellow-400' },
    low: { label: '轻微', color: 'text-green-400' }
  };

  const parameterColors = {
    oxygen: '#3b82f6',
    temperature: '#ef4444',
    pressure: '#10b981',
    co: '#f59e0b',
    nox: '#8b5cf6',
    efficiency: '#06b6d4'
  };
</script>

<div class="anomaly-panel">
  <div class="panel-header">
    <h2 class="text-xl font-bold text-white">异常分析与复盘</h2>
    <div class="flex gap-2">
      <button
        class="tab-btn {activeTab === 'history' ? 'active' : ''}"
        on:click={() => activeTab = 'history'}
      >
        📋 历史记录
      </button>
      <button
        class="tab-btn {activeTab === 'simulation' ? 'active' : ''}"
        on:click={() => activeTab = 'simulation'}
      >
        🎮 异常模拟
      </button>
      <button
        class="tab-btn {activeTab === 'analysis' ? 'active' : ''}"
        on:click={() => activeTab = 'analysis'}
      >
        📊 对比分析
      </button>
    </div>
  </div>

  {#if activeTab === 'history'}
    <div class="history-layout">
      <div class="snapshot-list">
        <div class="list-header">
          <h3 class="text-sm font-semibold text-gray-400">异常快照</h3>
          <span class="text-xs text-gray-500">{snapshots.length} 条记录</span>
        </div>
        <div class="snapshot-scroll">
          {#if isLoading}
            <div class="loading">加载中...</div>
          {:else if snapshots.length === 0}
            <div class="empty-state">
              <span class="text-4xl mb-2">📭</span>
              <span class="text-sm text-gray-500">暂无异常记录</span>
            </div>
          {:else}
            {#each snapshots as snapshot (snapshot.id)}
              <div
                class="snapshot-item {selectedSnapshot?.id === snapshot.id ? 'active' : ''}"
                on:click={() => selectSnapshot(snapshot)}
              >
                <div class="flex items-start justify-between mb-2">
                  <span class="px-2 py-0.5 rounded text-xs {anomalyTypeLabels[snapshot.anomalyType]?.bg} {anomalyTypeLabels[snapshot.anomalyType]?.color}">
                    {anomalyTypeLabels[snapshot.anomalyType]?.label || snapshot.anomalyType}
                  </span>
                  <span class="text-xs {severityLabels[snapshot.severity]?.color}">
                    {severityLabels[snapshot.severity]?.label}
                  </span>
                </div>
                <p class="text-sm text-gray-300 mb-2 line-clamp-2">{snapshot.description}</p>
                <div class="flex items-center justify-between text-xs text-gray-500">
                  <span>{new Date(snapshot.timestamp).toLocaleString()}</span>
                  <span>效率: {snapshot.efficiencyBefore?.toFixed(1)}% → {snapshot.efficiencyAfter?.toFixed(1)}%</span>
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </div>

      <div class="detail-panel">
        {#if selectedSnapshot}
          <div class="detail-header">
            <h3 class="text-lg font-semibold text-white">异常详情</h3>
            <div class="flex gap-2">
              <button class="action-btn" on:click={startReplay}>
                {isReplaying ? '⏸️ 暂停回放' : '▶️ 波形回放'}
              </button>
              <button class="action-btn" on:click={exportData}>📤 导出</button>
            </div>
          </div>

          <div class="detail-grid">
            <div class="detail-section">
              <h4 class="text-sm font-medium text-gray-400 mb-3">基本信息</h4>
              <div class="info-grid">
                <div class="info-item">
                  <span class="text-xs text-gray-500">发生时间</span>
                  <span class="text-sm text-white">{new Date(selectedSnapshot.timestamp).toLocaleString()}</span>
                </div>
                <div class="info-item">
                  <span class="text-xs text-gray-500">持续时间</span>
                  <span class="text-sm text-white">{selectedSnapshot.duration} 秒</span>
                </div>
                <div class="info-item">
                  <span class="text-xs text-gray-500">效率变化</span>
                  <span class="text-sm text-red-400">
                    {(selectedSnapshot.efficiencyBefore - selectedSnapshot.efficiencyAfter).toFixed(2)}%
                  </span>
                </div>
                <div class="info-item">
                  <span class="text-xs text-gray-500">波形点数</span>
                  <span class="text-sm text-white">{selectedSnapshot.waveformCount}</span>
                </div>
              </div>
            </div>

            <div class="detail-section">
              <h4 class="text-sm font-medium text-gray-400 mb-3">根因分析</h4>
              <div class="cause-box">
                <span class="text-sm text-yellow-400">🔍 {selectedSnapshot.rootCause}</span>
              </div>
            </div>

            <div class="detail-section">
              <h4 class="text-sm font-medium text-gray-400 mb-3">处理措施</h4>
              <ul class="actions-list">
                {#each selectedSnapshot.actionsTaken as action}
                  <li class="action-item">✓ {action}</li>
                {/each}
              </ul>
            </div>
          </div>

          <div class="waveform-section">
            <h4 class="text-sm font-medium text-gray-400 mb-3">参数波形</h4>
            <div class="waveform-grid">
              {#each ['oxygen', 'temperature', 'pressure'] as param}
                <div class="waveform-card">
                  <div class="waveform-header">
                    <div class="w-3 h-3 rounded-full" style="background: {parameterColors[param]}"></div>
                    <span class="text-sm text-gray-300">{param === 'oxygen' ? '氧含量' : param === 'temperature' ? '温度' : '压力'}</span>
                  </div>
                  <RealtimeChart
                    data={getParameterWaveform(param)}
                    color={parameterColors[param]}
                    yLabel={getUnit(param)}
                    height={120}
                  />
                </div>
              {/each}
            </div>
          </div>

          {#if isReplaying && replayData.length > 0}
            <div class="replay-progress">
              <div class="progress-bar">
                <div class="progress-fill" style="width: {(replayIndex / replayData.length) * 100}%"></div>
              </div>
              <span class="text-xs text-gray-400">回放进度: {replayIndex} / {replayData.length}</span>
            </div>
          {/if}
        {:else}
          <div class="empty-detail">
            <span class="text-6xl mb-4">📈</span>
            <p class="text-gray-400">选择一个异常快照查看详情</p>
          </div>
        {/if}
      </div>
    </div>
  {:else if activeTab === 'simulation'}
    <div class="simulation-panel">
      <h3 class="text-lg font-semibold text-white mb-4">异常场景模拟</h3>
      <div class="simulation-grid">
        <div class="simulation-card">
          <h4 class="text-sm font-medium text-gray-400 mb-3">选择异常类型</h4>
          <div class="anomaly-options">
            {#each Object.entries(anomalyTypeLabels) as [type, config]}
              <button
                class="anomaly-option {triggerType === type ? 'active' : ''}"
                on:click={() => triggerType = type}
              >
                <span class="{config.color}">{config.label}</span>
              </button>
            {/each}
          </div>
          <div class="mt-4">
            <label class="text-sm text-gray-400 mb-2 block">持续时间: {triggerDuration} 秒</label>
            <input
              type="range"
              min="10"
              max="120"
              bind:value={triggerDuration}
              class="w-full"
            />
          </div>
          <button class="trigger-btn mt-4" on:click={triggerAnomaly}>
            🚀 触发异常
          </button>
        </div>

        <div class="simulation-card">
          <h4 class="text-sm font-medium text-gray-400 mb-3">手动保存</h4>
          <p class="text-sm text-gray-500 mb-4">保存当前运行状态的最近60个数据点作为异常快照</p>
          <button class="trigger-btn secondary" on:click={saveCurrentAnomaly}>
            💾 保存当前状态
          </button>
        </div>
      </div>
    </div>
  {:else if activeTab === 'analysis'}
    <div class="analysis-panel">
      <h3 class="text-lg font-semibold text-white mb-4">跨系统复盘分析</h3>
      {#if selectedSnapshot}
        <div class="comparison-section">
          <h4 class="text-sm font-medium text-gray-400 mb-4">参数变化对比</h4>
          <div class="comparison-grid">
            {#each ['oxygen', 'temperature', 'pressure', 'efficiency'] as param}
              {#if comparisonData[param]}
                <div class="comparison-card">
                  <div class="comparison-header">
                    <div class="w-3 h-3 rounded-full" style="background: {parameterColors[param]}"></div>
                    <span class="text-sm text-gray-300">
                      {param === 'oxygen' ? '氧含量' : param === 'temperature' ? '温度' : param === 'pressure' ? '压力' : '效率'}
                    </span>
                  </div>
                  <div class="comparison-values">
                    <div class="value-block">
                      <span class="text-xs text-gray-500">异常前</span>
                      <span class="text-lg font-bold text-green-400">{comparisonData[param].before.toFixed(2)}</span>
                    </div>
                    <div class="value-block">
                      <span class="text-xs text-gray-500">异常中</span>
                      <span class="text-lg font-bold text-red-400">{comparisonData[param].during.toFixed(2)}</span>
                    </div>
                    <div class="value-block">
                      <span class="text-xs text-gray-500">异常后</span>
                      <span class="text-lg font-bold text-blue-400">{comparisonData[param].after.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              {/if}
            {/each}
          </div>
        </div>

        <div class="insight-section">
          <h4 class="text-sm font-medium text-gray-400 mb-4">AI 分析洞察</h4>
          <div class="insight-cards">
            <div class="insight-card">
              <div class="insight-icon">📊</div>
              <div>
                <h5 class="text-sm font-medium text-white mb-1">效率影响评估</h5>
                <p class="text-xs text-gray-400">
                  本次异常导致热效率下降 {(selectedSnapshot.efficiencyBefore - selectedSnapshot.efficiencyAfter).toFixed(2)}%，
                  折合标准煤耗增加约 {((selectedSnapshot.efficiencyBefore - selectedSnapshot.efficiencyAfter) * 0.5).toFixed(2)} g/kWh
                </p>
              </div>
            </div>
            <div class="insight-card">
              <div class="insight-icon">🎯</div>
              <div>
                <h5 class="text-sm font-medium text-white mb-1">控制策略建议</h5>
                <p class="text-xs text-gray-400">
                  建议优化 {selectedSnapshot.rootCause?.includes('送风机') ? '送风机' : '引风机'} 响应滞后时间，
                  将氧含量控制回路增益调整为当前值的 1.2 倍
                </p>
              </div>
            </div>
            <div class="insight-card">
              <div class="insight-icon">🔮</div>
              <div>
                <h5 class="text-sm font-medium text-white mb-1">预防措施</h5>
                <p class="text-xs text-gray-400">
                  增设 {selectedSnapshot.anomalyType.includes('oxygen') ? '氧含量' : '温度'} 预报警阈值，
                  在参数偏离最优值 80% 时触发预警
                </p>
              </div>
            </div>
          </div>
        </div>
      {:else}
        <div class="empty-analysis">
          <span class="text-6xl mb-4">📊</span>
          <p class="text-gray-400">请先在历史记录中选择一个异常快照进行分析</p>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .anomaly-panel {
    background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 14, 23, 0.98) 100%);
    border-radius: 1rem;
    padding: 1.5rem;
    border: 1px solid rgba(139, 92, 246, 0.1);
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .tab-btn {
    padding: 0.5rem 1rem;
    background: rgba(30, 41, 59, 0.5);
    border: 1px solid rgba(51, 65, 85, 0.5);
    border-radius: 0.5rem;
    color: #94a3b8;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .tab-btn.active {
    background: rgba(59, 130, 246, 0.2);
    border-color: rgba(59, 130, 246, 0.5);
    color: #60a5fa;
  }

  .history-layout {
    display: grid;
    grid-template-columns: 350px 1fr;
    gap: 1.5rem;
    height: 600px;
  }

  .snapshot-list {
    background: rgba(30, 41, 59, 0.3);
    border-radius: 0.75rem;
    display: flex;
    flex-direction: column;
  }

  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid rgba(51, 65, 85, 0.5);
  }

  .snapshot-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
  }

  .snapshot-item {
    padding: 1rem;
    margin-bottom: 0.5rem;
    background: rgba(30, 41, 59, 0.5);
    border: 1px solid rgba(51, 65, 85, 0.3);
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .snapshot-item:hover {
    border-color: rgba(59, 130, 246, 0.5);
    background: rgba(30, 41, 59, 0.8);
  }

  .snapshot-item.active {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.1);
  }

  .detail-panel {
    background: rgba(30, 41, 59, 0.3);
    border-radius: 0.75rem;
    padding: 1.5rem;
    overflow-y: auto;
  }

  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .action-btn {
    padding: 0.5rem 1rem;
    background: rgba(59, 130, 246, 0.2);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 0.5rem;
    color: #60a5fa;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .action-btn:hover {
    background: rgba(59, 130, 246, 0.3);
  }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .detail-section {
    background: rgba(30, 41, 59, 0.5);
    border-radius: 0.5rem;
    padding: 1rem;
  }

  .info-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .cause-box {
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: 0.375rem;
    padding: 0.75rem;
  }

  .actions-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .action-item {
    font-size: 0.875rem;
    color: #94a3b8;
  }

  .waveform-section {
    margin-bottom: 1.5rem;
  }

  .waveform-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  .waveform-card {
    background: rgba(30, 41, 59, 0.5);
    border-radius: 0.5rem;
    padding: 0.75rem;
  }

  .waveform-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .replay-progress {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(51, 65, 85, 0.5);
  }

  .progress-bar {
    height: 6px;
    background: #334155;
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #8b5cf6);
    border-radius: 3px;
    transition: width 0.2s;
  }

  .empty-detail,
  .empty-analysis {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
  }

  .loading,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
    color: #64748b;
  }

  .simulation-panel {
    padding: 1rem;
  }

  .simulation-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }

  .simulation-card {
    background: rgba(30, 41, 59, 0.5);
    border: 1px solid rgba(51, 65, 85, 0.5);
    border-radius: 0.75rem;
    padding: 1.5rem;
  }

  .anomaly-options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .anomaly-option {
    padding: 0.75rem;
    background: rgba(30, 41, 59, 0.8);
    border: 1px solid rgba(51, 65, 85, 0.5);
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
  }

  .anomaly-option:hover {
    border-color: rgba(59, 130, 246, 0.5);
  }

  .anomaly-option.active {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.1);
  }

  .trigger-btn {
    width: 100%;
    padding: 0.75rem 1.5rem;
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .trigger-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
  }

  .trigger-btn.secondary {
    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  }

  .trigger-btn.secondary:hover {
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }

  .analysis-panel {
    padding: 1rem;
  }

  .comparison-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .comparison-card {
    background: rgba(30, 41, 59, 0.5);
    border: 1px solid rgba(51, 65, 85, 0.5);
    border-radius: 0.75rem;
    padding: 1rem;
  }

  .comparison-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .comparison-values {
    display: flex;
    justify-content: space-between;
  }

  .value-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .insight-cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  .insight-card {
    background: rgba(30, 41, 59, 0.5);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 0.75rem;
    padding: 1.25rem;
    display: flex;
    gap: 1rem;
    align-items: flex-start;
  }

  .insight-icon {
    font-size: 2rem;
    flex-shrink: 0;
  }

  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
