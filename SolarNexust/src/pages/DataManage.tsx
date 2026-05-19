import { useState, useEffect } from 'react';
import { Database, Download, Upload, Trash2, RefreshCw, HardDrive, FileJson, Building, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { initDB, getDBStats, exportAllData, importAllData, clearAllData, solarPanelDB, buildingDB, regionDB } from '@/utils/db';
import { generateAllMockData } from '@/utils/mockData';
import type { DBStats } from '@/types/database';

export default function DataManage() {
  const [stats, setStats] = useState<DBStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  
  const loadStats = async () => {
    try {
      setIsLoading(true);
      const newStats = await getDBStats();
      setStats(newStats);
    } catch (error) {
      console.error('Failed to load stats:', error);
      setMessage({ type: 'error', text: '加载数据统计失败' });
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    const init = async () => {
      await initDB();
      await loadStats();
    };
    init();
  }, []);
  
  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };
  
  const handleInitData = async () => {
    try {
      setIsLoading(true);
      const mockData = await generateAllMockData();
      await regionDB.bulkPut(mockData.regions);
      await solarPanelDB.bulkPut(mockData.panels);
      await buildingDB.bulkPut(mockData.buildings);
      await loadStats();
      showMessage('success', '初始化数据成功');
    } catch (error) {
      console.error('Failed to init data:', error);
      showMessage('error', '初始化数据失败');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleExportData = async () => {
    try {
      setIsLoading(true);
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `solarnexust-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showMessage('success', '数据导出成功');
    } catch (error) {
      console.error('Failed to export data:', error);
      showMessage('error', '数据导出失败');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setIsLoading(true);
      const text = await file.text();
      const data = JSON.parse(text);
      await importAllData(data);
      await loadStats();
      showMessage('success', '数据导入成功');
    } catch (error) {
      console.error('Failed to import data:', error);
      showMessage('error', '数据导入失败，请检查文件格式');
    } finally {
      setIsLoading(false);
    }
    e.target.value = '';
  };
  
  const handleClearData = async () => {
    if (!confirm('确定要清空所有数据吗？此操作不可恢复！')) {
      return;
    }
    
    try {
      setIsLoading(true);
      await clearAllData();
      await loadStats();
      showMessage('success', '数据已清空');
    } catch (error) {
      console.error('Failed to clear data:', error);
      showMessage('error', '清空数据失败');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">数据管理</h1>
          <p className="text-slate-400">离线数据库管理与数据导入导出</p>
        </div>
        
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`mb-6 p-4 rounded-xl ${
              message.type === 'success' ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400' :
              message.type === 'error' ? 'bg-red-500/20 border border-red-500/50 text-red-400' :
              'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400'
            }`}
          >
            {message.text}
          </motion.div>
        )}
        
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-700/50 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-cyan-500/20">
                  <Database className="text-cyan-400" size={20} />
                </div>
                <span className="text-sm text-slate-400">数据存储</span>
              </div>
              <p className="text-2xl font-bold text-white">{(stats.totalSize / 1024 / 1024).toFixed(2)} MB</p>
              <p className="text-xs text-slate-500 mt-1">共 {stats.totalRecords} 条记录</p>
            </div>
            <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-700/50 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <HardDrive className="text-emerald-400" size={20} />
                </div>
                <span className="text-sm text-slate-400">光伏板</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.storeStats.solarPanels.count}</p>
              <p className="text-xs text-slate-500 mt-1">{(stats.storeStats.solarPanels.size / 1024).toFixed(1)} KB</p>
            </div>
            <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-700/50 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-orange-500/20">
                  <Building className="text-orange-400" size={20} />
                </div>
                <span className="text-sm text-slate-400">建筑物</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.storeStats.buildings.count}</p>
              <p className="text-xs text-slate-500 mt-1">{(stats.storeStats.buildings.size / 1024).toFixed(1)} KB</p>
            </div>
            <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-700/50 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-yellow-500/20">
                  <Zap className="text-yellow-400" size={20} />
                </div>
                <span className="text-sm text-slate-400">发电记录</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.storeStats.powerGenerations.count}</p>
              <p className="text-xs text-slate-500 mt-1">{(stats.storeStats.powerGenerations.size / 1024).toFixed(1)} KB</p>
            </div>
          </motion.div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-700/50 p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-6">数据操作</h2>
            <div className="space-y-4">
              <button
                onClick={handleInitData}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                初始化测试数据
              </button>
              <button
                onClick={handleExportData}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Download size={20} />
                导出所有数据
              </button>
              <label className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 cursor-pointer transition-all">
                <Upload size={20} />
                导入数据
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="hidden"
                />
              </label>
              <button
                onClick={handleClearData}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Trash2 size={20} />
                清空所有数据
              </button>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-700/50 p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-6">数据库信息</h2>
            <div className="space-y-4">
              <div className="p-4 bg-slate-800/50 rounded-xl">
                <h3 className="text-sm font-medium text-white mb-2">IndexedDB</h3>
                <p className="text-xs text-slate-400">使用浏览器本地 IndexedDB 存储离线数据，支持离线访问和数据持久化。</p>
              </div>
              <div className="p-4 bg-slate-800/50 rounded-xl">
                <h3 className="text-sm font-medium text-white mb-2">数据结构</h3>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                  <div>• 区域信息</div>
                  <div>• 光伏板数据</div>
                  <div>• 建筑物模型</div>
                  <div>• 发电记录</div>
                  <div>• 阴影记录</div>
                  <div>• MPPT 数据</div>
                  <div>• 维护任务</div>
                  <div>• 同步状态</div>
                </div>
              </div>
              <div className="p-4 bg-slate-800/50 rounded-xl">
                <h3 className="text-sm font-medium text-white mb-2">数据格式</h3>
                <div className="flex items-center gap-2">
                  <FileJson size={16} className="text-yellow-400" />
                  <span className="text-xs text-slate-400">导出为 JSON 格式，可用于数据备份和迁移</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
        
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-700/50 overflow-hidden"
          >
            <div className="p-4 border-b border-slate-700/50">
              <h2 className="text-lg font-semibold text-white">Object Store 详情</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">名称</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">记录数</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">大小</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {Object.entries(stats.storeStats).map(([name, data]) => (
                    <tr key={name} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-white">{name}</td>
                      <td className="px-4 py-3 text-sm text-slate-400 text-right font-mono">{data.count}</td>
                      <td className="px-4 py-3 text-sm text-slate-400 text-right font-mono">{(data.size / 1024).toFixed(2)} KB</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
