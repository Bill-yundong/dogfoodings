'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Database,
  Calendar,
  Download,
  Search,
  Filter,
  Clock,
  Gauge,
  Wind,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import Layout from '@/components/Layout';
import { useGasMatrixStore } from '@/store';
import { generateMockSnapshots } from '@/lib/mockData';
import { saveSnapshot, getSnapshots } from '@/lib/db';
import { cn, formatTimestamp, formatPressure, formatFlow } from '@/utils';
import type { Snapshot } from '@/types';

export default function HistoryPage() {
  const { stations, pressureData, flowData, totalStorage } = useGasMatrixStore();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSnapshots();
  }, []);

  const loadSnapshots = async () => {
    setIsLoading(true);
    try {
      const savedSnapshots = await getSnapshots();
      if (savedSnapshots.length === 0) {
        const mockSnaps = generateMockSnapshots(48);
        for (const snap of mockSnaps) {
          await saveSnapshot(snap);
        }
        setSnapshots(mockSnaps);
      } else {
        setSnapshots(savedSnapshots);
      }
    } catch (e) {
      console.error('Error loading snapshots:', e);
      setSnapshots(generateMockSnapshots(24));
    }
    setIsLoading(false);
  };

  const handleCreateSnapshot = async () => {
    const now = Date.now();
    const avgPressure =
      Object.values(pressureData).reduce((a, b) => a + b, 0) / Object.values(pressureData).length;
    const totalFlow = Object.values(flowData).reduce((a, b) => a + b, 0);
    const abnormalCount = stations.filter(
      (s) => s.status === 'warning' || s.status === 'danger'
    ).length;

    const newSnapshot: Snapshot = {
      id: `SNAP-${now}`,
      timestamp: now,
      pressureData: { ...pressureData },
      flowData: { ...flowData },
      totalStorage,
      periodType: 'hourly',
      avgPressure: Math.round(avgPressure),
      totalFlow: Math.round(totalFlow * 10) / 10,
      peakHour: new Date().getHours(),
      abnormalStations: abnormalCount,
    };

    try {
      await saveSnapshot(newSnapshot);
      setSnapshots((prev) => [newSnapshot, ...prev]);
    } catch (e) {
      console.error('Error saving snapshot:', e);
    }
  };

  const filteredSnapshots = snapshots.filter((snapshot) => {
    const matchesPeriod = periodFilter === 'all' || snapshot.periodType === periodFilter;
    const matchesSearch =
      searchQuery === '' ||
      formatTimestamp(snapshot.timestamp).includes(searchQuery);
    return matchesPeriod && matchesSearch;
  });

  const snapshotChartOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(16, 42, 67, 0.9)',
      borderColor: '#334e68',
      textStyle: { color: '#d9e2ec' },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: filteredSnapshots
        .slice(0, 24)
        .reverse()
        .map((s) =>
          new Date(s.timestamp).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })
        ),
      axisLine: { lineStyle: { color: '#334e68' } },
      axisLabel: { color: '#829ab1', fontSize: 10 },
    },
    yAxis: [
      {
        type: 'value',
        name: '压力 (kPa)',
        axisLine: { lineStyle: { color: '#334e68' } },
        axisLabel: {
          color: '#829ab1',
          fontSize: 10,
          formatter: (value: number) => (value / 1000).toFixed(0),
        },
        splitLine: { lineStyle: { color: '#243b53' } },
      },
      {
        type: 'value',
        name: '管存 (t)',
        axisLine: { lineStyle: { color: '#334e68' } },
        axisLabel: {
          color: '#829ab1',
          fontSize: 10,
          formatter: (value: number) => (value / 1000).toFixed(1),
        },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '平均压力',
        type: 'bar',
        data: filteredSnapshots
          .slice(0, 24)
          .reverse()
          .map((s) => s.avgPressure),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(0, 212, 255, 0.8)' },
              { offset: 1, color: 'rgba(0, 212, 255, 0.2)' },
            ],
          },
        },
      },
      {
        name: '管存',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        data: filteredSnapshots
          .slice(0, 24)
          .reverse()
          .map((s) => s.totalStorage),
        lineStyle: { color: '#FF8A00', width: 2 },
        itemStyle: { color: '#FF8A00' },
        symbol: 'circle',
        symbolSize: 6,
      },
    ],
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-dark-100">历史数据中心</h1>
            <p className="text-sm text-dark-400 mt-1">
              IndexedDB 存储的长周期用气波动快照数据
            </p>
          </div>
          <button onClick={handleCreateSnapshot} className="btn-primary flex items-center gap-2">
            <Database className="w-4 h-4" />
            创建快照
          </button>
        </div>

        <div className="glass-card p-6">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索快照时间..."
                className="input-field pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-dark-500" />
              {['all', 'hourly', 'daily', 'weekly', 'monthly'].map((period) => (
                <button
                  key={period}
                  onClick={() => setPeriodFilter(period)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm transition-all',
                    periodFilter === period
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                  )}
                >
                  {period === 'all'
                    ? '全部'
                    : period === 'hourly'
                    ? '小时'
                    : period === 'daily'
                    ? '日'
                    : period === 'weekly'
                    ? '周'
                    : '月'}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[300px] mb-6">
            <ReactECharts option={snapshotChartOption} style={{ height: '100%' }} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredSnapshots.slice(0, 6).map((snapshot, index) => (
              <motion.div
                key={snapshot.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedSnapshot(snapshot)}
                className={cn(
                  'glass-card-hover p-4 cursor-pointer',
                  selectedSnapshot?.id === snapshot.id && 'border-primary-500 bg-primary-500/10'
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary-400" />
                    <span className="text-sm text-dark-300">
                      {formatTimestamp(snapshot.timestamp)}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-dark-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-dark-500 mb-1">平均压力</p>
                    <p className="font-mono text-primary-400">
                      {formatPressure(snapshot.avgPressure, 'kPa')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-500 mb-1">管网管存</p>
                    <p className="font-mono text-success-400">
                      {(snapshot.totalStorage / 1000).toFixed(1)} t
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-500 mb-1">总流量</p>
                    <p className="font-mono text-warning-400">
                      {formatFlow(snapshot.totalFlow, 'm³/h')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-dark-500 mb-1">异常站点</p>
                    <p
                      className={cn(
                        'font-mono',
                        snapshot.abnormalStations > 0 ? 'text-danger-400' : 'text-success-400'
                      )}
                    >
                      {snapshot.abnormalStations} 个
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {selectedSnapshot && (
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="section-title mb-0">
                <Database className="w-5 h-5 text-primary-400" />
                快照详情 - {formatTimestamp(selectedSnapshot.timestamp)}
              </h3>
              <button
                onClick={() => setSelectedSnapshot(null)}
                className="text-sm text-dark-400 hover:text-dark-200"
              >
                关闭
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-dark-400 border-b border-dark-700">
                    <th className="pb-3 font-medium">调压站</th>
                    <th className="pb-3 font-medium">压力</th>
                    <th className="pb-3 font-medium">流量</th>
                    <th className="pb-3 font-medium">状态</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {stations.map((station) => {
                    const pressure = selectedSnapshot.pressureData[station.id] || 0;
                    const flow = selectedSnapshot.flowData[station.id] || 0;
                    const isNormal =
                      pressure >= station.minPressure && pressure <= station.maxPressure;

                    return (
                      <tr key={station.id} className="border-b border-dark-800">
                        <td className="py-3 font-medium text-dark-200">{station.name}</td>
                        <td className="py-3">
                          <span
                            className={cn(
                              'font-mono',
                              isNormal ? 'text-dark-300' : 'text-danger-400'
                            )}
                          >
                            {formatPressure(pressure, 'kPa')}
                          </span>
                        </td>
                        <td className="py-3 font-mono text-dark-300">
                          {formatFlow(flow, 'm³/h')}
                        </td>
                        <td className="py-3">
                          <span
                            className={cn(
                              'px-2 py-1 rounded text-xs',
                              isNormal
                                ? 'bg-success-500/20 text-success-400'
                                : 'bg-danger-500/20 text-danger-400'
                            )}
                          >
                            {isNormal ? '正常' : '异常'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="glass-card p-6">
          <h3 className="section-title">
            <Database className="w-5 h-5 text-primary-400" />
            存储状态
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-dark-800/50 rounded-lg p-4">
              <p className="text-sm text-dark-400 mb-1">快照总数</p>
              <p className="text-2xl font-mono text-primary-400">{snapshots.length}</p>
            </div>
            <div className="bg-dark-800/50 rounded-lg p-4">
              <p className="text-sm text-dark-400 mb-1">最早快照</p>
              <p className="text-lg font-mono text-dark-300">
                {snapshots.length > 0
                  ? formatTimestamp(snapshots[snapshots.length - 1].timestamp)
                  : '-'}
              </p>
            </div>
            <div className="bg-dark-800/50 rounded-lg p-4">
              <p className="text-sm text-dark-400 mb-1">最新快照</p>
              <p className="text-lg font-mono text-dark-300">
                {snapshots.length > 0 ? formatTimestamp(snapshots[0].timestamp) : '-'}
              </p>
            </div>
            <div className="bg-dark-800/50 rounded-lg p-4">
              <p className="text-sm text-dark-400 mb-1">存储引擎</p>
              <p className="text-lg font-mono text-success-400">IndexedDB</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
