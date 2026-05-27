'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, ArrowRightLeft, CheckCircle, Clock, AlertCircle, Settings, Database } from 'lucide-react';
import { useAppStore } from '@/store/use-app-store';
import type { DataSyncRequest } from '@/types';

export default function DataSyncManager() {
  const { semanticMappings } = useAppStore();
  const [source, setSource] = useState<'operations' | 'energy-management'>('operations');
  const [target, setTarget] = useState<'operations' | 'energy-management'>('energy-management');
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>(['heat_extraction_rate', 'ground_temperature']);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncHistory, setSyncHistory] = useState([
    { id: '1', type: '全量同步', status: 'completed', time: '2024-01-15 10:30', records: 15234 },
    { id: '2', type: '增量同步', status: 'completed', time: '2024-01-15 09:00', records: 2456 },
    { id: '3', type: '增量同步', status: 'running', time: '2024-01-15 11:45', records: 0 },
    { id: '4', type: '全量同步', status: 'failed', time: '2024-01-14 16:20', records: 0 },
  ]);

  const dataTypes = [
    { id: 'heat_extraction_rate', name: '热提取率', description: '实时热提取数据' },
    { id: 'ground_temperature', name: '地温数据', description: '土壤温度监测值' },
    { id: 'pump_efficiency', name: '泵效率', description: '热泵运行效率' },
    { id: 'thermal_balance', name: '热平衡', description: '系统热平衡计算值' },
    { id: 'borehole_depth', name: '钻孔参数', description: '换热孔深度等参数' },
  ];

  const statusConfig = {
    completed: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
    running: { icon: RefreshCw, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    failed: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
    pending: { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-500/10' },
  };

  const handleSync = async () => {
    setIsSyncing(true);

    const request: DataSyncRequest = {
      source,
      target,
      dataTypes: selectedDataTypes,
    };

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const newSync = {
        id: Date.now().toString(),
        type: selectedDataTypes.length > 2 ? '全量同步' : '增量同步',
        status: 'completed' as const,
        time: new Date().toLocaleString('zh-CN'),
        records: Math.floor(Math.random() * 10000) + 1000,
      };

      setSyncHistory((prev) => [newSync, ...prev]);
      console.log('Sync request:', request);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleDataType = (id: string) => {
    setSelectedDataTypes((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6"
      >
        <div className="flex items-center gap-2 mb-6">
          <ArrowRightLeft className="w-5 h-5 text-primary-500" />
          <h3 className="text-lg font-semibold text-white">数据同步配置</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-4">同步方向</h4>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-900/50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-2">源系统</p>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value as typeof source)}
                  className="w-full bg-transparent text-white border-none focus:ring-0"
                >
                  <option value="operations">系统运维</option>
                  <option value="energy-management">建筑节能系统</option>
                </select>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-2">目标系统</p>
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value as typeof target)}
                  className="w-full bg-transparent text-white border-none focus:ring-0"
                >
                  <option value="energy-management">建筑节能系统</option>
                  <option value="operations">系统运维</option>
                </select>
              </div>
            </div>

            <h4 className="text-sm font-medium text-gray-300 mb-4">选择数据类型</h4>
            <div className="space-y-3">
              {dataTypes.map((type) => (
                <label
                  key={type.id}
                  className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-all ${
                    selectedDataTypes.includes(type.id)
                      ? 'bg-primary-600/20 border border-primary-500/30'
                      : 'bg-gray-900/50 border border-gray-700/50 hover:border-gray-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedDataTypes.includes(type.id)}
                    onChange={() => toggleDataType(type.id)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-primary-500 focus:ring-primary-500"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{type.name}</p>
                    <p className="text-xs text-gray-400">{type.description}</p>
                  </div>
                </label>
              ))}
            </div>

            <button
              onClick={handleSync}
              disabled={isSyncing || selectedDataTypes.length === 0}
              className="w-full mt-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isSyncing ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <ArrowRightLeft className="w-5 h-5" />
              )}
              {isSyncing ? '同步中...' : '开始同步'}
            </button>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-4">语义映射配置</h4>
            <div className="space-y-3 mb-6">
              {semanticMappings.slice(0, 5).map((mapping) => (
                <div key={mapping.id} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">字段映射</span>
                    <Settings className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-primary-500">{mapping.sourceField}</span>
                    <ArrowRightLeft className="w-4 h-4 text-gray-500" />
                    <span className="text-accent-500">{mapping.targetField}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">{mapping.description}</p>
                </div>
              ))}
            </div>

            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
              <div className="flex items-center gap-2 mb-3">
                <Database className="w-4 h-4 text-primary-500" />
                <span className="text-sm font-medium text-white">同步队列状态</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">待处理</p>
                  <p className="text-xl font-bold text-yellow-500">3</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">今日完成</p>
                  <p className="text-xl font-bold text-green-500">27</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-6">同步历史记录</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-400 border-b border-gray-700">
                <th className="pb-3">同步类型</th>
                <th className="pb-3">状态</th>
                <th className="pb-3">时间</th>
                <th className="pb-3">处理记录数</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {syncHistory.map((sync) => {
                const config = statusConfig[sync.status as keyof typeof statusConfig];
                const Icon = config.icon;
                return (
                  <tr key={sync.id} className="text-sm">
                    <td className="py-3 text-white">{sync.type}</td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${config.bg} ${config.color}`}>
                        <Icon className={`w-3 h-3 ${sync.status === 'running' ? 'animate-spin' : ''}`} />
                        {sync.status === 'completed' ? '已完成' : sync.status === 'running' ? '进行中' : sync.status === 'failed' ? '失败' : '等待中'}
                      </span>
                    </td>
                    <td className="py-3 text-gray-400">{sync.time}</td>
                    <td className="py-3 text-white">{sync.records.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
