import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import type { LandingWindow } from '@/types';
import { StatusBadge } from './StatusBadge';

interface LandingWindowTimelineProps {
  windows: LandingWindow[];
  onSelect?: (window: LandingWindow) => void;
  selectedId?: string;
}

export const LandingWindowTimeline: React.FC<LandingWindowTimelineProps> = ({
  windows,
  onSelect,
  selectedId,
}) => {
  const sortedWindows = useMemo(
    () => [...windows].sort((a, b) => a.startTime - b.startTime),
    [windows]
  );

  const timeRange = useMemo(() => {
    if (sortedWindows.length === 0) {
      const now = Date.now();
      return { start: now, end: now + 24 * 3600000 };
    }
    const first = sortedWindows[0].startTime;
    const last = sortedWindows[sortedWindows.length - 1].endTime;
    return { start: first, end: last };
  }, [sortedWindows]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#1B998B';
    if (score >= 60) return '#F46036';
    return '#EF4444';
  };

  if (windows.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-steel-400 font-mono text-sm">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <div>暂无着陆窗口数据</div>
          <div className="text-xs mt-1">请选择平台并运行DWA算法</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <span className="data-label">时间轴</span>
        <span className="text-xs text-steel-400 font-mono">
          {dayjs(timeRange.start).format('MM-DD HH:mm')} - {dayjs(timeRange.end).format('MM-DD HH:mm')}
        </span>
      </div>

      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-px bg-steel-700" />

        <div className="space-y-3 pl-6">
          {sortedWindows.map((window, index) => {
            const isSelected = window.id === selectedId;
            const color = getScoreColor(window.feasibilityScore);

            return (
              <motion.div
                key={window.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => onSelect?.(window)}
                className={`relative p-3 rounded-sm border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-deep-ocean-400 bg-deep-ocean-900/30'
                    : 'border-steel-700 bg-steel-900/50 hover:border-deep-ocean-500/50'
                }`}
              >
                <div
                  className="absolute left-[-29px] top-1/2 w-3 h-3 rounded-full border-2"
                  style={{
                    backgroundColor: color,
                    borderColor: 'var(--color-steel-950)',
                    boxShadow: `0 0 8px ${color}`,
                  }}
                />

                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-display font-bold text-lg"
                      style={{ color }}
                    >
                      {window.feasibilityScore.toFixed(0)}
                    </span>
                    <span className="text-xs text-steel-400">分</span>
                    <StatusBadge type="risk" value={window.riskLevel} />
                  </div>
                  <div className="text-xs text-steel-400 font-mono">
                    {dayjs(window.startTime).format('HH:mm')} - {dayjs(window.endTime).format('HH:mm')}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-steel-500">风速</span>
                    <div className="text-steel-200 font-mono">{window.weatherConditions.avgWindSpeed.toFixed(1)} m/s</div>
                  </div>
                  <div>
                    <span className="text-steel-500">浪高</span>
                    <div className="text-steel-200 font-mono">{window.weatherConditions.maxWaveHeight.toFixed(1)} m</div>
                  </div>
                  <div>
                    <span className="text-steel-500">能见度</span>
                    <div className="text-steel-200 font-mono">{window.weatherConditions.visibility.toFixed(1)} km</div>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-steel-700/50 grid grid-cols-3 gap-1">
                  <div className="text-center">
                    <div className="text-[10px] text-steel-500">安全</div>
                    <div className="text-xs font-mono text-safety-green-400">{window.safetyScore.toFixed(0)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-steel-500">时效</div>
                    <div className="text-xs font-mono text-deep-ocean-400">{window.timeScore.toFixed(0)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-steel-500">油耗</div>
                    <div className="text-xs font-mono text-alert-orange-400">{window.fuelScore.toFixed(0)}</div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
