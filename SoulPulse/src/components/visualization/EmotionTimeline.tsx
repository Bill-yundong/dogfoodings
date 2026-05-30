import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { EmotionTrajectoryPoint } from "@/types";
import { formatDate } from "@/lib/utils";
import { EMOTION_COLORS } from "@/lib/constants";
import { TrendingUp } from "lucide-react";

interface EmotionTimelineProps {
  data: EmotionTrajectoryPoint[];
  className?: string;
}

export const EmotionTimeline: React.FC<EmotionTimelineProps> = ({
  data,
  className,
}) => {
  const chartData = data.map((point) => ({
    ...point,
    date: formatDate(point.timestamp, "MM/dd"),
    sentiment: point.sentimentScore,
    alignment: point.alignmentConfidence * 100,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100">
          <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: EMOTION_COLORS[data.dominantEmotion as keyof typeof EMOTION_COLORS] }}
              />
              <span className="text-sm text-gray-600">
                {data.dominantEmotion}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sm text-gray-500">情绪得分</span>
              <span className="text-sm font-medium">
                {(data.sentiment * 100).toFixed(0)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sm text-gray-500">对齐度</span>
              <span className="text-sm font-medium">
                {data.alignment.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`card p-5 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary-500" />
        情绪轨迹
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              stroke="#9ca3af"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[-1, 1]}
              tick={{ fontSize: 12 }}
              stroke="#9ca3af"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => (value * 100).toFixed(0)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="sentiment"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#sentimentGradient)"
              dot={(props) => {
                const { cx, cy, payload } = props;
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={EMOTION_COLORS[payload.dominantEmotion as keyof typeof EMOTION_COLORS]}
                    stroke="white"
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={{ r: 6, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default EmotionTimeline;
