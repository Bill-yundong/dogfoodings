import React, { useMemo } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { useApp } from '@/context/AppContext';
import { semanticEngine } from '@/models/SemanticAlignment';

export const MonitoringPanel: React.FC = () => {
  const { state, dispatch, getZoneById, getReadingsByZone, getWinesByZone } = useApp();

  const selectedZone = useMemo(
    () => (state.selectedZoneId ? getZoneById(state.selectedZoneId) : getZoneById(state.zones[0]?.id || '')),
    [state.selectedZoneId, getZoneById, state.zones]
  );

  const zoneReadings = useMemo(
    () => (state.selectedZoneId ? getReadingsByZone(state.selectedZoneId) : getReadingsByZone(state.zones[0]?.id || '')),
    [state.selectedZoneId, getReadingsByZone, state.zones]
  );

  const zoneWines = useMemo(
    () => (state.selectedZoneId ? getWinesByZone(state.selectedZoneId) : getWinesByZone(state.zones[0]?.id || '')),
    [state.selectedZoneId, getWinesByZone, state.zones]
  );

  const chartData = useMemo(() => {
    const last24h = Date.now() - 86400000;
    const filtered = zoneReadings.filter(r => r.timestamp >= last24h);

    const averaged = filtered.reduce((acc: { time: string; temp: number; humidity: number; timestamp: number }[], reading, index) => {
      if (index % 4 === 0) {
        const group = filtered.slice(index, index + 4);
        if (group.length > 0) {
          acc.push({
            time: new Date(reading.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            temp: group.reduce((sum, r) => sum + r.temperature, 0) / group.length,
            humidity: group.reduce((sum, r) => sum + r.humidity, 0) / group.length,
            timestamp: reading.timestamp,
          });
        }
      }
      return acc;
    }, []);

    return averaged;
  }, [zoneReadings]);

  const latestReading = useMemo(() => {
    if (zoneReadings.length === 0) return null;
    return zoneReadings[zoneReadings.length - 1];
  }, [zoneReadings]);

  const semanticAnalysis = useMemo(() => {
    if (!selectedZone || zoneReadings.length === 0) return null;
    return semanticEngine.calculateMaturationImpact(zoneReadings, selectedZone);
  }, [selectedZone, zoneReadings]);

  const insights = useMemo(() => {
    if (!selectedZone) return null;
    return semanticEngine.getSemanticInsights(zoneReadings, selectedZone, zoneWines);
  }, [selectedZone, zoneReadings, zoneWines]);

  const getStatusBg = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusText = (score: number) => {
    if (score >= 80) return '优秀';
    if (score >= 60) return '良好';
    if (score >= 40) return '一般';
    return '较差';
  };

  const tooltipStyle = {
    backgroundColor: '#1f2937',
    border: '1px solid #374151',
    borderRadius: '8px',
    color: '#e5e7eb',
  };

  if (!selectedZone) {
    return (
      <div className="flex items-center justify-center h-64 text-cellar-500">
        暂无区域数据，请先初始化系统
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold text-wine-100">🌡️ 环境监控</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-cellar-400">选择区域：</span>
          <select
            value={state.selectedZoneId || state.zones[0]?.id || ''}
            onChange={(e) => dispatch({ type: 'SET_SELECTED_ZONE', payload: e.target.value })}
            className="bg-cellar-800 text-cellar-200 border border-cellar-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wine-500"
          >
            {state.zones.map(zone => (
              <option key={zone.id} value={zone.id}>{zone.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-cellar-800 rounded-xl shadow-md p-5 border border-cellar-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-cellar-400">当前温度</span>
            <span className="text-xs text-cellar-500">目标 {selectedZone.targetTemperature.optimal}°C</span>
          </div>
          <div className="flex items-end gap-2">
            <span className={`text-3xl font-bold ${
              (latestReading?.temperature || 0) >= selectedZone.targetTemperature.min &&
              (latestReading?.temperature || 0) <= selectedZone.targetTemperature.max
                ? 'text-green-400' : 'text-red-400'
            }`}>
              {latestReading?.temperature.toFixed(1) || '--'}
            </span>
            <span className="text-cellar-500 mb-1">°C</span>
          </div>
          <div className="text-xs text-cellar-500 mt-1">
            范围: {selectedZone.targetTemperature.min}-{selectedZone.targetTemperature.max}°C
          </div>
        </div>

        <div className="bg-cellar-800 rounded-xl shadow-md p-5 border border-cellar-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-cellar-400">当前湿度</span>
            <span className="text-xs text-cellar-500">目标 {selectedZone.targetHumidity.optimal}%</span>
          </div>
          <div className="flex items-end gap-2">
            <span className={`text-3xl font-bold ${
              (latestReading?.humidity || 0) >= selectedZone.targetHumidity.min &&
              (latestReading?.humidity || 0) <= selectedZone.targetHumidity.max
                ? 'text-green-400' : 'text-red-400'
            }`}>
              {latestReading?.humidity.toFixed(0) || '--'}
            </span>
            <span className="text-cellar-500 mb-1">%</span>
          </div>
          <div className="text-xs text-cellar-500 mt-1">
            范围: {selectedZone.targetHumidity.min}-{selectedZone.targetHumidity.max}%
          </div>
        </div>

        <div className="bg-cellar-800 rounded-xl shadow-md p-5 border border-cellar-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-cellar-400">光线强度</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-amber-400">
              {latestReading?.lightIntensity?.toFixed(1) || '--'}
            </span>
            <span className="text-cellar-500 mb-1">lux</span>
          </div>
        </div>

        <div className="bg-cellar-800 rounded-xl shadow-md p-5 border border-cellar-700">
          <div className="text-sm text-cellar-400 mb-1">储存条件评分</div>
          <div className={`text-3xl font-bold ${(semanticAnalysis?.impactScore ?? 0) >= 75 ? 'text-green-400' : 'text-yellow-400'}`}>
            {semanticAnalysis?.impactScore?.toFixed(1) || '--'}
          </div>
          <div className="w-full h-2 bg-cellar-700 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full ${getStatusBg(semanticAnalysis?.impactScore || 0)} transition-all duration-500`}
              style={{ width: `${semanticAnalysis?.impactScore || 0}%` }}
            />
          </div>
          <div className="text-xs text-cellar-500 mt-1">{getStatusText(semanticAnalysis?.impactScore || 0)}</div>
        </div>
      </div>

      <div className="bg-cellar-800 rounded-xl shadow-md p-6 border border-cellar-700">
        <h3 className="text-lg font-semibold text-cellar-100 mb-4">📈 24小时温湿度趋势</h3>
        <div className="h-80">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="humidityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9ca3af" fontSize={11} />
                <YAxis yAxisId="left" stroke="#9ca3af" fontSize={11} />
                <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ color: '#9ca3af' }} />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="temp"
                  name="温度 (°C)"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fill="url(#tempGradient)"
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="humidity"
                  name="湿度 (%)"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#humidityGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-cellar-500">
              启动仿真后显示趋势数据
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-cellar-800 rounded-xl shadow-md p-6 border border-cellar-700">
          <h3 className="text-lg font-semibold text-cellar-100 mb-4">🎯 语义影响分析</h3>
          {semanticAnalysis?.factors ? (
            <div className="space-y-4">
              {Object.entries(semanticAnalysis.factors).map(([key, value]: [string, any]) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-cellar-300">
                      {key === 'temperature' ? '温度稳定性' :
                       key === 'humidity' ? '湿度适宜度' :
                       key === 'consistency' ? '条件一致性' :
                       key === 'seasonalAlignment' ? '季节匹配度' : key}
                    </span>
                    <span className={`text-sm font-medium ${
                      value >= 75 ? 'text-green-400' : value >= 50 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {typeof value === 'number' ? value.toFixed(0) : String(value)}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-cellar-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        value >= 75 ? 'bg-green-500' : value >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-cellar-500">
              启动仿真后显示分析数据
            </div>
          )}
        </div>

        <div className="bg-cellar-800 rounded-xl shadow-md p-6 border border-cellar-700">
          <h3 className="text-lg font-semibold text-cellar-100 mb-4">� 智能洞察</h3>
          {insights ? (
            <div className="space-y-3">
              <div className="p-3 bg-cellar-900 rounded-lg border border-cellar-700">
                <div className="text-sm font-medium text-cellar-100 mb-1">整体健康度</div>
                <div className="flex items-center gap-2">
                  <div className="w-full h-2 bg-cellar-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getStatusBg(insights.overallHealth)}`}
                      style={{ width: `${insights.overallHealth}%` }}
                    />
                  </div>
                  <span className="text-sm text-cellar-300">{insights.overallHealth}%</span>
                </div>
              </div>
              {insights.recommendations?.slice(0, 3).map((rec: string, i: number) => (
                <div key={i} className="p-3 bg-wine-900/30 rounded-lg border border-wine-800/30">
                  <p className="text-sm text-cellar-300 flex items-start">
                    <span className="mr-2">•</span>
                    {rec}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-cellar-500">
              启动仿真后显示智能洞察
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
