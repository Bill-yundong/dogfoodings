'use client';

import { WeldPoint } from '@/types/welding';
import { CheckCircle, AlertTriangle, Clock } from 'lucide-react';

interface WeldPointListProps {
  points: WeldPoint[];
  onSelect: (point: WeldPoint) => void;
  selectedId?: string;
}

export function WeldPointList({ points, onSelect, selectedId }: WeldPointListProps) {
  const getQualityIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (score >= 60) return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    return <AlertTriangle className="w-4 h-4 text-red-400" />;
  };

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'border-green-500/30 hover:border-green-500/60';
    if (score >= 60) return 'border-yellow-500/30 hover:border-yellow-500/60';
    return 'border-red-500/30 hover:border-red-500/60';
  };

  const getRiskBadge = (level: string) => {
    const colors: Record<string, string> = {
      none: 'bg-green-500/20 text-green-400',
      low: 'bg-blue-500/20 text-blue-400',
      medium: 'bg-yellow-500/20 text-yellow-400',
      high: 'bg-orange-500/20 text-orange-400',
      critical: 'bg-red-500/20 text-red-400',
    };
    const labels: Record<string, string> = {
      none: '正常',
      low: '低',
      medium: '中',
      high: '高',
      critical: '危急',
    };
    return (
      <span className={`px-2 py-0.5 text-xs rounded-full ${colors[level] || colors.none}`}>
        {labels[level] || '正常'}
      </span>
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">焊点历史记录</h3>
          <span className="text-sm text-gray-400">共 {points.length} 条记录</span>
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {points.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>暂无焊点数据</p>
            <p className="text-sm mt-1">开始模拟以生成数据</p>
          </div>
        ) : (
          points.map((point) => (
            <div
              key={point.id}
              onClick={() => onSelect(point)}
              className={`p-4 border-b border-gray-700/50 cursor-pointer transition-all ${
                selectedId === point.id 
                  ? 'bg-blue-500/10 border-blue-500/50' 
                  : `hover:bg-gray-700/50 ${getQualityColor(point.qualityScore)}`
              } border`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getQualityIcon(point.qualityScore)}
                  <span className="text-sm font-medium text-white">
                    #{point.sequence.toString().slice(-6)}
                  </span>
                </div>
                {getRiskBadge(point.defectRisk.level)}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">质量评分: </span>
                  <span className="text-white font-medium">{point.qualityScore.toFixed(1)}</span>
                </div>
                <div>
                  <span className="text-gray-500">稳定性: </span>
                  <span className="text-white font-medium">{point.features.stabilityIndex.toFixed(1)}</span>
                </div>
                <div>
                  <span className="text-gray-500">热输入: </span>
                  <span className="text-white font-medium">{point.features.heatInput.toFixed(2)} kJ</span>
                </div>
                <div>
                  <span className="text-gray-500">飞溅数: </span>
                  <span className="text-white font-medium">{point.features.spatterCount}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {new Date(point.startTime).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
