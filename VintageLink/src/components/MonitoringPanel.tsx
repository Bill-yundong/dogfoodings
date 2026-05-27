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
  const { state, dispatch, getReadingsByZone, getZoneById, getWinesByZone } = useApp();

  const selectedZone = useMemo(
    () => (state.selectedZoneId ? getZoneById(state.selectedZoneId) : null),
    [state.selectedZoneId, getZoneById]
  );

  const zoneReadings = useMemo(
    () => (state.selectedZoneId ? getReadingsByZone(state.selectedZoneId) : []),
    [state.selectedZoneId, getReadingsByZone]
  );

  const zoneWines = useMemo(
    () => (state.selectedZoneId ? getWinesByZone(state.selectedZoneId) : []),
    [state.selectedZoneId, getWinesByZone]
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

  const getStatusColor = (value: number, min: number, max: number, optimal: number) => {
    if (value >= min && value <= max) {
      const distance = Math.abs(value - optimal);
      const range = max - min;
      if (distance < range * 0.2) return 'text-green-500';
      if (distance < range * 0.5) return 'text-yellow-500';
    }
    return 'text-red-500';
  };

  const getStatusBg = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 75) return 'bg-yellow-500';
    if (score >= 60) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wine-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold text-wine-900">🌡️ 环境监控中心</h2>
        <div className="flex space-x-2">
          {state.zones.map(zone => (
            <button
              key={zone.id}
              onClick={() => dispatch({ type: 'SET_SELECTED_ZONE', payload: zone.id })}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                state.selectedZoneId === zone.id
                  ? 'bg-wine-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {zone.name}
            </button>
          ))}
        </div>
      </div>

      {selectedZone && latestReading && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <div className="text-sm text-gray-500 mb-1">当前温度</div>
              <div className={`text-3xl font-bold ${
                getStatusColor(
                  latestReading.temperature,
                  selectedZone.targetTemperature.min,
                  selectedZone.targetTemperature.max,
                  selectedZone.targetTemperature.optimal
                )
              }`}>
                {latestReading.temperature.toFixed(1)}°C
              </div>
              <div className="text-xs text-gray-400 mt-1">
                目标: {selectedZone.targetTemperature.optimal}°C ({selectedZone.targetTemperature.min}-{selectedZone.targetTemperature.max}°C)
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <div className="text-sm text-gray-500 mb-1">当前湿度</div>
              <div className={`text-3xl font-bold ${
                getStatusColor(
                  latestReading.humidity,
                  selectedZone.targetHumidity.min,
                  selectedZone.targetHumidity.max,
                  selectedZone.targetHumidity.optimal
                )
              }`}>
                {latestReading.humidity.toFixed(0)}%
              </div>
              <div className="text-xs text-gray-400 mt-1">
                目标: {selectedZone.targetHumidity.optimal}% ({selectedZone.targetHumidity.min}-{selectedZone.targetHumidity.max}%)
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <div className="text-sm text-gray-500 mb-1">储存条件评分</div>
              <div className={`text-3xl font-bold ${(semanticAnalysis?.impactScore ?? 0) >= 75 ? 'text-green-500' : 'text-yellow-500'}`}>
                {semanticAnalysis?.impactScore?.toFixed(1) || '--'}
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full ${getStatusBg(semanticAnalysis?.impactScore || 0)} transition-all duration-500`}
                  style={{ width: `${semanticAnalysis?.impactScore || 0}%` }}
                />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <div className="text-sm text-gray-500 mb-1">藏酒数量</div>
              <div className="text-3xl font-bold text-wine-600">
                {zoneWines.length} 瓶
              </div>
              <div className="text-xs text-gray-400 mt-1">
                覆盖 {new Set(zoneWines.map(w => w.label.chateau)).size} 个酒庄
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">📈 24小时温湿度趋势</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#b86244" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#b86244" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="humidityGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#61636e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#61636e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="time" stroke="#9ca3af" fontSize={12} />
                    <YAxis yAxisId="left" stroke="#b86244" fontSize={12} domain={[8, 20]} />
                    <YAxis yAxisId="right" orientation="right" stroke="#61636e" fontSize={12} domain={[40, 90]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="temp"
                      name="温度 (°C)"
                      stroke="#b86244"
                      strokeWidth={2}
                      fill="url(#tempGradient)"
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="humidity"
                      name="湿度 (%)"
                      stroke="#61636e"
                      strokeWidth={2}
                      fill="url(#humidityGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">🔬 语义影响分析</h3>
                <div className="space-y-3">
                  {semanticAnalysis?.factors.map((factor, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{factor.metric}</span>
                        <span className={factor.impact >= 75 ? 'text-green-500 font-medium' : 'text-yellow-500 font-medium'}>
                          {factor.impact.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            factor.impact >= 75 ? 'bg-green-500' : factor.impact >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${factor.impact}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-400">{factor.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              {insights && (
                <div className="bg-gradient-to-br from-wine-50 to-white rounded-xl shadow-md p-6 border border-wine-100">
                  <h3 className="text-lg font-semibold text-wine-800 mb-3">💡 智能洞察</h3>
                  <div className="text-sm text-gray-600 mb-3">
                    {insights.zoneOptimization}
                  </div>
                  {insights.keyInsights.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-gray-500">关键发现：</div>
                      {insights.keyInsights.slice(0, 3).map((insight, i) => (
                        <div key={i} className="text-xs bg-wine-50 rounded px-3 py-2 text-wine-700">
                          • {insight}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">📋 区域详情</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">区域描述</h4>
                <p className="text-gray-700">{selectedZone.description}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">目标参数</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">温度范围：</span>
                    <span className="text-gray-800">{selectedZone.targetTemperature.min}-{selectedZone.targetTemperature.max}°C</span>
                  </div>
                  <div>
                    <span className="text-gray-500">湿度范围：</span>
                    <span className="text-gray-800">{selectedZone.targetHumidity.min}-{selectedZone.targetHumidity.max}%</span>
                  </div>
                  <div>
                    <span className="text-gray-500">传感器：</span>
                    <span className="text-gray-800">{selectedZone.sensorIds.length} 个</span>
                  </div>
                  <div>
                    <span className="text-gray-500">数据点：</span>
                    <span className="text-gray-800">{zoneReadings.length} 条</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
