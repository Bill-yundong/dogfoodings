'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Database, Search, Filter, Download, ChevronLeft, ChevronRight, Eye, Trash2 } from 'lucide-react';
import { getWeldPoints, getWeldPointCount, clearDatabase, getWeldPointsByRisk } from '@/lib/db';
import WaveformChart from '@/components/WaveformChart';
import StatusIndicator from '@/components/StatusIndicator';
import type { WeldPoint, DefectRisk } from '@/types';

export default function WeldsPage() {
  const [weldPoints, setWeldPoints] = useState<WeldPoint[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<DefectRisk | 'all'>('all');
  const [selectedPoint, setSelectedPoint] = useState<WeldPoint | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [currentPage, riskFilter]);

  async function loadData() {
    setIsLoading(true);
    try {
      const count = await getWeldPointCount();
      setTotalCount(count);

      let points: WeldPoint[];
      if (riskFilter === 'all') {
        points = await getWeldPoints(pageSize, (currentPage - 1) * pageSize);
      } else {
        points = await getWeldPointsByRisk(riskFilter, pageSize);
      }

      if (searchQuery) {
        points = points.filter(
          (p) =>
            p.robotId.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.weldProgram.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      setWeldPoints(points);
    } catch (error) {
      console.error('Failed to load weld points:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize);

  async function handleClearDatabase() {
    if (window.confirm('确定要清空所有焊点数据吗？此操作不可恢复。')) {
      await clearDatabase();
      loadData();
    }
  }

  const riskColors: Record<DefectRisk, string> = {
    low: 'bg-tech-green/10 text-tech-green border-tech-green/30',
    medium: 'bg-tech-yellow/10 text-tech-yellow border-tech-yellow/30',
    high: 'bg-tech-red/10 text-tech-red border-tech-red/30',
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">焊点数据管理</h1>
            <p className="text-gray-400 mt-1">IndexedDB 存储的万级焊点特征波形切片管理</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">
              共 <span className="text-tech-cyan font-mono">{totalCount}</span> 条记录
            </span>
            <button
              onClick={handleClearDatabase}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-tech-red hover:bg-tech-red/10 rounded-lg transition-colors"
            >
              <Trash2 size={16} />
              清空数据
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-industrial-800 hover:bg-industrial-700 text-white text-sm rounded-lg transition-colors">
              <Download size={16} />
              导出数据
            </button>
          </div>
        </div>
      </div>

      <div className="bg-industrial-900/50 rounded-xl border border-industrial-800 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="搜索机器人ID或焊接程序..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-industrial-800 border border-industrial-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-tech-cyan/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-500" />
            {(['all', 'low', 'medium', 'high'] as const).map((risk) => (
              <button
                key={risk}
                onClick={() => {
                  setRiskFilter(risk);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                  riskFilter === risk
                    ? 'bg-tech-cyan/20 text-tech-cyan border-tech-cyan/30'
                    : 'bg-industrial-800 text-gray-400 border-industrial-700 hover:text-white'
                }`}
              >
                {risk === 'all' ? '全部' : risk === 'low' ? '低风险' : risk === 'medium' ? '中风险' : '高风险'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-industrial-900/50 rounded-xl border border-industrial-800 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-industrial-800">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      序号
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      机器人ID
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      焊接程序
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      稳定性
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      风险等级
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      时间
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-industrial-800/50">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <div className="animate-pulse text-gray-500">加载中...</div>
                      </td>
                    </tr>
                  ) : weldPoints.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <Database className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                        <p className="text-gray-500">暂无焊点数据</p>
                        <p className="text-gray-600 text-sm mt-1">请先启动监控系统采集数据</p>
                      </td>
                    </tr>
                  ) : (
                    weldPoints.map((point, index) => (
                      <motion.tr
                        key={point.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.02 }}
                        className={`hover:bg-industrial-800/30 transition-colors ${
                          selectedPoint?.id === point.id ? 'bg-industrial-800/50' : ''
                        }`}
                        onClick={() => setSelectedPoint(point)}
                      >
                        <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                          #{(currentPage - 1) * pageSize + index + 1}
                        </td>
                        <td className="px-4 py-3 text-sm text-white font-mono">{point.robotId}</td>
                        <td className="px-4 py-3 text-sm text-gray-300">{point.weldProgram}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-industrial-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  point.stabilityIndex >= 80
                                    ? 'bg-tech-green'
                                    : point.stabilityIndex >= 60
                                    ? 'bg-tech-yellow'
                                    : 'bg-tech-red'
                                }`}
                                style={{ width: `${point.stabilityIndex}%` }}
                              />
                            </div>
                            <span className="text-sm font-mono text-gray-400">
                              {point.stabilityIndex.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${riskColors[point.defectRisk]}`}
                          >
                            {point.defectRisk === 'low' ? '低' : point.defectRisk === 'medium' ? '中' : '高'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                          {new Date(point.timestamp).toLocaleTimeString('zh-CN')}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPoint(point);
                            }}
                            className="p-1.5 hover:bg-industrial-700 rounded-lg transition-colors text-gray-400 hover:text-tech-cyan"
                          >
                            <Eye size={16} />
                          </button>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-industrial-800">
                <div className="text-sm text-gray-400">
                  显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalCount)} 条，共 {totalCount} 条
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg hover:bg-industrial-800 disabled:opacity-50 disabled:cursor-not-allowed text-gray-400 hover:text-white transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-sm text-gray-400">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg hover:bg-industrial-800 disabled:opacity-50 disabled:cursor-not-allowed text-gray-400 hover:text-white transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        <div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-industrial-900/50 rounded-xl border border-industrial-800 p-5 sticky top-24"
          >
            <h3 className="text-sm font-semibold text-white mb-4">焊点详情</h3>

            {selectedPoint ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-industrial-800/50 rounded-lg">
                    <p className="text-xs text-gray-500">机器人ID</p>
                    <p className="text-sm text-white font-mono mt-1">{selectedPoint.robotId}</p>
                  </div>
                  <div className="p-3 bg-industrial-800/50 rounded-lg">
                    <p className="text-xs text-gray-500">稳定性</p>
                    <p className="text-sm text-white font-mono mt-1">{selectedPoint.stabilityIndex.toFixed(1)}%</p>
                  </div>
                  <div className="p-3 bg-industrial-800/50 rounded-lg">
                    <p className="text-xs text-gray-500">风险等级</p>
                    <div className="mt-1">
                      <StatusIndicator status={selectedPoint.defectRisk} label />
                    </div>
                  </div>
                  <div className="p-3 bg-industrial-800/50 rounded-lg">
                    <p className="text-xs text-gray-500">峰值数量</p>
                    <p className="text-sm text-white font-mono mt-1">{selectedPoint.features.peakCount}</p>
                  </div>
                </div>

                {selectedPoint.defectType && (
                  <div className="p-3 bg-tech-red/10 border border-tech-red/30 rounded-lg">
                    <p className="text-xs text-tech-red mb-1">潜在缺陷类型</p>
                    <p className="text-sm text-white font-medium">{selectedPoint.defectType}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-gray-500 mb-2">温度波形预览</p>
                  <WaveformChart
                    data={selectedPoint.poolTemperature.slice(0, 100)}
                    color="#FF6B6B"
                    height={100}
                    showGrid={false}
                  />
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-2">电流波形预览</p>
                  <WaveformChart
                    data={selectedPoint.current.slice(0, 100)}
                    color="#00D4FF"
                    height={100}
                    showGrid={false}
                  />
                </div>

                <div className="p-3 bg-industrial-800/50 rounded-lg">
                  <p className="text-xs text-gray-500">特征参数</p>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">平均振幅:</span>
                      <span className="text-white font-mono">{selectedPoint.features.avgAmplitude.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">频率:</span>
                      <span className="text-white font-mono">{selectedPoint.features.frequency.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">上升时间:</span>
                      <span className="text-white font-mono">{selectedPoint.features.riseTime.toFixed(1)}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">衰减时间:</span>
                      <span className="text-white font-mono">{selectedPoint.features.decayTime.toFixed(1)}ms</span>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  采集时间: {new Date(selectedPoint.timestamp).toLocaleString('zh-CN')}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Eye className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">选择一个焊点查看详情</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
