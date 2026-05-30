import React from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { EmotionType } from "@/types";
import { EMOTION_TYPES, EMOTION_COLORS, EMOTION_LABELS } from "@/lib/constants";
import { PieChart } from "lucide-react";

interface EmotionRadarProps {
  emotionVector: Record<EmotionType, number>;
  className?: string;
}

export const EmotionRadar: React.FC<EmotionRadarProps> = ({
  emotionVector,
  className,
}) => {
  const data = EMOTION_TYPES.map((emotion) => ({
    emotion: EMOTION_LABELS[emotion],
    value: emotionVector[emotion] * 100,
    color: EMOTION_COLORS[emotion],
  })).filter((d) => d.value > 1);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100">
          <p className="text-sm font-medium text-gray-900">
            {payload[0].payload.emotion}
          </p>
          <p className="text-sm text-gray-600">
            {payload[0].value.toFixed(0)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`card p-5 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <PieChart className="w-5 h-5 text-primary-500" />
        情绪分布
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis
              dataKey="emotion"
              tick={{ fontSize: 12, fill: "#6b7280" }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={{ fontSize: 10 }}
              stroke="#d1d5db"
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Radar
              name="情绪"
              dataKey="value"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.3}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default EmotionRadar;
