import React from "react";
import { Heart, Sparkles, TrendingUp, Moon, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface WellbeingDimension {
  name: string;
  score: number;
  icon: React.ReactNode;
  color: string;
}

interface WellbeingScoreProps {
  overall: number;
  dimensions: {
    emotional: number;
    cognitive: number;
    physical: number;
    social: number;
    behavioral: number;
  };
  className?: string;
}

export const WellbeingScore: React.FC<WellbeingScoreProps> = ({
  overall,
  dimensions,
  className,
}) => {
  const wellbeingDimensions: WellbeingDimension[] = [
    {
      name: "情绪健康",
      score: dimensions.emotional,
      icon: <Heart className="w-4 h-4" />,
      color: "bg-pink-500",
    },
    {
      name: "认知健康",
      score: dimensions.cognitive,
      icon: <Sparkles className="w-4 h-4" />,
      color: "bg-purple-500",
    },
    {
      name: "身体健康",
      score: dimensions.physical,
      icon: <Zap className="w-4 h-4" />,
      color: "bg-orange-500",
    },
    {
      name: "社交健康",
      score: dimensions.social,
      icon: <TrendingUp className="w-4 h-4" />,
      color: "bg-green-500",
    },
    {
      name: "行为健康",
      score: dimensions.behavioral,
      icon: <Moon className="w-4 h-4" />,
      color: "bg-blue-500",
    },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "优秀";
    if (score >= 60) return "良好";
    if (score >= 40) return "一般";
    return "需要关注";
  };

  return (
    <div className={`card p-5 ${className}`}>
      <div className="text-center mb-6">
        <div
          className={cn(
            "text-5xl font-bold mb-2",
            getScoreColor(overall)
          )}
        >
          {overall.toFixed(0)}
        </div>
        <div className="text-sm text-gray-500">综合幸福感指数</div>
        <div
          className={cn(
            "inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium",
            overall >= 80
              ? "bg-green-100 text-green-700"
              : overall >= 60
              ? "bg-yellow-100 text-yellow-700"
              : overall >= 40
              ? "bg-orange-100 text-orange-700"
              : "bg-red-100 text-red-700"
          )}
        >
          {getScoreLabel(overall)}
        </div>
      </div>

      <div className="space-y-3">
        {wellbeingDimensions.map((dim) => (
          <div key={dim.name} className="flex items-center gap-3">
            <div
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center text-white",
                dim.color
              )}
            >
              {dim.icon}
            </div>
            <div className="flex-1">
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-700">{dim.name}</span>
                <span className="text-sm font-medium text-gray-900">
                  {dim.score.toFixed(0)}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", dim.color)}
                  style={{ width: `${dim.score}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WellbeingScore;
