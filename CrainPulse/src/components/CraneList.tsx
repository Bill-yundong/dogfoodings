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
    <div class="crane-list p-6">
      <h3 class="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
        <span class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white text-lg">
          🚧
        </span>
        塔吊状态监控
      </h3>
      <div class="space-y-4">
        <For each={props.cranes}>
          {(crane, index) => {
            const colors = craneColors[index() % craneColors.length];
            return (
              <div class={`p-5 rounded-2xl ${colors.light} border border-opacity-50 hover:shadow-md transition-all duration-300`}>
                <div class="flex items-center gap-4">
                  <div class={`w-5 h-5 rounded-full ${colors.bg} shadow-lg`}></div>
                  <div class="flex-1">
                    <h4 class="font-bold text-slate-800 text-lg">{crane.name}</h4>
                    <p class="text-xs text-slate-500 mt-1 font-mono">{crane.id}</p>
                  </div>
                  <div class="text-right bg-white/60 px-4 py-2 rounded-xl">
                    <p class="text-xl font-bold text-slate-700">
                      {(crane.jibAngle % 360).toFixed(0)}°
                    </p>
                    <p class="text-xs text-slate-500 font-medium">
                      {crane.rotationSpeed > 0 ? '顺时针' : crane.rotationSpeed < 0 ? '逆时针' : '静止'}
                    </p>
                  </div>
                </div>
                <div class="mt-4 grid grid-cols-2 gap-3">
                  <div class="bg-white/70 px-3 py-2 rounded-lg">
                    <span class="text-xs text-slate-500 block">小车位置</span>
                    <span class="font-bold text-slate-700">{crane.trolleyPosition.toFixed(1)}m</span>
                  </div>
                  <div class="bg-white/70 px-3 py-2 rounded-lg">
                    <span class="text-xs text-slate-500 block">吊钩高度</span>
                    <span class="font-bold text-slate-700">{crane.hookHeight.toFixed(1)}m</span>
                  </div>
                  <div class="bg-white/70 px-3 py-2 rounded-lg">
                    <span class="text-xs text-slate-500 block">载重</span>
                    <span class="font-bold text-slate-700">{crane.loadWeight}kg</span>
                  </div>
                  <div class="bg-white/70 px-3 py-2 rounded-lg">
                    <span class="text-xs text-slate-500 block">臂长</span>
                    <span class="font-bold text-slate-700">{crane.jibLength}m</span>
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
