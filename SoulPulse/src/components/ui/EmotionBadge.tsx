import React from "react";
import { EmotionType } from "@/types";
import { EMOTION_LABELS, EMOTION_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface EmotionBadgeProps {
  emotion: EmotionType;
  intensity?: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export const EmotionBadge: React.FC<EmotionBadgeProps> = ({
  emotion,
  intensity = 1,
  size = "md",
  showLabel = true,
  className,
}) => {
  const color = EMOTION_COLORS[emotion];
  const label = EMOTION_LABELS[emotion];
  const opacity = 0.3 + intensity * 0.7;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium transition-all",
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: `${color}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`,
        color: color,
        border: `1px solid ${color}40`,
      }}
    >
      <span
        className="rounded-full"
        style={{
          width: size === "sm" ? 6 : size === "md" ? 8 : 10,
          height: size === "sm" ? 6 : size === "md" ? 8 : 10,
          backgroundColor: color,
        }}
      />
      {showLabel && label}
    </span>
  );
};

export default EmotionBadge;
