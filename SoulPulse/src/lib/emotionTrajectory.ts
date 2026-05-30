import {
  DiaryEntry,
  EmotionTrajectoryPoint,
  EmotionEvolutionPattern,
  EmotionInsight,
  EmotionType,
  HealthProfile,
  WellbeingScore,
} from "@/types";
import { EMOTION_TYPES, POSITIVE_EMOTIONS, NEGATIVE_EMOTIONS } from "@/lib/constants";
import { generateId, mean, stdDev, correlation, movingAverage, normalize } from "@/lib/utils";

export interface TrajectoryAnalysisOptions {
  smoothWindowSize?: number;
  patternDetectionThreshold?: number;
  minPatternDuration?: number;
  maxPatternDuration?: number;
}

const DEFAULT_OPTIONS: Required<TrajectoryAnalysisOptions> = {
  smoothWindowSize: 3,
  patternDetectionThreshold: 0.6,
  minPatternDuration: 3 * 60 * 60 * 1000,
  maxPatternDuration: 30 * 24 * 60 * 60 * 1000,
};

export class EmotionTrajectoryEngine {
  private options: Required<TrajectoryAnalysisOptions>;

  constructor(options?: TrajectoryAnalysisOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  buildTrajectory(entries: DiaryEntry[]): EmotionTrajectoryPoint[] {
    const sortedEntries = [...entries].sort((a, b) => a.createdAt - b.createdAt);

    const trajectory: EmotionTrajectoryPoint[] = sortedEntries.map((entry) => {
      const dominantEmotion = this.getDominantEmotion(entry.emotionVector);
      const triggers = this.extractTriggers(entry);
      const context = this.extractContext(entry);

      return {
        timestamp: entry.createdAt,
        emotion: dominantEmotion,
        dominantEmotion,
        intensity: entry.emotionVector[dominantEmotion],
        sentimentScore: entry.sentimentScore,
        alignmentConfidence: entry.semanticAlignment?.alignmentConfidence || 0.5,
        entryId: entry.id,
        triggers,
        context,
      };
    });

    return this.smoothTrajectory(trajectory);
  }

  private getDominantEmotion(vector: Record<EmotionType, number>): EmotionType {
    let maxEmotion: EmotionType = "neutral";
    let maxValue = 0;

    for (const emotion of EMOTION_TYPES) {
      if (vector[emotion] > maxValue) {
        maxValue = vector[emotion];
        maxEmotion = emotion;
      }
    }

    return maxEmotion;
  }

  private extractTriggers(entry: DiaryEntry): string[] {
    const triggers: string[] = [];
    const content = entry.content.toLowerCase();

    const triggerKeywords = [
      "工作", "会议", "项目", "deadline", "考试", "面试", "date", "约会",
      "朋友", "家人", "同事", "领导", "客户", "争吵", "冲突", "误解",
      "收到", "获得", "失去", "完成", "失败", "成功", "庆祝", "旅行",
      "购物", "美食", "电影", "音乐", "运动", "健康", "医院", "体检",
      "news", "消息", "电话", "邮件", "微信", "通知", "提醒",
    ];

    for (const keyword of triggerKeywords) {
      if (content.includes(keyword)) {
        triggers.push(keyword);
      }
    }

    for (const tag of entry.tags) {
      if (!triggers.includes(tag)) {
        triggers.push(tag);
      }
    }

    return triggers.slice(0, 5);
  }

  private extractContext(entry: DiaryEntry): string {
    const sentences = entry.content.split(/[.!?。！？]+/);
    if (sentences.length === 0) return "";

    let contextSentence = sentences[0].trim();
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length > contextSentence.length && trimmed.length < 100) {
        contextSentence = trimmed;
      }
    }

    return contextSentence.slice(0, 100);
  }

  private smoothTrajectory(trajectory: EmotionTrajectoryPoint[]): EmotionTrajectoryPoint[] {
    if (trajectory.length < this.options.smoothWindowSize) {
      return trajectory;
    }

    const intensities = trajectory.map((p) => p.intensity);
    const smoothedIntensities = movingAverage(intensities, this.options.smoothWindowSize);

    return trajectory.map((point, index) => ({
      ...point,
      intensity:
        index < this.options.smoothWindowSize - 1
          ? point.intensity
          : smoothedIntensities[index - this.options.smoothWindowSize + 1],
    }));
  }

  detectPatterns(trajectory: EmotionTrajectoryPoint[]): EmotionEvolutionPattern[] {
    if (trajectory.length < 3) return [];

    const patterns: EmotionEvolutionPattern[] = [];
    const segments = this.segmentTrajectory(trajectory);

    for (const segment of segments) {
      if (segment.points.length < 2) continue;

      const duration =
        segment.points[segment.points.length - 1].timestamp - segment.points[0].timestamp;

      if (duration < this.options.minPatternDuration) continue;
      if (duration > this.options.maxPatternDuration) continue;

      const pattern = this.analyzeSegmentPattern(segment);
      if (pattern) {
        patterns.push(pattern);
      }
    }

    return this.mergeOverlappingPatterns(patterns);
  }

  private segmentTrajectory(trajectory: EmotionTrajectoryPoint[]): {
    points: EmotionTrajectoryPoint[];
    emotion: EmotionType;
  }[] {
    const segments: { points: EmotionTrajectoryPoint[]; emotion: EmotionType }[] = [];
    let currentSegment: EmotionTrajectoryPoint[] = [];
    let currentEmotion: EmotionType | null = null;

    for (const point of trajectory) {
      if (currentEmotion !== point.emotion) {
        if (currentSegment.length > 0 && currentEmotion) {
          segments.push({ points: currentSegment, emotion: currentEmotion });
        }
        currentSegment = [point];
        currentEmotion = point.emotion;
      } else {
        currentSegment.push(point);
      }
    }

    if (currentSegment.length > 0 && currentEmotion) {
      segments.push({ points: currentSegment, emotion: currentEmotion });
    }

    return segments;
  }

  private analyzeSegmentPattern(segment: {
    points: EmotionTrajectoryPoint[];
    emotion: EmotionType;
  }): EmotionEvolutionPattern | null {
    const { points, emotion } = segment;
    const timestamps = points.map((p) => p.timestamp);
    const intensities = points.map((p) => p.intensity);

    const duration = timestamps[timestamps.length - 1] - timestamps[0];
    const intensityVariation = stdDev(intensities);
    const recoveryRate = this.calculateRecoveryRate(points);

    const timeSeries = timestamps.map((t, i) => ({ x: t, y: intensities[i] }));
    const patternType = this.classifyPattern(timeSeries);

    const triggerEvents = this.extractPatternTriggers(points);
    const associatedEmotions = this.findAssociatedEmotions(points, emotion);

    const descriptions: Record<string, string> = {
      cyclical: "情绪呈现周期性波动规律",
      progressive: "情绪呈现渐进性变化趋势",
      reactive: "情绪对外部事件有明显反应",
      stable: "情绪状态保持相对稳定",
    };

    const typeNames: Record<string, EmotionEvolutionPattern["type"]> = {
      cyclical: "cyclical",
      progressive: "progressive",
      reactive: "reactive",
      stable: "stable",
    };

    return {
      type: typeNames[patternType || "stable"] || "stable",
      patternType,
      triggerEvents,
      triggerFactors: triggerEvents,
      duration,
      intensityVariation,
      recoveryRate,
      associatedEmotions,
      confidence: 0.6 + Math.random() * 0.3,
      description: descriptions[patternType || "stable"] || "情绪模式已识别",
    };
  }

  private calculateRecoveryRate(points: EmotionTrajectoryPoint[]): number {
    if (points.length < 2) return 0;

    const peakIndex = points.reduce(
      (maxIdx, p, idx) => (p.intensity > points[maxIdx].intensity ? idx : maxIdx),
      0
    );

    if (peakIndex >= points.length - 1) return 0;

    const peakIntensity = points[peakIndex].intensity;
    const finalIntensity = points[points.length - 1].intensity;
    const recoveryTime =
      points[points.length - 1].timestamp - points[peakIndex].timestamp;

    const intensityDrop = peakIntensity - finalIntensity;
    return recoveryTime > 0 ? intensityDrop / (recoveryTime / (60 * 60 * 1000)) : 0;
  }

  private classifyPattern(timeSeries: { x: number; y: number }[]): EmotionEvolutionPattern["patternType"] {
    if (timeSeries.length < 3) return "stable";

    const x = timeSeries.map((p) => p.x);
    const y = timeSeries.map((p) => p.y);

    const corr = correlation(x, y);
    const variance = stdDev(y);

    const halfLen = Math.floor(timeSeries.length / 2);
    const firstHalf = y.slice(0, halfLen);
    const secondHalf = y.slice(halfLen);
    const firstMean = mean(firstHalf);
    const secondMean = mean(secondHalf);
    const meanChange = (secondMean - firstMean) / (Math.max(Math.abs(firstMean), Math.abs(secondMean)) || 1);

    if (Math.abs(corr) < 0.2 && variance < 0.15) {
      return "stable";
    }

    if (Math.abs(corr) > 0.5) {
      return "progressive";
    }

    const zeroCrossings = this.countZeroCrossings(y.map((v) => v - mean(y)));
    if (zeroCrossings >= 2 && Math.abs(meanChange) < 0.3) {
      return "cyclical";
    }

    if (variance > 0.3 || Math.abs(meanChange) > 0.4) {
      return "reactive";
    }

    return "stable";
  }

  private countZeroCrossings(values: number[]): number {
    let crossings = 0;
    for (let i = 1; i < values.length; i++) {
      if ((values[i - 1] > 0 && values[i] <= 0) || (values[i - 1] < 0 && values[i] >= 0)) {
        crossings++;
      }
    }
    return crossings;
  }

  private extractPatternTriggers(points: EmotionTrajectoryPoint[]): string[] {
    const triggerCounts: Record<string, number> = {};

    for (const point of points) {
      for (const trigger of point.triggers) {
        triggerCounts[trigger] = (triggerCounts[trigger] || 0) + 1;
      }
    }

    return Object.entries(triggerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([trigger]) => trigger);
  }

  private findAssociatedEmotions(
    points: EmotionTrajectoryPoint[],
    primaryEmotion: EmotionType
  ): EmotionType[] {
    const emotionCounts: Record<EmotionType, number> = {} as Record<EmotionType, number>;
    for (const emotion of EMOTION_TYPES) {
      emotionCounts[emotion] = 0;
    }

    for (const point of points) {
      emotionCounts[point.emotion]++;
    }

    const threshold = points.length * 0.15;
    return EMOTION_TYPES.filter(
      (e) => e !== primaryEmotion && emotionCounts[e] >= threshold
    );
  }

  private mergeOverlappingPatterns(patterns: EmotionEvolutionPattern[]): EmotionEvolutionPattern[] {
    if (patterns.length < 2) return patterns;

    const merged: EmotionEvolutionPattern[] = [];
    let currentPattern = patterns[0];

    for (let i = 1; i < patterns.length; i++) {
      const nextPattern = patterns[i];

      if (currentPattern.patternType === nextPattern.patternType) {
        const sharedTriggers = currentPattern.triggerEvents.filter((t) =>
          nextPattern.triggerEvents.includes(t)
        );

        if (sharedTriggers.length > 0) {
          currentPattern = {
            ...currentPattern,
            duration: currentPattern.duration + nextPattern.duration,
            intensityVariation: Math.max(
              currentPattern.intensityVariation,
              nextPattern.intensityVariation
            ),
            triggerEvents: [...new Set([...currentPattern.triggerEvents, ...nextPattern.triggerEvents])],
            associatedEmotions: [
              ...new Set([...currentPattern.associatedEmotions, ...nextPattern.associatedEmotions]),
            ],
          };
          continue;
        }
      }

      merged.push(currentPattern);
      currentPattern = nextPattern;
    }

    merged.push(currentPattern);
    return merged;
  }

  generateInsights(
    entries: DiaryEntry[],
    trajectory: EmotionTrajectoryPoint[],
    patterns: EmotionEvolutionPattern[],
    profile?: HealthProfile
  ): EmotionInsight[] {
    const insights: EmotionInsight[] = [];

    const sentimentInsight = this.analyzeSentimentTrend(entries);
    if (sentimentInsight) insights.push(sentimentInsight);

    const patternInsights = this.analyzePatternInsights(patterns, entries);
    insights.push(...patternInsights);

    const triggerInsight = this.analyzeTriggerInsights(trajectory);
    if (triggerInsight) insights.push(triggerInsight);

    const correlationInsight = this.analyzeCorrelationInsights(entries);
    if (correlationInsight) insights.push(correlationInsight);

    const recommendation = this.generateRecommendation(entries, trajectory, patterns, profile);
    if (recommendation) insights.push(recommendation);

    return insights;
  }

  private analyzeSentimentTrend(entries: DiaryEntry[]): EmotionInsight | null {
    if (entries.length < 5) return null;

    const sortedEntries = [...entries].sort((a, b) => a.createdAt - b.createdAt);
    const scores = sortedEntries.map((e) => e.sentimentScore);

    const firstQuarter = scores.slice(0, Math.ceil(scores.length / 2));
    const lastQuarter = scores.slice(Math.floor(scores.length / 2));
    const firstMean = mean(firstQuarter);
    const lastMean = mean(lastQuarter);
    const trend = lastMean - firstMean;

    const timestamps = sortedEntries.map((e) => e.createdAt);
    const corr = correlation(timestamps, scores);

    let title = "";
    let description = "";
    let confidence = Math.abs(corr);

    if (trend > 0.2) {
      title = "情绪呈显著积极趋势";
      description = `近期你的整体情绪状态有明显改善，平均情绪得分从 ${firstMean.toFixed(2)} 提升至 ${lastMean.toFixed(2)}。继续保持良好的生活节奏！`;
    } else if (trend < -0.2) {
      title = "情绪呈下降趋势，建议关注";
      description = `近期你的情绪状态有所下滑，平均情绪得分从 ${firstMean.toFixed(2)} 下降至 ${lastMean.toFixed(2)}。可以尝试调整作息，增加社交活动。`;
      confidence = Math.max(confidence, 0.7);
    } else {
      title = "情绪状态保持稳定";
      description = `你的情绪状态整体保持稳定，平均得分在 ${mean(scores).toFixed(2)} 左右波动。这是心理健康的良好信号。`;
    }

    const actionableSteps: string[] = [];
    if (trend > 0.2) {
      actionableSteps.push("继续保持积极的生活态度");
      actionableSteps.push("记录下让你感到快乐的事情");
    } else if (trend < -0.2) {
      actionableSteps.push("尝试每天进行 10 分钟的冥想");
      actionableSteps.push("增加户外活动时间");
      actionableSteps.push("与朋友或家人分享你的感受");
    } else {
      actionableSteps.push("继续保持规律的作息");
      actionableSteps.push("定期回顾情绪模式");
    }

    return {
      id: generateId(),
      type: "pattern",
      category: "emotional_trend",
      title,
      description,
      confidence: Math.min(Math.max(confidence, 0.5), 1),
      evidence: [
        `分析样本: ${entries.length} 条日记`,
        `趋势系数: ${trend.toFixed(3)}`,
        `时间相关性: ${corr.toFixed(3)}`,
      ],
      actionableSteps,
      timestamp: Date.now(),
      relatedEntryIds: entries.slice(-5).map((e) => e.id),
    };
  }

  private analyzePatternInsights(
    patterns: EmotionEvolutionPattern[],
    entries: DiaryEntry[]
  ): EmotionInsight[] {
    const insights: EmotionInsight[] = [];

    const cyclicalPatterns = patterns.filter((p) => p.patternType === "cyclical");
    if (cyclicalPatterns.length > 0) {
      const pattern = cyclicalPatterns[0];
      insights.push({
        id: generateId(),
        type: "pattern",
        category: "cyclical_pattern",
        title: "发现周期性情绪波动",
        description: `你的情绪呈现出周期性波动规律，主要触发因素包括：${pattern.triggerEvents.join("、")}。建议记录这些事件的发生时间，以便更好地预测和管理情绪。`,
        confidence: 0.8,
        evidence: [
          `波动周期: ${Math.round(pattern.duration / (24 * 60 * 60 * 1000))} 天`,
          `强度变化: ${(pattern.intensityVariation * 100).toFixed(0)}%`,
          `关联情绪: ${pattern.associatedEmotions.join("、")}`,
        ],
        actionableSteps: [
          "使用日历记录情绪波动周期",
          "在预期波动期提前做好心理准备",
          "保持规律作息以减少波动幅度",
        ],
        timestamp: Date.now(),
        relatedEntryIds: entries.slice(-3).map((e) => e.id),
      });
    }

    const reactivePatterns = patterns.filter((p) => p.patternType === "reactive");
    if (reactivePatterns.length > 0) {
      const pattern = reactivePatterns[0];
      insights.push({
        id: generateId(),
        type: "trigger",
        category: "trigger_detection",
        title: "识别到情绪触发源",
        description: `以下因素容易引起你的情绪波动：${pattern.triggerEvents.join("、")}。在面对这些情境时，可以尝试深呼吸或短暂休息来稳定情绪。`,
        confidence: 0.75,
        evidence: [
          `主要触发源: ${pattern.triggerEvents.join(", ")}`,
          `反应强度: ${(pattern.intensityVariation * 100).toFixed(0)}%`,
          `恢复速率: ${pattern.recoveryRate.toFixed(4)}/小时`,
        ],
        actionableSteps: [
          `遇到${pattern.triggerEvents[0] || "触发源"}时先深呼吸三次`,
          "提前准备应对策略",
          "记录每次触发后的感受和应对方式",
        ],
        timestamp: Date.now(),
        relatedEntryIds: entries.slice(-3).map((e) => e.id),
      });
    }

    return insights;
  }

  private analyzeTriggerInsights(trajectory: EmotionTrajectoryPoint[]): EmotionInsight | null {
    if (trajectory.length < 5) return null;

    const triggerCounts: Record<string, { positive: number; negative: number; total: number }> = {};

    for (const point of trajectory) {
      const isPositive = POSITIVE_EMOTIONS.has(point.emotion);
      const isNegative = NEGATIVE_EMOTIONS.has(point.emotion);

      for (const trigger of point.triggers) {
        if (!triggerCounts[trigger]) {
          triggerCounts[trigger] = { positive: 0, negative: 0, total: 0 };
        }
        triggerCounts[trigger].total++;
        if (isPositive) triggerCounts[trigger].positive++;
        if (isNegative) triggerCounts[trigger].negative++;
      }
    }

    const significantTriggers = Object.entries(triggerCounts)
      .filter(([, stats]) => stats.total >= 2)
      .map(([trigger, stats]) => ({
        trigger,
        positivity: stats.total > 0 ? stats.positive / stats.total : 0,
        negativity: stats.total > 0 ? stats.negative / stats.total : 0,
        count: stats.total,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    if (significantTriggers.length === 0) return null;

    const positiveTriggers = significantTriggers.filter((t) => t.positivity > 0.6);
    const negativeTriggers = significantTriggers.filter((t) => t.negativity > 0.6);

    const triggerSteps: string[] = [];
    if (positiveTriggers.length > 0) {
      triggerSteps.push(`增加${positiveTriggers[0].trigger}等积极活动`);
    }
    if (negativeTriggers.length > 0) {
      triggerSteps.push(`遇到${negativeTriggers[0].trigger}时使用情绪调节技巧`);
    }
    triggerSteps.push("继续记录日记以完善触发因子识别");

    return {
      id: generateId(),
      type: "trigger",
      category: "trigger_analysis",
      title: "情绪触发因子分析",
      description: this.generateTriggerDescription(positiveTriggers, negativeTriggers),
      confidence: Math.min(0.5 + significantTriggers.length * 0.1, 0.9),
      evidence: significantTriggers.map(
        (t) =>
          `${t.trigger}: 出现${t.count}次，积极率${(t.positivity * 100).toFixed(0)}%`
      ),
      actionableSteps: triggerSteps,
      timestamp: Date.now(),
      relatedEntryIds: trajectory.slice(-3).map((p) => p.entryId),
    };
  }

  private generateTriggerDescription(
    positiveTriggers: { trigger: string; positivity: number }[],
    negativeTriggers: { trigger: string; negativity: number }[]
  ): string {
    const parts: string[] = [];

    if (positiveTriggers.length > 0) {
      parts.push(
        `${positiveTriggers.map((t) => t.trigger).join("、")} 能够有效提升你的情绪状态，建议在日常生活中增加这些活动。`
      );
    }

    if (negativeTriggers.length > 0) {
      parts.push(
        `${negativeTriggers.map((t) => t.trigger).join("、")} 可能对你的情绪产生负面影响，在面对这些情境时可以尝试使用情绪调节技巧。`
      );
    }

    if (parts.length === 0) {
      return "继续记录更多日记，系统将能够更准确地识别你的情绪触发因子。";
    }

    return parts.join(" ");
  }

  private analyzeCorrelationInsights(entries: DiaryEntry[]): EmotionInsight | null {
    if (entries.length < 7) return null;

    const featureCorrelations: { feature: string; correlation: number }[] = [];

    const sentimentScores = entries.map((e) => e.sentimentScore);
    const wordCounts = entries.map((e) => e.linguisticFeatures.wordCount);
    const vocabularyRichness = entries.map((e) => e.linguisticFeatures.vocabularyRichness);
    const firstPersonUsage = entries.map((e) => e.linguisticFeatures.pronounUsage.firstPerson);
    const futureOrientation = entries.map((e) => e.linguisticFeatures.temporalOrientation.future);

    featureCorrelations.push({
      feature: "写作长度",
      correlation: correlation(sentimentScores, wordCounts),
    });

    featureCorrelations.push({
      feature: "词汇丰富度",
      correlation: correlation(sentimentScores, vocabularyRichness),
    });

    featureCorrelations.push({
      feature: "自我关注度",
      correlation: correlation(sentimentScores, firstPersonUsage),
    });

    featureCorrelations.push({
      feature: "未来导向",
      correlation: correlation(sentimentScores, futureOrientation),
    });

    const significantCorrelations = featureCorrelations.filter(
      (fc) => Math.abs(fc.correlation) > 0.4
    );

    if (significantCorrelations.length === 0) return null;

    const topCorrelation = significantCorrelations.sort(
      (a, b) => Math.abs(b.correlation) - Math.abs(a.correlation)
    )[0];

    const correlationSteps: string[] = [];
    if (topCorrelation.correlation > 0) {
      correlationSteps.push(`在日记中增加${topCorrelation.feature}表达`);
      correlationSteps.push("记录这一特征带来的情绪变化");
    } else {
      correlationSteps.push(`注意调节${topCorrelation.feature}的表达`);
      correlationSteps.push("尝试用更积极的方式表达");
    }
    correlationSteps.push("继续观察语言模式与情绪的关系");

    return {
      id: generateId(),
      type: "correlation",
      category: "linguistic_correlation",
      title: "发现语言特征与情绪的关联",
      description: this.generateCorrelationDescription(topCorrelation),
      confidence: Math.min(Math.abs(topCorrelation.correlation), 0.9),
      evidence: featureCorrelations.map(
        (fc) => `${fc.feature}: 相关系数 ${fc.correlation.toFixed(3)}`
      ),
      actionableSteps: correlationSteps,
      timestamp: Date.now(),
      relatedEntryIds: entries.slice(-5).map((e) => e.id),
    };
  }

  private generateCorrelationDescription(correlation: {
    feature: string;
    correlation: number;
  }): string {
    const direction = correlation.correlation > 0 ? "正相关" : "负相关";
    const strength =
      Math.abs(correlation.correlation) > 0.7 ? "强烈" : "中等";

    return `分析发现「${correlation.feature}」与你的情绪状态呈${strength}${direction}（相关系数：${correlation.correlation.toFixed(3)}）。${
      correlation.correlation > 0
        ? "当你在日记中表现出这一特征时，通常情绪状态更好。"
        : "当你在日记中表现出这一特征时，可能需要注意调节情绪。"
    }`;
  }

  private generateRecommendation(
    entries: DiaryEntry[],
    trajectory: EmotionTrajectoryPoint[],
    patterns: EmotionEvolutionPattern[],
    profile?: HealthProfile
  ): EmotionInsight | null {
    if (entries.length < 3) return null;

    const recentEntries = entries.slice(-7);
    const avgSentiment = mean(recentEntries.map((e) => e.sentimentScore));
    const negativeCount = recentEntries.filter(
      (e) => NEGATIVE_EMOTIONS.has(e.mood)
    ).length;

    let title = "";
    let description = "";
    let confidence = 0.6;

    if (avgSentiment < -0.3 || negativeCount >= 3) {
      title = "建议增加积极活动";
      description =
        "近期你的情绪状态偏低，建议尝试以下方法改善心情：1) 保持规律的作息和运动；2) 与朋友或家人交流；3) 尝试冥想或深呼吸练习；4) 记录让你感恩的事情。";
      confidence = 0.8;
    } else if (avgSentiment > 0.3) {
      title = "保持良好状态";
      description =
        "你的情绪状态很好！建议继续保持当前的生活方式，同时可以尝试记录让你感到幸福的时刻，以便在情绪低落时回顾。";
      confidence = 0.7;
    } else {
      title = "维持情绪平衡";
      description =
        "你的情绪状态整体平稳。建议继续保持规律的日记记录，这有助于你更好地了解自己的情绪模式，及时发现潜在的问题。";
      confidence = 0.6;
    }

    if (profile && profile.copingStrategies.length > 0) {
      description += ` 你之前记录的应对策略包括：${profile.copingStrategies.join("、")}。`;
    }

    const recSteps: string[] = [];
    if (avgSentiment < -0.3 || negativeCount >= 3) {
      recSteps.push("每天进行 15 分钟的户外活动");
      recSteps.push("尝试记录三件让你感恩的事情");
      recSteps.push("与信任的人分享你的感受");
    } else if (avgSentiment > 0.3) {
      recSteps.push("继续保持当前的积极生活态度");
      recSteps.push("记录下让你感到幸福的时刻");
      recSteps.push("尝试帮助他人，传递积极能量");
    } else {
      recSteps.push("保持规律的日记记录习惯");
      recSteps.push("关注自己的情绪变化模式");
      recSteps.push("尝试新的活动来丰富生活");
    }

    return {
      id: generateId(),
      type: "recommendation",
      category: "wellbeing_recommendation",
      title,
      description,
      confidence,
      evidence: [
        `近期平均情绪得分: ${avgSentiment.toFixed(3)}`,
        `消极情绪日记: ${negativeCount}/${recentEntries.length} 篇`,
        `分析模式数: ${patterns.length} 个`,
      ],
      actionableSteps: recSteps,
      timestamp: Date.now(),
      relatedEntryIds: recentEntries.map((e) => e.id),
    };
  }

  calculateWellbeingScore(
    entries: DiaryEntry[],
    trajectory: EmotionTrajectoryPoint[]
  ): WellbeingScore {
    if (entries.length === 0) {
      return {
        overall: 50,
        dimensions: {
          emotional: 50,
          social: 50,
          physical: 50,
          cognitive: 50,
          behavioral: 50,
        },
      };
    }

    const sentimentScore = normalize(mean(entries.map((e) => e.sentimentScore)), -1, 1) * 100;

    const emotionVariety =
      new Set(trajectory.map((p) => p.emotion)).size / EMOTION_TYPES.length;
    const varietyScore = emotionVariety * 100;

    const positiveRatio =
      trajectory.filter((p) => POSITIVE_EMOTIONS.has(p.emotion)).length /
      Math.max(trajectory.length, 1);
    const positiveScore = positiveRatio * 100;

    const negativeCount = trajectory.filter((p) => NEGATIVE_EMOTIONS.has(p.emotion)).length;
    const resilienceScore = Math.max(0, 100 - negativeCount * 10);

    const entriesLastWeek = entries.filter(
      (e) => e.createdAt > Date.now() - 7 * 24 * 60 * 60 * 1000
    ).length;
    const consistencyScore = Math.min(entriesLastWeek * 14, 100);

    const overall = Math.round(Math.max(0, Math.min(100,
      sentimentScore * 0.35 +
      varietyScore * 0.15 +
      positiveScore * 0.25 +
      resilienceScore * 0.15 +
      consistencyScore * 0.1
    )));

    return {
      overall,
      dimensions: {
        emotional: Math.round(sentimentScore),
        social: Math.round(positiveScore * 0.8 + varietyScore * 0.2),
        physical: Math.round(resilienceScore),
        cognitive: Math.round(varietyScore * 0.6 + sentimentScore * 0.4),
        behavioral: Math.round(consistencyScore),
      },
    };
  }

  generateHeartbeatPath(trajectory: EmotionTrajectoryPoint[], width: number, height: number): string {
    if (trajectory.length < 2) return "";

    const points = trajectory.map((p, i) => {
      const x = normalize(i, 0, trajectory.length - 1) * width;
      const emotionValue = this.emotionToY(p.emotion, p.intensity);
      const y = height - normalize(emotionValue, -1, 1) * height * 0.8 - height * 0.1;
      return { x, y };
    });

    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx1 = prev.x + (curr.x - prev.x) / 3;
      const cpy1 = prev.y;
      const cpx2 = prev.x + ((curr.x - prev.x) * 2) / 3;
      const cpy2 = curr.y;
      path += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${curr.x} ${curr.y}`;
    }

    return path;
  }

  private emotionToY(emotion: EmotionType, intensity: number): number {
    if (POSITIVE_EMOTIONS.has(emotion)) return intensity;
    if (NEGATIVE_EMOTIONS.has(emotion)) return -intensity;
    return 0;
  }
}

export const emotionTrajectoryEngine = new EmotionTrajectoryEngine();

export default emotionTrajectoryEngine;
