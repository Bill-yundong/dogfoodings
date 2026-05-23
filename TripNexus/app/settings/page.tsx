'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, Palette, Globe, Database, Bell, Shield,
  ChevronRight, CheckCircle2, Info, Trash2,
  Sun, Moon, Monitor, MapPin, Clock, DollarSign
} from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { useUIStore, useOfflineStore, useTripStore } from '@/lib/store';

export default function SettingsPage() {
  const { themeMode, setThemeMode, showToast } = useUIStore();
  const { forceOnline, forceOffline, exportData, importData } = useOfflineStore();
  const { reset: resetTripStore } = useTripStore();
  const [autoSync, setAutoSync] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [defaultTransport, setDefaultTransport] = useState('driving');
  const [defaultOptimization, setDefaultOptimization] = useState('balanced');

  const themeOptions = [
    { id: 'light', name: '浅色模式', icon: Sun },
    { id: 'dark', name: '深色模式', icon: Moon },
    { id: 'system', name: '跟随系统', icon: Monitor },
  ];

  const transportOptions = [
    { id: 'driving', name: '驾车', desc: '60 km/h' },
    { id: 'transit', name: '公共交通', desc: '35 km/h' },
    { id: 'walking', name: '步行', desc: '5 km/h' },
    { id: 'cycling', name: '骑行', desc: '15 km/h' },
  ];

  const optimizationOptions = [
    { id: 'distance', name: '最短距离', icon: MapPin },
    { id: 'time', name: '最短时间', icon: Clock },
    { id: 'cost', name: '最低成本', icon: DollarSign },
    { id: 'balanced', name: '综合均衡', icon: Settings },
  ];

  const handleResetData = () => {
    if (confirm('确定要清除所有本地数据吗？此操作不可恢复。')) {
      if (confirm('再次确认：所有行程、快照、日志将被永久删除。')) {
        resetTripStore();
        localStorage.clear();
        indexedDB.deleteDatabase('TripNexusDB');
        showToast('success', '所有数据已清除');
        window.location.reload();
      }
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = event.target?.result as string;
        await importData(data);
        showToast('success', '数据导入成功');
      } catch (error) {
        showToast('error', error instanceof Error ? error.message : '导入失败');
      }
    };
    reader.readAsText(file);
  };

  const handleExport = async () => {
    try {
      const data = await exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tripnexus-settings-backup.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('success', '设置导出成功');
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : '导出失败');
    }
  };

  return (
    <PageContainer>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-dark-800">
            设置
          </h1>
          <p className="text-dark-500 mt-1">
            自定义您的 TripNexus 体验
          </p>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-bold text-dark-800 mb-4 flex items-center gap-2">
              <Palette className="w-5 h-5 text-purple-500" />
              外观设置
            </h3>
            
            <div className="grid grid-cols-3 gap-4">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.id}
                    onClick={() => {
                      setThemeMode(option.id as any);
                      showToast('success', `已切换到${option.name}`);
                    }}
                    className={`p-6 rounded-2xl border-2 transition-all ${
                      themeMode === option.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-dark-100 hover:border-primary-200'
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center ${
                      themeMode === option.id
                        ? 'bg-gradient-to-br from-primary-500 to-cyan-500 text-white'
                        : 'bg-dark-100 text-dark-500'
                    }`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <p className={`font-medium text-center ${
                      themeMode === option.id ? 'text-primary-700' : 'text-dark-700'
                    }`}>
                      {option.name}
                    </p>
                    {themeMode === option.id && (
                      <CheckCircle2 className="w-5 h-5 text-primary-500 mx-auto mt-2" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-bold text-dark-800 mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-500" />
              网络与同步
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-dark-50 hover:bg-primary-50/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                    <Database className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-dark-800">自动同步</p>
                    <p className="text-sm text-dark-500">恢复网络时自动同步数据</p>
                  </div>
                </div>
                <button
                  onClick={() => setAutoSync(!autoSync)}
                  className={`w-14 h-8 rounded-full transition-colors relative ${
                    autoSync ? 'bg-primary-500' : 'bg-dark-300'
                  }`}
                >
                  <motion.div
                    animate={{ x: autoSync ? 28 : 4 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-dark-50 hover:bg-primary-50/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-dark-800">推送通知</p>
                    <p className="text-sm text-dark-500">同步完成、行程提醒等通知</p>
                  </div>
                </div>
                <button
                  onClick={() => setNotifications(!notifications)}
                  className={`w-14 h-8 rounded-full transition-colors relative ${
                    notifications ? 'bg-primary-500' : 'bg-dark-300'
                  }`}
                >
                  <motion.div
                    animate={{ x: notifications ? 28 : 4 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-bold text-dark-800 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-accent-500" />
              默认偏好设置
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-3">默认交通方式</label>
                <div className="grid grid-cols-4 gap-3">
                  {transportOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setDefaultTransport(option.id);
                        showToast('success', `已设置默认交通方式：${option.name}`);
                      }}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        defaultTransport === option.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-dark-100 hover:border-primary-200'
                      }`}
                    >
                      <p className={`font-medium ${defaultTransport === option.id ? 'text-primary-700' : 'text-dark-700'}`}>
                        {option.name}
                      </p>
                      <p className="text-xs text-dark-500 mt-1">{option.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-700 mb-3">默认优化目标</label>
                <div className="grid grid-cols-4 gap-3">
                  {optimizationOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.id}
                        onClick={() => {
                          setDefaultOptimization(option.id);
                          showToast('success', `已设置默认优化目标：${option.name}`);
                        }}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          defaultOptimization === option.id
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-dark-100 hover:border-primary-200'
                        }`}
                      >
                        <Icon className={`w-6 h-6 mx-auto mb-2 ${
                          defaultOptimization === option.id ? 'text-primary-500' : 'text-dark-400'
                        }`} />
                        <p className={`text-sm font-medium text-center ${
                          defaultOptimization === option.id ? 'text-primary-700' : 'text-dark-700'
                        }`}>
                          {option.name}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-bold text-dark-800 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-500" />
              数据管理
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-xl bg-dark-50 hover:bg-primary-50/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                    <Database className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-dark-800">导出所有数据</p>
                    <p className="text-sm text-dark-500">备份所有行程和设置</p>
                  </div>
                </div>
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors flex items-center gap-2"
                >
                  导出
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-dark-50 hover:bg-primary-50/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Database className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-dark-800">导入数据</p>
                    <p className="text-sm text-dark-500">从备份文件恢复</p>
                  </div>
                </div>
                <label className="px-4 py-2 bg-secondary border-2 border-primary-500 text-primary-600 rounded-xl hover:bg-primary-50 transition-colors cursor-pointer flex items-center gap-2">
                  导入
                  <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                </label>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-red-50 hover:bg-red-100 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-red-700">清除所有数据</p>
                    <p className="text-sm text-red-500">删除所有本地存储的行程和设置</p>
                  </div>
                </div>
                <button
                  onClick={handleResetData}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors flex items-center gap-2"
                >
                  清除
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-dark-800 to-dark-900 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                <Info className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">关于 TripNexus</h3>
                <p className="text-sm text-white/60">智能多目的地旅行路径规划系统</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-white/60">版本</p>
                <p className="font-medium">1.0.0</p>
              </div>
              <div>
                <p className="text-white/60">构建时间</p>
                <p className="font-medium">{new Date().toLocaleDateString('zh-CN')}</p>
              </div>
              <div>
                <p className="text-white/60">技术栈</p>
                <p className="font-medium">Next.js + TypeScript</p>
              </div>
              <div>
                <p className="text-white/60">核心算法</p>
                <p className="font-medium">TSP · GA · SA · ACO</p>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-xs text-white/40">
                © 2025 TripNexus. 基于 TSP 算法的智能旅行路径规划系统。
                支持离线存储、多目标优化、异步调度、日历同步。
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
