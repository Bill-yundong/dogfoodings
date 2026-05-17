'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { WaveformPoint } from '@/types/welding';

interface WaveformChartProps {
  data: WaveformPoint[];
  title?: string;
}

export function WaveformChart({ data, title }: WaveformChartProps) {
  const chartData = data.reduce((acc: any[], point) => {
    const existing = acc.find(d => d.timestamp === point.timestamp);
    if (existing) {
      existing[point.type] = point.value;
    } else {
      acc.push({
        timestamp: point.timestamp,
        [point.type]: point.value,
      });
    }
    return acc;
  }, []);

  return (
    <div className="w-full h-64 bg-gray-900 rounded-lg p-4">
      {title && <h3 className="text-white text-sm font-medium mb-2">{title}</h3>}
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="timestamp" 
            stroke="#9CA3AF" 
            tick={{ fontSize: 10 }}
            tickFormatter={(value) => new Date(value).toLocaleTimeString()}
          />
          <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '4px' }}
            labelStyle={{ color: '#9CA3AF' }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="current" 
            stroke="#3B82F6" 
            dot={false} 
            strokeWidth={1.5}
            name="电流 (A)"
          />
          <Line 
            type="monotone" 
            dataKey="voltage" 
            stroke="#10B981" 
            dot={false} 
            strokeWidth={1.5}
            name="电压 (V)"
          />
          <Line 
            type="monotone" 
            dataKey="temperature" 
            stroke="#F59E0B" 
            dot={false} 
            strokeWidth={1.5}
            name="温度 (°C)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
