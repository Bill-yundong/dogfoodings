import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface ChartData {
  time: number;
  coolingRate: number;
  temperature: number;
}

interface CoolingRateChartProps {
  data: ChartData[];
  targetRate?: number;
}

export const CoolingRateChart: React.FC<CoolingRateChartProps> = ({ data, targetRate }) => {
  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis 
            dataKey="time" 
            label={{ value: '时间 (s)', position: 'bottom', offset: -5 }}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            yAxisId="left"
            label={{ value: '冷却速率 (°C/s)', angle: -90, position: 'insideLeft' }}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right"
            label={{ value: '温度 (°C)', angle: 90, position: 'insideRight' }}
            tick={{ fontSize: 12 }}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: 4 }}
            formatter={(value: number, name: string) => [
              value.toFixed(2),
              name === 'coolingRate' ? '冷却速率' : '温度'
            ]}
          />
          {targetRate && (
            <ReferenceLine
              yAxisId="left"
              y={targetRate}
              stroke="#ff7300"
              strokeDasharray="5 5"
              label={{ value: `目标: ${targetRate}°C/s`, position: 'right' }}
            />
          )}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="coolingRate"
            stroke="#2196f3"
            strokeWidth={2}
            dot={{ r: 3 }}
            name="coolingRate"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="temperature"
            stroke="#f44336"
            strokeWidth={2}
            dot={{ r: 3 }}
            name="temperature"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
