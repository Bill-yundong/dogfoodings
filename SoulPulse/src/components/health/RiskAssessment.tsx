import React from "react";
import { RiskAssessment as RiskAssessmentType, RiskFactor } from "@/types";
import { AlertTriangle, Shield, Heart, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface RiskAssessmentProps {
  assessment: RiskAssessmentType;
  className?: string;
}

export const RiskAssessment: React.FC<RiskAssessmentProps> = ({
  assessment,
  className,
}) => {
  const getRiskColor = (level: string) => {
    switch (level) {
      case "low":
        return { bg: "bg-green-500", text: "text-green-700", light: "bg-green-50", border: "border-green-200" };
      case "moderate":
        return { bg: "bg-yellow-500", text: "text-yellow-700", light: "bg-yellow-50", border: "border-yellow-200" };
      case "high":
        return { bg: "bg-orange-500", text: "text-orange-700", light: "bg-orange-50", border: "border-orange-200" };
      case "critical":
        return { bg: "bg-red-500", text: "text-red-700", light: "bg-red-50", border: "border-red-200" };
      default:
        return { bg: "bg-gray-500", text: "text-gray-700", light: "bg-gray-50", border: "border-gray-200" };
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case "low":
        return "低风险";
      case "moderate":
        return "中等风险";
      case "high":
        return "高风险";
      case "critical":
        return "紧急风险";
      default:
        return "未知";
    }
  };

  const riskColors = getRiskColor(assessment.riskLevel);

  return (
    <div className={cn("card p-5", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary-500" />
          健康风险评估
        </h3>
        <span
          className={cn(
            "px-3 py-1 rounded-full text-sm font-medium",
            riskColors.light,
            riskColors.text,
            riskColors.border,
            "border"
          )}
        >
          {getRiskLabel(assessment.riskLevel)}
        </span>
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">风险评分</span>
          <span className={cn("text-lg font-bold", riskColors.text)}>
            {(assessment.overallScore * 100).toFixed(0)}
          </span>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", riskColors.bg)}
            style={{ width: `${assessment.overallScore * 100}%` }}
          />
        </div>
      </div>

      {assessment.factors && assessment.factors.length > 0 && (
        <div className="space-y-2 mb-4">
          {assessment.factors.map((factor: RiskFactor, index: number) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-2">
                {factor.type === "emotional" && (
                  <Heart className="w-4 h-4 text-pink-500" />
                )}
                {factor.type === "physical" && (
                  <Activity className="w-4 h-4 text-orange-500" />
                )}
                {factor.type === "behavioral" && (
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                )}
                <span className="text-sm text-gray-700">{factor.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", riskColors.bg)}
                    style={{ width: `${factor.score * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-8 text-right">
                  {(factor.score * 100).toFixed(0)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {assessment.recommendations && assessment.recommendations.length > 0 && (
        <div className="p-3 bg-blue-50 rounded-xl">
          <p className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" />
            建议措施
          </p>
          <ul className="space-y-1">
            {assessment.recommendations.map((rec: string, index: number) => (
              <li key={index} className="text-sm text-blue-700 flex items-start gap-2">
                <span className="text-blue-400">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default RiskAssessment;
