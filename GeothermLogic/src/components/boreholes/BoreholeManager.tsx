'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Database, Search, Filter, HardDrive, Trash2, RefreshCw, Download, MapPin } from 'lucide-react';
import { useAppStore } from '@/store/use-app-store';
import { generateBoreholes, generateTemperatureSnapshots } from '@/lib/mock-data';
import { saveBoreholes, getBoreholes, saveTemperatureSnapshots, getSnapshotsByBorehole, clearOldSnapshots, getDBStats } from '@/lib/idb-db';
import type { Borehole, TemperatureSnapshot } from '@/types';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function BoreholeManager() {
  const { boreholes, setBoreholes, selectedBorehole, setSelectedBorehole, dbInitialized, setDbInitialized } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [snapshots, setSnapshots] = useState<TemperatureSnapshot[]>([]);
  const [dbStats, setDbStats] = useState({ size: 0, stores: [] as string[] });

  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      try {
        const cachedBoreholes = await getBoreholes();
        if (cachedBoreholes.length > 0) {
          setBoreholes(cachedBoreholes);
        } else {
          const newBoreholes = generateBoreholes(200);
          await saveBoreholes(newBoreholes);
          setBoreholes(newBoreholes);
        }
        setDbInitialized(true);
        const stats = await getDBStats();
        setDbStats(stats);
      } catch (error) {
        console.error('Failed to initialize borehole data:', error);
        const fallbackBoreholes = generateBoreholes(200);
        setBoreholes(fallbackBoreholes);
      } finally {
        setIsLoading(false);
      }
    };
    initData();
  }, [setBoreholes, setDbInitialized]);

  const filteredBoreholes = useMemo(() => {
    return boreholes.filter((b) => {
      const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [boreholes, searchTerm, statusFilter]);

  const handleSelectBorehole = async (borehole: Borehole) => {
    setSelectedBorehole(borehole);
    const boreholeSnapshots = await getSnapshotsByBorehole(borehole.id);
    if (boreholeSnapshots.length > 0) {
      setSnapshots(boreholeSnapshots);
    } else {
      const newSnapshots = generateTemperatureSnapshots(borehole.id, 30);
      await saveTemperatureSnapshots(newSnapshots);
      setSnapshots(newSnapshots);
    }
  };

  const handleGenerateMore = async () => {
    const moreBoreholes = generateBoreholes(100);
    await saveBoreholes(moreBoreholes);
    setBoreholes([...boreholes, ...moreBoreholes]);
    const stats = await getDBStats();
    setDbStats(stats);
  };

  const handleClearOldData = async () => {
    const deleted = await clearOldSnapshots(90);
    const stats = await getDBStats();
    setDbStats(stats);
    alert(`已清理 ${deleted} 条过期快照数据`);
  };

  const statusColors = {
    active: 'bg-green-500/20 text-green-500 border-green-500/30',
    inactive: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    maintenance: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary-500" />
            <h3 className="text-lg font-semibold text-white">换热孔管理</h3>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <HardDrive className="w-4 h-4" />
            <span>本地缓存: {dbStats.size} 条记录</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="搜索换热孔名称..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Filter className="w-5 h-5 text-gray-500 self-center" />
            {['all', 'active', 'inactive', 'maintenance'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-900/50 text-gray-400 hover:bg-gray-800'
                }`}
              >
                {status === 'all' ? '全部' : status === 'active' ? '活跃' : status === 'inactive' ? '停用' : '维护'}
              </button>
            ))}
          </div>

          <button
            onClick={handleGenerateMore}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            生成更多数据
          </button>

          <button
            onClick={handleClearOldData}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            清理过期数据
          </button>
        </div>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-400 border-b border-gray-700">
                  <th className="pb-3">名称</th>
                  <th className="pb-3">深度 (m)</th>
                  <th className="pb-3">直径 (m)</th>
                  <th className="pb-3">当前地温 (°C)</th>
                  <th className="pb-3">状态</th>
                  <th className="pb-3">最后同步</th>
                  <th className="pb-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {filteredBoreholes.slice(0, 20).map((borehole) => (
                  <motion.tr
                    key={borehole.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`hover:bg-gray-700/30 cursor-pointer ${
                      selectedBorehole?.id === borehole.id ? 'bg-primary-900/30' : ''
                    }`}
                    onClick={() => handleSelectBorehole(borehole)}
                  >
                    <td className="py-3 text-white font-medium">{borehole.name}</td>
                    <td className="py-3 text-gray-300">{borehole.depth.toFixed(1)}</td>
                    <td className="py-3 text-gray-300">{borehole.diameter.toFixed(3)}</td>
                    <td className="py-3 text-accent-500">{borehole.currentTemperature.toFixed(1)}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs border ${statusColors[borehole.status]}`}>
                        {borehole.status === 'active' ? '活跃' : borehole.status === 'inactive' ? '停用' : '维护中'}
                      </span>
                    </td>
                    <td className="py-3 text-gray-400 text-sm">
                      {format(new Date(borehole.lastSyncTime), 'MM-dd HH:mm', { locale: zhCN })}
                    </td>
                    <td className="py-3">
                      <button className="p-1 text-gray-400 hover:text-white">
                        <Download className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
          <span>显示 {filteredBoreholes.slice(0, 20).length} / {filteredBoreholes.length} 条</span>
          <span>共 {boreholes.length} 个换热孔</span>
        </div>
      </motion.div>

      {selectedBorehole && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">{selectedBorehole.name} - 历史地温快照</h3>
              <p className="text-sm text-gray-400 flex items-center gap-2 mt-1">
                <MapPin className="w-4 h-4" />
                {selectedBorehole.location.lat.toFixed(4)}, {selectedBorehole.location.lng.toFixed(4)}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-primary-500">
              <Database className="w-4 h-4" />
              <span>IndexedDB 缓存: {snapshots.length} 条记录</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-900/50 rounded-lg p-4">
              <p className="text-sm text-gray-400">深度</p>
              <p className="text-xl font-bold text-white">{selectedBorehole.depth.toFixed(1)} m</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4">
              <p className="text-sm text-gray-400">直径</p>
              <p className="text-xl font-bold text-white">{selectedBorehole.diameter.toFixed(3)} m</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4">
              <p className="text-sm text-gray-400">当前地温</p>
              <p className="text-xl font-bold text-accent-500">{selectedBorehole.currentTemperature.toFixed(1)}°C</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4">
              <p className="text-sm text-gray-400">快照数量</p>
              <p className="text-xl font-bold text-white">{snapshots.length}</p>
            </div>
          </div>

          <div className="overflow-x-auto max-h-64">
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-800">
                <tr className="text-left text-sm text-gray-400 border-b border-gray-700">
                  <th className="pb-2">时间</th>
                  <th className="pb-2">温度 (°C)</th>
                  <th className="pb-2">深度 (m)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {snapshots.slice(-10).reverse().map((snapshot) => (
                  <tr key={snapshot.id} className="text-sm">
                    <td className="py-2 text-gray-300">
                      {format(new Date(snapshot.timestamp), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                    </td>
                    <td className="py-2 text-accent-500">{snapshot.temperature.toFixed(2)}</td>
                    <td className="py-2 text-gray-400">{snapshot.depth.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
