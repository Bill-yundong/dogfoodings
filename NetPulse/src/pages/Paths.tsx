import { Component, createMemo } from 'solid-js';
import { Network, Sparkles } from 'lucide-solid';
import { useHub } from '@/store';
import { PathComparison } from '@/components/dashboard/PathComparison';
import { StatusIndicator } from '@/components/ui/StatusIndicator';

export const Paths: Component = () => {
  const hub = useHub();

  const pathQualities = createMemo(() => {
    const qualities = new Map<string, any>();
    for (const node of hub.state.nodes) {
      const quality = hub.getPathQuality(node.id);
      if (quality) {
        qualities.set(node.id, quality);
      }
    }
    return qualities;
  });

  const recommendedPath = createMemo(() => {
    if (!hub.state.isMonitoring) return null;

    let best: { id: string; score: number } | null = null;
    for (const node of hub.state.nodes.filter((n) => n.status === 'online')) {
      const quality = hub.getPathQuality(node.id);
      if (quality && (!best || quality.overallScore > best.score)) {
        best = { id: node.id, score: quality.overallScore };
      }
    }
    return best;
  });

  const handleSelectPath = (pathId: string) => {
    hub.switchPath(pathId, 'manual');
  };

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="font-display text-2xl font-bold text-metal-100">路径管理</h2>
          <p class="text-metal-400 text-sm mt-1">
            管理和切换加速节点，查看各路径的实时质量数据
          </p>
        </div>
        <div class="flex items-center gap-3">
          {hub.state.config.autoSwitch && (
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-alert-green/10 border border-alert-green/30">
              <Sparkles class="w-4 h-4 text-alert-green" />
              <span class="text-sm text-alert-green font-medium">智能切换已启用</span>
            </div>
          )}
        </div>
      </div>

      {recommendedPath() &&
        recommendedPath()!.id !== hub.state.activePath && (
          <div class="glass-card p-5 border border-neon-cyan/30 animate-pulse-glow text-neon-cyan">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-xl bg-neon-cyan/20 flex items-center justify-center flex-shrink-0">
                <Sparkles class="w-6 h-6 text-neon-cyan" />
              </div>
              <div class="flex-1">
                <h3 class="font-semibold text-lg">智能路径推荐</h3>
                <p class="text-sm text-metal-300 mt-1">
                  检测到{' '}
                  <span class="text-neon-cyan font-semibold">
                    {hub.state.nodes.find((n) => n.id === recommendedPath()!.id)?.name}
                  </span>{' '}
                  当前质量更优，建议切换以获得更好的网络体验。
                </p>
              </div>
              <button
                onClick={() => handleSelectPath(recommendedPath()!.id)}
                class="btn-primary text-sm"
              >
                立即切换
              </button>
            </div>
          </div>
        )}

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        {hub.state.nodes.map((node) => {
          const quality = hub.getPathQuality(node.id);
          const isActive = hub.state.activePath === node.id;

          return (
            <div class="glass-card p-5">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                  <div
                    class={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isActive ? 'bg-neon-cyan/20' : 'bg-space-700'
                    }`}
                  >
                    <Network
                      class={`w-5 h-5 ${isActive ? 'text-neon-cyan' : 'text-metal-400'}`}
                    />
                  </div>
                  <div>
                    <h3 class="font-semibold text-metal-100">{node.name}</h3>
                    <p class="text-xs text-metal-500">
                      {node.location.city}, {node.location.country}
                    </p>
                  </div>
                </div>
                <StatusIndicator status={node.status} />
              </div>

              <div class="space-y-3 mb-4">
                <div class="flex justify-between text-sm">
                  <span class="text-metal-400">综合评分</span>
                  <span
                    class={`font-semibold ${
                      quality
                        ? quality.overallScore >= 85
                          ? 'text-alert-green'
                          : quality.overallScore >= 65
                          ? 'text-neon-cyan'
                          : quality.overallScore >= 40
                          ? 'text-alert-orange'
                          : 'text-alert-red'
                        : 'text-metal-400'
                    }`}
                  >
                    {quality ? quality.overallScore.toFixed(1) : '--'} 分
                  </span>
                </div>
                <div class="h-2 bg-space-700 rounded-full overflow-hidden">
                  <div
                    class={`h-full rounded-full transition-all duration-500 ${
                      quality
                        ? quality.overallScore >= 85
                          ? 'bg-alert-green'
                          : quality.overallScore >= 65
                          ? 'bg-neon-cyan'
                          : quality.overallScore >= 40
                          ? 'bg-alert-orange'
                          : 'bg-alert-red'
                        : 'bg-metal-700'
                    }`}
                    style={{ width: `${quality ? quality.overallScore : 0}%` }}
                  />
                </div>

                <div class="grid grid-cols-3 gap-2 pt-2 text-xs">
                  <div>
                    <p class="text-metal-500">时延</p>
                    <p class="text-metal-200 font-mono">
                      {quality ? quality.latencyScore.toFixed(0) : '--'}
                    </p>
                  </div>
                  <div>
                    <p class="text-metal-500">抖动</p>
                    <p class="text-metal-200 font-mono">
                      {quality ? quality.jitterScore.toFixed(0) : '--'}
                    </p>
                  </div>
                  <div>
                    <p class="text-metal-500">丢包</p>
                    <p class="text-metal-200 font-mono">
                      {quality ? quality.lossScore.toFixed(0) : '--'}
                    </p>
                  </div>
                </div>
              </div>

              <div class="flex items-center justify-between pt-3 border-t border-white/10">
                <div class="flex items-center gap-2 text-xs">
                  <span class="text-metal-500">负载</span>
                  <div class="w-16 h-1.5 bg-space-700 rounded-full overflow-hidden">
                    <div
                      class={`h-full rounded-full ${
                        node.load > 0.8
                          ? 'bg-alert-red'
                          : node.load > 0.6
                          ? 'bg-alert-orange'
                          : 'bg-neon-cyan'
                      }`}
                      style={{ width: `${node.load * 100}%` }}
                    />
                  </div>
                  <span
                    class={`font-mono ${
                      node.load > 0.8
                        ? 'text-alert-red'
                        : node.load > 0.6
                        ? 'text-alert-orange'
                        : 'text-alert-green'
                    }`}
                  >
                    {(node.load * 100).toFixed(0)}%
                  </span>
                </div>
                {node.status === 'online' && !isActive && (
                  <button
                    onClick={() => handleSelectPath(node.id)}
                    class="text-xs text-neon-cyan hover:text-neon-cyan/80 font-medium"
                  >
                    切换
                  </button>
                )}
                {isActive && (
                  <span class="text-xs text-alert-green font-medium">当前使用</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {hub.state.isMonitoring && (
        <PathComparison
          nodes={hub.state.nodes}
          pathQualities={pathQualities()}
          activePath={hub.state.activePath}
          onSelectPath={handleSelectPath}
        />
      )}

      {!hub.state.isMonitoring && (
        <div class="glass-card p-12 text-center">
          <Network class="w-16 h-16 mx-auto mb-4 text-metal-600" />
          <h3 class="font-display text-xl font-semibold text-metal-300 mb-2">
            开始监测以查看路径详情
          </h3>
          <p class="text-metal-500">点击右上角的开始按钮，系统将自动探测所有可用路径</p>
        </div>
      )}
    </div>
  );
};
