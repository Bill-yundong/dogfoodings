import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';
import type { TimeSeriesData } from '@/types';

interface MetricsChartProps {
  angularVelocity: TimeSeriesData;
  linearVelocity: TimeSeriesData;
  cogDisplacement: TimeSeriesData;
}

const TABS = [
  { key: 'angularVelocity' as const, label: '角速度', color: '#6366F1' },
  { key: 'linearVelocity' as const, label: '线速度', color: '#00F0B5' },
  { key: 'cogDisplacement' as const, label: '重心偏移', color: '#FFD60A' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function toChartData(data: TimeSeriesData) {
  return data.timestamps.map((t, i) => ({
    time: t,
    value: data.values[i],
    isAnomaly: data.anomalies.some((a) => a.index === i),
  }));
}

function getAnomalyRanges(data: TimeSeriesData) {
  const anomalyIndices = new Set(data.anomalies.map((a) => a.index));
  if (anomalyIndices.size === 0) return [];

  const sorted = [...anomalyIndices].sort((a, b) => a - b);
  const ranges: { startIndex: number; endIndex: number }[] = [];
  let rangeStart = sorted[0];
  let rangeEnd = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === rangeEnd + 1) {
      rangeEnd = sorted[i];
    } else {
      ranges.push({ startIndex: rangeStart, endIndex: rangeEnd });
      rangeStart = sorted[i];
      rangeEnd = sorted[i];
    }
  }
  ranges.push({ startIndex: rangeStart, endIndex: rangeEnd });

  return ranges.map((r) => ({
    x1: data.timestamps[r.startIndex],
    x2: data.timestamps[r.endIndex],
  }));
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { time: number; isAnomaly: boolean } }> }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-[#2A2F3E] bg-[#1A1F2E] px-3 py-2 shadow-lg">
      <p className="text-xs text-gray-400">
        t = {payload[0].payload.time.toFixed(2)}s
      </p>
      <p className="text-sm font-semibold text-white">
        {payload[0].value.toFixed(3)}
      </p>
      {payload[0].payload.isAnomaly && (
        <p className="text-xs text-[#FF6B2B]">⚠ 异常</p>
      )}
    </div>
  );
}

export default function MetricsChart({
  angularVelocity,
  linearVelocity,
  cogDisplacement,
}: MetricsChartProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('angularVelocity');

  const dataMap: Record<TabKey, TimeSeriesData> = {
    angularVelocity,
    linearVelocity,
    cogDisplacement,
  };

  const currentTab = TABS.find((t) => t.key === activeTab)!;
  const currentData = dataMap[activeTab];
  const chartData = toChartData(currentData);
  const anomalyRanges = getAnomalyRanges(currentData);

  return (
    <div className="rounded-xl bg-[#1A1F2E] p-4">
      <div className="mb-4 flex gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-cyan-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />
            )}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid stroke="#2A2F3E" strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            tick={{ fill: '#6B7280', fontSize: 11 }}
            axisLine={{ stroke: '#2A2F3E' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#6B7280', fontSize: 11 }}
            axisLine={{ stroke: '#2A2F3E' }}
            tickLine={false}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />
          {anomalyRanges.map((range, i) => (
            <ReferenceArea
              key={i}
              x1={range.x1}
              x2={range.x2}
              fill="#FF6B2B"
              fillOpacity={0.15}
              stroke="#FF6B2B"
              strokeOpacity={0.3}
            />
          ))}
          <Line
            type="monotone"
            dataKey="value"
            stroke={currentTab.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: currentTab.color, stroke: '#1A1F2E', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
