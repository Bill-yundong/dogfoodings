'use client';

import { SoilSample } from '@/types';

interface DashboardProps {
  stats: {
    avgPh: number;
    avgOm: number;
    avgN: number;
    avgP: number;
    avgK: number;
    healthCount: { good: number; medium: number; poor: number };
  };
  soilSamples: SoilSample[];
}

export default function Dashboard({ stats, soilSamples }: DashboardProps) {
  const StatCard = ({ title, value, unit, color, icon, trend, description }: {
    title: string;
    value: number;
    unit: string;
    color: string;
    icon: string;
    trend?: number;
    description?: string;
  }) => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 card-hover">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">
            {value.toFixed(1)}
            <span className="text-base font-normal text-slate-400 ml-1">{unit}</span>
          </p>
          {description && <p className="text-xs text-slate-400 mt-2">{description}</p>}
          {trend !== undefined && (
            <p className={`text-xs mt-2 font-medium ${trend >= 0 ? 'text-crop-600' : 'text-red-500'}`}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}% 较上期
            </p>
          )}
        </div>
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${color}`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );

  const NutrientBar = ({ label, value, max, color }: { label: string; value: number; max: number; color: string }) => {
    const percentage = Math.min((value / max) * 100, 100);
    return (
      <div className="space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600 font-medium">{label}</span>
          <span className="text-slate-800 font-semibold">{value.toFixed(0)}</span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${color}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="pH 平均值"
          value={stats.avgPh}
          unit=""
          color="bg-gradient-to-br from-blue-50 to-blue-100"
          icon="💧"
          description="土壤酸碱度指标"
        />
        <StatCard
          title="有机质平均"
          value={stats.avgOm}
          unit="g/kg"
          color="bg-gradient-to-br from-amber-50 to-amber-100"
          icon="🌿"
          description="土壤肥力指标"
        />
        <StatCard
          title="氮素 (N)"
          value={stats.avgN}
          unit="mg/kg"
          color="bg-gradient-to-br from-crop-50 to-crop-100"
          icon="🧪"
          description="全氮含量"
        />
        <StatCard
          title="磷素 (P)"
          value={stats.avgP}
          unit="mg/kg"
          color="bg-gradient-to-br from-purple-50 to-purple-100"
          icon="⚗️"
          description="有效磷含量"
        />
        <StatCard
          title="钾素 (K)"
          value={stats.avgK}
          unit="mg/kg"
          color="bg-gradient-to-br from-orange-50 to-orange-100"
          icon="🔬"
          description="速效钾含量"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800">养分含量分布</h3>
            <span className="text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
              基于 {soilSamples.length} 个样本分析
            </span>
          </div>
          
          <div className="space-y-5">
            <NutrientBar label="氮素 (N)" value={stats.avgN} max={200} color="bg-gradient-to-r from-blue-400 to-blue-600" />
            <NutrientBar label="磷素 (P)" value={stats.avgP} max={60} color="bg-gradient-to-r from-crop-400 to-crop-600" />
            <NutrientBar label="钾素 (K)" value={stats.avgK} max={250} color="bg-gradient-to-r from-amber-400 to-amber-600" />
            <NutrientBar label="有机质" value={stats.avgOm} max={50} color="bg-gradient-to-r from-orange-400 to-orange-600" />
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <h4 className="font-semibold text-slate-700 mb-4">养分状态说明</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-blue-50 rounded-xl">
                <p className="text-sm font-medium text-blue-700">氮素</p>
                <p className="text-xs text-blue-500 mt-1">
                  {stats.avgN < 80 ? '偏低，建议增施氮肥' : stats.avgN < 150 ? '正常' : '偏高，注意流失风险'}
                </p>
              </div>
              <div className="p-3 bg-crop-50 rounded-xl">
                <p className="text-sm font-medium text-crop-700">磷素</p>
                <p className="text-xs text-crop-500 mt-1">
                  {stats.avgP < 15 ? '偏低，建议增施磷肥' : stats.avgP < 40 ? '正常' : '偏高'}
                </p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl">
                <p className="text-sm font-medium text-amber-700">钾素</p>
                <p className="text-xs text-amber-500 mt-1">
                  {stats.avgK < 100 ? '偏低，建议增施钾肥' : stats.avgK < 200 ? '正常' : '偏高'}
                </p>
              </div>
              <div className="p-3 bg-orange-50 rounded-xl">
                <p className="text-sm font-medium text-orange-700">有机质</p>
                <p className="text-xs text-orange-500 mt-1">
                  {stats.avgOm < 20 ? '偏低，建议增施有机肥' : stats.avgOm < 35 ? '正常' : '丰富'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6">土壤健康状况</h3>
          
          <div className="relative">
            <div className="flex items-center justify-center h-48">
              <div className="relative w-40 h-40">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                  <circle
                    cx="50" cy="50" r="40" fill="none"
                    stroke="#22c55e" strokeWidth="12"
                    strokeDasharray={`${(stats.healthCount.good / soilSamples.length) * 251.2} 251.2`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                  <circle
                    cx="50" cy="50" r="40" fill="none"
                    stroke="#eab308" strokeWidth="12"
                    strokeDasharray={`${(stats.healthCount.medium / soilSamples.length) * 251.2} 251.2`}
                    strokeDashoffset={`${(stats.healthCount.good / soilSamples.length) * 251.2}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                  <circle
                    cx="50" cy="50" r="40" fill="none"
                    stroke="#ef4444" strokeWidth="12"
                    strokeDasharray={`${(stats.healthCount.poor / soilSamples.length) * 251.2} 251.2`}
                    strokeDashoffset={`${((stats.healthCount.good + stats.healthCount.medium) / soilSamples.length) * 251.2}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-slate-800">
                    {((stats.healthCount.good / soilSamples.length) * 100).toFixed(0)}%
                  </span>
                  <span className="text-xs text-slate-500">健康样本</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 mt-6">
              <div className="flex items-center justify-between p-3 bg-crop-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-crop-500 rounded-full"></div>
                  <span className="text-sm font-medium text-crop-700">健康</span>
                </div>
                <span className="text-sm font-bold text-crop-700">{stats.healthCount.good} 个</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                  <span className="text-sm font-medium text-amber-700">一般</span>
                </div>
                <span className="text-sm font-bold text-amber-700">{stats.healthCount.medium} 个</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm font-medium text-red-700">需关注</span>
                </div>
                <span className="text-sm font-bold text-red-700">{stats.healthCount.poor} 个</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4">养分流失风险预警</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600">💨</span>
                </div>
                <div>
                  <p className="font-medium text-slate-700">氮素流失风险</p>
                  <p className="text-xs text-slate-500">基于降雨强度与土壤渗透性</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm font-medium rounded-full">中等</span>
            </div>
            <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-crop-100 rounded-full flex items-center justify-center">
                  <span className="text-crop-600">🌊</span>
                </div>
                <div>
                  <p className="font-medium text-slate-700">磷素流失风险</p>
                  <p className="text-xs text-slate-500">基于土壤侵蚀与径流情况</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-crop-100 text-crop-700 text-sm font-medium rounded-full">低</span>
            </div>
            <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600">⬇️</span>
                </div>
                <div>
                  <p className="font-medium text-slate-700">淋溶风险</p>
                  <p className="text-xs text-slate-500">基于土壤质地与地下水位</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm font-medium rounded-full">中等</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4">快捷操作</h3>
          <div className="grid grid-cols-2 gap-3">
            <button className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl text-left hover:from-blue-100 hover:to-blue-200 transition-all">
              <span className="text-2xl block mb-2">📋</span>
              <p className="font-semibold text-blue-700">生成配方</p>
              <p className="text-xs text-blue-500 mt-1">智能施肥建议</p>
            </button>
            <button className="p-4 bg-gradient-to-br from-crop-50 to-crop-100 rounded-xl text-left hover:from-crop-100 hover:to-crop-200 transition-all">
              <span className="text-2xl block mb-2">🔬</span>
              <p className="font-semibold text-crop-700">根系模拟</p>
              <p className="text-xs text-crop-500 mt-1">养分吸收模拟</p>
            </button>
            <button className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl text-left hover:from-amber-100 hover:to-amber-200 transition-all">
              <span className="text-2xl block mb-2">🚚</span>
              <p className="font-semibold text-amber-700">农资采购</p>
              <p className="text-xs text-amber-500 mt-1">供应链协同</p>
            </button>
            <button className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl text-left hover:from-purple-100 hover:to-purple-200 transition-all">
              <span className="text-2xl block mb-2">📊</span>
              <p className="font-semibold text-purple-700">数据导出</p>
              <p className="text-xs text-purple-500 mt-1">报告生成</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
