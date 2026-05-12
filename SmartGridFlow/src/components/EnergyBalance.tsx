import { Component } from 'solid-js';
import { energyStore } from '../store/energyStore';

export const EnergyBalance: Component = () => {
  const { energyBalance } = energyStore;

  return (
    <div class="bg-white rounded-lg shadow-md p-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">冷热电平衡</h3>
      <div class="space-y-4">
        {(['cooling', 'heating', 'electricity'] as const).map(type => {
          const labels = { cooling: '制冷', heating: '供热', electricity: '电力' };
          const colors = { cooling: 'text-blue-600', heating: 'text-red-600', electricity: 'text-yellow-600' };
          const bgColors = { cooling: 'bg-blue-500', heating: 'bg-red-500', electricity: 'bg-yellow-500' };
          
          const supply = energyBalance().supply[type];
          const demand = energyBalance().demand[type];
          const surplus = energyBalance().surplus[type];
          const deficit = energyBalance().deficit[type];
          const utilization = Math.min(100, (supply / demand) * 100);

          return (
            <div class="space-y-2">
              <div class="flex justify-between items-center">
                <span class={`font-medium ${colors[type]}`}>{labels[type]}</span>
                <span class="text-sm text-gray-600">
                  {supply.toFixed(0)} / {demand.toFixed(0)} kW
                </span>
              </div>
              <div class="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  class={`h-full ${bgColors[type]} transition-all duration-500`}
                  style={{ width: `${utilization}%` }}
                />
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-green-600">盈余: {surplus.toFixed(0)} kW</span>
                <span class="text-red-600">缺口: {deficit.toFixed(0)} kW</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
