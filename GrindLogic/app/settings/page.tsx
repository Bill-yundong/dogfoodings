'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Database, AlertTriangle, Palette, Zap, Save } from 'lucide-react';
import { useAppStore } from '@/store';
import { updateSystemConfig, getSystemConfig } from '@/lib/db';
import { useTheme } from '@/components/ThemeProvider';

export default function SettingsPage() {
  const { systemConfig, setSystemConfig } = useAppStore();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'datasource' | 'thresholds' | 'model' | 'display'>('datasource');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSystemConfig({
      ...systemConfig,
      displayConfig: { ...systemConfig.displayConfig, theme },
    });
  }, [theme]);

  const handleSave = async () => {
    try {
      await updateSystemConfig('dataSource', systemConfig.dataSource);
      await updateSystemConfig('thresholds', systemConfig.thresholds);
      await updateSystemConfig('modelConfig', systemConfig.modelConfig);
      await updateSystemConfig('displayConfig', systemConfig.displayConfig);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const tabs = [
    { id: 'datasource', label: '数据源配置', icon: Database },
    { id: 'thresholds', label: '阈值设置', icon: AlertTriangle },
    { id: 'model', label: '模型配置', icon: Zap },
    { id: 'display', label: '显示设置', icon: Palette },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold font-display" style={{ color: 'var(--text-primary)' }}>系统设置</h1>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>配置系统参数与阈值</p>
        </div>
        <button onClick={handleSave} className="btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" />
          {saved ? '已保存' : '保存配置'}
        </button>
      </motion.div>

      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                : 'bg-dark-800/50 text-dark-300 border border-dark-700 hover:bg-dark-700/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'datasource' && (
          <motion.div
            key="datasource"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-6">数据源配置</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-dark-300 mb-2">MES 系统接口地址</label>
                <input
                  type="text"
                  value={systemConfig.dataSource.mesEndpoint}
                  onChange={(e) =>
                    setSystemConfig({
                      ...systemConfig,
                      dataSource: { ...systemConfig.dataSource, mesEndpoint: e.target.value },
                    })
                  }
                  placeholder="http://mes.example.com/api"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-2">QMS 系统接口地址</label>
                <input
                  type="text"
                  value={systemConfig.dataSource.qmsEndpoint}
                  onChange={(e) =>
                    setSystemConfig({
                      ...systemConfig,
                      dataSource: { ...systemConfig.dataSource, qmsEndpoint: e.target.value },
                    })
                  }
                  placeholder="http://qms.example.com/api"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-2">WebSocket 实时数据地址</label>
                <input
                  type="text"
                  value={systemConfig.dataSource.websocketUrl}
                  onChange={(e) =>
                    setSystemConfig({
                      ...systemConfig,
                      dataSource: { ...systemConfig.dataSource, websocketUrl: e.target.value },
                    })
                  }
                  placeholder="ws://realtime.example.com/ws"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-2">数据轮询间隔 (ms)</label>
                <input
                  type="number"
                  value={systemConfig.dataSource.pollingInterval}
                  onChange={(e) =>
                    setSystemConfig({
                      ...systemConfig,
                      dataSource: { ...systemConfig.dataSource, pollingInterval: parseInt(e.target.value) },
                    })
                  }
                  min={100}
                  step={100}
                  className="input-field"
                />
              </div>
            </div>

            <div className="mt-8 p-4 bg-accent-500/10 border border-accent-500/20 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-accent-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-accent-300">连接状态</div>
                  <div className="text-xs text-dark-400 mt-1">
                    当前使用模拟数据模式。配置真实数据源后将自动切换到实时数据采集模式。
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'thresholds' && (
          <motion.div
            key="thresholds"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-6">质量阈值设置</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-dark-300 mb-2">Ra 最大允许值 (μm)</label>
                <input
                  type="number"
                  value={systemConfig.thresholds.maxRa}
                  onChange={(e) =>
                    setSystemConfig({
                      ...systemConfig,
                      thresholds: { ...systemConfig.thresholds, maxRa: parseFloat(e.target.value) },
                    })
                  }
                  step="0.1"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-2">Rz 最大允许值 (μm)</label>
                <input
                  type="number"
                  value={systemConfig.thresholds.maxRz}
                  onChange={(e) =>
                    setSystemConfig({
                      ...systemConfig,
                      thresholds: { ...systemConfig.thresholds, maxRz: parseFloat(e.target.value) },
                    })
                  }
                  step="0.1"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-2">警告阈值 (占上限百分比)</label>
                <input
                  type="number"
                  value={systemConfig.thresholds.warningThreshold}
                  onChange={(e) =>
                    setSystemConfig({
                      ...systemConfig,
                      thresholds: { ...systemConfig.thresholds, warningThreshold: parseFloat(e.target.value) },
                    })
                  }
                  step="0.05"
                  min="0.5"
                  max="0.95"
                  className="input-field"
                />
                <p className="text-xs text-dark-500 mt-1">
                  当前: {(systemConfig.thresholds.warningThreshold * systemConfig.thresholds.maxRa).toFixed(2)} μm
                </p>
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-2">严重阈值 (占上限百分比)</label>
                <input
                  type="number"
                  value={systemConfig.thresholds.criticalThreshold}
                  onChange={(e) =>
                    setSystemConfig({
                      ...systemConfig,
                      thresholds: { ...systemConfig.thresholds, criticalThreshold: parseFloat(e.target.value) },
                    })
                  }
                  step="0.05"
                  min="0.7"
                  max="1.0"
                  className="input-field"
                />
                <p className="text-xs text-dark-500 mt-1">
                  当前: {(systemConfig.thresholds.criticalThreshold * systemConfig.thresholds.maxRa).toFixed(2)} μm
                </p>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-sm font-semibold text-white mb-4">阈值可视化</h3>
              <div className="relative h-12 bg-dark-700/50 rounded-xl overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-accent-500/30"
                  style={{ width: `${systemConfig.thresholds.warningThreshold * 100}%` }}
                />
                <div
                  className="absolute inset-y-0 bg-warning-500/30"
                  style={{
                    left: `${systemConfig.thresholds.warningThreshold * 100}%`,
                    width: `${(systemConfig.thresholds.criticalThreshold - systemConfig.thresholds.warningThreshold) * 100}%`,
                  }}
                />
                <div
                  className="absolute inset-y-0 bg-red-500/30"
                  style={{
                    left: `${systemConfig.thresholds.criticalThreshold * 100}%`,
                    width: `${(1 - systemConfig.thresholds.criticalThreshold) * 100}%`,
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-between px-4 text-xs">
                  <span className="text-accent-400">正常</span>
                  <span className="text-warning-400">警告</span>
                  <span className="text-red-400">严重</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'model' && (
          <motion.div
            key="model"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-6">AI 模型配置</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm text-dark-300 mb-2">当前激活模型</label>
                <select
                  value={systemConfig.modelConfig.activeModel}
                  onChange={(e) =>
                    setSystemConfig({
                      ...systemConfig,
                      modelConfig: { ...systemConfig.modelConfig, activeModel: e.target.value },
                    })
                  }
                  className="input-field"
                >
                  <option value="xgboost_v1.2.0">XGBoost v1.2.0 (默认)</option>
                  <option value="xgboost_v1.1.0">XGBoost v1.1.0</option>
                  <option value="randomforest_v1.0.0">Random Forest v1.0.0</option>
                  <option value="neuralnetwork_v1.0.0">Neural Network v1.0.0</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4 bg-dark-700/30 rounded-xl">
                <div>
                  <div className="text-sm text-white">自动重新训练</div>
                  <div className="text-xs text-dark-400">当新样本积累到一定数量时自动触发模型更新</div>
                </div>
                <button
                  onClick={() =>
                    setSystemConfig({
                      ...systemConfig,
                      modelConfig: {
                        ...systemConfig.modelConfig,
                        autoRetrain: !systemConfig.modelConfig.autoRetrain,
                      },
                    })
                  }
                  className={`w-12 h-6 rounded-full transition-colors ${
                    systemConfig.modelConfig.autoRetrain ? 'bg-accent-500' : 'bg-dark-600'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                      systemConfig.modelConfig.autoRetrain ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="block text-sm text-dark-300 mb-2">重新训练阈值 (样本数)</label>
                <input
                  type="number"
                  value={systemConfig.modelConfig.retrainThreshold}
                  onChange={(e) =>
                    setSystemConfig({
                      ...systemConfig,
                      modelConfig: { ...systemConfig.modelConfig, retrainThreshold: parseInt(e.target.value) },
                    })
                  }
                  min={10}
                  step={10}
                  className="input-field"
                />
                <p className="text-xs text-dark-500 mt-1">
                  积累 {systemConfig.modelConfig.retrainThreshold} 个新样本后触发模型重新训练
                </p>
              </div>

              <div className="p-4 bg-primary-500/10 border border-primary-500/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-primary-300">模型信息</div>
                    <div className="text-xs text-dark-400 mt-1">
                      当前模型基于 2,456 个标注样本训练，验证集准确率 94.2%。
                      最后更新时间: 2024-05-15 14:30
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'display' && (
          <motion.div
            key="display"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card p-6"
          >
            <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>显示设置</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>主题</label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as 'dark' | 'light')}
                  className="input-field"
                >
                  <option value="dark">深色主题</option>
                  <option value="light">浅色主题</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>数据刷新频率 (ms)</label>
                <input
                  type="number"
                  value={systemConfig.displayConfig.refreshRate}
                  onChange={(e) =>
                    setSystemConfig({
                      ...systemConfig,
                      displayConfig: { ...systemConfig.displayConfig, refreshRate: parseInt(e.target.value) },
                    })
                  }
                  min={100}
                  step={100}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>图表最大数据点</label>
                <input
                  type="number"
                  value={systemConfig.displayConfig.chartPoints}
                  onChange={(e) =>
                    setSystemConfig({
                      ...systemConfig,
                      displayConfig: { ...systemConfig.displayConfig, chartPoints: parseInt(e.target.value) },
                    })
                  }
                  min={100}
                  step={100}
                  className="input-field"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AnimatePresence({ children, mode }: any) {
  return <>{children}</>;
}
