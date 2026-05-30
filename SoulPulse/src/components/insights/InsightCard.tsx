import React from "react";
import { EmotionInsight } from "@/types";
import { Lightbulb, TrendingUp, AlertTriangle, Award, Target, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface InsightCardProps {
  insight: EmotionInsight;
  className?: string;
}

export const InsightCard: React.FC<InsightCardProps> = ({ insight, className }) => {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "trend":
        return <TrendingUp className="w-5 h-5" />;
      case "trigger":
        return <Target className="w-5 h-5" />;
      case "recommendation":
        return <Lightbulb className="w-5 h-5" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5" />;
      case "achievement":
        return <Award className="w-5 h-5" />;
      case "linguistic":
        return <BookOpen className="w-5 h-5" />;
      default:
        return <Lightbulb className="w-5 h-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "trend":
        return "bg-blue-500";
      case "trigger":
        return "bg-purple-500";
      case "recommendation":
        return "bg-green-500";
      case "warning":
        return "bg-orange-500";
      case "achievement":
        return "bg-yellow-500";
      case "linguistic":
        return "bg-indigo-500";
      default:
        return "bg-gray-500";
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "trend":
        return "趋势分析";
      case "trigger":
        return "触发因子";
      case "recommendation":
        return "个性化建议";
      case "warning":
        return "风险预警";
      case "achievement":
        return "成长成就";
      case "linguistic":
        return "语言特征";
      default:
        return "洞察";
    }
  };

  return (
    <div
      className={cn(
        "card p-4 hover:shadow-md transition-all duration-300",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0",
            getCategoryColor(insight.category)
          )}
        >
          {getCategoryIcon(insight.category)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-xs font-medium text-white",
                getCategoryColor(insight.category)
              )}
            >
              {getCategoryLabel(insight.category)}
            </span>
            <span className="text-xs text-gray-400">
              置信度 {(insight.confidence * 100).toFixed(0)}%
            </span>
          </div>
          <h4 className="font-medium text-gray-900 mb-1">{insight.title}</h4>
          <p className="text-sm text-gray-600 leading-relaxed">
            {insight.description}
          </p>
          {insight.actionableSteps && insight.actionableSteps.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">建议行动：</p>
              <ul className="space-y-1">
                {insight.actionableSteps.map((step: string, index: number) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-xs text-gray-600"
                  >
                    <span className="w-4 h-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InsightCard;
