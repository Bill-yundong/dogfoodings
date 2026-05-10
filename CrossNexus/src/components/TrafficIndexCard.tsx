import React from 'react';
import { TrafficIndex } from '@/lib/types/traffic';

interface TrafficIndexCardProps {
  title: string;
  trafficIndex: TrafficIndex | null;
  syncStatus?: 'synced' | 'out-of-sync' | 'unknown';
}

export function TrafficIndexCard({ title, trafficIndex, syncStatus = 'unknown' }: TrafficIndexCardProps) {
  const getOverallColor = (value: number): string => {
    if (value < 25) return 'text-traffic-green';
    if (value < 50) return 'text-traffic-yellow';
    if (value < 75) return 'text-orange-500';
    return 'text-traffic-red';
  };

  const getSyncIcon = () => {
    switch (syncStatus) {
      case 'synced':
        return (
          <span className="flex items-center gap-1 text-traffic-green text-sm">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            已同步
          </span>
        );
      case 'out-of-sync':
        return (
          <span className="flex items-center gap-1 text-traffic-yellow text-sm">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            同步中
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-slate-500 text-sm">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            等待数据
          </span>
        );
    }
  };

  if (!trafficIndex) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {getSyncIcon()}
        </div>
        <div className="flex items-center justify-center h-24">
          <div className="animate-pulse text-slate-500">等待流量数据...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {getSyncIcon()}
      </div>
      
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-sm text-slate-400 mb-1">整体拥堵指数</div>
          <div className={`text-5xl font-bold ${getOverallColor(trafficIndex.overall)}`}>
            {trafficIndex.overall}
          </div>
          <div className="text-sm text-slate-500 mt-1">/ 100</div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
          <div>
            <div className="text-sm text-slate-400">拥堵热点</div>
            <div className="text-xl font-semibold text-white">
              {trafficIndex.hotspots.length}
            </div>
          </div>
          <div>
            <div className="text-sm text-slate-400">更新时间</div>
            <div className="text-sm font-medium text-slate-300">
              {new Date(trafficIndex.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}