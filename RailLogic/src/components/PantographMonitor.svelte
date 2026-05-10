<script lang="ts">
  import { latestPantographState, pantographStates } from '../lib/stores';
  import type { PantographContactState } from '../types';

  let latestState = $state<PantographContactState | null>(null);
  let historyStates = $state<PantographContactState[]>([]);

  $effect(() => {
    const unsub1 = latestPantographState.subscribe((state) => {
      latestState = state;
    });
    const unsub2 = pantographStates.subscribe((states) => {
      historyStates = states.slice(-20);
    });
    return () => {
      unsub1();
      unsub2();
    };
  });

  function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString('zh-CN');
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'normal': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  }

  function getStatusText(status: string): string {
    switch (status) {
      case 'normal': return '正常';
      case 'warning': return '警告';
      case 'critical': return '危急';
      default: return '未知';
    }
  }
</script>

<div class="p-4 bg-gray-900 rounded-lg shadow-lg">
  <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
    <span class="text-2xl">⚡</span>
    受电弓交互状态监测
  </h3>

  {#if latestState}
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-gray-800 p-3 rounded-lg">
        <div class="text-gray-400 text-sm">接触力</div>
        <div class="text-2xl font-bold text-cyan-400">
          {latestState.contactForce.toFixed(1)}
          <span class="text-sm font-normal">N</span>
        </div>
      </div>

      <div class="bg-gray-800 p-3 rounded-lg">
        <div class="text-gray-400 text-sm">磨损程度</div>
        <div class="text-2xl font-bold text-orange-400">
          {latestState.wearLevel.toFixed(1)}
          <span class="text-sm font-normal">%</span>
        </div>
      </div>

      <div class="bg-gray-800 p-3 rounded-lg">
        <div class="text-gray-400 text-sm">垂直位移</div>
        <div class="text-2xl font-bold text-purple-400">
          {latestState.verticalDisplacement.toFixed(2)}
          <span class="text-sm font-normal">mm</span>
        </div>
      </div>

      <div class="bg-gray-800 p-3 rounded-lg">
        <div class="text-gray-400 text-sm">水平位移</div>
        <div class="text-2xl font-bold text-pink-400">
          {latestState.horizontalDisplacement.toFixed(2)}
          <span class="text-sm font-normal">mm</span>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="bg-gray-800 p-3 rounded-lg">
        <div class="text-gray-400 text-sm">振动频率</div>
        <div class="text-xl font-bold text-blue-400">
          {latestState.vibrationFrequency.toFixed(1)} Hz
        </div>
      </div>

      <div class="bg-gray-800 p-3 rounded-lg">
        <div class="text-gray-400 text-sm">温度</div>
        <div class="text-xl font-bold text-red-400">
          {latestState.temperature.toFixed(1)} °C
        </div>
      </div>

      <div class="bg-gray-800 p-3 rounded-lg">
        <div class="text-gray-400 text-sm">电弧检测</div>
        <div class="text-xl font-bold" class:text-red-500={latestState.arcDetection} class:text-green-500={!latestState.arcDetection}>
          {latestState.arcDetection ? '检测到' : '未检测'}
        </div>
      </div>
    </div>

    <div class="flex items-center gap-4 mb-4">
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 rounded-full {getStatusColor(latestState.status)} animate-pulse"></div>
        <span class="text-white font-semibold">
          状态: {getStatusText(latestState.status)}
        </span>
      </div>
      <div class="text-gray-400">
        更新时间: {formatTime(latestState.timestamp)}
      </div>
      <div class="text-gray-400">
        列车: {latestState.trainId}
      </div>
    </div>
  {:else}
    <div class="text-gray-400 text-center py-8">
      等待受电弓数据...
    </div>
  {/if}

  {#if historyStates.length > 0}
    <div class="mt-4 border-t border-gray-700 pt-4">
      <h4 class="text-gray-300 font-semibold mb-2">历史数据 (最近20条)</h4>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-gray-400">
              <th class="text-left py-1">时间</th>
              <th class="text-right py-1">接触力</th>
              <th class="text-right py-1">磨损</th>
              <th class="text-right py-1">垂移</th>
              <th class="text-right py-1">状态</th>
            </tr>
          </thead>
          <tbody>
            {#each historyStates as state (state.id)}
              <tr class="text-gray-300 border-t border-gray-800">
                <td class="py-1">{formatTime(state.timestamp)}</td>
                <td class="text-right">{state.contactForce.toFixed(1)} N</td>
                <td class="text-right">{state.wearLevel.toFixed(1)}%</td>
                <td class="text-right">{state.verticalDisplacement.toFixed(2)} mm</td>
                <td class="text-right">
                  <span class="px-2 py-0.5 rounded text-xs {getStatusColor(state.status)} text-white">
                    {getStatusText(state.status)}
                  </span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>

<style>
  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
</style>
