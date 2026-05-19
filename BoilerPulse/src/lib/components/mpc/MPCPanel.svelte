<script lang="ts">
  import type { MPCPrediction } from '$lib/types';
  import { mpcController } from '$lib/services/mpc';

  let { prediction }: { prediction: MPCPrediction | null } = $props();

  const modelAccuracy = $derived(mpcController.getModelAccuracy());
  const predictionCount = $derived(mpcController.getPredictionCount());
  const errorRate = $derived(mpcController.getErrorRate());
</script>

<div class="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-5">
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-lg font-semibold text-slate-100">MPC 预测控制</h3>
    <span class="text-xs text-slate-500">模型预测控制</span>
  </div>

  {#if prediction}
    <div class="space-y-4">
      <div class="grid grid-cols-3 gap-3">
        <div class="bg-slate-900/50 rounded-lg p-3 text-center">
          <div class="text-xs text-slate-500 mb-1">预测时域</div>
          <div class="text-xl font-bold font-mono text-blue-400">{prediction.horizon}</div>
          <div class="text-xs text-slate-500">分钟</div>
        </div>
        <div class="bg-slate-900/50 rounded-lg p-3 text-center">
          <div class="text-xs text-slate-500 mb-1">模型精度</div>
          <div class="text-xl font-bold font-mono text-emerald-400">{(modelAccuracy * 100).toFixed(1)}</div>
          <div class="text-xs text-slate-500">%</div>
        </div>
        <div class="bg-slate-900/50 rounded-lg p-3 text-center">
          <div class="text-xs text-slate-500 mb-1">置信度</div>
          <div class="text-xl font-bold font-mono text-amber-400">{(prediction.confidence * 100).toFixed(1)}</div>
          <div class="text-xs text-slate-500">%</div>
        </div>
      </div>

      <div class="bg-slate-900/50 rounded-lg p-4">
        <div class="text-sm text-slate-400 mb-3">优化控制参数</div>
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div class="flex justify-between">
            <span class="text-slate-500">送风机转速</span>
            <span class="font-mono text-blue-400">{prediction.optimizedParams.forcedDraftSpeed.toFixed(1)}%</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">引风机转速</span>
            <span class="font-mono text-blue-400">{prediction.optimizedParams.inducedDraftSpeed.toFixed(1)}%</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">风门开度</span>
            <span class="font-mono text-blue-400">{prediction.optimizedParams.damperOpening.toFixed(1)}%</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">氧含量设定</span>
            <span class="font-mono text-emerald-400">{prediction.optimizedParams.oxygenSetpoint.toFixed(2)}%</span>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-700/50">
        <span>预测次数: {predictionCount}</span>
        <span>平均误差: {errorRate.toFixed(4)}</span>
      </div>
    </div>
  {:else}
    <div class="flex items-center justify-center h-40 text-slate-500">
      <div class="text-center">
        <div class="text-4xl mb-2">📊</div>
        <div>等待数据收集...</div>
        <div class="text-xs text-slate-600 mt-1">启动系统后开始 MPC 预测</div>
      </div>
    </div>
  {/if}
</div>
