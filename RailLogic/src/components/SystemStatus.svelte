<script lang="ts">
  import { systemStatus, isMonitoring } from '../lib/stores';
  import type { SystemStatus as SystemStatusType } from '../types';

  let statusData = $state<SystemStatusType | null>(null);
  let monitoringState = $state(false);

  $effect(() => {
    const unsub1 = systemStatus.subscribe((s) => {
      statusData = s;
    });
    const unsub2 = isMonitoring.subscribe((m) => {
      monitoringState = m;
    });
    return () => {
      unsub1();
      unsub2();
    };
  });

  $effect(() => {
    const interval = setInterval(() => {
      systemStatus.refresh();
    }, 2000);
    return () => clearInterval(interval);
  });

  function getStatusIndicator(status: string): { color: string; text: string } {
    switch (status) {
      case 'active':
        return { color: 'bg-green-500', text: '运行中' };
      case 'standby':
        return { color: 'bg-yellow-500', text: '待机' };
      case 'error':
        return { color: 'bg-red-500', text: '错误' };
      default:
        return { color: 'bg-gray-500', text: '未知' };
    }
  }

  function formatTime(timestamp: number): string {
    if (timestamp === 0) return '未同步';
    return new Date(timestamp).toLocaleTimeString('zh-CN');
  }
</script>

<div class="p-4 bg-gray-900 rounded-lg shadow-lg">
  <h3 class="text-xl font-bold text-white mb-4 flex items-center gap-2">
    <span class="text-2xl">🖥️</span>
    系统状态
  </h3>

  {#if statusData}
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-gray-800 p-3 rounded-lg">
          <div class="text-gray-400 text-sm mb-2">接触网检测系统</div>
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full {getStatusIndicator(statusData.catenarySystem.status).color}"></div>
            <span class="text-white">{getStatusIndicator(statusData.catenarySystem.status).text}</span>
          </div>
          <div class="text-xs text-gray-400 mt-1">
            数据质量: {statusData.catenarySystem.dataQuality.toFixed(1)}%
          </div>
          <div class="text-xs text-gray-500">
            最后同步: {formatTime(statusData.catenarySystem.lastSync)}
          </div>
        </div>

        <div class="bg-gray-800 p-3 rounded-lg">
          <div class="text-gray-400 text-sm mb-2">行车保障系统</div>
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full {getStatusIndicator(statusData.operationSystem.status).color}"></div>
            <span class="text-white">{getStatusIndicator(statusData.operationSystem.status).text}</span>
          </div>
          <div class="text-xs text-gray-400 mt-1">
            数据质量: {statusData.operationSystem.dataQuality.toFixed(1)}%
          </div>
          <div class="text-xs text-gray-500">
            最后同步: {formatTime(statusData.operationSystem.lastSync)}
          </div>
        </div>
      </div>

      <div class="bg-gray-800 p-3 rounded-lg">
        <div class="text-gray-400 text-sm mb-2">数据库状态</div>
        <div class="grid grid-cols-3 gap-4">
          <div>
            <div class="text-gray-500 text-xs">连接</div>
            <div class="text-green-400">已连接</div>
          </div>
          <div>
            <div class="text-gray-500 text-xs">缓存使用</div>
            <div class="text-cyan-400">{statusData.databaseStatus.cacheUsage.toFixed(2)}%</div>
          </div>
          <div>
            <div class="text-gray-500 text-xs">清理时间</div>
            <div class="text-gray-300">
              {statusData.databaseStatus.lastCleanup === 0 ? '未执行' : formatTime(statusData.databaseStatus.lastCleanup)}
            </div>
          </div>
        </div>
      </div>

      <div class="bg-gray-800 p-3 rounded-lg">
        <div class="flex items-center justify-between">
          <span class="text-gray-400">监测状态</span>
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full {monitoringState ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}"></div>
            <span class="text-white font-semibold">{monitoringState ? '运行中' : '已停止'}</span>
          </div>
        </div>
      </div>
    </div>
  {:else}
    <div class="text-gray-400 text-center py-4">
      加载中...
    </div>
  {/if}
</div>
