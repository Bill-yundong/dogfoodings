import React from "react";
import { DiaryEntry } from "@/types";
import { EmotionBadge } from "@/components/ui/EmotionBadge";
import { getSentimentLabel } from "@/lib/sentiment";
import { formatDateTime } from "@/lib/utils";
import { EMOTION_TYPES, EMOTION_COLORS, EMOTION_LABELS } from "@/lib/constants";
import { X, Calendar, Tag, Activity, Heart, Shield, Brain, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface DiaryDetailProps {
  entry: DiaryEntry;
  onClose: () => void;
  onEdit: (entry: DiaryEntry) => void;
}

export const DiaryDetail: React.FC<DiaryDetailProps> = ({ entry, onClose, onEdit }) => {
  const {
    linguisticFeatures,
    semanticAlignment,
    physiologicalData,
    emotionVector,
  } = entry;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full my-8 shadow-2xl animate-fade-in">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <EmotionBadge emotion={entry.mood} intensity={entry.emotionVector[entry.mood]} />
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDateTime(entry.createdAt)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-thin">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{entry.title}</h1>
            {entry.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {entry.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="bg-gray-50 rounded-xl p-6">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-base">
              {entry.content}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-sm text-gray-500 mb-1">情绪得分</div>
              <div
                className={cn(
                  "text-2xl font-bold",
                  entry.sentimentScore > 0
                    ? "text-green-600"
                    : entry.sentimentScore < 0
                    ? "text-red-600"
                    : "text-gray-600"
                )}
              >
                {(entry.sentimentScore * 100).toFixed(0)}
              </div>
              <div className="text-xs text-gray-500">{getSentimentLabel(entry.sentimentLevel)}</div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-sm text-gray-500 mb-1">字数</div>
              <div className="text-2xl font-bold text-gray-900">
                {linguisticFeatures.wordCount}
              </div>
              <div className="text-xs text-gray-500">
                {linguisticFeatures.sentenceCount} 句话
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-sm text-gray-500 mb-1">词汇丰富度</div>
              <div className="text-2xl font-bold text-gray-900">
                {(linguisticFeatures.vocabularyRichness * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500">
                {linguisticFeatures.avgWordLength.toFixed(1)} 平均词长
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                <Shield className="w-4 h-4" />
                语义对齐
              </div>
              <div className="text-2xl font-bold text-primary-600">
                {semanticAlignment
                  ? `${(semanticAlignment.alignmentConfidence * 100).toFixed(0)}%`
                  : "--"}
              </div>
              <div className="text-xs text-gray-500">
                {semanticAlignment?.alignedEmotion
                  ? EMOTION_LABELS[semanticAlignment.alignedEmotion]
                  : "待分析"}
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary-500" />
              情绪构成
            </h3>
            <div className="space-y-3">
              {EMOTION_TYPES.map((emotion) => {
                const value = emotionVector[emotion];
                if (value < 0.01) return null;
                return (
                  <div key={emotion} className="flex items-center gap-3">
                    <span className="w-16 text-sm text-gray-600">
                      {EMOTION_LABELS[emotion]}
                    </span>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${value * 100}%`,
                          backgroundColor: EMOTION_COLORS[emotion],
                        }}
                      />
                    </div>
                    <span className="w-12 text-right text-sm font-medium text-gray-700">
                      {(value * 100).toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary-500" />
                语言学特征
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">第一人称使用</span>
                  <span className="text-sm font-medium">
                    {(linguisticFeatures.pronounUsage.firstPerson * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">过去导向</span>
                  <span className="text-sm font-medium">
                    {(linguisticFeatures.temporalOrientation.past * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">现在导向</span>
                  <span className="text-sm font-medium">
                    {(linguisticFeatures.temporalOrientation.present * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">未来导向</span>
                  <span className="text-sm font-medium">
                    {(linguisticFeatures.temporalOrientation.future * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">认知确定性</span>
                  <span className="text-sm font-medium">
                    {(linguisticFeatures.cognitiveProcesses.certainty * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {physiologicalData && (
              <div className="card p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary-500" />
                  生理指标
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <Heart className="w-4 h-4 text-red-500" />
                      心率
                    </span>
                    <span className="text-sm font-medium">
                      {physiologicalData.heartRate} BPM
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">压力水平</span>
                    <span className="text-sm font-medium">
                      {physiologicalData.stressLevel}/10
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">睡眠质量</span>
                    <span className="text-sm font-medium">
                      {physiologicalData.sleepQuality}/10
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">能量水平</span>
                    <span className="text-sm font-medium">
                      {physiologicalData.energyLevel}/10
                    </span>
                  </div>
                  {physiologicalData.heartRateVariability && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">心率变异性</span>
                      <span className="text-sm font-medium">
                        {physiologicalData.heartRateVariability} ms
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {semanticAlignment && (
            <div className="card p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary-500" />
                语义对齐分析
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-green-50 rounded-xl p-4">
                  <div className="text-sm text-green-700 mb-1">语言情绪得分</div>
                  <div className="text-xl font-bold text-green-700">
                    {(semanticAlignment.linguisticEmotionScore * 100).toFixed(0)}
                  </div>
                </div>
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="text-sm text-blue-700 mb-1">生理情绪得分</div>
                  <div className="text-xl font-bold text-blue-700">
                    {(semanticAlignment.physiologicalEmotionScore * 100).toFixed(0)}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-600">匹配特征: </span>
                  {semanticAlignment.alignmentFeatures.featureMatches.length > 0 ? (
                    <span className="text-sm text-green-600">
                      {semanticAlignment.alignmentFeatures.featureMatches.join(", ")}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">无</span>
                  )}
                </div>
                <div>
                  <span className="text-sm text-gray-600">差异特征: </span>
                  {semanticAlignment.alignmentFeatures.discrepancies.length > 0 ? (
                    <span className="text-sm text-orange-600">
                      {semanticAlignment.alignmentFeatures.discrepancies.join(", ")}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">无</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-100 px-6 py-4 flex justify-between items-center rounded-b-2xl">
          <div className="text-sm text-gray-500">
            {entry.isEncrypted && (
              <span className="inline-flex items-center gap-1">
                <Shield className="w-4 h-4" />
                端到端加密存储
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary">
              关闭
            </button>
            <button
              onClick={() => {
                onClose();
                onEdit(entry);
              }}
              className="btn-primary"
            >
              编辑日记
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiaryDetail;
