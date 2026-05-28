import { Component, createSignal, onCleanup, onMount } from 'solid-js';
import { A, useLocation } from '@solidjs/router';
import {
  Activity,
  BarChart3,
  Network,
  Settings,
  Power,
  PowerOff,
  Wifi,
  Zap,
} from 'lucide-solid';
import { useHub } from '@/store';
import { StatusIndicator } from '@/components/ui/StatusIndicator';

interface HeaderProps {
  onToggleMonitor: () => void;
}

export const Header: Component<HeaderProps> = (props) => {
  const hub = useHub();
  const location = useLocation();
  const [currentTime, setCurrentTime] = createSignal(new Date());

  let timer: number;

  onMount(() => {
    timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
  });

  onCleanup(() => {
    clearInterval(timer);
  });

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const navItems = [
    { path: '/', label: '仪表盘', icon: Activity },
    { path: '/paths', label: '路径管理', icon: Network },
    { path: '/history', label: '历史分析', icon: BarChart3 },
    { path: '/settings', label: '系统设置', icon: Settings },
  ];

  const connectionStatus = () => {
    if (!hub.isMonitoring()) return 'offline';
    switch (hub.connectionStatus()) {
      case 'connected':
        return 'online';
      case 'connecting':
      case 'reconnecting':
        return 'warning';
      case 'error':
        return 'critical';
      default:
        return 'offline';
    }
  };

  return (
    <header class="fixed top-0 left-0 right-0 z-50 h-16 bg-space-900/80 backdrop-blur-xl border-b border-white/5">
      <div class="h-full px-6 flex items-center justify-between">
        <div class="flex items-center gap-8">
          <A href="/" class="flex items-center gap-3 group">
            <div class="relative">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center group-hover:shadow-neon transition-shadow">
                <Zap class="w-6 h-6 text-white" />
              </div>
              <div class="absolute -top-1 -right-1 w-3 h-3">
                <StatusIndicator status={connectionStatus()} size="sm" />
              </div>
            </div>
            <div>
              <h1 class="font-display font-bold text-xl bg-gradient-to-r from-neon-cyan to-neon-purple bg-clip-text text-transparent">
                NetPulse
              </h1>
              <p class="text-[10px] text-metal-500 -mt-1">链路质量协同中枢</p>
            </div>
          </A>

          <nav class="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <A
                  href={item.path}
                  class={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30'
                      : 'text-metal-400 hover:text-metal-100 hover:bg-white/5'
                  }`}
                >
                  <item.icon class="w-4 h-4" />
                  <span class="text-sm font-medium">{item.label}</span>
                </A>
              );
            })}
          </nav>
        </div>

        <div class="flex items-center gap-4">
          <div class="flex items-center gap-4 text-sm">
            {hub.isMonitoring() && (
              <>
                <div class="flex items-center gap-2 text-metal-300">
                  <Wifi class="w-4 h-4 text-neon-cyan" />
                  <span class="font-mono">
                    {formatDuration(hub.getMonitoringDuration())}
                  </span>
                </div>
                <div class="h-6 w-px bg-metal-700" />
              </>
            )}
            <div class="text-metal-400 font-mono">
              {currentTime().toLocaleTimeString()}
            </div>
          </div>

          <button
            onClick={props.onToggleMonitor}
            class={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 ${
              hub.isMonitoring()
                ? 'bg-alert-red/10 text-alert-red border border-alert-red/30 hover:bg-alert-red/20'
                : 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 hover:bg-neon-cyan/20'
            }`}
          >
            {hub.isMonitoring() ? (
              <>
                <PowerOff class="w-4 h-4" />
                <span>停止监测</span>
              </>
            ) : (
              <>
                <Power class="w-4 h-4" />
                <span>开始监测</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
