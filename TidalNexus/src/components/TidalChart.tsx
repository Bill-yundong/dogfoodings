import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { TidalData } from '../types/tidal';

interface TidalChartProps {
  data: TidalData[];
  title?: string;
}

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export const TidalChart: React.FC<TidalChartProps> = ({ data, title }) => {
  const chartData = data.map((d) => ({
    ...d,
    time: formatTime(d.timestamp),
    powerDensity: 0.5 * 1025 * Math.pow(d.velocity.magnitude, 3),
  }));

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      {title && (
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      )}
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-2">水位变化</h4>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} unit="m" />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="waterLevel"
                stroke="#3B82F6"
                fill="#93C5FD"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-2">流速变化</h4>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} unit="m/s" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey={(d) => d.velocity.magnitude}
                name="流速"
                stroke="#10B981"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-2">功率密度</h4>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} unit="W/m²" />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="powerDensity"
                stroke="#F59E0B"
                fill="#FCD34D"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};