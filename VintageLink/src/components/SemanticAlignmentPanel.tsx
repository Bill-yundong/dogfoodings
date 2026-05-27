import React, { useMemo } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useApp } from '@/context/AppContext';
import { semanticEngine } from '@/models/SemanticAlignment';

export const SemanticAlignmentPanel: React.FC = () => {
  const { state, dispatch, getReadingsByZone, getZoneById, getWinesByZone } = useApp();

  const mappings = useMemo(() => semanticEngine.getMappings(), []);

  const selectedZone = useMemo(
    () => (state.selectedZoneId ? getZoneById(state.selectedZoneId) : state.zones[0] || null),
    [state.selectedZoneId, state.zones, getZoneById]
  );

  const zoneReadings = useMemo(
    () => (selectedZone ? getReadingsByZone(selectedZone.id) : []),
    [selectedZone, getReadingsByZone]
  );

  const zoneWines = useMemo(
    () => (selectedZone ? getWinesByZone(selectedZone.id) : []),
    [selectedZone, getWinesByZone]
  );

  const impactAnalysis = useMemo(() => {
    if (!selectedZone || zoneReadings.length === 0) return null;
    return semanticEngine.calculateMaturationImpact(zoneReadings, selectedZone);
  }, [selectedZone, zoneReadings]);

  const semanticInsights = useMemo(() => {
    if (!selectedZone) return null;
    return semanticEngine.getSemanticInsights(zoneReadings, selectedZone, zoneWines);
  }, [selectedZone, zoneReadings, zoneWines]);

  const alignedMetrics = useMemo(() => {
    if (!selectedZone || zoneReadings.length === 0) return [];

    const latest = zoneReadings[zoneReadings.length - 1];
    const metrics: {
      sensorMetric: string;
      value: number;
      wineProperty: string;
      alignedValue: number;
      correlation: number;
      semanticDescription: string;
      units: string;
    }[] = [];

    const metricValueMap: Record<string, number> = {
      temperature: latest.temperature,
      humidity: latest.humidity,
      lightIntensity: latest.lightIntensity || 0,
      vibration: latest.vibration || 0,
    };

    mappings.forEach(mapping => {
      const value = metricValueMap[mapping.sensorMetric];
      if (value !== undefined) {
        const alignment = semanticEngine.alignSensorToWineProperty(
          mapping.sensorMetric,
          value,
          mapping.wineProperty
        );
        metrics.push({
          sensorMetric: mapping.sensorMetric,
          value,
          wineProperty: mapping.wineProperty,
          alignedValue: alignment.alignedValue,
          correlation: mapping.correlation,
          semanticDescription: alignment.semanticDescription,
          units: mapping.units,
        });
      }
    });

    return metrics;
  }, [selectedZone, zoneReadings, mappings]);

  const radarData = useMemo(() => {
    if (!impactAnalysis) return [];
    return impactAnalysis.factors.map(f => ({
      metric: f.metric,
      impact: f.impact,
      fullMark: 100,
    }));
  }, [impactAnalysis]);

  const correlationData = useMemo(() => {
    return mappings.map(m => ({
      name: m.sensorMetric,
      correlation: m.correlation * 100,
      impact: m.impactFactor * 50,
    }));
  }, [mappings]);

  const winePropertyDistribution = useMemo(() => {
    if (zoneWines.length === 0) return [];

    const now = Date.now();
    const distribution = zoneWines.reduce((acc, w) => {
      const label = w.label;
      const currentYear = new Date(now).getFullYear();
      const age = currentYear - label.vintage;
      const peakStart = label.agingPotential.peakStart;
      const peakEnd = label.agingPotential.peakEnd;

      let stage: 'developing' | 'approaching' | 'peak' | 'declining';
      if (age < peakStart - 2) stage = 'developing';
      else if (age < peakStart) stage = 'approaching';
      else if (age <= peakEnd) stage = 'peak';
      else stage = 'declining';

      acc[stage] = (acc[stage] || 0) + w.bottle.quantity;
      return acc;
    }, {} as Record<string, number>);

    return [
      { stage: '发展期', count: distribution.developing || 0, color: '#3b82f6' },
      { stage: '接近巅峰', count: distribution.approaching || 0, color: '#f59e0b' },
      { stage: '巅峰期', count: distribution.peak || 0, color: '#22c55e' },
      { stage: '衰退期', count: distribution.declining || 0, color: '#ef4444' },
    ];
  }, [zoneWines]);

  const getCorrelationColor = (correlation: number) => {
    const abs = Math.abs(correlation);
    if (abs >= 0.8) return 'text-green-600';
    if (abs >= 0.6) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getCorrelationStrength = (correlation: number) => {
    const abs = Math.abs(correlation);
    if (abs >= 0.8) return '强相关';
    if (abs >= 0.6) return '中等相关';
    if (abs >= 0.4) return '弱相关';
    return '极弱相关';
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
        <h2 className="text-2xl font-serif font-bold text-wine-900">🔗 语义对齐中心</h2>
        <div className="flex space-x-2">
          {state.zones.map(zone => (
            <button
              key={zone.id}
              onClick={() => dispatch({ type: 'SET_SELECTED_ZONE', payload: zone.id })}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                (state.selectedZoneId || state.zones[0]?.id) === zone.id
                  ? 'bg-wine-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {zone.name}
            </button>
          ))}
        </div>
      </div>

      {selectedZone && (
        <>
          <div className="bg-gradient-to-r from-wine-50 to-amber-50 rounded-xl p-6 border border-wine-200">
            <h3 className="text-lg font-semibold text-wine-900 mb-2">📚 语义对齐原理</h3>
            <p className="text-gray-700 text-sm leading-relaxed">
              本模块通过建立传感器数据与葡萄酒属性之间的语义映射，实现环境监控数据与资产管理数据的跨系统语义对齐。
              系统实时分析温度、湿度、光照、振动等环境因子对葡萄酒熟化过程的影响，将物理传感器数据转化为可理解的酒质语义信息，
              为陈年潜力预测和资产管理提供智能决策支持。
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-6">
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 环境因子影响分析</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="h-72">
                    <h4 className="text-sm font-medium text-gray-600 mb-2 text-center">影响因子雷达图</h4>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#6b7280' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Radar
                          name="影响评分"
                          dataKey="impact"
                          stroke="#b86244"
                          fill="#b86244"
                          fillOpacity={0.4}
                          strokeWidth={2}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="h-72">
                    <h4 className="text-sm font-medium text-gray-600 mb-2 text-center">相关性与影响权重</h4>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={correlationData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
                        <YAxis stroke="#9ca3af" fontSize={11} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="correlation" name="相关性 (%)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="impact" name="影响权重" fill="#b86244" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">🔬 语义映射详情</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">传感器指标</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">当前值</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">映射到酒质属性</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">对齐后的值</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">相关性</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">语义描述</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {alignedMetrics.map((metric, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span className="font-medium text-gray-900">{metric.sensorMetric}</span>
                            <span className="text-xs text-gray-400 ml-1">({metric.units})</span>
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {metric.value.toFixed(2)} {metric.units}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 text-xs bg-wine-100 text-wine-700 rounded-full">
                              {metric.wineProperty}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-800 font-medium">
                            {typeof metric.alignedValue === 'number'
                              ? metric.alignedValue.toFixed(2)
                              : metric.alignedValue}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${Math.abs(metric.correlation) >= 0.7 ? 'bg-green-500' : Math.abs(metric.correlation) >= 0.5 ? 'bg-yellow-500' : 'bg-gray-400'}`}
                                  style={{ width: `${Math.abs(metric.correlation) * 100}%` }}
                                />
                              </div>
                              <span className={`text-xs ${getCorrelationColor(metric.correlation)}`}>
                                {getCorrelationStrength(metric.correlation)}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                            {metric.semanticDescription}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">🍷 酒窖熟化阶段分布</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={winePropertyDistribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="stage" stroke="#9ca3af" fontSize={12} />
                        <YAxis stroke="#9ca3af" fontSize={12} />
                        <Tooltip />
                        <Bar dataKey="count" name="瓶数" radius={[4, 4, 0, 0]}>
                          {winePropertyDistribution.map((entry, index) => (
                            <rect key={index} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-600">阶段说明</h4>
                    {winePropertyDistribution.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm text-gray-700">{item.stage}</span>
                        </div>
                        <span className="font-bold text-gray-900">{item.count} 瓶</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {semanticInsights && (
                <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                  <div className="p-4 bg-gradient-to-r from-wine-800 to-wine-700 text-white">
                    <h3 className="text-lg font-semibold">💡 智能语义洞察</h3>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="text-center">
                      <div className="text-sm text-gray-500 mb-1">区域健康评分</div>
                      <div className={`text-4xl font-bold ${
                        semanticInsights.overallHealth >= 80 ? 'text-green-500' :
                        semanticInsights.overallHealth >= 60 ? 'text-yellow-500' : 'text-red-500'
                      }`}>
                        {semanticInsights.overallHealth.toFixed(1)}
                      </div>
                      <div className="w-full h-3 bg-gray-200 rounded-full mt-2 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            semanticInsights.overallHealth >= 80 ? 'bg-green-500' :
                            semanticInsights.overallHealth >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${semanticInsights.overallHealth}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-wine-50 rounded-lg border border-wine-100">
                      <p className="text-sm text-wine-700">{semanticInsights.zoneOptimization}</p>
                    </div>

                    {semanticInsights.keyInsights.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">关键发现</h4>
                        <div className="space-y-2">
                          {semanticInsights.keyInsights.map((insight, i) => (
                            <div key={i} className="text-xs bg-blue-50 text-blue-700 px-3 py-2 rounded-lg">
                              📌 {insight}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {semanticInsights.recommendations.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">优化建议</h4>
                        <div className="space-y-2">
                          {semanticInsights.recommendations.map((rec, i) => (
                            <div key={i} className="text-xs bg-green-50 text-green-700 px-3 py-2 rounded-lg">
                              ✅ {rec}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">📖 语义映射定义</h3>
                <div className="space-y-3">
                  {mappings.map((mapping, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">{mapping.sensorMetric}</span>
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                          → {mapping.wineProperty}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">{mapping.description}</p>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-gray-500">相关系数: {mapping.correlation}</span>
                        <span className="text-gray-500">影响因子: {mapping.impactFactor}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-md p-4 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">📊 区域统计</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-white rounded-lg border border-gray-100">
                    <div className="text-xs text-gray-500">藏酒数量</div>
                    <div className="text-xl font-bold text-wine-600">{zoneWines.length} 瓶</div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-gray-100">
                    <div className="text-xs text-gray-500">酒庄数量</div>
                    <div className="text-xl font-bold text-wine-600">
                      {new Set(zoneWines.map(w => w.label.chateau)).size}
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-gray-100">
                    <div className="text-xs text-gray-500">传感器</div>
                    <div className="text-xl font-bold text-wine-600">{selectedZone.sensorIds.length} 个</div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-gray-100">
                    <div className="text-xs text-gray-500">数据点</div>
                    <div className="text-xl font-bold text-wine-600">{zoneReadings.length}</div>
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
