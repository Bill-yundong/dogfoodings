import { Component, createEffect, createSignal, For } from 'solid-js';
import { appState, actions, getSyncStats } from '../../store';
import { SEMANTIC_LEVEL_COLORS } from '../../../core/constants/app.constants';
import type { FaultSignal } from '../../../core/domain';

const sourceLabels: Record<string, string> = {
  maintenance: '维保系统',
  operation_control: '运行控制',
  sensor: '传感器'
};

export const FaultSignalPanel: Component = () => {
  const [faults, setFaults] = createSignal<FaultSignal[]>([]);

  createEffect(() => {
    const interval = setInterval(() => {
      setFaults([...appState.faultSignals]);
    }, 200);

    return () => clearInterval(interval);
  });

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN');
  };

  return (
    <div class="bg-gray-800 rounded-lg p-4 shadow-lg">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold text-white">故障信号监控</h2>
        <button 
          onClick={actions.clearFaults}
          class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
        >
          清除全部
        </button>
      </div>
      
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div class="bg-gray-700 rounded p-3">
          <div class="text-gray-400 text-sm">维保系统同步</div>
          <div class="flex items-center justify-between">
            <span class="text-2xl font-bold text-green-400">{getSyncStats().maintenance.syncedCount}</span>
            <span class="text-sm text-gray-400">
              待处理: <span class="text-yellow-400">{getSyncStats().maintenance.pendingCount}</span>
            </span>
          </div>
        </div>
        <div class="bg-gray-700 rounded p-3">
          <div class="text-gray-400 text-sm">运行控制同步</div>
          <div class="flex items-center justify-between">
            <span class="text-2xl font-bold text-blue-400">{getSyncStats().operation.syncedCount}</span>
            <span class="text-sm text-gray-400">
              待处理: <span class="text-yellow-400">{getSyncStats().operation.pendingCount}</span>
            </span>
          </div>
        </div>
      </div>

      <div class="max-h-80 overflow-y-auto space-y-2">
        <For each={faults()}>
          {fault => (
            <div 
              class={`bg-gray-700 rounded-lg p-3 border-l-4 ${
                fault.semanticLevel === 'emergency' ? 'border-red-500' :
                fault.semanticLevel === 'critical' ? 'border-orange-500' :
                fault.semanticLevel === 'warning' ? 'border-yellow-500' :
                'border-blue-500'
              } ${fault.acknowledged ? 'opacity-60' : ''}`}
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <span class={`${SEMANTIC_LEVEL_COLORS[fault.semanticLevel]} px-2 py-0.5 rounded text-xs text-white font-medium`}>
                      {fault.semanticLevel.toUpperCase()}
                    </span>
                    <span class="text-xs text-gray-400">{sourceLabels[fault.source]}</span>
                    <span class="text-xs text-gray-400">{formatTime(fault.timestamp)}</span>
                  </div>
                  <div class="text-white font-medium">{fault.description}</div>
                  {fault.doorId && (
                    <div class="text-sm text-gray-400">关联门体: {fault.doorId}</div>
                  )}
                </div>
                <div class="flex items-center gap-2">
                  <div class="flex gap-1">
                    <span 
                      class={`w-2 h-2 rounded-full ${
                        actions.isSignalSynced(fault.id, 'maintenance') 
                          ? 'bg-green-500' 
                          : 'bg-gray-500'
                      }`}
                      title="维保系统同步状态"
                    />
                    <span 
                      class={`w-2 h-2 rounded-full ${
                        actions.isSignalSynced(fault.id, 'operation_control') 
                          ? 'bg-blue-500' 
                          : 'bg-gray-500'
                      }`}
                      title="运行控制同步状态"
                    />
                  </div>
                  {!fault.acknowledged && (
                    <button 
                      onClick={() => actions.acknowledgeFault(fault.id)}
                      class="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-xs transition-colors"
                    >
                      确认
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </For>
        {faults().length === 0 && (
          <div class="text-center text-gray-500 py-8">
            暂无故障信号
          </div>
        )}
      </div>
    </div>
  );
};
