'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { ExtractionDataPoint, BrewingPreset } from '@/types';

interface ExtractionCurveChartProps {
  data: ExtractionDataPoint[];
  referenceData?: ExtractionDataPoint[];
  preset?: BrewingPreset;
  showAllMetrics?: boolean;
  metrics?: MetricKey[];
  height?: number;
  className?: string;
  onPointClick?: (point: ExtractionDataPoint) => void;
}

const METRIC_CONFIG = {
  temperature: { color: '#ef4444', name: '温度', unit: '°C', yAxisId: 'left' },
  pressure: { color: '#8b5cf6', name: '压力', unit: 'bar', yAxisId: 'right' },
  flowRate: { color: '#10b981', name: '流速', unit: 'g/s', yAxisId: 'right' },
  weight: { color: '#3b82f6', name: '重量', unit: 'g', yAxisId: 'left' },
  tds: { color: '#f59e0b', name: 'TDS', unit: '%', yAxisId: 'right' },
} as const;

type MetricKey = keyof typeof METRIC_CONFIG;

export function ExtractionCurveChart({
  data,
  referenceData,
  preset,
  showAllMetrics = false,
  metrics,
  height = 400,
  className,
  onPointClick,
}: ExtractionCurveChartProps) {
  const [activeMetrics, setActiveMetrics] = useState<MetricKey[]>(
    metrics || (showAllMetrics ? ['temperature', 'pressure', 'flowRate', 'weight'] : ['temperature', 'pressure', 'weight'])
  );
  const [hoveredPoint, setHoveredPoint] = useState<ExtractionDataPoint | null>(null);

  useEffect(() => {
    if (metrics) {
      setActiveMetrics(metrics);
    }
  }, [metrics]);

  const chartData = useMemo(() => {
    return data.map(point => ({
      ...point,
      timeLabel: `${point.time.toFixed(1)}s`,
    }));
  }, [data]);

  const referenceChartData = useMemo(() => {
    if (!referenceData) return null;
    return referenceData.map(point => ({
      ...point,
      timeLabel: `${point.time.toFixed(1)}s`,
    }));
  }, [referenceData]);

  const yAxisDomains = useMemo(() => {
    if (data.length === 0) {
      return { left: [80, 100], right: [0, 12] };
    }

    const tempValues = data.map(p => p.temperature);
    const weightValues = data.map(p => p.weight);
    const pressureValues = data.map(p => p.pressure);
    const flowValues = data.map(p => p.flowRate);

    return {
      left: [
        Math.floor(Math.min(...tempValues) - 2),
        Math.ceil(Math.max(...tempValues, ...weightValues) + 2),
      ],
      right: [
        0,
        Math.ceil(Math.max(...pressureValues, ...flowValues) + 1),
      ],
    };
  }, [data]);

  const toggleMetric = (metric: MetricKey) => {
    setActiveMetrics(prev =>
      prev.includes(metric)
        ? prev.filter(m => m !== metric)
        : [...prev, metric]
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const point = payload[0]?.payload;
    if (!point) return null;

    return (
      <div className="bg-white/95 backdrop-blur-sm border border-coffee-200 rounded-lg p-3 shadow-xl">
        <p className="font-semibold text-coffee-900 mb-2">
          时间: {point.time.toFixed(1)}s
        </p>
        {payload.map((entry: any, index: number) => (
          <p
            key={index}
            className="text-sm flex items-center gap-2"
            style={{ color: entry.color }}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.name}: {entry.value.toFixed(2)}
            {METRIC_CONFIG[entry.dataKey as MetricKey]?.unit}
          </p>
        ))}
      </div>
    );
  };

  if (data.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-coffee-50 rounded-xl',
          className
        )}
        style={{ height }}
      >
        <p className="text-coffee-500">暂无萃取曲线数据</p>
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="flex flex-wrap gap-2 mb-4">
        {(Object.keys(METRIC_CONFIG) as MetricKey[]).map(metric => (
          <button
            key={metric}
            onClick={() => toggleMetric(metric)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
              activeMetrics.includes(metric)
                ? 'text-white shadow-md'
                : 'bg-coffee-100 text-coffee-600 hover:bg-coffee-200'
            )}
            style={{
              backgroundColor: activeMetrics.includes(metric)
                ? METRIC_CONFIG[metric].color
                : undefined,
            }}
          >
            {METRIC_CONFIG[metric].name}
          </button>
        ))}
      </div>

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            onClick={e => {
              if (e && e.activePayload && onPointClick) {
                onPointClick(e.activePayload[0].payload);
              }
            }}
            onMouseMove={e => {
              if (e && e.activePayload) {
                setHoveredPoint(e.activePayload[0].payload);
              }
            }}
            onMouseLeave={() => setHoveredPoint(null)}
          >
            <defs>
              {activeMetrics.map(metric => (
                <linearGradient
                  key={metric}
                  id={`color${metric}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={METRIC_CONFIG[metric].color}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={METRIC_CONFIG[metric].color}
                    stopOpacity={0}
                  />
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#e0cec7" />

            <XAxis
              dataKey="time"
              stroke="#8a6559"
              tick={{ fill: '#5c4037', fontSize: 12 }}
              label={{
                value: '时间 (秒)',
                position: 'insideBottom',
                offset: -10,
                fill: '#5c4037',
                fontSize: 12,
              }}
            />

            <YAxis
              yAxisId="left"
              stroke="#ef4444"
              tick={{ fill: '#5c4037', fontSize: 12 }}
              domain={yAxisDomains.left}
              label={{
                value: '温度 / 重量',
                angle: -90,
                position: 'insideLeft',
                fill: '#5c4037',
                fontSize: 12,
              }}
            />

            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#8b5cf6"
              tick={{ fill: '#5c4037', fontSize: 12 }}
              domain={yAxisDomains.right}
              label={{
                value: '压力 / 流速',
                angle: 90,
                position: 'insideRight',
                fill: '#5c4037',
                fontSize: 12,
              }}
            />

            {preset && (
              <>
                <ReferenceLine
                  y={preset.waterTemperature}
                  yAxisId="left"
                  stroke="#ef4444"
                  strokeDasharray="5 5"
                  label={{
                    value: `目标 ${preset.waterTemperature}°C`,
                    fill: '#ef4444',
                    fontSize: 10,
                  }}
                />
                <ReferenceLine
                  x={preset.brewTime}
                  stroke="#10b981"
                  strokeDasharray="5 5"
                  label={{
                    value: `目标 ${preset.brewTime}s`,
                    fill: '#10b981',
                    fontSize: 10,
                  }}
                />
              </>
            )}

            {activeMetrics.includes('temperature') && (
              <>
                <Area
                  type="monotone"
                  dataKey="temperature"
                  yAxisId="left"
                  stroke={METRIC_CONFIG.temperature.color}
                  strokeWidth={2.5}
                  fill={`url(#colortemperature)`}
                  name="温度"
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                />
                {referenceChartData && (
                  <Line
                    type="monotone"
                    data={referenceChartData}
                    dataKey="temperature"
                    yAxisId="left"
                    stroke={METRIC_CONFIG.temperature.color}
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    opacity={0.5}
                    dot={false}
                  />
                )}
              </>
            )}

            {activeMetrics.includes('pressure') && (
              <>
                <Line
                  type="monotone"
                  dataKey="pressure"
                  yAxisId="right"
                  stroke={METRIC_CONFIG.pressure.color}
                  strokeWidth={2.5}
                  name="压力"
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                />
                {referenceChartData && (
                  <Line
                    type="monotone"
                    data={referenceChartData}
                    dataKey="pressure"
                    yAxisId="right"
                    stroke={METRIC_CONFIG.pressure.color}
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    opacity={0.5}
                    dot={false}
                  />
                )}
              </>
            )}

            {activeMetrics.includes('flowRate') && (
              <>
                <Line
                  type="monotone"
                  dataKey="flowRate"
                  yAxisId="right"
                  stroke={METRIC_CONFIG.flowRate.color}
                  strokeWidth={2.5}
                  name="流速"
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                />
                {referenceChartData && (
                  <Line
                    type="monotone"
                    data={referenceChartData}
                    dataKey="flowRate"
                    yAxisId="right"
                    stroke={METRIC_CONFIG.flowRate.color}
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    opacity={0.5}
                    dot={false}
                  />
                )}
              </>
            )}

            {activeMetrics.includes('weight') && (
              <>
                <Area
                  type="monotone"
                  dataKey="weight"
                  yAxisId="left"
                  stroke={METRIC_CONFIG.weight.color}
                  strokeWidth={2.5}
                  fill={`url(#colorweight)`}
                  name="重量"
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                />
                {referenceChartData && (
                  <Line
                    type="monotone"
                    data={referenceChartData}
                    dataKey="weight"
                    yAxisId="left"
                    stroke={METRIC_CONFIG.weight.color}
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    opacity={0.5}
                    dot={false}
                  />
                )}
              </>
            )}

            {activeMetrics.includes('tds') && (
              <Line
                type="monotone"
                dataKey="tds"
                yAxisId="right"
                stroke={METRIC_CONFIG.tds.color}
                strokeWidth={2.5}
                name="TDS"
                dot={false}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
            )}

            <Tooltip content={<CustomTooltip />} />

            <Legend
              wrapperStyle={{
                paddingTop: '20px',
              }}
            />

            <Brush
              dataKey="time"
              height={30}
              stroke="#8b6914"
              fill="#fdf8f6"
              travellerWidth={12}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {hoveredPoint && (
        <div className="mt-4 p-4 bg-gradient-to-r from-coffee-50 to-amber-50 rounded-xl border border-coffee-200">
          <h4 className="font-semibold text-coffee-900 mb-2">实时数据点详情</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
            <div>
              <span className="text-coffee-500">时间</span>
              <p className="font-medium text-coffee-900">{hoveredPoint.time.toFixed(1)}s</p>
            </div>
            <div>
              <span className="text-coffee-500">温度</span>
              <p className="font-medium text-red-600">{hoveredPoint.temperature.toFixed(1)}°C</p>
            </div>
            <div>
              <span className="text-coffee-500">压力</span>
              <p className="font-medium text-purple-600">{hoveredPoint.pressure.toFixed(2)} bar</p>
            </div>
            <div>
              <span className="text-coffee-500">流速</span>
              <p className="font-medium text-green-600">{hoveredPoint.flowRate.toFixed(2)} g/s</p>
            </div>
            <div>
              <span className="text-coffee-500">重量</span>
              <p className="font-medium text-blue-600">{hoveredPoint.weight.toFixed(1)}g</p>
            </div>
            <div>
              <span className="text-coffee-500">TDS</span>
              <p className="font-medium text-amber-600">{hoveredPoint.tds.toFixed(3)}%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
