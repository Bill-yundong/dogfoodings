import React, { useState } from 'react';
import { HistoricalRecord } from '@/lib/types/traffic';

interface HistoricalDataPanelProps {
  records: HistoricalRecord[];
  recordCount: number;
  onFetchPeak: (type: 'morning' | 'evening' | 'both') => Promise<HistoricalRecord[]>;
  onFetchTimeRange: (hours: number) => Promise<HistoricalRecord[]>;
  onClearAll: () => Promise<void>;
}

export function HistoricalDataPanel({
  records,
  recordCount,
  onFetchPeak,
  onFetchTimeRange,
  onClearAll,
}: HistoricalDataPanelProps) {
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('6h');

  const getTimeRangeHours = (range: string): number => {
    switch (range) {
      case '1h': return 1;
      case '6h': return 6;
      case '24h': return 24;
      case '7d': return 168;
      default: return 6;
    }
  };

  const handleTimeRangeChange = async (range: '1h' | '6h' | '24h' | '7d') => {
    setTimeRange(range);
    await onFetchTimeRange(getTimeRangeHours(range));
  };

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPeakLabel = (peakStatus: string): { label: string; color: string } => {
    switch (peakStatus) {
      case 'morning':
        return { label: '早高峰', color: 'bg-blue-500' };
      case 'evening':
        return { label: '晚高峰', color: 'bg-purple-500' };
      default:
        return { label: '平峰', color: 'bg-slate-500' };
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">历史高峰数据</h3>
        <span className="text-sm text-slate-400">
          共 {recordCount} 条记录
        </span>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <span className="text-sm text-slate-400">时间段:</span>
            {(['1h', '6h', '24h', '7d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => handleTimeRangeChange(range)}
                className={`px-2 py-1 rounded text-sm transition-colors ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {range === '7d' ? '7天' : `${range}小时`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <span className="text-sm text-slate-400">高峰:</span>
            <button
              onClick={async () => await onFetchPeak('morning')}
              className="px-2 py-1 rounded text-sm bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
            >
              早高峰
            </button>
            <button
              onClick={async () => await onFetchPeak('evening')}
              className="px-2 py-1 rounded text-sm bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
            >
              晚高峰
            </button>
            <button
              onClick={async () => await onFetchPeak('both')}
              className="px-2 py-1 rounded text-sm bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
            >
              全部
            </button>
          </div>
        </div>

        <div className="max-h-64 overflow-auto scrollbar-thin">
          {records.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              暂无历史数据，等待仿真运行...
            </div>
          ) : (
            <div className="space-y-2">
              {records.slice(-20).reverse().map((record) => {
                const peak = getPeakLabel(record.peakStatus);
                return (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-2 bg-slate-700/50 rounded"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-xs text-white ${peak.color}`}>
                        {peak.label}
                      </span>
                      <span className="text-sm text-slate-300">
                        {formatTimestamp(record.timestamp)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">
                        指数: <span className="text-white">{record.trafficIndex.overall}</span>
                      </span>
                      <span className="text-sm text-slate-400">
                        热点: {record.trafficIndex.hotspots.length}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {records.length > 0 && (
          <div className="pt-3 border-t border-slate-700">
            <button
              onClick={async () => await onClearAll()}
              className="w-full px-3 py-2 rounded bg-red-900/50 text-red-400 hover:bg-red-900/70 transition-colors text-sm"
            >
              清除所有历史数据
            </button>
          </div>
        )}
      </div>
    </div>
  );
}