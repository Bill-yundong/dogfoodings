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
    <div class="crane-list p-8">
      <h3 class="text-2xl font-extrabold text-slate-800 mb-8 flex items-center gap-4 flex-wrap">
        <span class="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white text-3xl shadow-lg shadow-orange-500/30 flex-shrink-0">
          🚧
        </span>
        <span>塔吊状态监控</span>
      </h3>
      <div class="space-y-6">
        <For each={props.cranes}>
          {(crane, index) => {
            const colors = craneColors[index() % craneColors.length];
            return (
              <div class={`p-7 rounded-2xl ${colors.light} border-2 border-opacity-60 hover:shadow-xl transition-all duration-300`}>
                <div class="flex items-center gap-5">
                  <div class={`w-6 h-6 rounded-full ${colors.bg} shadow-xl flex-shrink-0`}></div>
                  <div class="flex-1 min-w-0">
                    <h4 class="font-extrabold text-slate-800 text-xl whitespace-nowrap">{crane.name}</h4>
                    <p class="text-sm text-slate-500 mt-2 font-mono">{crane.id}</p>
                  </div>
                  <div class="text-right bg-white/80 px-6 py-4 rounded-xl shadow-sm flex-shrink-0">
                    <p class="text-2xl font-extrabold text-slate-700">
                      {(crane.jibAngle % 360).toFixed(0)}°
                    </p>
                    <p class="text-sm text-slate-500 font-semibold mt-1 whitespace-nowrap">
                      {crane.rotationSpeed > 0 ? '顺时针' : crane.rotationSpeed < 0 ? '逆时针' : '静止'}
                    </p>
                  </div>
                </div>
                <div class="mt-6 grid grid-cols-2 gap-4">
                  <div class="bg-white/80 px-5 py-4 rounded-xl shadow-sm">
                    <span class="text-xs text-slate-500 block font-semibold uppercase tracking-wide">小车位置</span>
                    <span class="font-extrabold text-slate-700 text-lg mt-1 block">{crane.trolleyPosition.toFixed(1)}m</span>
                  </div>
                  <div class="bg-white/80 px-5 py-4 rounded-xl shadow-sm">
                    <span class="text-xs text-slate-500 block font-semibold uppercase tracking-wide">吊钩高度</span>
                    <span class="font-extrabold text-slate-700 text-lg mt-1 block">{crane.hookHeight.toFixed(1)}m</span>
                  </div>
                  <div class="bg-white/80 px-5 py-4 rounded-xl shadow-sm">
                    <span class="text-xs text-slate-500 block font-semibold uppercase tracking-wide">载重</span>
                    <span class="font-extrabold text-slate-700 text-lg mt-1 block">{crane.loadWeight}kg</span>
                  </div>
                  <div class="bg-white/80 px-5 py-4 rounded-xl shadow-sm">
                    <span class="text-xs text-slate-500 block font-semibold uppercase tracking-wide">臂长</span>
                    <span class="font-extrabold text-slate-700 text-lg mt-1 block">{crane.jibLength}m</span>
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
