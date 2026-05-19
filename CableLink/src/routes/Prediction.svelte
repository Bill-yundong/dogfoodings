<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { realtimeStore } from '@/stores/realtime';
  import { predictTemperature } from '@/engine/coupling';
  import { generateLoadProfile } from '@/engine/prediction';
  import { formatTemperature, formatCurrent, formatDateTime, getRiskLevelColor } from '@/utils/format';
  import StatCard from '@/components/common/StatCard.svelte';
  import LineChart from '@/components/charts/LineChart.svelte';

  let horizonHours = $state(24);
  let isPredicting = $state(false);
  let predictionResult = $state<{
    temps: number[];
    times: string[];
    confidence: number[];
    safeCurrent: number;
    riskLevel: 'low' | 'medium' | 'high';
    hotspotProbability: number;
  } | null>(null);

  let intervalId: number | null = null;

  const { sensorData, avgCurrent, cableParams } = realtimeStore;

  const runPrediction = async () => {
    isPredicting = true;
    try {
      const currentData = get(sensorData);
      const currentAvg = get(avgCurrent);
      const params = get(cableParams);

      const loadProfile = generateLoadProfile(currentAvg, horizonHours);
      const result = await predictTemperature(
        currentData,
        params,
        horizonHours,
        loadProfile
      );

      predictionResult = {
        temps: result.temperatureForecast.map(f => f.temp),
        times: result.temperatureForecast.map(f => formatDateTime(f.time)),
        confidence: result.temperatureForecast.map(f => f.confidence),
        safeCurrent: result.safeCurrent,
        riskLevel: result.riskLevel,
        hotspotProbability: result.hotspotProbability
      };
    } finally {
      isPredicting = false;
    }
  };

  onMount(() => {
    runPrediction();
    intervalId = window.setInterval(() => {
      runPrediction();
    }, 60000);
  });

  onDestroy(() => {
    if (intervalId) clearInterval(intervalId);
  });

  function get<T>(store: { subscribe: (fn: (v: T) => void) => () => void }): T {
    let value: T = undefined as T;
    store.subscribe(v => value = v)();
    return value;
  }
</script>

<div class="p-6 space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-white">预测分析</h1>
      <p class="text-gray-400 mt-1">基于物理场耦合模型的温升趋势预测</p>
    </div>
    <div class="flex items-center gap-3">
      <select
        bind:value={horizonHours}
        onchange={runPrediction}
        class="px-4 py-2 bg-space-light border border-tech-cyan/30 rounded-lg text-white focus:outline-none focus:border-tech-cyan"
      >
        <option value={6}>未来 6 小时</option>
        <option value={12}>未来 12 小时</option>
        <option value={24}>未来 24 小时</option>
        <option value={48}>未来 48 小时</option>
        <option value={72}>未来 72 小时</option>
      </select>
      <button onclick={runPrediction} disabled={isPredicting} class="btn-primary">
        {isPredicting ? '计算中...' : '刷新预测'}
      </button>
    </div>
  </div>

  {#if predictionResult}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="预测最高温度"
        value={Math.max(...predictionResult.temps)}
        unit="°C"
        color="#E63946"
        icon="🔴"
      />
      <StatCard
        label="安全载流量"
        value={predictionResult.safeCurrent}
        unit="A"
        color="#2EC4B6"
        icon="✅"
      />
      <StatCard
        label="风险等级"
        value={predictionResult.riskLevel === 'low' ? '低' : predictionResult.riskLevel === 'medium' ? '中' : '高'}
        color={getRiskLevelColor(predictionResult.riskLevel)}
        icon="⚠️"
      />
      <StatCard
        label="热点概率"
        value={(predictionResult.hotspotProbability * 100).toFixed(1)}
        unit="%"
        color="#FF9F1C"
        icon="🔥"
      />
    </div>

    <div class="panel-glow p-5">
      <h3 class="text-lg font-semibold text-white mb-4">温度预测曲线</h3>
      <div class="h-[350px]">
        <LineChart
          data={predictionResult.temps}
          labels={predictionResult.times}
          color="#3E92CC"
          yLabel="温度 (°C)"
        />
      </div>
      <div class="mt-4 flex items-center justify-between text-sm">
        <div class="flex items-center gap-4">
          <span class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-tech-cyan"></span>
            <span class="text-gray-400">预测温度</span>
          </span>
          <span class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-danger-red" style="opacity: 0.3"></span>
            <span class="text-gray-400">置信区间</span>
          </span>
        </div>
        <div class="text-gray-400">
          预测时长: {horizonHours} 小时 · 数据点: {predictionResult.temps.length}
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="panel-glow p-5">
        <h3 class="text-lg font-semibold text-white mb-4">调度建议</h3>
        <div class="space-y-4">
          {#if predictionResult.riskLevel === 'high'}
            <div class="p-4 bg-danger-red/10 border border-danger-red/30 rounded-lg">
              <div class="flex items-start gap-3">
                <span class="text-2xl">🚨</span>
                <div>
                  <h4 class="font-semibold text-danger-red">紧急建议</h4>
                  <p class="text-sm text-gray-300 mt-1">
                    预测温度将超过安全阈值，建议立即降低载流量至 {formatCurrent(predictionResult.safeCurrent)} 以下。
                    考虑启动备用线路或减少非关键负荷。
                  </p>
                </div>
              </div>
            </div>
          {:else if predictionResult.riskLevel === 'medium'}
            <div class="p-4 bg-warning-orange/10 border border-warning-orange/30 rounded-lg">
              <div class="flex items-start gap-3">
                <span class="text-2xl">⚠️</span>
                <div>
                  <h4 class="font-semibold text-warning-orange">注意事项</h4>
                  <p class="text-sm text-gray-300 mt-1">
                    温度有升高趋势，建议将载流量控制在 {formatCurrent(predictionResult.safeCurrent * 0.9)} 以内。
                    密切关注热点区域温度变化。
                  </p>
                </div>
              </div>
            </div>
          {:else}
            <div class="p-4 bg-safe-green/10 border border-safe-green/30 rounded-lg">
              <div class="flex items-start gap-3">
                <span class="text-2xl">✅</span>
                <div>
                  <h4 class="font-semibold text-safe-green">运行正常</h4>
                  <p class="text-sm text-gray-300 mt-1">
                    预测温度在安全范围内，当前载流量可保持在 {formatCurrent(predictionResult.safeCurrent)} 以内。
                    可根据用电需求适当调整负荷。
                  </p>
                </div>
              </div>
            </div>
          {/if}

          <div class="grid grid-cols-2 gap-4 mt-4">
            <div class="p-3 bg-space-light rounded-lg">
              <p class="text-xs text-gray-400">推荐载流量</p>
              <p class="text-xl font-bold text-tech-cyan font-mono">
                {formatCurrent(predictionResult.safeCurrent * 0.85)}
              </p>
            </div>
            <div class="p-3 bg-space-light rounded-lg">
              <p class="text-xs text-gray-400">最大允许值</p>
              <p class="text-xl font-bold text-warning-orange font-mono">
                {formatCurrent(predictionResult.safeCurrent)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="panel-glow p-5">
        <h3 class="text-lg font-semibold text-white mb-4">预测模型参数</h3>
        <div class="space-y-3 text-sm">
          <div class="flex justify-between py-2 border-b border-gray-700/50">
            <span class="text-gray-400">热力学模型</span>
            <span class="text-white">傅里叶热传导方程 (FDM)</span>
          </div>
          <div class="flex justify-between py-2 border-b border-gray-700/50">
            <span class="text-gray-400">时间步长</span>
            <span class="text-white font-mono">15 分钟</span>
          </div>
          <div class="flex justify-between py-2 border-b border-gray-700/50">
            <span class="text-gray-400">空间分辨率</span>
            <span class="text-white font-mono">250 m</span>
          </div>
          <div class="flex justify-between py-2 border-b border-gray-700/50">
            <span class="text-gray-400">环境温度</span>
            <span class="text-white font-mono">{formatTemperature($cableParams.ambientTemperature)}</span>
          </div>
          <div class="flex justify-between py-2">
            <span class="text-gray-400">预测置信度</span>
            <span class="text-safe-green font-mono">
              {(predictionResult.confidence.reduce((a: number, b: number) => a + b, 0) / predictionResult.confidence.length * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  {:else}
    <div class="panel-glow p-12 text-center">
      <div class="text-5xl mb-4 animate-pulse">🔮</div>
      <p class="text-gray-400">正在进行预测计算...</p>
    </div>
  {/if}
</div>
