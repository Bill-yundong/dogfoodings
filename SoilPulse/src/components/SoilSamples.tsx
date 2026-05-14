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
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-6 flex-wrap">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="搜索地块..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-5 py-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-crop-500 focus:border-crop-500 outline-none transition-all text-base"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {['all', 'good', 'medium', 'poor'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-3 rounded-2xl text-sm font-medium transition-all ${
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-slate-800">测土配方点分布</h3>
              <span className="text-sm text-slate-500">共 {filteredSamples.length} 个样本</span>
            </div>

            <div className="grid grid-cols-5 gap-5">
              {Object.keys(groupedSamples).map((plot) => (
                <div key={plot} className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-center mb-5">
                    <p className="text-xl font-bold text-slate-800">地块 {plot}</p>
                    <p className="text-sm text-slate-500 mt-1">{groupedSamples[plot].length} 个样本</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {groupedSamples[plot].slice(0, 6).map((sample) => {
                      const status = getPhStatus(sample.pH);
                      const isSelected = selectedSample?.id === sample.id;
                      return (
                        <button
                          key={sample.id}
                          onClick={() => setSelectedSample(sample)}
                          className={`aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-all ${
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

          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
            <h3 className="text-xl font-bold text-slate-800 mb-6">样本列表</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-4 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider">地块</th>
                    <th className="text-left py-4 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider">pH</th>
                    <th className="text-left py-4 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider">有机质</th>
                    <th className="text-left py-4 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider">氮</th>
                    <th className="text-left py-4 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider">磷</th>
                    <th className="text-left py-4 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider">钾</th>
                    <th className="text-left py-4 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wider">状态</th>
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
                        <td className="py-4 px-5">
                          <span className="font-medium text-slate-700">{sample.location.plotName}</span>
                        </td>
                        <td className="py-4 px-5">
                          <span className="font-bold text-slate-800">{sample.pH.toFixed(1)}</span>
                        </td>
                        <td className="py-4 px-5 text-slate-600">{sample.organicMatter.toFixed(1)} g/kg</td>
                        <td className="py-4 px-5 text-slate-600">{sample.totalNitrogen.toFixed(0)}</td>
                        <td className="py-4 px-5 text-slate-600">{sample.availablePhosphorus.toFixed(0)}</td>
                        <td className="py-4 px-5 text-slate-600">{sample.availablePotassium.toFixed(0)}</td>
                        <td className="py-4 px-5">
                          <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${status.color}`}>
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

        <div className="space-y-6">
          {selectedSample ? (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
              <h3 className="text-xl font-bold text-slate-800 mb-8">样本详情</h3>
              
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-crop-100 to-crop-200 mb-4">
                  <span className="text-4xl font-bold text-crop-700">{selectedSample.pH.toFixed(1)}</span>
                </div>
                <p className="font-bold text-slate-800 text-lg">{selectedSample.location.plotName}</p>
                <p className="text-sm text-slate-500 mt-1">{new Date(selectedSample.timestamp).toLocaleDateString()}</p>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-blue-50 rounded-2xl">
                    <p className="text-xs text-blue-500 mb-2 font-medium">氮素 (N)</p>
                    <p className="text-xl font-bold text-blue-700">{selectedSample.totalNitrogen.toFixed(0)} <span className="text-sm font-normal">mg/kg</span></p>
                  </div>
                  <div className="p-5 bg-crop-50 rounded-2xl">
                    <p className="text-xs text-crop-500 mb-2 font-medium">磷素 (P)</p>
                    <p className="text-xl font-bold text-crop-700">{selectedSample.availablePhosphorus.toFixed(0)} <span className="text-sm font-normal">mg/kg</span></p>
                  </div>
                  <div className="p-5 bg-amber-50 rounded-2xl">
                    <p className="text-xs text-amber-500 mb-2 font-medium">钾素 (K)</p>
                    <p className="text-xl font-bold text-amber-700">{selectedSample.availablePotassium.toFixed(0)} <span className="text-sm font-normal">mg/kg</span></p>
                  </div>
                  <div className="p-5 bg-orange-50 rounded-2xl">
                    <p className="text-xs text-orange-500 mb-2 font-medium">有机质</p>
                    <p className="text-xl font-bold text-orange-700">{selectedSample.organicMatter.toFixed(1)} <span className="text-sm font-normal">g/kg</span></p>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-2xl space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">土壤湿度</span>
                    <span className="font-bold text-slate-700">{(selectedSample.moisture * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">土壤温度</span>
                    <span className="font-bold text-slate-700">{selectedSample.temperature.toFixed(1)}°C</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">容重</span>
                    <span className="font-bold text-slate-700">{selectedSample.bulkDensity.toFixed(2)} g/cm³</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">阳离子交换量</span>
                    <span className="font-bold text-slate-700">{selectedSample.cationExchangeCapacity.toFixed(1)} cmol/kg</span>
                  </div>
                </div>

                <div className="p-6 bg-gradient-to-r from-blue-50 to-crop-50 rounded-2xl border border-blue-100">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-lg">📍</span>
                    <span className="text-sm font-bold text-slate-700">采样位置</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    纬度: {selectedSample.location.lat.toFixed(4)}°N<br />
                    经度: {selectedSample.location.lng.toFixed(4)}°E
                  </p>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <button className="w-full py-4 bg-crop-600 hover:bg-crop-700 text-white font-bold rounded-2xl transition-colors shadow-sm">
                  生成施肥配方
                </button>
                <button className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-colors">
                  查看历史对比
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-16 shadow-sm border border-slate-100 text-center">
              <div className="text-6xl mb-6 opacity-50">🌱</div>
              <p className="text-slate-500 text-lg">选择一个样本查看详情</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
