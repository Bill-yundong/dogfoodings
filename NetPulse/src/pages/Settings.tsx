import { Component, createSignal, For } from 'solid-js';
import {
  Settings as SettingsIcon,
  Wifi,
  Activity,
  Database,
  Zap,
  Bell,
  Shield,
  RefreshCw,
  Trash2,
  Save,
  Server,
} from 'lucide-solid';
import { useHub } from '@/store';
import { storageService } from '@/core/storage';
import { DEFAULT_CONFIG } from '@shared/protocol';

export const Settings: Component = () => {
  const hub = useHub();
  const [saved, setSaved] = createSignal(false);
  const [config, setConfig] = createSignal({ ...hub.config() });

  const handleSave = () => {
    hub.updateConfig(config());
    localStorage.setItem('netpulse-config', JSON.stringify(config()));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setConfig({ ...DEFAULT_CONFIG });
  };

  const handleClearData = async () => {
    if (confirm('确定要清除所有历史数据吗？此操作不可恢复。')) {
      await storageService.clearAllData();
      location.reload();
    }
  };

  interface ConfigItem {
    key: string;
    label: string;
    type: 'number' | 'boolean';
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    description: string;
  }

  const configSections: { title: string; icon: any; items: ConfigItem[] }[] = [
    {
      title: '监测设置',
      icon: Activity,
      items: [
        {
          key: 'probeInterval',
          label: '探测间隔',
          unit: 'ms',
          type: 'number',
          min: 500,
          max: 5000,
          step: 100,
          description: '网络质量探测的时间间隔',
        },
        {
          key: 'sampleSize',
          label: '样本数量',
          type: 'number',
          min: 10,
          max: 200,
          step: 10,
          description: '用于质量计算的历史样本数量',
        },
      ],
    },
    {
      title: '阈值设置',
      icon: Bell,
      items: [
        {
          key: 'latencyThreshold',
          label: '时延阈值',
          unit: 'ms',
          type: 'number',
          min: 20,
          max: 500,
          step: 10,
          description: '超过此值触发时延告警',
        },
        {
          key: 'jitterThreshold',
          label: '抖动阈值',
          unit: 'ms',
          type: 'number',
          min: 5,
          max: 100,
          step: 5,
          description: '超过此值触发抖动告警',
        },
        {
          key: 'lossThreshold',
          label: '丢包阈值',
          unit: '%',
          type: 'number',
          min: 0.1,
          max: 10,
          step: 0.1,
          description: '超过此值触发丢包告警',
        },
      ],
    },
    {
      title: '智能切换',
      icon: Zap,
      items: [
        {
          key: 'autoSwitch',
          label: '自动路径切换',
          type: 'boolean',
          description: '当检测到更优路径时自动切换',
        },
        {
          key: 'minSwitchInterval',
          label: '最小切换间隔',
          unit: 's',
          type: 'number',
          min: 5,
          max: 300,
          step: 5,
          description: '两次路径切换之间的最小间隔时间',
        },
        {
          key: 'qualityImprovementThreshold',
          label: '质量提升阈值',
          unit: '%',
          type: 'number',
          min: 5,
          max: 50,
          step: 5,
          description: '只有当目标路径质量提升超过此值时才切换',
        },
      ],
    },
    {
      title: '数据存储',
      icon: Database,
      items: [
        {
          key: 'dataRetentionDays',
          label: '数据保留天数',
          type: 'number',
          min: 7,
          max: 365,
          step: 7,
          description: '历史数据在本地保留的天数',
        },
        {
          key: 'enableAnalytics',
          label: '启用数据分析',
          type: 'boolean',
          description: '自动分析网络环境特征并生成建议',
        },
      ],
    },
    {
      title: '同步设置',
      icon: Server,
      items: [
        {
          key: 'syncEnabled',
          label: '启用服务器同步',
          type: 'boolean',
          description: '将本地数据同步到加速服务器',
        },
        {
          key: 'syncInterval',
          label: '同步间隔',
          unit: 's',
          type: 'number',
          min: 10,
          max: 300,
          step: 10,
          description: '与服务器同步数据的间隔',
        },
      ],
    },
  ];

  return (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="font-display text-2xl font-bold text-metal-100">系统设置</h2>
          <p class="text-metal-400 text-sm mt-1">
            配置监测参数、告警阈值、数据存储等系统选项
          </p>
        </div>
        <div class="flex gap-3">
          <button
            onClick={handleReset}
            class="btn-secondary text-sm flex items-center gap-2"
          >
            <RefreshCw class="w-4 h-4" />
            恢复默认
          </button>
          <button
            onClick={handleSave}
            class="btn-primary text-sm flex items-center gap-2"
          >
            <Save class="w-4 h-4" />
            {saved() ? '已保存' : '保存设置'}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
          <For each={configSections}>
            {(section) => (
              <div class="glass-card p-6">
                <div class="flex items-center gap-3 mb-6">
                  <div class="w-10 h-10 rounded-xl bg-neon-cyan/10 flex items-center justify-center">
                    <section.icon class="w-5 h-5 text-neon-cyan" />
                  </div>
                  <h3 class="font-display font-semibold text-lg text-metal-100">
                    {section.title}
                  </h3>
                </div>

                <div class="space-y-5">
                  <For each={section.items}>
                    {(item) => (
                      <div class="flex items-start justify-between gap-6">
                        <div class="flex-1">
                          <div class="flex items-center gap-2">
                            <label class="text-sm font-medium text-metal-200">
                              {item.label}
                            </label>
                            {item.type === 'number' && (
                              <span class="text-xs text-metal-500">
                                ({item.min}-{item.max} {item.unit})
                              </span>
                            )}
                          </div>
                          <p class="text-xs text-metal-500 mt-1">{item.description}</p>
                        </div>

                        <div class="w-48">
                          {item.type === 'boolean' ? (
                            <button
                              onClick={() =>
                                setConfig({
                                  ...config(),
                                  [item.key]: !config()[item.key as keyof typeof config],
                                })
                              }
                              class={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
                                config()[item.key as keyof typeof config]
                                  ? 'bg-neon-cyan'
                                  : 'bg-space-700'
                              }`}
                            >
                              <div
                                class={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all duration-300 ${
                                  config()[item.key as keyof typeof config]
                                    ? 'left-8'
                                    : 'left-1'
                                }`}
                              />
                            </button>
                          ) : (
                            <div class="flex items-center gap-2">
                              <input
                                type="number"
                                min={item.min}
                                max={item.max}
                                step={item.step}
                                value={config()[item.key as keyof typeof config] as number}
                                onInput={(e) =>
                                  setConfig({
                                    ...config(),
                                    [item.key]: parseFloat(e.currentTarget.value) || item.min,
                                  })
                                }
                                class="w-full px-3 py-2 rounded-lg bg-space-800 border border-white/10 text-metal-100 font-mono text-sm focus:outline-none focus:border-neon-cyan/50 transition-colors"
                              />
                              {item.unit && (
                                <span class="text-xs text-metal-500 w-8">{item.unit}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            )}
          </For>
        </div>

        <div class="space-y-6">
          <div class="glass-card p-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-xl bg-alert-red/10 flex items-center justify-center">
                <Shield class="w-5 h-5 text-alert-red" />
              </div>
              <h3 class="font-display font-semibold text-lg text-metal-100">危险操作</h3>
            </div>
            <p class="text-sm text-metal-400 mb-4">
              以下操作会影响本地存储的数据，请谨慎操作。
            </p>
            <button
              onClick={handleClearData}
              class="w-full py-3 px-4 rounded-lg bg-alert-red/10 border border-alert-red/30 text-alert-red font-medium text-sm hover:bg-alert-red/20 transition-all flex items-center justify-center gap-2"
            >
              <Trash2 class="w-4 h-4" />
              清除所有历史数据
            </button>
          </div>

          <div class="glass-card p-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-xl bg-neon-purple/10 flex items-center justify-center">
                <SettingsIcon class="w-5 h-5 text-neon-purple" />
              </div>
              <h3 class="font-display font-semibold text-lg text-metal-100">系统信息</h3>
            </div>
            <div class="space-y-3 text-sm">
              <div class="flex justify-between">
                <span class="text-metal-400">应用版本</span>
                <span class="text-metal-200 font-mono">v1.0.0</span>
              </div>
              <div class="flex justify-between">
                <span class="text-metal-400">监测状态</span>
                <span
                  class={
                    hub.isMonitoring()
                      ? 'text-alert-green font-medium'
                      : 'text-metal-500'
                  }
                >
                  {hub.isMonitoring() ? '运行中' : '未启动'}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-metal-400">连接状态</span>
                <span
                  class={
                    hub.connectionStatus() === 'connected'
                      ? 'text-alert-green font-medium'
                      : hub.connectionStatus() === 'error'
                      ? 'text-alert-red'
                      : 'text-metal-500'
                  }
                >
                  {hub.connectionStatus() === 'connected'
                    ? '已连接'
                    : hub.connectionStatus() === 'connecting'
                    ? '连接中'
                    : hub.connectionStatus() === 'reconnecting'
                    ? '重连中'
                    : hub.connectionStatus() === 'error'
                    ? '连接错误'
                    : '未连接'}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-metal-400">活跃节点</span>
                <span class="text-metal-200 font-mono">
                  {hub.nodes().filter((n) => n.status === 'online').length}/
                  {hub.nodes().length}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-metal-400">告警数量</span>
                <span class="text-metal-200 font-mono">
                  {hub.alerts().filter((a) => !a.dismissed).length}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-metal-400">总切换次数</span>
                <span class="text-metal-200 font-mono">{hub.recentSwitches().length}</span>
              </div>
            </div>
          </div>

          <div class="glass-card p-6">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-xl bg-alert-green/10 flex items-center justify-center">
                <Wifi class="w-5 h-5 text-alert-green" />
              </div>
              <h3 class="font-display font-semibold text-lg text-metal-100">关于</h3>
            </div>
            <p class="text-sm text-metal-400 leading-relaxed">
              NetPulse 是一款专业的竞技网络连接动态反馈系统，通过实时监测网络质量、
              智能路径切换和长效数据分析，为您提供最佳的网络体验。
            </p>
            <div class="mt-4 pt-4 border-t border-white/10">
              <p class="text-xs text-metal-600 text-center">
                © 2024 NetPulse. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
