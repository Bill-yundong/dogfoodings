<script lang="ts">
  let { label, value, unit = '', color = '#3E92CC', trend, icon } = $props<{
    label: string;
    value: number | string;
    unit?: string;
    color?: string;
    trend?: { value: number; isPositive: boolean };
    icon?: string;
  }>();
</script>

<div class="panel-glow p-5 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
  <div class="absolute top-0 left-0 w-full h-1 opacity-80" style="background: linear-gradient(90deg, {color}, transparent)"></div>

  <div class="flex items-start justify-between">
    <div>
      <p class="stat-label mb-2">{label}</p>
      <div class="flex items-baseline gap-1">
        <span class="stat-value" style="color: {color}">
          {typeof value === 'number' ? value.toLocaleString('zh-CN', { maximumFractionDigits: 1 }) : value}
        </span>
        {#if unit}
          <span class="text-sm text-gray-400">{unit}</span>
        {/if}
      </div>
      {#if trend}
        <div class="flex items-center gap-1 mt-2 text-xs">
          <span class={trend.isPositive ? 'text-safe-green' : 'text-danger-red'}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}%
          </span>
          <span class="text-gray-500">较上周期</span>
        </div>
      {/if}
    </div>
    {#if icon}
      <div
        class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl opacity-50 group-hover:opacity-100 transition-opacity"
        style="background: {color}20"
      >
        {icon}
      </div>
    {/if}
  </div>

  <div class="absolute -bottom-10 -right-10 w-32 h-32 rounded-full opacity-5 group-hover:opacity-10 transition-opacity" style="background: {color}"></div>
</div>
