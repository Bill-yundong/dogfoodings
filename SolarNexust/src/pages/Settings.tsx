import { useState } from 'react';
import { Settings as SettingsIcon, Monitor, Palette, Database, Zap, Globe, Save } from 'lucide-react';
import { motion } from 'framer-motion';

interface SimulationConfig {
  timeSpeed: number;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  rayCount: number;
  ambientTemperature: number;
  windSpeed: number;
  turbidity: number;
}

interface UISettings {
  theme: 'dark';
  showGrid: boolean;
  showLabels: boolean;
  animationSpeed: number;
  displayMode: '3d' | 'heatmap';
}

interface SyncSettings {
  autoSync: boolean;
  syncInterval: number;
  maxOfflineRecords: number;
}

export default function Settings() {
  const [simulationConfig, setSimulationConfig] = useState<SimulationConfig>({
    timeSpeed: 60,
    quality: 'medium',
    rayCount: 100,
    ambientTemperature: 25,
    windSpeed: 3,
    turbidity: 2,
  });
  
  const [uiSettings, setUISettings] = useState<UISettings>({
    theme: 'dark',
    showGrid: true,
    showLabels: true,
    animationSpeed: 1,
    displayMode: '3d',
  });
  
  const [syncSettings, setSyncSettings] = useState<SyncSettings>({
    autoSync: true,
    syncInterval: 300,
    maxOfflineRecords: 10000,
  });
  
  const [saved, setSaved] = useState(false);
  
  const handleSave = () => {
    localStorage.setItem('solarnexus_simulation', JSON.stringify(simulationConfig));
    localStorage.setItem('solarnexus_ui', JSON.stringify(uiSettings));
    localStorage.setItem('solarnexus_sync', JSON.stringify(syncSettings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  
  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">系统设置</h1>
          <p className="text-slate-400">配置仿真参数、界面显示和数据同步</p>
        </div>
        
        <div className="grid grid-cols-1 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-700/50 p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <Zap className="text-cyan-400" size={20} />
              </div>
              <h2 className="text-lg font-semibold text-white">仿真参数</h2>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    时间速度 (倍速)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="3600"
                    value={simulationConfig.timeSpeed}
                    onChange={(e) => setSimulationConfig({ ...simulationConfig, timeSpeed: Number(e.target.value) })}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>1x</span>
                    <span>{simulationConfig.timeSpeed}x</span>
                    <span>3600x</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    仿真质量
                  </label>
                  <select
                    value={simulationConfig.quality}
                    onChange={(e) => setSimulationConfig({ ...simulationConfig, quality: e.target.value as SimulationConfig['quality'] })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="low">低 (快速)</option>
                    <option value="medium">中 (平衡)</option>
                    <option value="high">高 (精确)</option>
                    <option value="ultra">超高 (最佳)</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    光线数量
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={simulationConfig.rayCount}
                    onChange={(e) => setSimulationConfig({ ...simulationConfig, rayCount: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    环境温度 (°C)
                  </label>
                  <input
                    type="number"
                    min="-20"
                    max="50"
                    value={simulationConfig.ambientTemperature}
                    onChange={(e) => setSimulationConfig({ ...simulationConfig, ambientTemperature: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    风速 (m/s)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    step="0.1"
                    value={simulationConfig.windSpeed}
                    onChange={(e) => setSimulationConfig({ ...simulationConfig, windSpeed: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-700/50 p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <Monitor className="text-emerald-400" size={20} />
              </div>
              <h2 className="text-lg font-semibold text-white">界面设置</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
                <div>
                  <p className="text-white font-medium">显示网格</p>
                  <p className="text-sm text-slate-400">在3D场景中显示参考网格</p>
                </div>
                <button
                  onClick={() => setUISettings({ ...uiSettings, showGrid: !uiSettings.showGrid })}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    uiSettings.showGrid ? 'bg-cyan-500' : 'bg-slate-600'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      uiSettings.showGrid ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
                <div>
                  <p className="text-white font-medium">显示标签</p>
                  <p className="text-sm text-slate-400">显示光伏板和建筑物的名称标签</p>
                </div>
                <button
                  onClick={() => setUISettings({ ...uiSettings, showLabels: !uiSettings.showLabels })}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    uiSettings.showLabels ? 'bg-cyan-500' : 'bg-slate-600'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      uiSettings.showLabels ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
                <div>
                  <p className="text-white font-medium">显示模式</p>
                  <p className="text-sm text-slate-400">3D视图或热图模式</p>
                </div>
                <select
                  value={uiSettings.displayMode}
                  onChange={(e) => setUISettings({ ...uiSettings, displayMode: e.target.value as UISettings['displayMode'] })}
                  className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="3d">3D 视图</option>
                  <option value="heatmap">热图模式</option>
                </select>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-700/50 p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <Database className="text-orange-400" size={20} />
              </div>
              <h2 className="text-lg font-semibold text-white">数据同步</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
                <div>
                  <p className="text-white font-medium">自动同步</p>
                  <p className="text-sm text-slate-400">自动将本地数据同步到服务器</p>
                </div>
                <button
                  onClick={() => setSyncSettings({ ...syncSettings, autoSync: !syncSettings.autoSync })}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    syncSettings.autoSync ? 'bg-cyan-500' : 'bg-slate-600'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      syncSettings.autoSync ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
              
              <div className="p-4 bg-slate-800/50 rounded-xl">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  同步间隔 (秒)
                </label>
                <input
                  type="range"
                  min="60"
                  max="3600"
                  value={syncSettings.syncInterval}
                  onChange={(e) => setSyncSettings({ ...syncSettings, syncInterval: Number(e.target.value) })}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>60s</span>
                  <span>{syncSettings.syncInterval}s</span>
                  <span>3600s</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
        
        <div className="flex justify-end gap-4">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-colors"
          >
            重置
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-3 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 transition-colors"
          >
            <Save size={18} />
            {saved ? '已保存' : '保存设置'}
          </button>
        </div>
      </div>
    </div>
  );
}
