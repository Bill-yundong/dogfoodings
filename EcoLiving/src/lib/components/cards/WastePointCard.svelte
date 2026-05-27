<script lang="ts">
  import { AlertTriangle, Clock, CheckCircle, XCircle, Zap } from '@lucide/svelte';
  import type { LoadFeature } from '@/lib/types/energy';
  import { formatTimestamp, getWasteLevelColor, getWasteLevelLabel } from '@/lib/utils/formatters';

  let {
    wastePoint,
    onResolve,
    onDismiss,
  } = $props<{
    wastePoint: LoadFeature;
    onResolve?: (id: string) => void;
    onDismiss?: (id: string) => void;
  }>();

  const levelColor = $derived(() => getWasteLevelColor(wastePoint.wasteLevel));
  const levelLabel = $derived(() => getWasteLevelLabel(wastePoint.wasteLevel));

  const levelBgClass = $derived(() => {
    const classes: Record<string, string> = {
      low: 'waste-level-low',
      medium: 'waste-level-medium',
      high: 'waste-level-high',
      critical: 'waste-level-critical',
    };
    return classes[wastePoint.wasteLevel] || '';
  });

  function handleResolve() {
    if (onResolve) {
      onResolve(wastePoint.id);
    }
  }

  function handleDismiss(e: MouseEvent) {
    e.stopPropagation();
    if (onDismiss) {
      onDismiss(wastePoint.id);
    }
  }
</script>

<div 
  class="glass-card p-4 transition-all duration-300"
  class:opacity-60={wastePoint.resolved}
>
  <div class="flex items-start gap-4">
    <div class="relative">
      <div 
        class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style="background: {levelColor()}20;"
      >
        <AlertTriangle size={20} style="color: {levelColor()};" />
      </div>
      {#if wastePoint.resolved}
        <div class="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
          <CheckCircle size={12} class="text-white" />
        </div>
      {/if}
    </div>

    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 mb-1">
        <h4 class="font-medium text-slate-100 truncate">{wastePoint.deviceName}</h4>
        <span 
          class={`text-xs px-2 py-0.5 rounded-full border ${levelBgClass()} flex-shrink-0`}
        >
          {levelLabel()}
        </span>
      </div>

      <p class="text-sm text-slate-400 mb-2">{wastePoint.description}</p>

      <div class="flex items-center gap-4 text-xs text-slate-500">
        <span class="flex items-center gap-1">
          <Clock size={12} />
          {formatTimestamp(wastePoint.timestamp)}
        </span>
        <span class="flex items-center gap-1">
          <Zap size={12} />
          置信度 {(wastePoint.confidence * 100).toFixed(0)}%
        </span>
        <span class="font-mono">
          异常分 {wastePoint.anomalyScore.toFixed(1)}
        </span>
      </div>

      {#if !wastePoint.resolved}
        <div class="flex gap-2 mt-3 pt-3 border-t border-slate-700/50">
          <button 
            class="btn-primary text-sm py-2 px-4 flex-1"
            on:click={handleResolve}
          >
            已处理
          </button>
          <button 
            class="btn-secondary text-sm py-2 px-4"
            on:click={handleDismiss}
          >
            <XCircle size={14} />
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>
