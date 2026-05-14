'use client';

import { useState } from 'react';
import { SoilSample } from '@/types';

interface SoilSamplesProps {
  soilSamples: SoilSample[];
  selectedSample: SoilSample | null;
  setSelectedSample: (sample: SoilSample) => void;
}

export default function SoilSamples({ soilSamples, selectedSample, setSelectedSample }: SoilSamplesProps) {
  const getPhStatus = (pH: number) => {
    if (pH >= 6 && pH <= 7.5) return { label: '健康', color: 'bg-crop-100 text-crop-700 border-crop-200' };
    if (pH >= 5.5 && pH <= 8) return { label: '一般', color: 'bg-amber-100 text-amber-700 border-amber-200' };
    return { label: '需关注', color: 'bg-red-100 text-red-700 border-red-200' };
  };

  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSamples = soilSamples.filter(sample => {
    const matchesSearch = sample.location.plotName.toLowerCase().includes(searchTerm.toLowerCase());
    if (filter === 'all') return matchesSearch;
    if (filter === 'good') return matchesSearch && sample.pH >= 6 && sample.pH <= 7.5;
    if (filter === 'medium') return matchesSearch && ((sample.pH >= 5.5 && sample.pH < 6) || (sample.pH > 7.5 && sample.pH <= 8));
    if (filter === 'poor') return matchesSearch && (sample.pH < 5.5 || sample.pH > 8);
    return matchesSearch;
  });

  const groupedSamples = filteredSamples.reduce((acc, sample) => {
    const plot = sample.location.plotName.split(' ')[1][0];
    if (!acc[plot]) acc[plot] = [];
    acc[plot].push(sample);
    return acc;
  }, {} as Record<string, SoilSample[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="搜索地块..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-crop-500 focus:border-crop-500 outline-none transition-all"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {['all', 'good', 'medium', 'poor'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-crop-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f === 'all' ? '全部' : f === 'good' ? '健康' : f === 'medium' ? '一般' : '需关注'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800">测土配方点分布</h3>
              <span className="text-sm text-slate-500">共 {filteredSamples.length} 个样本</span>
            </div>

            <div className="grid grid-cols-5 gap-3">
              {Object.keys(groupedSamples).map((plot) => (
                <div key={plot} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-center mb-3">
                    <p className="text-lg font-bold text-slate-800">地块 {plot}</p>
                    <p className="text-xs text-slate-500">{groupedSamples[plot].length} 个样本</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {groupedSamples[plot].slice(0, 6).map((sample) => {
                      const status = getPhStatus(sample.pH);
                      const isSelected = selectedSample?.id === sample.id;
                      return (
                        <button
                          key={sample.id}
                          onClick={() => setSelectedSample(sample)}
                          className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all ${
                            isSelected
                              ? 'ring-2 ring-crop-500 ring-offset-2'
                              : 'hover:scale-110'
                          } ${status.color} border`}
                          title={sample.location.plotName}
                        >
                          {sample.pH.toFixed(1)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4">样本列表</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">地块</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">pH</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">有机质</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">氮</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">磷</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">钾</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSamples.slice(0, 10).map((sample) => {
                    const status = getPhStatus(sample.pH);
                    const isSelected = selectedSample?.id === sample.id;
                    return (
                      <tr
                        key={sample.id}
                        onClick={() => setSelectedSample(sample)}
                        className={`border-b border-slate-50 cursor-pointer transition-all ${
                          isSelected ? 'bg-crop-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <span className="font-medium text-slate-700">{sample.location.plotName}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800">{sample.pH.toFixed(1)}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{sample.organicMatter.toFixed(1)} g/kg</td>
                        <td className="py-3 px-4 text-slate-600">{sample.totalNitrogen.toFixed(0)}</td>
                        <td className="py-3 px-4 text-slate-600">{sample.availablePhosphorus.toFixed(0)}</td>
                        <td className="py-3 px-4 text-slate-600">{sample.availablePotassium.toFixed(0)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {selectedSample ? (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-6">样本详情</h3>
              
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-crop-100 to-crop-200 mb-3">
                  <span className="text-3xl font-bold text-crop-700">{selectedSample.pH.toFixed(1)}</span>
                </div>
                <p className="font-semibold text-slate-800">{selectedSample.location.plotName}</p>
                <p className="text-sm text-slate-500">{new Date(selectedSample.timestamp).toLocaleDateString()}</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <p className="text-xs text-blue-500 mb-1">氮素 (N)</p>
                    <p className="text-lg font-bold text-blue-700">{selectedSample.totalNitrogen.toFixed(0)} <span className="text-sm font-normal">mg/kg</span></p>
                  </div>
                  <div className="p-3 bg-crop-50 rounded-xl">
                    <p className="text-xs text-crop-500 mb-1">磷素 (P)</p>
                    <p className="text-lg font-bold text-crop-700">{selectedSample.availablePhosphorus.toFixed(0)} <span className="text-sm font-normal">mg/kg</span></p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl">
                    <p className="text-xs text-amber-500 mb-1">钾素 (K)</p>
                    <p className="text-lg font-bold text-amber-700">{selectedSample.availablePotassium.toFixed(0)} <span className="text-sm font-normal">mg/kg</span></p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-xl">
                    <p className="text-xs text-orange-500 mb-1">有机质</p>
                    <p className="text-lg font-bold text-orange-700">{selectedSample.organicMatter.toFixed(1)} <span className="text-sm font-normal">g/kg</span></p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">土壤湿度</span>
                    <span className="font-medium text-slate-700">{(selectedSample.moisture * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">土壤温度</span>
                    <span className="font-medium text-slate-700">{selectedSample.temperature.toFixed(1)}°C</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">容重</span>
                    <span className="font-medium text-slate-700">{selectedSample.bulkDensity.toFixed(2)} g/cm³</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">阳离子交换量</span>
                    <span className="font-medium text-slate-700">{selectedSample.cationExchangeCapacity.toFixed(1)} cmol/kg</span>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-blue-50 to-crop-50 rounded-xl border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span>📍</span>
                    <span className="text-sm font-medium text-slate-700">采样位置</span>
                  </div>
                  <p className="text-sm text-slate-600">
                    纬度: {selectedSample.location.lat.toFixed(4)}°N<br />
                    经度: {selectedSample.location.lng.toFixed(4)}°E
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <button className="w-full py-3 bg-crop-600 hover:bg-crop-700 text-white font-medium rounded-xl transition-colors shadow-sm">
                  生成施肥配方
                </button>
                <button className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors">
                  查看历史对比
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 text-center">
              <div className="text-5xl mb-4 opacity-50">🌱</div>
              <p className="text-slate-500">选择一个样本查看详情</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
