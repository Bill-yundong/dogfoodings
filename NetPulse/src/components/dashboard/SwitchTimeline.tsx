import { Component, For } from 'solid-js';
import { ArrowRight, Clock, MapPin, Zap, Activity, Wifi } from 'lucide-solid';
import type { SwitchEvent } from '@/types';
import type { AcceleratorNode } from '@shared/protocol';

interface SwitchTimelineProps {
  events: SwitchEvent[];
  nodes: AcceleratorNode[];
}

const reasonConfig: Record<string, { icon: Component; color: string; label: string }> = {
  latency: { icon: Clock, color: 'text-neon-cyan', label: '时延过高' },
  jitter: { icon: Activity, color: 'text-neon-purple', label: '抖动过大' },
  loss: { icon: Wifi, color: 'text-alert-red', label: '丢包严重' },
  manual: { icon: Zap, color: 'text-alert-orange', label: '手动切换' },
  predictive: { icon: Zap, color: 'text-alert-green', label: '预测切换' },
};

export const SwitchTimeline: Component<SwitchTimelineProps> = (props) => {
  const getNodeName = (id: string) => {
    return props.nodes.find((n) => n.id === id)?.name || id;
  };

  const displayEvents = () => props.events.slice(0, 20);

  return (
    <div class="glass-card p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-display font-semibold text-neon-cyan">路径切换轨迹</h3>
        <span class="text-xs text-metal-500">共 {props.events.length} 次切换</span>
      </div>

      <div class="space-y-4 max-h-96 overflow-y-auto pr-2">
        <For each={displayEvents()}>
          {(event, index) => {
            const config = reasonConfig[event.reason] || reasonConfig.manual;
            const isLast = index() === 0;

            return (
              <div class="relative flex gap-4 animate-fade-in">
                {!isLast && (
                  <div class="absolute left-[11px] top-6 w-px h-full bg-metal-700/30" />
                )}

                <div
                  class={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center ${
                    event.success
                      ? 'bg-space-800 border border-neon-cyan/50'
                      : 'bg-space-800 border border-alert-red/50'
                  }`}
                >
                  <div class={`w-3 h-3 ${config.color}`}>
                    {(() => {
                      const Icon = config.icon;
                      return <Icon />;
                    })()}
                  </div>
                </div>

                <div class="flex-1 pb-4">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-sm text-metal-100">{getNodeName(event.fromPath)}</span>
                    <ArrowRight class="w-4 h-4 text-metal-500" />
                    <span class="text-sm text-neon-cyan">{getNodeName(event.toPath)}</span>
                  </div>
                  <div class="flex items-center gap-3 text-xs">
                    <span class={config.color}>{config.label}</span>
                    <span class="text-metal-500">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                    <span class="text-metal-500">耗时 {event.switchTime}ms</span>
                    {event.success ? (
                      <span class="text-alert-green">成功</span>
                    ) : (
                      <span class="text-alert-red">失败</span>
                    )}
                  </div>
                </div>
              </div>
            );
          }}
        </For>

        {props.events.length === 0 && (
          <div class="text-center py-8 text-metal-500">
            <MapPin class="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>暂无路径切换记录</p>
          </div>
        )}
      </div>
    </div>
  );
};
