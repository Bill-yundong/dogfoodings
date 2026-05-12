'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CurrentChartProps {
  data: Array<{ time: string; value: number; harmonic: number }>;
}

export function CurrentChart({ data }: CurrentChartProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-4">泄露电流波形</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#0ea5e9"
            strokeWidth={2}
            dot={false}
            name="基波"
          />
          <Line
            type="monotone"
            dataKey="harmonic"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            name="谐波"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}