import React from 'react';
import { Settings as SettingsIcon, Database, AlertTriangle, Gauge, Waves, RotateCcw, Info } from 'lucide-react';

const SettingsPage: React.FC = () => {
  const clearAllData = () => {
    if (confirm('确定要清空所有仿真数据吗？此操作不可恢复。')) {
      const request = indexedDB.deleteDatabase('ValveLogicDB');
      request.onsuccess = () => {
        alert('数据库已清空，页面将刷新');
        window.location.reload();
      };
      request.onerror = () => {
        alert('清空失败');
      };
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">系统设置</h1>
        <p className="text-slate-400 text-sm mt-1">配置仿真参数、阈值警报与数据管理</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Waves size={18} className="text-blue-400" />
              流体与材料参数
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">流体密度 (kg/m³)</label>
                <input
                  type="number"
                  defaultValue={850}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">流体体积模量 (Pa)</label>
                <input
                  type="number"
                  defaultValue={1.6e9}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">运动粘度 (m²/s)</label>
                <input
                  type="number"
                  defaultValue={1e-5}
                  step="1e-6"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">管道杨氏模量 (Pa)</label>
                <input
                  type="number"
                  defaultValue={2e11}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-400" />
              警报阈值
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">高压警报阈值 (MPa)</label>
                <input
                  type="number"
                  defaultValue={10}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">低压警报阈值 (MPa)</label>
                <input
                  type="number"
                  defaultValue={0.1}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">汽化压力警报 (Pa)</label>
                <input
                  type="number"
                  defaultValue={1000}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">启用自动紧急关断</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Gauge size={18} className="text-cyan-400" />
              仿真参数
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">时间步长 (s)</label>
                <input
                  type="number"
                  defaultValue={0.001}
                  step="0.001"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Courant 数</label>
                <input
                  type="number"
                  defaultValue={0.9}
                  step="0.05"
                  max={1}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">自动保存快照间隔 (步)</label>
                <input
                  type="number"
                  defaultValue={100}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">启用摩阻计算</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Database size={18} className="text-emerald-400" />
              数据管理
            </h2>
            <div className="space-y-3">
              <button
                onClick={clearAllData}
                className="w-full py-3 px-4 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-800/50 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw size={16} />
                清空所有仿真数据
              </button>
              <p className="text-xs text-slate-500 text-center">
                将删除 IndexedDB 中的所有仿真记录与快照
              </p>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Info size={18} className="text-slate-400" />
              关于
            </h2>
            <div className="space-y-2 text-sm text-slate-400">
              <p>
                <span className="text-slate-300">应用名称:</span> ValveLogic 水锤效应仿真系统
              </p>
              <p>
                <span className="text-slate-300">版本:</span> 1.0.0
              </p>
              <p>
                <span className="text-slate-300">核心算法:</span> 异步特征线法 (MOC)
              </p>
              <p>
                <span className="text-slate-300">数据存储:</span> IndexedDB
              </p>
              <p className="pt-2 border-t border-slate-700 mt-3">
                基于 React + TypeScript 构建的长输油气管线水锤效应仿真平台，用于模拟压力波传播与阀门控制协同，预防管道物理损伤。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
