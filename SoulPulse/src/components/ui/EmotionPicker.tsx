import React from "react";
import { EmotionType } from "@/types";
import { EMOTION_TYPES, EMOTION_LABELS, EMOTION_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  Smile,
  Heart,
  AlertCircle,
  Zap,
  CloudRain,
  Frown,
  Flame,
  Clock,
  Circle,
} from "lucide-react";

interface EmotionPickerProps {
  value: EmotionType;
  onChange: (emotion: EmotionType) => void;
  className?: string;
}

const emotionIcons: Record<EmotionType, React.ReactNode> = {
  joy: <Smile className="w-6 h-6" />,
  trust: <Heart className="w-6 h-6" />,
  fear: <AlertCircle className="w-6 h-6" />,
  surprise: <Zap className="w-6 h-6" />,
  sadness: <CloudRain className="w-6 h-6" />,
  disgust: <Frown className="w-6 h-6" />,
  anger: <Flame className="w-6 h-6" />,
  anticipation: <Clock className="w-6 h-6" />,
  neutral: <Circle className="w-6 h-6" />,
};

export const EmotionPicker: React.FC<EmotionPickerProps> = ({
  value,
  onChange,
  className,
}) => {
  return (
    <div className={cn("grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9", className)}>
      {EMOTION_TYPES.map((emotion) => {
        const color = EMOTION_COLORS[emotion];
        const isSelected = value === emotion;

        return (
          <button
            key={emotion}
            type="button"
            onClick={() => onChange(emotion)}
            className={cn(
              "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-200",
              "hover:scale-105 active:scale-95",
              isSelected
                ? "ring-2 ring-offset-2 shadow-lg"
                : "bg-gray-50 hover:bg-gray-100"
            )}
            style={{
              backgroundColor: isSelected ? `${color}20` : undefined,
              color: isSelected ? color : "#6b7280",
            }}
          >
            <div
              className={cn(
                "p-2 rounded-full transition-colors",
                isSelected ? "bg-white/80" : "bg-white"
              )}
            >
              {emotionIcons[emotion]}
            </div>
            <span className="text-xs font-medium">{EMOTION_LABELS[emotion]}</span>
          </button>
        );
      })}
    </div>
  );
};

export default EmotionPicker;
