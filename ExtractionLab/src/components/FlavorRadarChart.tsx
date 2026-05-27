'use client';

import { useMemo } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { FLAVOR_DIMENSIONS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { FlavorProfile } from '@/types';

interface FlavorRadarChartProps {
  profiles?: {
    name: string;
    profile: FlavorProfile;
    color?: string;
  }[];
  data?: FlavorProfile;
  target?: FlavorProfile;
  tolerance?: FlavorProfile;
  targetProfile?: FlavorProfile;
  height?: number;
  className?: string;
  showDetails?: boolean;
}

export function FlavorRadarChart({
  profiles,
  data,
  target,
  tolerance,
  targetProfile,
  height = 400,
  className,
  showDetails = true,
}: FlavorRadarChartProps) {
  const chartData = useMemo(() => {
    const actualProfiles = profiles || (data ? [{ name: '实际', profile: data, color: '#8b6914' }] : []);
    const actualTarget = target || targetProfile;

    return FLAVOR_DIMENSIONS.map(dim => {
      const dataPoint: Record<string, any> = {
        dimension: dim.label,
        key: dim.key,
        color: dim.color,
        fullMark: 100,
      };

      actualProfiles.forEach(p => {
        dataPoint[p.name] = p.profile[dim.key as keyof FlavorProfile];
      });

      if (actualTarget) {
        dataPoint['目标'] = actualTarget[dim.key as keyof FlavorProfile];
      }

      if (tolerance) {
        const baseValue = actualTarget ? actualTarget[dim.key as keyof FlavorProfile] : (actualProfiles[0]?.profile[dim.key as keyof FlavorProfile] || 0);
        const tolValue = tolerance[dim.key as keyof FlavorProfile];
        dataPoint['上限'] = Math.min(100, baseValue + tolValue);
        dataPoint['下限'] = Math.max(0, baseValue - tolValue);
      }

      return dataPoint;
    });
  }, [profiles, data, target, tolerance, targetProfile]);

  const defaultColors = useMemo(() => {
    const colors = ['#8b6914', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b'];
    const actualProfiles = profiles || (data ? [{ name: '实际', profile: data, color: '#8b6914' }] : []);
    return actualProfiles.map((p, i) => p.color || colors[i % colors.length]);
  }, [profiles, data]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const dim = payload[0]?.payload;
    if (!dim) return null;

    return (
      <div className="bg-white/95 backdrop-blur-sm border border-coffee-200 rounded-lg p-3 shadow-xl">
        <p className="font-semibold text-coffee-900 mb-2">{dim.dimension}</p>
        {payload.map((entry: any, index: number) => {
          if (entry.dataKey === '上限' || entry.dataKey === '下限') return null;
          return (
            <p
              key={index}
              className="text-sm flex items-center justify-between gap-4"
            >
              <span className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.dataKey}:
              </span>
              <span className="font-medium text-coffee-900">
                {entry.value.toFixed(1)} / 10
              </span>
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className={cn('w-full', className)}>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart
            data={chartData}
            margin={{ top: 20, right: 30, bottom: 20, left: 30 }}
          >
            <PolarGrid stroke="#e0cec7" />

            <PolarAngleAxis
              dataKey="dimension"
              tick={{
                fill: '#5c4037',
                fontSize: 12,
                fontWeight: 500,
              }}
            />

            <PolarRadiusAxis
              angle={30}
              domain={[0, 10]}
              tick={{ fill: '#8a6559', fontSize: 10 }}
              tickCount={6}
            />

            {tolerance && (
              <>
                <Radar
                  name="上限"
                  dataKey="上限"
                  stroke="#d1d5db"
                  fill="#d1d5db"
                  fillOpacity={0.1}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                <Radar
                  name="下限"
                  dataKey="下限"
                  stroke="#d1d5db"
                  fill="#d1d5db"
                  fillOpacity={0.1}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
              </>
            )}

            {(target || targetProfile) && (
              <Radar
                name="目标"
                dataKey="目标"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.1}
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            )}

            {(profiles || (data ? [{ name: '实际', profile: data, color: '#8b6914' }] : [])).map((profile, index) => (
              <Radar
                key={profile.name}
                name={profile.name}
                dataKey={profile.name}
                stroke={defaultColors[index]}
                fill={defaultColors[index]}
                fillOpacity={index === 0 ? 0.3 : 0.15}
                strokeWidth={2.5}
                dot={{ r: 4, strokeWidth: 2, fill: 'white' }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
            ))}

            <Tooltip content={<CustomTooltip />} />

            <Legend
              wrapperStyle={{
                paddingTop: '20px',
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {showDetails && (profiles || (data ? [{ name: '实际', profile: data }] : [])).length > 0 && (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {FLAVOR_DIMENSIONS.slice(0, 4).map(dim => {
            const actualProfiles = profiles || (data ? [{ name: '实际', profile: data }] : []);
            const value = actualProfiles[0].profile[dim.key as keyof FlavorProfile];
            const targetProfileValue = target || targetProfile;
            const targetValue = targetProfileValue?.[dim.key as keyof FlavorProfile];
            const diff = targetValue ? value - targetValue : 0;

            return (
              <div
                key={dim.key}
                className="p-3 bg-gradient-to-br from-coffee-50 to-white rounded-xl border border-coffee-100"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-coffee-600">{dim.label}</span>
                  {targetValue && (
                    <span
                      className={cn(
                        'text-xs font-medium',
                        Math.abs(diff) < 0.5
                          ? 'text-green-600'
                          : diff > 0
                          ? 'text-red-600'
                          : 'text-blue-600'
                      )}
                    >
                      {diff > 0 ? '+' : ''}
                      {diff.toFixed(1)}
                    </span>
                  )}
                </div>
                <div className="flex items-end gap-2">
                  <span
                    className="text-2xl font-bold"
                    style={{ color: dim.color }}
                  >
                    {value.toFixed(1)}
                  </span>
                  <span className="text-sm text-coffee-400 mb-0.5">/ 10</span>
                </div>
                <div className="mt-2 h-1.5 bg-coffee-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${value * 10}%`,
                      backgroundColor: dim.color,
                    }}
                  />
                </div>
                {targetValue && (
                  <div className="mt-1 text-xs text-coffee-500">
                    目标: {targetValue.toFixed(1)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showDetails && (profiles || (data ? [{ name: '实际', profile: data }] : [])).length > 0 && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {FLAVOR_DIMENSIONS.slice(4).map(dim => {
            const actualProfiles = profiles || (data ? [{ name: '实际', profile: data }] : []);
            const value = actualProfiles[0].profile[dim.key as keyof FlavorProfile];
            const targetProfileVal = target || targetProfile;
            const targetVal = targetProfileVal?.[dim.key as keyof FlavorProfile];
            const diff = targetVal ? value - targetVal : 0;

            return (
              <div
                key={dim.key}
                className="p-3 bg-gradient-to-br from-coffee-50 to-white rounded-xl border border-coffee-100"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-coffee-600">{dim.label}</span>
                  {targetVal && (
                    <span
                      className={cn(
                        'text-xs font-medium',
                        Math.abs(diff) < 0.5
                          ? 'text-green-600'
                          : diff > 0
                          ? 'text-red-600'
                          : 'text-blue-600'
                      )}
                    >
                      {diff > 0 ? '+' : ''}
                      {diff.toFixed(1)}
                    </span>
                  )}
                </div>
                <div className="flex items-end gap-2">
                  <span
                    className="text-2xl font-bold"
                    style={{ color: dim.color }}
                  >
                    {value.toFixed(1)}
                  </span>
                  <span className="text-sm text-coffee-400 mb-0.5">/ 10</span>
                </div>
                <div className="mt-2 h-1.5 bg-coffee-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${value * 10}%`,
                      backgroundColor: dim.color,
                    }}
                  />
                </div>
                {targetVal && (
                  <div className="mt-1 text-xs text-coffee-500">
                    目标: {targetVal.toFixed(1)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function FlavorComparisonCard({
  actual,
  target,
  tolerance,
}: {
  actual: FlavorProfile;
  target: FlavorProfile;
  tolerance: FlavorProfile;
}) {
  const dimensions = useMemo(() => {
    return FLAVOR_DIMENSIONS.map(dim => {
      const key = dim.key as keyof FlavorProfile;
      const actualValue = actual[key];
      const targetValue = target[key];
      const toleranceValue = tolerance[key];
      const diff = actualValue - targetValue;
      const withinTolerance = Math.abs(diff) <= toleranceValue;
      const percentage = (actualValue / 10) * 100;
      const targetPercentage = (targetValue / 10) * 100;

      return {
        ...dim,
        key,
        actual: actualValue,
        target: targetValue,
        tolerance: toleranceValue,
        diff,
        withinTolerance,
        percentage,
        targetPercentage,
      };
    });
  }, [actual, target, tolerance]);

  const score = useMemo(() => {
    let total = 0;
    dimensions.forEach(d => {
      const maxDiff = d.tolerance * 2;
      const normalizedDiff = Math.min(Math.abs(d.diff), maxDiff) / maxDiff;
      total += 100 - normalizedDiff * 100;
    });
    return total / dimensions.length;
  }, [dimensions]);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-coffee-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-coffee-900">风味匹配度分析</h3>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg',
              score >= 90
                ? 'bg-green-100 text-green-700'
                : score >= 75
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
            )}
          >
            {score.toFixed(0)}
          </div>
          <div>
            <p className="text-xs text-coffee-500">综合评分</p>
            <p className="text-xs text-coffee-400">
              {dimensions.filter(d => d.withinTolerance).length}/{dimensions.length} 达标
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {dimensions.map(dim => (
          <div key={dim.key}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-coffee-700">
                {dim.label}
              </span>
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={cn(
                    'font-medium',
                    dim.withinTolerance ? 'text-coffee-900' : 'text-red-600'
                  )}
                >
                  {dim.actual.toFixed(1)}
                </span>
                <span className="text-coffee-400">→</span>
                <span className="text-coffee-600">{dim.target.toFixed(1)}</span>
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded text-xs font-medium',
                    dim.withinTolerance
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  )}
                >
                  {dim.diff > 0 ? '+' : ''}
                  {dim.diff.toFixed(1)}
                </span>
              </div>
            </div>
            <div className="relative h-3 bg-coffee-100 rounded-full overflow-hidden">
              <div
                className="absolute h-full bg-gradient-to-r from-coffee-200 to-coffee-300 rounded-full opacity-50"
                style={{
                  left: `${Math.max(0, dim.targetPercentage - dim.tolerance * 10)}%`,
                  width: `${dim.tolerance * 20}%`,
                }}
              />
              <div
                className="absolute h-full w-1 bg-white rounded-full border-2 border-green-600"
                style={{ left: `calc(${dim.targetPercentage}% - 2px)` }}
              />
              <div
                className="absolute h-full w-2 rounded-full transition-all duration-300"
                style={{
                  left: `calc(${dim.percentage}% - 4px)`,
                  backgroundColor: dim.withinTolerance ? dim.color : '#ef4444',
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-coffee-400 mt-1">
              <span>0</span>
              <span>
                容差 ±{dim.tolerance.toFixed(1)}
              </span>
              <span>10</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
