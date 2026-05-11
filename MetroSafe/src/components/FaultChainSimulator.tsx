import { Component, createEffect, createSignal } from 'solid-js';
import { faultChainSimulator } from '../logic/FaultChainSimulator';
import { setSimulationRunning } from '../store/doorStore';

interface ChainStatus {
  id: string;
  active: boolean;
  gates: Array<{
    id: string;
    type: string;
    output: { value: boolean; timestamp: number };
  }>;
}

export const FaultChainSimulatorPanel: Component = () => {
  const [chains, setChains] = createSignal<ChainStatus[]>([]);
  const [isSimulating, setIsSimulating] = createSignal(false);

  createEffect(() => {
    const interval = setInterval(() => {
      setChains(faultChainSimulator.getAllChainsStatus() as ChainStatus[]);
    }, 100);

    return () => clearInterval(interval);
  });

  const triggerMotorChain = () => faultChainSimulator.triggerFault('motor_failure_chain', 'current_sensor');
  const triggerSensorChain = () => faultChainSimulator.triggerFault('sensor_error_chain', 'position_sensor_a');
  const triggerObstacleChain = () => faultChainSimulator.triggerFault('obstacle_detection_chain', 'light_curtain_triggered');
  const triggerCommChain = () => faultChainSimulator.triggerFault('communication_chain', 'packet_loss_detected');
  const triggerRandom = () => faultChainSimulator.triggerRandomFault();
  const resetAll = () => faultChainSimulator.resetAll();

  const toggleSimulation = () => {
    if (isSimulating()) {
      faultChainSimulator.stopSimulation();
      setSimulationRunning(false);
    } else {
      faultChainSimulator.startSimulation(3000);
      setSimulationRunning(true);
    }
    setIsSimulating(!isSimulating());
  };

  const chainLabels: Record<string, string> = {
    motor_failure_chain: '电机故障链',
    sensor_error_chain: '传感器故障链',
    obstacle_detection_chain: '障碍物检测链',
    communication_chain: '通信故障链'
  };

  return (
    <div class="bg-gray-800 rounded-lg p-4 shadow-lg">
      <h2 class="text-xl font-bold text-white mb-4">故障链模拟</h2>
      
      <div class="grid grid-cols-2 gap-2 mb-4">
        <button 
          onClick={triggerMotorChain}
          class="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
        >
          触发电机故障
        </button>
        <button 
          onClick={triggerSensorChain}
          class="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm transition-colors"
        >
          触发传感器故障
        </button>
        <button 
          onClick={triggerObstacleChain}
          class="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm transition-colors"
        >
          触发障碍物检测
        </button>
        <button 
          onClick={triggerCommChain}
          class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
        >
          触发通信故障
        </button>
      </div>

      <div class="flex gap-2 mb-4">
        <button 
          onClick={triggerRandom}
          class="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors"
        >
          随机故障
        </button>
        <button 
          onClick={toggleSimulation}
          class={`flex-1 px-3 py-2 text-white rounded text-sm transition-colors ${
            isSimulating() ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-500'
          }`}
        >
          {isSimulating() ? '停止模拟' : '自动模拟'}
        </button>
        <button 
          onClick={resetAll}
          class="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm transition-colors"
        >
          重置全部
        </button>
      </div>

      <div class="space-y-3">
        {chains().map(chain => (
          <div class="bg-gray-700 rounded-lg p-3">
            <div class="flex items-center justify-between mb-2">
              <span class="text-white font-medium">{chainLabels[chain.id]}</span>
              <span class={`px-2 py-0.5 rounded text-xs font-medium ${
                chain.active ? 'bg-red-500 text-white' : 'bg-gray-600 text-gray-300'
              }`}>
                {chain.active ? '激活' : '正常'}
              </span>
            </div>
            <div class="flex items-center gap-1">
              {chain.gates.map((gate, index) => (
                <>
                  <div 
                    class={`px-2 py-1 rounded text-xs ${
                      gate.output.value 
                        ? 'bg-red-500 text-white' 
                        : 'bg-gray-600 text-gray-300'
                    }`}
                    title={gate.type}
                  >
                    {gate.id}
                  </div>
                  {index < chain.gates.length - 1 && (
                    <div class="text-gray-500">→</div>
                  )}
                </>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
