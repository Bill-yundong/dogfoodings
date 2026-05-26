'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Legend } from 'recharts';
import { cn } from '@/utils/format';

interface ChartDataPoint {
  time: string;
  [key: string]: number | string;
}

interface LineChartCardProps {
  data: ChartDataPoint[];
  title: string;
  xKey?: string;
  lines: Array<{
    key: string;
    color: string;
    name: string;
    area?: boolean;
  }>;
  height?: number;
  className?: string;
}

export function LineChartCard({ data, title, xKey = 'time', lines, height = 200, className }: LineChartCardProps) {
  return (
    <div className={cn('glass-card p-4', className)}>
      <h3 className="text-sm font-semibold text-white mb-3 font-display">{title}</h3>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              {lines.map((line) => (
                <linearGradient key={line.key} id={`gradient-${line.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={line.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={line.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 212, 255, 0.1)" />
            <XAxis 
              dataKey={xKey} 
              stroke="#64748B" 
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: 'rgba(0, 212, 255, 0.2)' }}
            />
            <YAxis 
              stroke="#64748B" 
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: 'rgba(0, 212, 255, 0.2)' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'rgba(10, 22, 40, 0.95)',
                border: '1px solid rgba(0, 212, 255, 0.3)',
                borderRadius: '8px',
                fontSize: '12px'
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              iconType="circle"
            />
            {lines.map((line) => (
              line.area ? (
                <Area
                  key={line.key}
                  type="monotone"
                  dataKey={line.key}
                  name={line.name}
                  stroke={line.color}
                  fill={`url(#gradient-${line.key})`}
                  strokeWidth={2}
                />
              ) : (
                <Line
                  key={line.key}
                  type="monotone"
                  dataKey={line.key}
                  name={line.name}
                  stroke={line.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              )
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface BarChartCardProps {
  data: ChartDataPoint[];
  title: string;
  xKey?: string;
  bars: Array<{
    key: string;
    color: string;
    name: string;
  }>;
  height?: number;
  className?: string;
}

export function BarChartCard({ data, title, xKey = 'time', bars, height = 200, className }: BarChartCardProps) {
  return (
    <div className={cn('glass-card p-4', className)}>
      <h3 className="text-sm font-semibold text-white mb-3 font-display">{title}</h3>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 212, 255, 0.1)" />
            <XAxis 
              dataKey={xKey} 
              stroke="#64748B" 
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: 'rgba(0, 212, 255, 0.2)' }}
            />
            <YAxis 
              stroke="#64748B" 
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: 'rgba(0, 212, 255, 0.2)' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'rgba(10, 22, 40, 0.95)',
                border: '1px solid rgba(0, 212, 255, 0.3)',
                borderRadius: '8px',
                fontSize: '12px'
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              iconType="rect"
            />
            {bars.map((bar) => (
              <Area
                key={bar.key}
                type="monotone"
                dataKey={bar.key}
                name={bar.name}
                fill={bar.color}
                stroke={bar.color}
                strokeWidth={0}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
