import React from "react";
import { EmotionEvolutionPattern } from "@/types";
import { RefreshCw, TrendingUp, Zap, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface PatternDetectionProps {
  patterns: EmotionEvolutionPattern[];
  className?: string;
}

export const PatternDetection: React.FC<PatternDetectionProps> = ({
  patterns,
  className,
}) => {
  const getPatternIcon = (type: string) => {
    switch (type) {
      case "cyclical":
        return <RefreshCw className="w-5 h-5" />;
      case "progressive":
        return <TrendingUp className="w-5 h-5" />;
      case "reactive":
        return <Zap className="w-5 h-5" />;
      case "stable":
        return <Target className="w-5 h-5" />;
      default:
        return <TrendingUp className="w-5 h-5" />;
    }
  };

  const getPatternLabel = (type: string) => {
    switch (type) {
      case "cyclical":
        return "周期性模式";
      case "progressive":
        return "渐进性模式";
      case "reactive":
        return "反应性模式";
      case "stable":
        return "稳定模式";
      default:
        return type;
    }
  };

  const getPatternColor = (type: string) => {
    switch (type) {
      case "cyclical":
        return "bg-blue-500";
      case "progressive":
        return "bg-green-500";
      case "reactive":
        return "bg-orange-500";
      case "stable":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const getPatternDescription = (pattern: EmotionEvolutionPattern) => {
    const { type, confidence, description } = pattern;
    const baseDesc = description || `检测到${getPatternLabel(type)}`;
    return `${baseDesc}（置信度：${(confidence * 100).toFixed(0)}%）`;
  };

  if (patterns.length === 0) {
    return (
      <div className={`card p-5 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">模式识别</h3>
        <div className="text-center py-8 text-gray-500">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>需要更多日记数据来识别情绪模式</p>
          <p className="text-sm mt-1">建议至少记录7篇日记</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`card p-5 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">模式识别</h3>
      <div className="space-y-3">
        {patterns.map((pattern, index) => (
          <div
            key={index}
            className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0",
                  getPatternColor(pattern.type)
                )}
              >
                {getPatternIcon(pattern.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-gray-900">
                    {getPatternLabel(pattern.type)}
                  </h4>
                  <div className="flex items-center gap-1">
                    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", getPatternColor(pattern.type))}
                        style={{ width: `${pattern.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">
                      {(pattern.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  {getPatternDescription(pattern)}
                </p>
                {pattern.triggerFactors && pattern.triggerFactors.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {pattern.triggerFactors.map((trigger: string, i: number) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-white text-gray-600 text-xs rounded-full border border-gray-200"
                      >
                        {trigger}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PatternDetection;
