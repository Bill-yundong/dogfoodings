<script lang="ts">
  import { Clock, Check, X, TrendingDown } from '@lucide/svelte';
  import type { EnergySuggestion } from '@/lib/types/energy';
  import { formatEnergy, formatTimestamp } from '@/lib/utils/formatters';

  let {
    suggestion,
    onImplement,
    onDismiss,
  } = $props<{
    suggestion: EnergySuggestion;
    onImplement?: (id: string) => void;
    onDismiss?: (id: string) => void;
  }>();

  const priorityColor = $derived(() => {
    const colors: Record<string, string> = {
      high: '#EF4444',
      medium: '#F59E0B',
      low: '#3B82F6',
    };
    return colors[suggestion.priority] || '#64748B';
  });

  const priorityLabel = $derived(() => {
    const labels: Record<string, string> = {
      high: '高优先级',
      medium: '中优先级',
      low: '低优先级',
    };
    return labels[suggestion.priority] || '普通';
  });

  const typeIcon = $derived(() => {
    const icons: Record<string, string> = {
      standby: '⏸️',
      efficiency: '⚡',
      schedule: '📅',
      replacement: '🔄',
    };
    return icons[suggestion.type] || '💡';
  });

  function handleImplement() {
    if (onImplement) {
      onImplement(suggestion.id);
    }
  }

  function handleDismiss(e: MouseEvent) {
    e.stopPropagation();
    if (onDismiss) {
      onDismiss(suggestion.id);
    }
  }
</script>

<div 
  class="glass-card p-4 transition-all duration-300"
  class:opacity-60={suggestion.implemented}
>
  <div class="flex items-start gap-4">
    <div 
      class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-xl"
      style="background: {priorityColor()}20;"
    >
      {typeIcon()}
    </div>

    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 mb-1">
        <h4 class="font-medium text-slate-100 truncate">{suggestion.title}</h4>
        <span 
          class="text-xs px-2 py-0.5 rounded-full border"
          style="color: {priorityColor()}; border-color: {priorityColor()}40; background: {priorityColor()}10;"
        >
          {priorityLabel()}
        </span>
      </div>

      <p class="text-sm text-slate-400 mb-2">{suggestion.description}</p>

      <div class="flex items-center gap-4 text-xs">
        <span class="flex items-center gap-1 text-slate-500">
          <Clock size={12} />
          {formatTimestamp(suggestion.timestamp)}
        </span>
        <span class="flex items-center gap-1 text-green-400">
          <TrendingDown size={12} />
          预计节省 {formatEnergy(suggestion.potentialSaving)}
        </span>
      </div>

      {#if !suggestion.implemented}
        <div class="flex gap-2 mt-3 pt-3 border-t border-slate-700/50">
          <button 
            class="btn-primary text-sm py-2 px-4 flex-1 flex items-center justify-center gap-2"
            on:click={handleImplement}
          >
            <Check size={14} />
            执行建议
          </button>
          <button 
            class="btn-secondary text-sm py-2 px-4"
            on:click={handleDismiss}
          >
            <X size={14} />
          </button>
        </div>
      {:else}
        <div class="mt-3 pt-3 border-t border-slate-700/50">
          <span class="text-sm text-green-400 flex items-center gap-2">
            <Check size={14} />
            已执行
          </span>
        </div>
      {/if}
    </div>
  </div>
</div>
