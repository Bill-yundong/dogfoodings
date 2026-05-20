'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Gauge,
  Thermometer,
  Wind,
  Bell,
  RefreshCw,
  Moon,
  Save,
  Trash2,
  Database,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { useGasMatrixStore } from '@/store';
import { getSystemSettings, saveSystemSettings, clearOldData } from '@/lib/db';
import { cn } from '@/utils';
import type { SystemSettings } from '@/types';

export default function SettingsPage() {
  const { settings, updateSettings, user } = useGasMatrixStore();
  const [localSettings, setLocalSettings] = useState<SystemSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveSystemSettings(localSettings);
      updateSettings(localSettings);
      setSaveMessage('设置已保存');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (e) {
      setSaveMessage('保存失败');
    }
    setIsSaving(false);
  };

  const handleClearData = async () => {
    if (!confirm('确定要清除 30 天前的历史数据吗？此操作不可恢复。')) return;
    
    setIsClearing(true);
    try {
      await clearOldData(30);
      setSaveMessage('历史数据已清理');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (e) {
      setSaveMessage('清理失败');
    }
    setIsClearing(false);
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-dark-100">系统设置</h1>
            <p className="text-sm text-dark-400 mt-1">配置系统参数和显示选项</p>
          </div>
          {saveMessage && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="px-4 py-2 bg-success-500/20 text-success-400 rounded-lg text-sm"
            >
              {saveMessage}
            </motion.div>
          )}
        </div>

        <div className="glass-card p-6">
          <h3 className="section-title">
            <Settings className="w-5 h-5 text-primary-400" />
            单位设置
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm text-dark-300 mb-2 flex items-center gap-2">
                <Gauge className="w-4 h-4" />
                压力单位
              </label>
              <select
                value={localSettings.pressureUnit}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    pressureUnit: e.target.value as SystemSettings['pressureUnit'],
                  })
                }
                className="input-field"
              >
                <option value="kPa">千帕 (kPa)</option>
                <option value="MPa">兆帕 (MPa)</option>
                <option value="bar">巴 (bar)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-2 flex items-center gap-2">
                <Wind className="w-4 h-4" />
                流量单位
              </label>
              <select
                value={localSettings.flowUnit}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    flowUnit: e.target.value as SystemSettings['flowUnit'],
                  })
                }
                className="input-field"
              >
                <option value="m³/h">立方米/小时 (m³/h)</option>
                <option value="m³/s">立方米/秒 (m³/s)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-2 flex items-center gap-2">
                <Thermometer className="w-4 h-4" />
                温度单位
              </label>
              <select
                value={localSettings.temperatureUnit}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    temperatureUnit: e.target.value as SystemSettings['temperatureUnit'],
                  })
                }
                className="input-field"
              >
                <option value="C">摄氏度 (°C)</option>
                <option value="K">开尔文 (K)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="section-title">
            <Bell className="w-5 h-5 text-primary-400" />
            通知与刷新
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-dark-200">告警声音</p>
                <p className="text-sm text-dark-500">当有新告警时播放提示音</p>
              </div>
              <button
                onClick={() =>
                  setLocalSettings({
                    ...localSettings,
                    alertSound: !localSettings.alertSound,
                  })
                }
                className={cn(
                  'w-14 h-7 rounded-full transition-colors relative',
                  localSettings.alertSound ? 'bg-primary-600' : 'bg-dark-700'
                )}
              >
                <div
                  className={cn(
                    'absolute top-1 w-5 h-5 rounded-full bg-white transition-transform',
                    localSettings.alertSound ? 'translate-x-8' : 'translate-x-1'
                  )}
                />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-dark-200">自动刷新</p>
                <p className="text-sm text-dark-500">自动刷新实时数据</p>
              </div>
              <button
                onClick={() =>
                  setLocalSettings({
                    ...localSettings,
                    autoRefresh: !localSettings.autoRefresh,
                  })
                }
                className={cn(
                  'w-14 h-7 rounded-full transition-colors relative',
                  localSettings.autoRefresh ? 'bg-primary-600' : 'bg-dark-700'
                )}
              >
                <div
                  className={cn(
                    'absolute top-1 w-5 h-5 rounded-full bg-white transition-transform',
                    localSettings.autoRefresh ? 'translate-x-8' : 'translate-x-1'
                  )}
                />
              </button>
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-2 flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                刷新间隔 (毫秒)
              </label>
              <input
                type="number"
                value={localSettings.refreshInterval}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    refreshInterval: Number(e.target.value),
                  })
                }
                min={1000}
                step={1000}
                className="input-field w-48"
              />
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="section-title">
            <Moon className="w-5 h-5 text-primary-400" />
            显示设置
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-dark-200">主题</p>
              <p className="text-sm text-dark-500">选择界面显示主题</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setLocalSettings({ ...localSettings, theme: 'dark' })}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm transition-all',
                  localSettings.theme === 'dark'
                    ? 'bg-primary-600 text-white'
                    : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                )}
              >
                深色
              </button>
              <button
                onClick={() => setLocalSettings({ ...localSettings, theme: 'light' })}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm transition-all',
                  localSettings.theme === 'light'
                    ? 'bg-primary-600 text-white'
                    : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                )}
              >
                浅色
              </button>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="section-title">
            <Database className="w-5 h-5 text-primary-400" />
            数据管理
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-dark-800/50 rounded-lg">
              <div>
                <p className="font-medium text-dark-200">清理历史数据</p>
                <p className="text-sm text-dark-500">清除 30 天前的历史压力数据和指令记录</p>
              </div>
              <button
                onClick={handleClearData}
                disabled={isClearing}
                className="btn-danger flex items-center gap-2 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {isClearing ? '清理中...' : '清理数据'}
              </button>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="section-title">
            <Settings className="w-5 h-5 text-primary-400" />
            系统信息
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-dark-500">系统版本</p>
              <p className="text-dark-200 font-mono">v1.0.0</p>
            </div>
            <div>
              <p className="text-dark-500">当前用户</p>
              <p className="text-dark-200">{user?.name || '-'}</p>
            </div>
            <div>
              <p className="text-dark-500">用户角色</p>
              <p className="text-dark-200 capitalize">{user?.role || '-'}</p>
            </div>
            <div>
              <p className="text-dark-500">构建时间</p>
              <p className="text-dark-200 font-mono">2024-01-01</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            onClick={() => setLocalSettings(settings)}
            className="btn-secondary"
          >
            重置
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? '保存中...' : '保存设置'}
          </button>
        </div>
      </div>
    </Layout>
  );
}
