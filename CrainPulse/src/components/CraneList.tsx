import { For } from 'solid-js';
import type { CraneState } from '../types/crane';

interface CraneListProps {
  cranes: CraneState[];
}

export function CraneList(props: CraneListProps) {
  const craneColors = [
    { bg: 'bg-blue-500', light: 'bg-blue-100' },
    { bg: 'bg-emerald-500', light: 'bg-emerald-100' },
    { bg: 'bg-amber-500', light: 'bg-amber-100' }
  ];

  return (
    <div class="crane-list bg-white rounded-lg shadow p-4">
      <h3 class="text-lg font-semibold mb-3 text-gray-800">塔吊状态</h3>
      <div class="space-y-3">
        <For each={props.cranes}>
          {(crane, index) => {
            const colors = craneColors[index() % craneColors.length];
            return (
              <div class={`p-3 rounded-lg ${colors.light} border`}>
                <div class="flex items-center gap-3">
                  <div class={`w-3 h-3 rounded-full ${colors.bg}`}></div>
                  <div class="flex-1">
                    <h4 class="font-medium text-gray-800">{crane.name}</h4>
                    <p class="text-xs text-gray-500">{crane.id}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-medium text-gray-700">
                      {(crane.jibAngle % 360).toFixed(0)}°
                    </p>
                    <p class="text-xs text-gray-500">
                      {crane.rotationSpeed > 0 ? '顺时针' : crane.rotationSpeed < 0 ? '逆时针' : '静止'}
                    </p>
                  </div>
                </div>
                <div class="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span class="text-gray-500">小车:</span>
                    <span class="ml-1 font-medium">{crane.trolleyPosition.toFixed(1)}m</span>
                  </div>
                  <div>
                    <span class="text-gray-500">吊钩:</span>
                    <span class="ml-1 font-medium">{crane.hookHeight.toFixed(1)}m</span>
                  </div>
                  <div>
                    <span class="text-gray-500">载重:</span>
                    <span class="ml-1 font-medium">{crane.loadWeight}kg</span>
                  </div>
                  <div>
                    <span class="text-gray-500">臂长:</span>
                    <span class="ml-1 font-medium">{crane.jibLength}m</span>
                  </div>
                </div>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
}
