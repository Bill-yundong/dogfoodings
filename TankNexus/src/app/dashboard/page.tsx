'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Thermometer, Zap, Activity, ShieldAlert, Database, Clock, AlertTriangle } from 'lucide-react';
import { useMonitoringStore } from '@/store';
import DataCard from '@/components/DataCard';
import WaveformChart from '@/components/WaveformChart';
import StatusIndicator from '@/components/StatusIndicator';
import AlertItem from '@/components/AlertItem';
import type { RealTimeData } from '@/types';

export default function DashboardPage() {
  const {
    realtimeData,
    selectedRobotId,
    setSelectedRobot,
    alerts,
    stats,
    isRunning,
    recentWeldPoints,
    acknowledgeAlert,
  } = useMonitoringStore();

  const [tempHistory, setTempHistory] = useState<number[]>([]);
  const [currentHistory, setCurrentHistory] = useState<number[]>([]);
  const [voltageHistory, setVoltageHistory] = useState<number[]>([]);
  const [stabilityHistory, setStabilityHistory] = useState<number[]>([]);

  const currentData: RealTimeData | undefined = realtimeData[selectedRobotId];

  useEffect(() => {
    if (currentData) {
      setTempHistory((prev) => [...prev.slice(-99), currentData.poolTemp]);
      setCurrentHistory((prev) => [...prev.slice(-99), currentData.current]);
      setVoltageHistory((prev) => [...prev.slice(-99), currentData.voltage]);
      setStabilityHistory((prev) => [...prev.slice(-99), currentData.stability]);
    }
  }, [currentData]);

  const robotIds = ['ROBOT-001', 'ROBOT-002', 'ROBOT-003'];

  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">实时监控仪表盘</h1>
            <p className="text-gray-400 mt-1">熔池稳定性数据实时监控与缺陷预警</p>
          </div>
          <div className="flex items-center gap-3">
            {isRunning ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-tech-green/10 rounded-full">
                <span className="w-2 h-2 rounded-full bg-tech-green animate-pulse" />
                <span className="text-sm text-tech-green font-medium">监控运行中</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-600/10 rounded-full">
                <span className="w-2 h-2 rounded-full bg-gray-500" />
                <span className="text-sm text-gray-400 font-medium">监控已停止</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Clock size={16} />
              <span className="font-mono">{new Date().toLocaleTimeString('zh-CN')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {robotIds.map((robotId) => (
          <button
            key={robotId}
            onClick={() => setSelectedRobot(robotId)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedRobotId === robotId
                ? 'bg-industrial-800 text-tech-cyan border border-tech-cyan/30'
                : 'bg-industrial-900/50 text-gray-400 hover:text-white border border-transparent'
            }`}
          >
            <StatusIndicator
              status={realtimeData[robotId]?.status || 'offline'}
              size="sm"
            />
            {robotId}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <DataCard
          title="熔池温度"
          value={currentData?.poolTemp.toFixed(1) || '--'}
          unit="°C"
          icon={Thermometer}
          status={currentData?.status || 'offline'}
          subtitle="实时熔池核心温度"
          trend="stable"
          trendValue="±2%"
        />
        <DataCard
          title="焊接电流"
          value={currentData?.current.toFixed(1) || '--'}
          unit="A"
          icon={Zap}
          status={currentData?.status || 'offline'}
          subtitle="实时焊接电流值"
        />
        <DataCard
          title="电弧电压"
          value={currentData?.voltage.toFixed(1) || '--'}
          unit="V"
          icon={Activity}
          status={currentData?.status || 'offline'}
          subtitle="实时电弧电压值"
        />
        <DataCard
          title="稳定性指数"
          value={currentData?.stability.toFixed(1) || '--'}
          unit="%"
          icon={ShieldAlert}
          status={currentData?.status || 'offline'}
          subtitle="熔池综合稳定性评估"
          trend={currentData && currentData.stability >= 80 ? 'up' : currentData && currentData.stability >= 60 ? 'stable' : 'down'}
          trendValue={currentData ? `${currentData.stability >= 80 ? '良好' : currentData.stability >= 60 ? '一般' : '较差'}` : ''}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <DataCard
          title="累计焊点"
          value={stats.totalWeldPoints.toLocaleString()}
          icon={Database}
          status="normal"
          subtitle="IndexedDB 存储总量"
        />
        <DataCard
          title="今日焊点"
          value={stats.todayWelds}
          icon={Activity}
          status="normal"
          subtitle="今日焊接完成数"
        />
        <DataCard
          title="高风险"
          value={stats.highRiskCount}
          icon={AlertTriangle}
          status="error"
          subtitle="高风险焊点数量"
        />
        <DataCard
          title="中风险"
          value={stats.mediumRiskCount}
          icon={AlertTriangle}
          status="warning"
          subtitle="中风险焊点数量"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-industrial-900/50 rounded-xl border border-industrial-800 p-5"
          >
            <h3 className="text-lg font-semibold text-white mb-4">熔池温度曲线</h3>
            <WaveformChart
              data={tempHistory}
              color="#FF6B6B"
              label="温度变化趋势"
              unit="°C"
              height={180}
            />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-industrial-900/50 rounded-xl border border-industrial-800 p-5"
            >
              <h3 className="text-sm font-medium text-gray-300 mb-3">焊接电流</h3>
              <WaveformChart
                data={currentHistory}
                color="#00D4FF"
                unit="A"
                height={120}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-industrial-900/50 rounded-xl border border-industrial-800 p-5"
            >
              <h3 className="text-sm font-medium text-gray-300 mb-3">电弧电压</h3>
              <WaveformChart
                data={voltageHistory}
                color="#2ED573"
                unit="V"
                height={120}
              />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-industrial-900/50 rounded-xl border border-industrial-800 p-5"
          >
            <h3 className="text-lg font-semibold text-white mb-4">稳定性指数趋势</h3>
            <WaveformChart
              data={stabilityHistory}
              color="#FFB800"
              label="稳定性变化趋势"
              unit="%"
              height={150}
              highlightRanges={[
                { start: 0, end: stabilityHistory.length, color: 'rgba(255, 184, 0, 0.05)' },
              ]}
            />
          </motion.div>

          {recentWeldPoints.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-industrial-900/50 rounded-xl border border-industrial-800 p-5"
            >
              <h3 className="text-lg font-semibold text-white mb-4">最近焊点</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recentWeldPoints.slice(0, 10).map((point, index) => (
                  <div
                    key={point.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-industrial-800/50 hover:bg-industrial-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 font-mono w-8">#{index + 1}</span>
                      <div>
                        <p className="text-sm text-white font-mono">{point.weldProgram}</p>
                        <p className="text-xs text-gray-500">{point.robotId}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-400 font-mono">
                        {point.stabilityIndex.toFixed(0)}%
                      </span>
                      <StatusIndicator status={point.defectRisk} />
                      <span className="text-xs text-gray-500">
                        {new Date(point.timestamp).toLocaleTimeString('zh-CN')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-industrial-900/50 rounded-xl border border-industrial-800 p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">告警中心</h3>
              {unacknowledgedAlerts.length > 0 && (
                <span className="px-2 py-0.5 bg-tech-red/20 text-tech-red text-xs font-medium rounded-full">
                  {unacknowledgedAlerts.length} 未处理
                </span>
              )}
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {alerts.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">暂无告警信息</p>
                </div>
              ) : (
                alerts.slice(0, 15).map((alert) => (
                  <AlertItem
                    key={alert.id}
                    alert={alert}
                    onAcknowledge={acknowledgeAlert}
                  />
                ))
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-industrial-900/50 rounded-xl border border-industrial-800 p-5"
          >
            <h3 className="text-lg font-semibold text-white mb-4">系统状态</h3>
            <div className="space-y-3">
              {robotIds.map((robotId) => {
                const data = realtimeData[robotId];
                return (
                  <div key={robotId} className="p-3 rounded-lg bg-industrial-800/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">{robotId}</span>
                      <StatusIndicator status={data?.status || 'offline'} />
                    </div>
                    {data && (
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">温度</span>
                          <p className="text-tech-cyan font-mono">{data.poolTemp.toFixed(0)}°C</p>
                        </div>
                        <div>
                          <span className="text-gray-500">电流</span>
                          <p className="text-tech-green font-mono">{data.current.toFixed(0)}A</p>
                        </div>
                        <div>
                          <span className="text-gray-500">稳定性</span>
                          <p className="text-tech-yellow font-mono">{data.stability.toFixed(0)}%</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
