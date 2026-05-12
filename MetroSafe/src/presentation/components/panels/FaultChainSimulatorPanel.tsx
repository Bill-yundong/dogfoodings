import { Component, createEffect, createSignal, For } from 'solid-js';
import { appState, getChainStates, actions } from '../../store';

export const FaultChainSimulatorPanel: Component = () => {
  const [chains, setChains] = createSignal(getChainStates());

  createEffect(() => {
    const interval = setInterval(() => {
      setChains(getChainStates());
    }, 100);

    return () => clearInterval(interval);
  });

  return (
    <div class="bg-gray-800 rounded-lg p-4 shadow-lg">
      <h2 class="text-xl font-bold text-white mb-4">故障链模拟</h2>
      
      <div class="grid grid-cols-2 gap-2 mb-4">
        <button 
          onClick={() => actions.triggerFault('motor_failure', 'current_sensor')}
          class="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
        >
          触发电机故障
        </button>
        <button 
          onClick={() => actions.triggerFault('sensor_error', 'position_sensor_a')}
          class="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm transition-colors"
        >
          触发传感器故障
        </button>
        <button 
          onClick={() => actions.triggerFault('obstacle_detection', 'light_curtain')}
          class="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm transition-colors"
        >
          触发障碍物检测
        </button>
        <button 
          onClick={() => actions.triggerFault('communication', 'packet_loss')}
          class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
        >
          触发通信故障
        </button>
      </div>

      <div class="flex gap-2 mb-4">
        <button 
          onClick={actions.triggerRandomFault}
          class="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors"
        >
          随机故障
        </button>
        <button 
          onClick={actions.toggleSimulation}
          class={`flex-1 px-3 py-2 text-white rounded text-sm transition-colors ${
            appState.isSimulationRunning ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-500'
          }`}
        >
          {appState.isSimulationRunning ? '停止模拟' : '自动模拟'}
        </button>
        <button 
          onClick={actions.resetAllChains}
          class="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm transition-colors"
        >
          重置全部
        </button>
      </div>

      <div class="space-y-3">
        <For each={chains()}>
          {chain => (
            <div class="bg-gray-700 rounded-lg p-3">
              <div class="flex items-center justify-between mb-2">
                <span class="text-white font-medium">{chain.name}</span>
                <span class={`px-2 py-0.5 rounded text-xs font-medium ${
                  chain.active ? 'bg-red-500 text-white' : 'bg-gray-600 text-gray-300'
                }`}>
                  {chain.active ? '激活' : '正常'}
                </span>
              </div>
              <div class="flex items-center gap-1 flex-wrap">
                <For each={chain.gates}>
                  {gate => (
                    <>
                      <div 
                        class={`px-2 py-1 rounded text-xs ${
                          gate.output 
                            ? 'bg-red-500 text-white' 
                            : 'bg-gray-600 text-gray-300'
                        }`}
                        title={gate.type}
                      >
                        {gate.id}
                      </div>
                      {gate !== chain.gates[chain.gates.length - 1] && (
                        <div class="text-gray-500">→</div>
                      )}
                    </>
                  )}
                </For>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
};

// 修正 appState
