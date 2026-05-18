import { Component, createSignal } from 'solid-js';
import { settings, updateSetting } from '@/stores/settingsStore';
import { alarmState, updateThresholds } from '@/stores/alarmStore';

export const Settings: Component = () => {
  const [activeTab, setActiveTab] = createSignal<'general' | 'thresholds' | 'sensors' | 'database'>('general');

  return (
    <div class="p-6 h-full overflow-auto">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-white mb-1">系统配置</h1>
        <p class="text-sm text-gray-400">系统参数配置与传感器管理</p>
      </div>

      <div class="flex gap-2 mb-6 border-b border-industrial-700/50 pb-4">
        {(['general', 'thresholds', 'sensors', 'database'] as const).map((tab) => (
          <button
            onClick={() => setActiveTab(tab)}
            class={`px-4 py-2 text-sm font-medium transition-all border-b-2 ${
              activeTab() === tab
                ? 'text-tech-400 border-tech-400'
                : 'text-gray-400 border-transparent hover:text-gray-300'
            }`}
          >
            {tab === 'general' ? '通用设置' :
             tab === 'thresholds' ? '报警阈值' :
             tab === 'sensors' ? '传感器管理' : '数据存储'}
          </button>
        ))}
      </div>

      {activeTab() === 'general' && (
        <div class="grid grid-cols-2 gap-6">
          <div class="bg-industrial-800/30 rounded-xl border border-industrial-700/50 p-6">
            <h3 class="text-lg font-semibold text-white mb-4">显示设置</h3>
            <div class="space-y-4">
              <div>
                <label class="block text-sm text-gray-400 mb-2">主题</label>
                <select
                  value={settings.theme}
                  onChange={(e) => updateSetting('theme', e.target.value as any)}
                  class="w-full px-4 py-2 bg-industrial-900 border border-industrial-600 rounded-lg text-white focus:outline-none focus:border-tech-400"
                >
                  <option value="dark">深色主题</option>
                  <option value="light">浅色主题</option>
                </select>
              </div>
              <div>
                <label class="block text-sm text-gray-400 mb-2">语言</label>
                <select
                  value={settings.language}
                  onChange={(e) => updateSetting('language', e.target.value as any)}
                  class="w-full px-4 py-2 bg-industrial-900 border border-industrial-600 rounded-lg text-white focus:outline-none focus:border-tech-400"
                >
                  <option value="zh-CN">简体中文</option>
                  <option value="en-US">English</option>
                </select>
              </div>
            </div>
          </div>

          <div class="bg-industrial-800/30 rounded-xl border border-industrial-700/50 p-6">
            <h3 class="text-lg font-semibold text-white mb-4">数据更新</h3>
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-white">自动刷新</div>
                  <div class="text-sm text-gray-400">启用实时数据更新</div>
                </div>
                <button
                  onClick={() => updateSetting('autoRefresh', !settings.autoRefresh)}
                  class={`w-12 h-6 rounded-full transition-all ${
                    settings.autoRefresh ? 'bg-tech-400' : 'bg-industrial-600'
                  }`}
                >
                  <div
                    class={`w-5 h-5 rounded-full bg-white transition-transform ${
                      settings.autoRefresh ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
              <div>
                <label class="block text-sm text-gray-400 mb-2">
                  刷新间隔: {settings.refreshInterval}ms
                </label>
                <input
                  type="range"
                  min="500"
                  max="5000"
                  step="100"
                  value={settings.refreshInterval}
                  onChange={(e) => updateSetting('refreshInterval', parseInt(e.target.value))}
                  class="w-full"
                />
              </div>
            </div>
          </div>

          <div class="bg-industrial-800/30 rounded-xl border border-industrial-700/50 p-6">
            <h3 class="text-lg font-semibold text-white mb-4">通知设置</h3>
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-white">声音提醒</div>
                  <div class="text-sm text-gray-400">报警时播放提示音</div>
                </div>
                <button
                  onClick={() => updateSetting('soundEnabled', !settings.soundEnabled)}
                  class={`w-12 h-6 rounded-full transition-all ${
                    settings.soundEnabled ? 'bg-tech-400' : 'bg-industrial-600'
                  }`}
                >
                  <div
                    class={`w-5 h-5 rounded-full bg-white transition-transform ${
                      settings.soundEnabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-white">桌面通知</div>
                  <div class="text-sm text-gray-400">显示浏览器通知</div>
                </div>
                <button
                  onClick={() => updateSetting('notificationEnabled', !settings.notificationEnabled)}
                  class={`w-12 h-6 rounded-full transition-all ${
                    settings.notificationEnabled ? 'bg-tech-400' : 'bg-industrial-600'
                  }`}
                >
                  <div
                    class={`w-5 h-5 rounded-full bg-white transition-transform ${
                      settings.notificationEnabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab() === 'thresholds' && (
        <div class="grid grid-cols-2 gap-6">
          <div class="bg-industrial-800/30 rounded-xl border border-industrial-700/50 p-6">
            <h3 class="text-lg font-semibold text-white mb-4">张力阈值</h3>
            <div class="space-y-4">
              <div>
                <label class="block text-sm text-gray-400 mb-2">
                  警告阈值: {alarmState.thresholds.tension.warning} kN
                </label>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={alarmState.thresholds.tension.warning}
                  onChange={(e) => updateThresholds({
                    tension: {
                      ...alarmState.thresholds.tension,
                      warning: parseInt(e.target.value),
                    },
                  })}
                  class="w-full"
                />
              </div>
              <div>
                <label class="block text-sm text-gray-400 mb-2">
                  严重阈值: {alarmState.thresholds.tension.critical} kN
                </label>
                <input
                  type="range"
                  min="70"
                  max="120"
                  value={alarmState.thresholds.tension.critical}
                  onChange={(e) => updateThresholds({
                    tension: {
                      ...alarmState.thresholds.tension,
                      critical: parseInt(e.target.value),
                    },
                  })}
                  class="w-full"
                />
              </div>
            </div>
          </div>

          <div class="bg-industrial-800/30 rounded-xl border border-industrial-700/50 p-6">
            <h3 class="text-lg font-semibold text-white mb-4">温度阈值</h3>
            <div class="space-y-4">
              <div>
                <label class="block text-sm text-gray-400 mb-2">
                  警告阈值: {alarmState.thresholds.temperature.warning} °C
                </label>
                <input
                  type="range"
                  min="40"
                  max="80"
                  value={alarmState.thresholds.temperature.warning}
                  onChange={(e) => updateThresholds({
                    temperature: {
                      ...alarmState.thresholds.temperature,
                      warning: parseInt(e.target.value),
                    },
                  })}
                  class="w-full"
                />
              </div>
              <div>
                <label class="block text-sm text-gray-400 mb-2">
                  严重阈值: {alarmState.thresholds.temperature.critical} °C
                </label>
                <input
                  type="range"
                  min="60"
                  max="100"
                  value={alarmState.thresholds.temperature.critical}
                  onChange={(e) => updateThresholds({
                    temperature: {
                      ...alarmState.thresholds.temperature,
                      critical: parseInt(e.target.value),
                    },
                  })}
                  class="w-full"
                />
              </div>
            </div>
          </div>

          <div class="bg-industrial-800/30 rounded-xl border border-industrial-700/50 p-6">
            <h3 class="text-lg font-semibold text-white mb-4">振动阈值</h3>
            <div class="space-y-4">
              <div>
                <label class="block text-sm text-gray-400 mb-2">
                  警告阈值: {alarmState.thresholds.vibration.warning} mm/s
                </label>
                <input
                  type="range"
                  min="2"
                  max="10"
                  step="0.5"
                  value={alarmState.thresholds.vibration.warning}
                  onChange={(e) => updateThresholds({
                    vibration: {
                      ...alarmState.thresholds.vibration,
                      warning: parseFloat(e.target.value),
                    },
                  })}
                  class="w-full"
                />
              </div>
              <div>
                <label class="block text-sm text-gray-400 mb-2">
                  严重阈值: {alarmState.thresholds.vibration.critical} mm/s
                </label>
                <input
                  type="range"
                  min="5"
                  max="15"
                  step="0.5"
                  value={alarmState.thresholds.vibration.critical}
                  onChange={(e) => updateThresholds({
                    vibration: {
                      ...alarmState.thresholds.vibration,
                      critical: parseFloat(e.target.value),
                    },
                  })}
                  class="w-full"
                />
              </div>
            </div>
          </div>

          <div class="bg-industrial-800/30 rounded-xl border border-industrial-700/50 p-6">
            <h3 class="text-lg font-semibold text-white mb-4">磨损阈值</h3>
            <div class="space-y-4">
              <div>
                <label class="block text-sm text-gray-400 mb-2">
                  警告阈值: {alarmState.thresholds.wear.warning} mm
                </label>
                <input
                  type="range"
                  min="2"
                  max="8"
                  step="0.5"
                  value={alarmState.thresholds.wear.warning}
                  onChange={(e) => updateThresholds({
                    wear: {
                      ...alarmState.thresholds.wear,
                      warning: parseFloat(e.target.value),
                    },
                  })}
                  class="w-full"
                />
              </div>
              <div>
                <label class="block text-sm text-gray-400 mb-2">
                  严重阈值: {alarmState.thresholds.wear.critical} mm
                </label>
                <input
                  type="range"
                  min="4"
                  max="12"
                  step="0.5"
                  value={alarmState.thresholds.wear.critical}
                  onChange={(e) => updateThresholds({
                    wear: {
                      ...alarmState.thresholds.wear,
                      critical: parseFloat(e.target.value),
                    },
                  })}
                  class="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab() === 'sensors' && (
        <div class="bg-industrial-800/30 rounded-xl border border-industrial-700/50 p-6">
          <h3 class="text-lg font-semibold text-white mb-4">传感器管理</h3>
          <div class="overflow-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-gray-400 text-left">
                  <th class="pb-3 pr-4">传感器ID</th>
                  <th class="pb-3 pr-4">名称</th>
                  <th class="pb-3 pr-4">位置</th>
                  <th class="pb-3 pr-4">采样率</th>
                  <th class="pb-3 pr-4">状态</th>
                  <th class="pb-3">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr class="border-t border-industrial-700/30">
                  <td colspan="6" class="py-4 text-center text-gray-500">
                    传感器配置功能开发中...
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab() === 'database' && (
        <div class="grid grid-cols-2 gap-6">
          <div class="bg-industrial-800/30 rounded-xl border border-industrial-700/50 p-6">
            <h3 class="text-lg font-semibold text-white mb-4">数据存储设置</h3>
            <div class="space-y-4">
              <div>
                <label class="block text-sm text-gray-400 mb-2">
                  数据保留天数: {settings.dataRetentionDays} 天
                </label>
                <input
                  type="range"
                  min="7"
                  max="365"
                  value={settings.dataRetentionDays}
                  onChange={(e) => updateSetting('dataRetentionDays', parseInt(e.target.value))}
                  class="w-full"
                />
              </div>
              <div class="text-sm text-gray-400">
                超过保留期的传感器数据将自动清理
              </div>
            </div>
          </div>

          <div class="bg-industrial-800/30 rounded-xl border border-industrial-700/50 p-6">
            <h3 class="text-lg font-semibold text-white mb-4">数据管理</h3>
            <div class="space-y-4">
              <button class="w-full px-4 py-2 bg-industrial-700 text-white rounded-lg hover:bg-industrial-600 transition-colors">
                导出历史数据
              </button>
              <button class="w-full px-4 py-2 bg-red-900/50 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-900/70 transition-colors">
                清除所有数据
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
