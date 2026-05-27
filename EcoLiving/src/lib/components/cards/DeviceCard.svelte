<script lang="ts">
  import { Zap, Power, Clock, Settings } from '@lucide/svelte';
  import type { Device, DeviceReading } from '@/lib/types/energy';
  import { formatPower, formatDuration } from '@/lib/utils/formatters';

  let {
    device,
    reading,
    onToggle,
    onSelect,
    selected = false,
  } = $props<{
    device: Device;
    reading?: DeviceReading;
    onToggle?: (deviceId: string, isOn: boolean) => void;
    onSelect?: (deviceId: string) => void;
    selected?: boolean;
  }>();

  const statusColor = $derived(() => {
    if (!reading) return '#64748B';
    if (reading.isOn && !reading.isStandby) return '#10B981';
    if (reading.isStandby) return '#F59E0B';
    return '#64748B';
  });

  const statusText = $derived(() => {
    if (!reading) return '离线';
    if (reading.isOn && !reading.isStandby) return '运行中';
    if (reading.isStandby) return '待机';
    return '已关闭';
  });

  const statusClass = $derived(() => {
    if (!reading) return 'off';
    if (reading.isOn && !reading.isStandby) return 'on';
    if (reading.isStandby) return 'standby';
    return 'off';
  });

  function handleToggle(e: MouseEvent) {
    e.stopPropagation();
    if (onToggle && device.isSmart) {
      onToggle(device.id, !device.isOn);
    }
  }

  function handleClick() {
    if (onSelect) {
      onSelect(device.id);
    }
  }
</script>

<div 
  class="glass-card p-4 cursor-pointer transition-all duration-300"
  class:border-primary-500={selected}
  class:ring-2={selected}
  class:ring-primary-500={selected}
  on:click={handleClick}
>
  <div class="flex items-start justify-between mb-3">
    <div class="flex items-center gap-3">
      <div 
        class="w-10 h-10 rounded-lg flex items-center justify-center"
        style="background: {statusColor()}20;"
      >
        <Zap size={20} style="color: {statusColor()};" />
      </div>
      <div>
        <h4 class="font-medium text-slate-100">{device.name}</h4>
        <p class="text-xs text-slate-500">{device.location}</p>
      </div>
    </div>

    {#if device.isSmart}
      <button
        class="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 {device.isOn ? 'bg-primary-500/20' : ''} {!device.isOn ? 'hover:bg-slate-700' : ''}"
        on:click={handleToggle}
      >
        <Power 
          size={18} 
          class={device.isOn ? 'text-primary-400' : 'text-slate-500'} 
        />
      </button>
    {/if}
  </div>

  <div class="space-y-2">
    <div class="flex items-center justify-between text-sm">
      <span class="text-slate-400 flex items-center gap-2">
        <span class={`status-dot ${statusClass()}`} />
        {statusText()}
      </span>
      <span class="text-slate-300 font-mono">
        {reading ? formatPower(reading.power) : '--'}
      </span>
    </div>

    {#if reading?.isStandby && reading.standbyDuration > 0}
      <div class="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
        <Clock size={12} />
        待机 {formatDuration(reading.standbyDuration)}
      </div>
    {/if}

    <div class="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-700/50">
      <span>额定 {device.ratedPower}W</span>
      {#if device.isSmart}
        <Settings size={12} class="text-slate-600" />
      {/if}
    </div>
  </div>
</div>
