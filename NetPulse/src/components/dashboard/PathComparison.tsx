import { Component, For } from 'solid-js';
import { Activity, Clock, Wifi, Users, Server } from 'lucide-solid';
import type { AcceleratorNode } from '@shared/protocol';
import type { PathQuality } from '@/types';
import { getQualityLevel, getQualityColor, getQualityBgColor } from '@/utils/quality';

interface PathComparisonProps {
  nodes: AcceleratorNode[];
  pathQualities: Map<string, PathQuality>;
  activePath: string | null;
  onSelectPath: (pathId: string) => void;
}

export const PathComparison: Component<PathComparisonProps> = (props) => {
  const onlineNodes = () => props.nodes.filter((n) => n.status === 'online');

  return (
    <div class="glass-card p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-display font-semibold text-neon-cyan">多路径质量对比</h3>
        <span class="text-xs text-metal-500">{onlineNodes().length} 个可用节点</span>
      </div>

      <div class="grid gap-3">
        <For each={onlineNodes()}>
          {(node) => {
            const quality = () => props.pathQualities.get(node.id);
            const isActive = () => props.activePath === node.id;
            const level = () =>
              quality() ? getQualityLevel(quality()!.overallScore) : 'good';

            return (
              <div
                onClick={() => !isActive() && props.onSelectPath(node.id)}
                class={`p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                  isActive()
                    ? 'border-neon-cyan/50 bg-neon-cyan/5 shadow-neon'
                    : 'border-white/10 bg-glass hover:border-neon-cyan/30'
                }`}
              >
                <div class="flex items-start justify-between mb-3">
                  <div class="flex items-center gap-3">
                    <div
                      class={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isActive() ? 'bg-neon-cyan/20' : 'bg-space-700'
                      }`}
                    >
                      <Server
                        class={`w-5 h-5 ${isActive() ? 'text-neon-cyan' : 'text-metal-400'}`}
                      />
                    </div>
                    <div>
                      <h4 class="font-semibold text-metal-100">{node.name}</h4>
                      <p class="text-xs text-metal-400">
                        {node.location.city}, {node.location.country}
                      </p>
                    </div>
                  </div>
                  {quality() && (
                    <div
                      class={`px-3 py-1 rounded-full text-xs font-semibold ${getQualityBgColor(
                        level()
                      )} ${getQualityColor(level())}`}
                    >
                      {quality()!.overallScore.toFixed(0)} 分
                    </div>
                  )}
                </div>

                <div class="grid grid-cols-4 gap-2 text-xs">
                  <div class="flex items-center gap-1">
                    <Clock class="w-3 h-3 text-neon-cyan" />
                    <span class="text-metal-300">
                      {quality()?.latencyScore.toFixed(0) || '--'}分
                    </span>
                  </div>
                  <div class="flex items-center gap-1">
                    <Activity class="w-3 h-3 text-neon-purple" />
                    <span class="text-metal-300">
                      {quality()?.jitterScore.toFixed(0) || '--'}分
                    </span>
                  </div>
                  <div class="flex items-center gap-1">
                    <Wifi class="w-3 h-3 text-alert-green" />
                    <span class="text-metal-300">
                      {quality()?.lossScore.toFixed(0) || '--'}分
                    </span>
                  </div>
                  <div class="flex items-center gap-1">
                    <Users class="w-3 h-3 text-metal-400" />
                    <span class="text-metal-300">{node.currentUsers}</span>
                  </div>
                </div>

                {quality() && (
                  <div class="mt-3">
                    <div class="flex justify-between text-xs mb-1">
                      <span class="text-metal-400">负载</span>
                      <span
                        class={
                          node.load > 0.8
                            ? 'text-alert-red'
                            : node.load > 0.6
                            ? 'text-alert-orange'
                            : 'text-alert-green'
                        }
                      >
                        {(node.load * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div class="h-1.5 bg-space-700 rounded-full overflow-hidden">
                      <div
                        class={`h-full rounded-full transition-all duration-500 ${
                          node.load > 0.8
                            ? 'bg-alert-red'
                            : node.load > 0.6
                            ? 'bg-alert-orange'
                            : 'bg-neon-cyan'
                        }`}
                        style={{ width: `${node.load * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {quality()?.prediction && (
                  <div class="mt-3 flex items-center gap-2 text-xs">
                    <span class="text-metal-500">趋势:</span>
                    <span
                      class={
                        quality()!.prediction.trend === 'improving'
                          ? 'text-alert-green'
                          : quality()!.prediction.trend === 'deteriorating'
                          ? 'text-alert-red'
                          : 'text-metal-400'
                      }
                    >
                      {quality()!.prediction.trend === 'improving'
                        ? '↑ 改善中'
                        : quality()!.prediction.trend === 'deteriorating'
                        ? '↓ 恶化中'
                        : '→ 稳定'}
                    </span>
                    <span class="text-metal-500 ml-auto">
                      预测5s时延: {quality()!.prediction.next5sLatency.toFixed(1)}ms
                    </span>
                  </div>
                )}
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
};
