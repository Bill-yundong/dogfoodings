import React, { useEffect, useState } from "react";
import { useAppStore } from "@/store/appStore";
import { Layout } from "@/components/layout/Layout";
import { EmotionTimeline } from "@/components/visualization/EmotionTimeline";
import { EmotionRadar } from "@/components/visualization/EmotionRadar";
import { WellbeingScore } from "@/components/visualization/WellbeingScore";
import { PatternDetection } from "@/components/visualization/PatternDetection";
import { InsightCard } from "@/components/insights/InsightCard";
import { RiskAssessment } from "@/components/health/RiskAssessment";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { EmotionTrajectoryPoint, EmotionType } from "@/types";
import { BarChart3, RefreshCw, AlertTriangle, Lightbulb } from "lucide-react";

export default function DashboardPage() {
  const {
    entries,
    insights,
    trajectory,
    patterns,
    wellbeingScore,
    riskAssessment,
    isLoading,
    error,
    setError,
    loadEntries,
    generateInsights,
    assessRisk,
  } = useAppStore();

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (entries.length === 0) {
      loadEntries();
    }
  }, [entries.length, loadEntries]);

  useEffect(() => {
    if (entries.length > 0 && insights.length === 0) {
      handleGenerateInsights();
    }
  }, [entries.length]);

  const handleGenerateInsights = async () => {
    setIsAnalyzing(true);
    try {
      await generateInsights();
      await assessRisk();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const avgEmotionVector = React.useMemo(() => {
    if (entries.length === 0) {
      const empty: Record<EmotionType, number> = {
        joy: 0,
        trust: 0,
        fear: 0,
        surprise: 0,
        sadness: 0,
        disgust: 0,
        anger: 0,
        anticipation: 0,
        neutral: 0,
      };
      return empty;
    }

    const sum: Record<EmotionType, number> = {
      joy: 0,
      trust: 0,
      fear: 0,
      surprise: 0,
      sadness: 0,
      disgust: 0,
      anger: 0,
      anticipation: 0,
      neutral: 0,
    };

    entries.forEach((entry) => {
      (Object.keys(sum) as EmotionType[]).forEach((emotion) => {
        sum[emotion] += entry.emotionVector[emotion];
      });
    });

    (Object.keys(sum) as EmotionType[]).forEach((emotion) => {
      sum[emotion] /= entries.length;
    });

    return sum;
  }, [entries]);

  const recentTrajectory: EmotionTrajectoryPoint[] = React.useMemo(() => {
    return trajectory.slice(-30);
  }, [trajectory]);

  return (
    <Layout>
      {error && (
        <ErrorMessage
          message={error}
          onDismiss={() => setError(null)}
          className="mb-6"
        />
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary-500" />
            情绪仪表盘
          </h1>
          <p className="text-gray-500 mt-1">
            基于 {entries.length} 篇日记的情绪分析
          </p>
        </div>
        <button
          onClick={handleGenerateInsights}
          disabled={isAnalyzing || entries.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-primary-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw
            className={`w-5 h-5 ${isAnalyzing ? "animate-spin" : ""}`}
          />
          {isAnalyzing ? "分析中..." : "重新分析"}
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <BarChart3 className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            还没有数据
          </h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            记录几篇日记后，这里会显示您的情绪分析数据和洞察。
          </p>
        </div>
      ) : isLoading && insights.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" text="正在分析..." />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2">
              <EmotionTimeline data={recentTrajectory} />
            </div>
            {wellbeingScore && (
              <WellbeingScore
                overall={wellbeingScore.overall}
                dimensions={wellbeingScore.dimensions}
              />
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <EmotionRadar emotionVector={avgEmotionVector} />
            <PatternDetection patterns={patterns} />
            {riskAssessment && (
              <RiskAssessment assessment={riskAssessment} />
            )}
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg font-semibold text-gray-900">智能洞察</h2>
            </div>
            {insights.length === 0 ? (
              <div className="card p-8 text-center">
                <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-500">
                  需要更多日记数据来生成洞察建议
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights.slice(0, 6).map((insight, index) => (
                  <InsightCard key={index} insight={insight} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </Layout>
  );
}
