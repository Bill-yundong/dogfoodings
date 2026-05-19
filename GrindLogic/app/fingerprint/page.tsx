'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Search, Filter, Download, Trash2, Eye, Clock, CheckCircle, XCircle, Loader } from 'lucide-react';
import { useAppStore } from '@/store';
import { saveFingerprint, getFingerprints, deleteFingerprint, searchFingerprints } from '@/lib/db';
import { generateMockFingerprints } from '@/lib/mock';
import type { PartFingerprint } from '@/types';

export default function FingerprintPage() {
  const searchParams = useSearchParams();
  const urlSearchQuery = searchParams.get('search');
  
  const { fingerprints, setFingerprints, addFingerprint } = useAppStore();
  const [searchQuery, setSearchQuery] = useState(urlSearchQuery || '');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PASS' | 'FAIL' | 'PENDING'>('ALL');
  const [selectedFingerprint, setSelectedFingerprint] = useState<PartFingerprint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncProgress, setSyncProgress] = useState(0);

  useEffect(() => {
    loadFingerprints();
  }, []);

  useEffect(() => {
    if (urlSearchQuery) {
      setSearchQuery(urlSearchQuery);
      handleSearchWithQuery(urlSearchQuery);
    }
  }, [urlSearchQuery]);

  const handleSearchWithQuery = async (query: string) => {
    if (!query.trim()) {
      loadFingerprints();
      return;
    }
    try {
      const results = await searchFingerprints(query);
      setFingerprints(results);
    } catch (e) {
      const allFingerprints = await getFingerprints(50);
      const filtered = allFingerprints.filter(
        (fp) =>
          fp.partNumber.toLowerCase().includes(query.toLowerCase()) ||
          fp.batchId.toLowerCase().includes(query.toLowerCase())
      );
      setFingerprints(filtered);
    }
  };

  const loadFingerprints = async () => {
    setIsLoading(true);
    try {
      const saved = await getFingerprints(50);
      if (saved.length === 0) {
        const mockData = generateMockFingerprints(20);
        for (const fp of mockData) {
          await saveFingerprint(fp);
        }
        setFingerprints(mockData);
      } else {
        setFingerprints(saved);
      }
    } catch (e) {
      const mockData = generateMockFingerprints(20);
      setFingerprints(mockData);
    }
    setIsLoading(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadFingerprints();
      return;
    }
    try {
      const results = await searchFingerprints(searchQuery);
      setFingerprints(results);
    } catch (e) {
      const filtered = fingerprints.filter(
        (fp) =>
          fp.partNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          fp.batchId.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFingerprints(filtered);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFingerprint(id);
      setFingerprints(fingerprints.filter((fp) => fp.id !== id));
    } catch (e) {
      setFingerprints(fingerprints.filter((fp) => fp.id !== id));
    }
  };

  const handleSync = async () => {
    setSyncProgress(0);
    for (let i = 0; i <= 100; i += 10) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      setSyncProgress(i);
    }
    loadFingerprints();
  };

  const filteredFingerprints = fingerprints.filter((fp) => {
    if (filterStatus !== 'ALL' && fp.qualityStatus !== filterStatus) return false;
    return true;
  });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const getDuration = (start: number, end: number) => {
    const mins = Math.round((end - start) / 60000);
    return `${mins} 分钟`;
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-white font-display">加工指纹库</h1>
          <p className="text-dark-400 mt-1">关键零件加工指纹快照与数字化复刻</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSync} className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            同步数据
          </button>
        </div>
      </motion.div>

      {syncProgress > 0 && syncProgress < 100 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="glass-card p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-dark-300">正在同步加工指纹数据...</span>
            <span className="text-sm text-accent-400 font-mono">{syncProgress}%</span>
          </div>
          <div className="progress-bar">
            <motion.div
              animate={{ width: `${syncProgress}%` }}
              className="progress-fill"
            />
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-5"
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
            <input
              type="text"
              placeholder="搜索零件编号、批次号..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-3 bg-dark-700/50 border border-dark-600 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-primary-500/50 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-dark-400" />
            {(['ALL', 'PASS', 'FAIL', 'PENDING'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterStatus === status
                    ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                    : 'bg-dark-700/50 text-dark-300 border border-dark-600 hover:bg-dark-700'
                }`}
              >
                {status === 'ALL' ? '全部' : status === 'PASS' ? '合格' : status === 'FAIL' ? '不合格' : '待检'}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: '总记录数', value: fingerprints.length, icon: Database, color: 'text-primary-400' },
          { label: '合格', value: fingerprints.filter((f) => f.qualityStatus === 'PASS').length, icon: CheckCircle, color: 'text-accent-400' },
          { label: '不合格', value: fingerprints.filter((f) => f.qualityStatus === 'FAIL').length, icon: XCircle, color: 'text-warning-400' },
          { label: '待检测', value: fingerprints.filter((f) => f.qualityStatus === 'PENDING').length, icon: Clock, color: 'text-dark-400' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 + i * 0.05 }}
            className="glass-card p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-dark-400">{stat.label}</div>
                <div className={`text-3xl font-bold font-display mt-1 ${stat.color}`}>{stat.value}</div>
              </div>
              <stat.icon className={`w-8 h-8 ${stat.color} opacity-50`} />
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-5"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 text-primary-400 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-dark-400 border-b border-dark-700">
                  <th className="pb-3 font-medium">零件编号</th>
                  <th className="pb-3 font-medium">批次</th>
                  <th className="pb-3 font-medium">加工时间</th>
                  <th className="pb-3 font-medium">加工时长</th>
                  <th className="pb-3 font-medium">预测 Ra</th>
                  <th className="pb-3 font-medium">实测 Ra</th>
                  <th className="pb-3 font-medium">状态</th>
                  <th className="pb-3 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <AnimatePresence>
                  {filteredFingerprints.map((fp, i) => (
                    <motion.tr
                      key={fp.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b border-dark-700/50 hover:bg-dark-700/20 transition-colors"
                    >
                      <td className="py-4">
                        <span className="font-mono text-white">{fp.partNumber}</span>
                      </td>
                      <td className="py-4 text-dark-300">{fp.batchId}</td>
                      <td className="py-4 text-dark-400">{formatDate(fp.startTime)}</td>
                      <td className="py-4 text-dark-300">{getDuration(fp.startTime, fp.endTime)}</td>
                      <td className="py-4 font-mono text-primary-400">{fp.predictedRoughness.predictedRa.toFixed(3)} μm</td>
                      <td className="py-4">
                        {fp.measuredRoughness ? (
                          <span className="font-mono text-accent-400">{fp.measuredRoughness.ra.toFixed(3)} μm</span>
                        ) : (
                          <span className="text-dark-500">-</span>
                        )}
                      </td>
                      <td className="py-4">
                        <span className={`badge ${fp.qualityStatus === 'PASS' ? 'badge-pass' : fp.qualityStatus === 'FAIL' ? 'badge-fail' : 'badge-pending'}`}>
                          {fp.qualityStatus === 'PASS' ? '合格' : fp.qualityStatus === 'FAIL' ? '不合格' : '待检'}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedFingerprint(fp)}
                            className="p-2 rounded-lg hover:bg-dark-700/50 text-dark-400 hover:text-primary-400 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(fp.id)}
                            className="p-2 rounded-lg hover:bg-dark-700/50 text-dark-400 hover:text-warning-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {selectedFingerprint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setSelectedFingerprint(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white font-display">{selectedFingerprint.partNumber}</h2>
                  <p className="text-dark-400 text-sm">{selectedFingerprint.batchId}</p>
                </div>
                <span className={`badge ${selectedFingerprint.qualityStatus === 'PASS' ? 'badge-pass' : selectedFingerprint.qualityStatus === 'FAIL' ? 'badge-fail' : 'badge-pending'}`}>
                  {selectedFingerprint.qualityStatus === 'PASS' ? '合格' : selectedFingerprint.qualityStatus === 'FAIL' ? '不合格' : '待检'}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-dark-700/30 rounded-xl">
                  <div className="text-xs text-dark-400 mb-1">预测 Ra</div>
                  <div className="text-xl font-bold text-primary-400 font-mono">{selectedFingerprint.predictedRoughness.predictedRa.toFixed(3)} μm</div>
                </div>
                <div className="p-4 bg-dark-700/30 rounded-xl">
                  <div className="text-xs text-dark-400 mb-1">实测 Ra</div>
                  <div className="text-xl font-bold text-accent-400 font-mono">
                    {selectedFingerprint.measuredRoughness?.ra.toFixed(3) || '-'} μm
                  </div>
                </div>
                <div className="p-4 bg-dark-700/30 rounded-xl">
                  <div className="text-xs text-dark-400 mb-1">加工时长</div>
                  <div className="text-xl font-bold text-white font-mono">{getDuration(selectedFingerprint.startTime, selectedFingerprint.endTime)}</div>
                </div>
                <div className="p-4 bg-dark-700/30 rounded-xl">
                  <div className="text-xs text-dark-400 mb-1">置信度</div>
                  <div className="text-xl font-bold text-accent-400 font-mono">{(selectedFingerprint.predictedRoughness.confidence * 100).toFixed(1)}%</div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-semibold text-white mb-3">加工参数</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { label: '进给速度', value: selectedFingerprint.processingParams.feedRate, unit: 'mm/min' },
                    { label: '主轴转速', value: selectedFingerprint.processingParams.spindleSpeed, unit: 'rpm' },
                    { label: '切削深度', value: selectedFingerprint.processingParams.depthOfCut, unit: 'μm' },
                    { label: '砂轮线速', value: selectedFingerprint.processingParams.grindingWheelSpeed, unit: 'm/s' },
                    { label: '冷却压力', value: selectedFingerprint.processingParams.coolantPressure, unit: 'MPa' },
                  ].map((p) => (
                    <div key={p.label} className="p-3 bg-dark-700/30 rounded-lg text-center">
                      <div className="text-xs text-dark-400">{p.label}</div>
                      <div className="text-sm font-semibold text-white font-mono">{p.value}</div>
                      <div className="text-xs text-dark-500">{p.unit}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-semibold text-white mb-3">分形特征</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: '盒维数', value: selectedFingerprint.predictedRoughness.features.boxDimension },
                    { label: '信息维数', value: selectedFingerprint.predictedRoughness.features.informationDimension },
                    { label: '关联维数', value: selectedFingerprint.predictedRoughness.features.correlationDimension },
                    { label: '间隙度', value: selectedFingerprint.predictedRoughness.features.lacunarity },
                    { label: 'Hurst指数', value: selectedFingerprint.predictedRoughness.features.hurstExponent },
                  ].map((f) => (
                    <div key={f.label} className="p-3 bg-dark-700/30 rounded-lg flex justify-between">
                      <span className="text-sm text-dark-400">{f.label}</span>
                      <span className="text-sm font-semibold text-white font-mono">{f.value.toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedFingerprint.measuredRoughness && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-white mb-3">测量信息</h3>
                  <div className="p-4 bg-dark-700/30 rounded-xl">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-xs text-dark-400">测量方法</div>
                        <div className="text-sm text-white">{selectedFingerprint.measuredRoughness.measurementMethod}</div>
                      </div>
                      <div>
                        <div className="text-xs text-dark-400">检测人员</div>
                        <div className="text-sm text-white">{selectedFingerprint.measuredRoughness.inspector}</div>
                      </div>
                      <div>
                        <div className="text-xs text-dark-400">测量时间</div>
                        <div className="text-sm text-white">{formatDate(selectedFingerprint.measuredRoughness.measuredAt)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button onClick={() => setSelectedFingerprint(null)} className="btn-secondary w-full">
                关闭
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
