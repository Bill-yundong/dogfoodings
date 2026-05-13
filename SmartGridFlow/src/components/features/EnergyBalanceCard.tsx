import { Component } from 'solid-js';
import { Card } from '../shared/Card';
import { ProgressBar } from '../shared/ProgressBar';
import { useEnergyStore } from '../../store/useEnergyStore';
import { ENERGY_TYPE_LABELS } from '../../domain/constants/energy';

export const EnergyBalanceCard: Component = () => {
  const { energyBalance } = useEnergyStore();

  const energyTypes = [
    { key: 'cooling', color: 'blue' as const },
    { key: 'heating', color: 'red' as const },
    { key: 'electricity', color: 'yellow' as const },
  ];

  return (
    <Card title="冷热电平衡">
      <div class="space-y-6">
        {energyTypes.map(({ key, color }) => {
          const supply = energyBalance().supply[key];
          const demandVal = energyBalance().demand[key];
          const surplus = energyBalance().surplus[key];
          const deficit = energyBalance().deficit[key];

          return (
            <div class="space-y-2">
              <div class="flex justify-between items-center">
                <span class={`font-medium text-${color}-600`}>{ENERGY_TYPE_LABELS[key]}</span>
                <span class="text-sm text-gray-600">
                  {supply.toFixed(0)} / {demandVal.toFixed(0)} kW
                </span>
              </div>
              <ProgressBar value={supply} max={demandVal} color={color} />
              <div class="flex justify-between text-xs">
                <span class="text-green-600">盈余: {surplus.toFixed(0)} kW</span>
                <span class="text-red-600">缺口: {deficit.toFixed(0)} kW</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
