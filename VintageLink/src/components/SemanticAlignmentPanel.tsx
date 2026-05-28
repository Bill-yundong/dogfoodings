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
  Cell,
} from 'recharts';
import { useApp } from '@/context/AppContext';
import { semanticEngine } from '@/models/SemanticAlignment';

export const SemanticAlignmentPanel: React.FC = () => {
  const { state, getReadingsByZone } = useApp();

  const zoneImpactAnalysis = useMemo(() => {
    return state.zones.map(zone => {
      const readings = getReadingsByZone(zone.id);
      const analysis = readings.length > 0
        ? semanticEngine.calculateMaturationImpact(readings, zone)
        : { impactScore: 50, factors: { temperature: 50, humidity: 50, consistency: 50, seasonalAlignment: 50 } };

      return {
        name: zone.name,
        ...analysis,
        factors: analysis.factors as Record<string, number>,
      };
    });
  }, [state.zones, getReadingsByZone]);

  const semanticMappings = useMemo(() => {
    return [
      {
        source: '温度传感器',
        target: '熟化速率',
        correlation: 0.85,
        weight: 0.30,
        description: '温度波动直接影响酒液熟化速度',
      },
      {
        source: '湿度传感器',
        target: '软木塞完整性',
        correlation: 0.78,
        weight: 0.25,
        description: '湿度过低会导致软木塞干裂',
      },
      {
        source: '光线强度',
        target: '酒液氧化',
        correlation: 0.92,
        weight: 0.20,
        description: '紫外线会加速酒液氧化反应',
      },
      {
        source: '振动传感器',
        target: '沉淀物稳定性',
        correlation: 0.70,
        weight: 0.15,
        description: '剧烈振动会扰动酒中沉淀物',
      },
      {
        source: '季节变化',
        target: '陈年品质',
        correlation: 0.65,
        weight: 0.10,
        description: '季节温湿度变化影响陈年曲线',
      },
    ];
  }, []);

  const radarData = useMemo(() => {
    if (zoneImpactAnalysis.length === 0) return [];
    const factors = zoneImpactAnalysis[0].factors;
    return Object.entries(factors).map(([key, value]) => ({
      subject: key === 'temperature' ? '温度影响' :
               key === 'humidity' ? '湿度影响' :
               key === 'consistency' ? '一致性' :
               key === 'seasonalAlignment' ? '季节匹配' : key,
      A: value,
      fullMark: 100,
    }));
  }, [zoneImpactAnalysis]);

  const zoneComparisonData = useMemo(() => {
    return zoneImpactAnalysis.map(zone => ({
      name: zone.name,
      综合评分: zone.impactScore,
      温度因子: zone.factors.temperature,
      湿度因子: zone.factors.humidity,
    }));
  }, [zoneImpactAnalysis]);

  const tooltipStyle = {
    backgroundColor: '#1f2937',
    border: '1px solid #374151',
    borderRadius: '8px',
    color: '#e5e7eb',
  };

  const getMaturityPhase = (maturityScore: number) => {
    if (maturityScore >= 85) return { phase: '成熟期', color: 'text-green-400' };
    if (maturityScore >= 70) return { phase: '发展期', color: 'text-blue-400' };
    if (maturityScore >= 50) return { phase: '青年期', color: 'text-amber-400' };
    return { phase: '幼年期', color: 'text-cellar-400' };
  };

  const zoneMaturityDistribution = useMemo(() => {
    const distribution: Record<string, { count: number; names: string[] }> = {
      '幼年期': { count: 0, names: [] },
      '青年期': { count: 0, names: [] },
      '发展期': { count: 0, names: [] },
      '成熟期': { count: 0, names: [] },
    };

    state.maturationModels.forEach(m => {
      const { phase } = getMaturityPhase(m.maturityScore);
      distribution[phase].count++;
    });

    return Object.entries(distribution).map(([name, data]) => ({
      name,
      value: data.count,
    }));
  }, [state.maturationModels]);

  const COLORS = ['#6b7280', '#f59e0b', '#3b82f6', '#22c55e'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold text-wine-100">🔗 语义对齐分析</h2>
        <div className="text-sm text-cellar-400">
          环境数据 → 酒质属性的语义映射
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {zoneImpactAnalysis.map((zone, i) => (
          <div
            key={i}
            className={`bg-cellar-800 rounded-xl p-4 border ${
              zone.impactScore >= 80 ? 'border-green-600/50' :
              zone.impactScore >= 60 ? 'border-yellow-600/50' : 'border-red-600/50'
            }`}
          >
            <div className="text-sm text-cellar-400 mb-1">{zone.name}</div>
            <div className={`text-2xl font-bold ${
              zone.impactScore >= 80 ? 'text-green-400' :
              zone.impactScore >= 60 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {zone.impactScore.toFixed(1)}
            </div>
            <div className="text-xs text-cellar-500 mt-1">语义对齐评分</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-cellar-800 rounded-xl shadow-md p-6 border border-cellar-700">
          <h3 className="text-lg font-semibold text-cellar-100 mb-4">� 环境因子影响雷达</h3>
          <div className="h-64">
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis dataKey="subject" stroke="#9ca3af" fontSize={11} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#9ca3af" fontSize={10} />
                  <Radar name="影响度" dataKey="A" stroke="#b86244" fill="#b86244" fillOpacity={0.5} />
                  <Tooltip contentStyle={tooltipStyle} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-cellar-500">
                启动仿真后显示数据
              </div>
            )}
          </div>
        </div>

        <div className="bg-cellar-800 rounded-xl shadow-md p-6 border border-cellar-700">
          <h3 className="text-lg font-semibold text-cellar-100 mb-4">� 语义映射详情</h3>
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {semanticMappings.map((mapping, i) => (
              <div key={i} className="p-3 bg-cellar-900 rounded-lg border border-cellar-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-cellar-200">{mapping.source}</span>
                  <span className="text-lg">→</span>
                  <span className="text-sm text-wine-400 font-medium">{mapping.target}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-cellar-500">
                  <span>相关系数: {(mapping.correlation * 100).toFixed(0)}%</span>
                  <span>权重: {(mapping.weight * 100).toFixed(0)}%</span>
                </div>
                <p className="text-xs text-cellar-400 mt-2">{mapping.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-cellar-800 rounded-xl shadow-md p-6 border border-cellar-700">
          <h3 className="text-lg font-semibold text-cellar-100 mb-4">🍷 熟化阶段分布</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zoneMaturityDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
                <YAxis stroke="#9ca3af" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" name="瓶数" radius={[4, 4, 0, 0]}>
                  {zoneMaturityDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 mt-4 justify-center">
            {zoneMaturityDistribution.map((item, i) => (
              <span key={i} className="text-xs flex items-center gap-1 text-cellar-300">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                {item.name}: {item.value}瓶
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-cellar-800 rounded-xl shadow-md p-6 border border-cellar-700">
        <h3 className="text-lg font-semibold text-cellar-100 mb-4">� 区域性能对比</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={zoneComparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
              <YAxis stroke="#9ca3af" fontSize={11} domain={[0, 100]} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ color: '#9ca3af' }} />
              <Bar dataKey="综合评分" fill="#b86244" radius={[4, 4, 0, 0]} />
              <Bar dataKey="温度因子" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="湿度因子" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-gradient-to-br from-wine-900/30 to-cellar-800 rounded-xl p-6 border border-wine-800/30">
        <h3 className="text-lg font-semibold text-wine-200 mb-4">� 语义对齐原理</h3>
        <div className="grid grid-cols-2 gap-6 text-sm text-cellar-300">
          <div className="space-y-2">
            <p className="flex items-start">
              <span className="mr-2 text-wine-400">1.</span>
              <span><strong className="text-wine-300">传感器数据语义化</strong> — 将原始的温湿度数值转换为有意义的酒窖环境指标，如"温度稳定性"、"湿度适宜度"等。</span>
            </p>
            <p className="flex items-start">
              <span className="mr-2 text-wine-400">2.</span>
              <span><strong className="text-wine-300">多因子权重计算</strong> — 通过相关系数分析确定各环境因子对酒质的影响权重，构建综合评分模型。</span>
            </p>
          </div>
          <div className="space-y-2">
            <p className="flex items-start">
              <span className="mr-2 text-wine-400">3.</span>
              <span><strong className="text-wine-300">熟化状态映射</strong> — 将环境指标映射到酒液熟化状态，实时更新单宁、酸度、果香等多维指标。</span>
            </p>
            <p className="flex items-start">
              <span className="mr-2 text-wine-400">4.</span>
              <span><strong className="text-wine-300">跨系统语义对齐</strong> — 确保监控系统与资产管理模块使用统一的语义标准，实现数据无缝流转。</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
