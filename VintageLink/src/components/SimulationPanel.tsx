import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useApp } from '@/context/AppContext';
import type { SimulationSpeed } from '@/models/SimulationEngine';

export const SimulationPanel: React.FC = () => {
  const {
    simulationState,
    simulationEvents,
    startSimulation,
    stopSimulation,
    setSimulationSpeed,
    resetSimulation,
    state,
  } = useApp();

  const speeds: { key: SimulationSpeed; label: string; desc: string }[] = [
    { key: '1x', label: '1x', desc: '实时' },
    { key: '5x', label: '5x', desc: '5倍速' },
    { key: '20x', label: '20x', desc: '20倍速' },
    { key: '100x', label: '100x', desc: '100倍速' },
  ];

  const statsChartData = useMemo(() => [
    { name: '传感器数据', value: simulationState.stats.totalSensorReadings },
    { name: '告警事件', value: simulationState.stats.totalAlerts },
    { name: '熟化更新', value: simulationState.stats.maturationUpdates },
    { name: '预测计算', value: simulationState.stats.predictionsRun },
    { name: '异常检测', value: simulationState.stats.anomaliesDetected },
  ], [simulationState.stats]);

  const alertTypeDistribution = useMemo(() => {
    const typeCount: Record<string, number> = {};
    simulationEvents.forEach(evt => {
      if (evt.type === 'alert') {
        typeCount[evt.severity] = (typeCount[evt.severity] || 0) + 1;
      }
    });
    return Object.entries(typeCount).map(([name, value]) => ({ name, value }));
  }, [simulationEvents]);

  const COLORS = ['#b86244', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'sensor': return '📡';
      case 'alert': return '🚨';
      case 'maturation': return '🍷';
      case 'drinking_window': return '📅';
      case 'zone_change': return '🌡️';
      case 'system': return '⚙️';
      default: return '📋';
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-900/30 border-red-800/50 text-red-400';
      case 'warning': return 'bg-yellow-900/30 border-yellow-800/50 text-yellow-400';
      default: return 'bg-blue-900/30 border-blue-800/50 text-blue-400';
    }
  };

  const formatSimTime = (ts: number) => {
    return new Date(ts).toLocaleString('zh-CN');
  };

  const zoneSummary = useMemo(() => {
    return state.zones.map(zone => {
      const zoneReadings = state.readings.filter(r => r.zoneId === zone.id);
      const latest = zoneReadings.length > 0
        ? zoneReadings[zoneReadings.length - 1]
        : null;
      return {
        name: zone.name,
        id: zone.id,
        sensorCount: zone.sensorIds.length,
        wineCount: zone.wineBottleIds.length,
        latestTemp: latest?.temperature,
        latestHumidity: latest?.humidity,
      };
    });
  }, [state.zones, state.readings]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold text-wine-100">🧪 仿真控制中心</h2>
        <div className="text-sm text-cellar-400">
          仿真时间: {formatSimTime(simulationState.isRunning || simulationState.totalSimulatedDays > 0
            ? simulationEvents[0]?.simulatedTime || Date.now()
            : Date.now())}
        </div>
      </div>

      <div className="bg-gradient-to-r from-wine-900/50 via-cellar-800 to-wine-900/50 rounded-xl p-6 border border-wine-800/50">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-serif font-bold text-wine-100">仿真引擎</h3>
            <p className="text-sm text-cellar-400 mt-1">
              模拟酒窖环境变化，驱动传感器数据、熟化模型、适饮预测的完整数据流转
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${simulationState.isRunning ? 'bg-green-500 animate-pulse' : 'bg-cellar-600'}`} />
            <span className="text-sm font-medium text-cellar-200">
              {simulationState.isRunning ? `运行中 (${simulationState.speed})` : '已暂停'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-cellar-800 rounded-lg p-4 border border-cellar-700">
            <div className="text-sm text-cellar-400 mb-1">已仿真天数</div>
            <div className="text-3xl font-bold text-wine-400">
              {simulationState.totalSimulatedDays}
              <span className="text-base font-normal text-cellar-500 ml-1">天</span>
            </div>
          </div>
          <div className="bg-cellar-800 rounded-lg p-4 border border-cellar-700">
            <div className="text-sm text-cellar-400 mb-1">已仿真小时</div>
            <div className="text-3xl font-bold text-wine-400">
              {simulationState.elapsedHours.toFixed(0)}
              <span className="text-base font-normal text-cellar-500 ml-1">小时</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {!simulationState.isRunning ? (
            <button
              onClick={() => startSimulation('1x')}
              className="px-6 py-3 bg-wine-600 hover:bg-wine-500 text-white rounded-lg font-medium transition-colors shadow-md"
            >
              ▶ 启动仿真
            </button>
          ) : (
            <button
              onClick={stopSimulation}
              className="px-6 py-3 bg-cellar-600 hover:bg-cellar-500 text-white rounded-lg font-medium transition-colors shadow-md"
            >
              ⏸ 暂停仿真
            </button>
          )}

          <div className="flex gap-1">
            {speeds.map(sp => (
              <button
                key={sp.key}
                onClick={() => simulationState.isRunning ? setSimulationSpeed(sp.key) : startSimulation(sp.key)}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  simulationState.speed === sp.key && simulationState.isRunning
                    ? 'bg-wine-600 text-white shadow-md'
                    : 'bg-cellar-800 text-cellar-300 hover:bg-cellar-700 border border-cellar-600'
                }`}
              >
                {sp.label}
              </button>
            ))}
          </div>

          <button
            onClick={resetSimulation}
            className="px-4 py-3 bg-red-900/50 hover:bg-red-800/50 text-red-400 rounded-lg text-sm font-medium transition-colors border border-red-800/50 ml-auto"
          >
            🔄 重置
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        <div className="bg-cellar-800 rounded-xl shadow-md p-4 border border-cellar-700 text-center">
          <div className="text-2xl font-bold text-blue-400">{simulationState.stats.totalSensorReadings}</div>
          <div className="text-xs text-cellar-400 mt-1">📡 传感器数据</div>
        </div>
        <div className="bg-cellar-800 rounded-xl shadow-md p-4 border border-cellar-700 text-center">
          <div className="text-2xl font-bold text-red-400">{simulationState.stats.totalAlerts}</div>
          <div className="text-xs text-cellar-400 mt-1">🚨 告警事件</div>
        </div>
        <div className="bg-cellar-800 rounded-xl shadow-md p-4 border border-cellar-700 text-center">
          <div className="text-2xl font-bold text-wine-400">{simulationState.stats.maturationUpdates}</div>
          <div className="text-xs text-cellar-400 mt-1">🍷 熟化更新</div>
        </div>
        <div className="bg-cellar-800 rounded-xl shadow-md p-4 border border-cellar-700 text-center">
          <div className="text-2xl font-bold text-green-400">{simulationState.stats.predictionsRun}</div>
          <div className="text-xs text-cellar-400 mt-1">📈 预测计算</div>
        </div>
        <div className="bg-cellar-800 rounded-xl shadow-md p-4 border border-cellar-700 text-center">
          <div className="text-2xl font-bold text-amber-400">{simulationState.stats.anomaliesDetected}</div>
          <div className="text-xs text-cellar-400 mt-1">⚠️ 异常检测</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-cellar-800 rounded-xl shadow-md p-6 border border-cellar-700">
            <h3 className="text-lg font-semibold text-cellar-100 mb-4">📊 仿真数据产出统计</h3>
            <div className="h-64">
              {statsChartData.some(d => d.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statsChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#e5e7eb',
                      }}
                    />
                    <Bar dataKey="value" name="数量" fill="#b86244" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-cellar-500">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📊</div>
                    <p>启动仿真后显示统计数据</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-cellar-800 rounded-xl shadow-md p-6 border border-cellar-700">
            <h3 className="text-lg font-semibold text-cellar-100 mb-4">🏠 区域实时状态</h3>
            <div className="grid grid-cols-2 gap-4">
              {zoneSummary.map(zone => (
                <div key={zone.id} className="p-4 bg-cellar-900 rounded-lg border border-cellar-700">
                  <div className="font-medium text-cellar-100 mb-2">{zone.name}</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-cellar-500">传感器：</span>
                      <span className="text-cellar-200">{zone.sensorCount} 个</span>
                    </div>
                    <div>
                      <span className="text-cellar-500">藏酒：</span>
                      <span className="text-cellar-200">{zone.wineCount} 瓶</span>
                    </div>
                    <div>
                      <span className="text-cellar-500">温度：</span>
                      <span className={`font-medium ${
                        zone.latestTemp !== undefined
                          ? (zone.latestTemp >= 10 && zone.latestTemp <= 16 ? 'text-green-400' : 'text-red-400')
                          : 'text-cellar-500'
                      }`}>
                        {zone.latestTemp !== undefined ? `${zone.latestTemp.toFixed(1)}°C` : '--'}
                      </span>
                    </div>
                    <div>
                      <span className="text-cellar-500">湿度：</span>
                      <span className={`font-medium ${
                        zone.latestHumidity !== undefined
                          ? (zone.latestHumidity >= 60 && zone.latestHumidity <= 80 ? 'text-green-400' : 'text-red-400')
                          : 'text-cellar-500'
                      }`}>
                        {zone.latestHumidity !== undefined ? `${zone.latestHumidity.toFixed(0)}%` : '--'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-cellar-800 rounded-xl shadow-md p-6 border border-cellar-700">
            <h3 className="text-lg font-semibold text-cellar-100 mb-4">📋 事件日志</h3>
            <div className="max-h-[500px] overflow-y-auto space-y-2">
              {simulationEvents.length > 0 ? (
                simulationEvents.slice(0, 50).map(event => (
                  <div
                    key={event.id}
                    className={`p-3 rounded-lg border text-xs ${getSeverityStyle(event.severity)}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1">
                        <span>{getEventIcon(event.type)}</span>
                        <span className="font-medium">{event.type}</span>
                      </span>
                      <span className="text-cellar-500">
                        {formatSimTime(event.simulatedTime)}
                      </span>
                    </div>
                    <p className="leading-relaxed">{event.message}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-cellar-500">
                  <div className="text-3xl mb-2">📭</div>
                  <p>启动仿真后显示事件日志</p>
                </div>
              )}
            </div>
          </div>

          {alertTypeDistribution.length > 0 && (
            <div className="bg-cellar-800 rounded-xl shadow-md p-6 border border-cellar-700">
              <h3 className="text-lg font-semibold text-cellar-100 mb-4">🔔 告警分布</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={alertTypeDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {alertTypeDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#e5e7eb',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {alertTypeDistribution.map((item, i) => (
                  <span key={i} className="text-xs flex items-center gap-1 text-cellar-300">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    {item.name === 'critical' ? '严重' : item.name === 'warning' ? '警告' : '信息'}: {item.value}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="bg-gradient-to-br from-wine-900/30 to-cellar-800 rounded-xl p-4 border border-wine-800/30">
            <h3 className="text-sm font-semibold text-wine-200 mb-3">📖 仿真说明</h3>
            <div className="text-xs text-cellar-300 space-y-2 leading-relaxed">
              <p>仿真引擎模拟酒窖环境的实时变化，驱动完整的数据流转：</p>
              <p>1️⃣ <strong className="text-wine-300">传感器数据生成</strong> — 模拟温湿度传感器的实时数据采集，包含季节变化、设备漂移和随机异常</p>
              <p>2️⃣ <strong className="text-wine-300">熟化模型更新</strong> — 基于传感器数据的语义对齐分析，实时更新每瓶酒的熟化指标</p>
              <p>3️⃣ <strong className="text-wine-300">告警检测</strong> — 当环境参数超出安全范围时自动触发告警</p>
              <p>4️⃣ <strong className="text-wine-300">适饮窗口预测</strong> — 定期运行异步预测模型，检测进入巅峰期的酒款</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
