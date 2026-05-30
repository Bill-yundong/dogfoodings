import { DiaryEntry, HealthProfile, PhysiologicalData, EmotionType } from "@/types";
import { semanticAlignmentEngine } from "@/lib/semanticAlignment";
import { emotionTrajectoryEngine } from "@/lib/emotionTrajectory";
import { generateId } from "@/lib/utils";
import { EMOTION_TYPES, POSITIVE_EMOTIONS, NEGATIVE_EMOTIONS } from "@/lib/constants";

export interface HealthDataProvider {
  name: string;
  icon: string;
  fetchPhysiologicalData: () => Promise<PhysiologicalData | null>;
  syncEnabled: boolean;
  lastSync: number;
}

export interface RiskAssessment {
  level: "low" | "moderate" | "high" | "critical";
  score: number;
  factors: string[];
  recommendations: string[];
  lastUpdated: number;
}

export interface CopingStrategy {
  id: string;
  name: string;
  description: string;
  category: "relaxation" | "cognitive" | "behavioral" | "social" | "physical";
  effectiveness: number;
  usageCount: number;
  lastUsed?: number;
}

export class HealthIntegrationService {
  private providers: Map<string, HealthDataProvider> = new Map();
  private apiEndpoint: string | null = null;
  private syncToken: string | null = null;

  registerProvider(provider: HealthDataProvider): void {
    this.providers.set(provider.name, provider);
  }

  unregisterProvider(name: string): void {
    this.providers.delete(name);
  }

  getProviders(): HealthDataProvider[] {
    return Array.from(this.providers.values());
  }

  configureApi(endpoint: string, token: string): void {
    this.apiEndpoint = endpoint;
    this.syncToken = token;
  }

  async fetchAllPhysiologicalData(): Promise<Map<string, PhysiologicalData>> {
    const results = new Map<string, PhysiologicalData>();

    for (const provider of this.providers.values()) {
      if (provider.syncEnabled) {
        try {
          const data = await provider.fetchPhysiologicalData();
          if (data) {
            results.set(provider.name, data);
            semanticAlignmentEngine.updateBaseline(data);
          }
        } catch (error) {
          console.error(`Failed to fetch data from ${provider.name}:`, error);
        }
      }
    }

    return results;
  }

  mergePhysiologicalData(dataMap: Map<string, PhysiologicalData>): PhysiologicalData {
    const merged: PhysiologicalData = {
      measurementTimestamp: Date.now(),
    };

    const fieldWeights: Record<string, number> = {};

    for (const [providerName, data] of dataMap.entries()) {
      const provider = this.providers.get(providerName);
      const weight = provider ? 1 / dataMap.size : 1;

      for (const [key, value] of Object.entries(data)) {
        if (key === "measurementTimestamp") continue;
        if (typeof value === "number") {
          if (!merged[key as keyof PhysiologicalData] || typeof merged[key as keyof PhysiologicalData] !== "number") {
            (merged as any)[key] = value * weight;
            fieldWeights[key] = weight;
          } else {
            (merged as any)[key] = (merged as any)[key] + value * weight;
            fieldWeights[key] += weight;
          }
        } else if (typeof value === "object" && value !== null) {
          if (!merged[key as keyof PhysiologicalData]) {
            (merged as any)[key] = { ...value };
          } else {
            const existing = (merged as any)[key];
            for (const [subKey, subValue] of Object.entries(value)) {
              if (typeof subValue === "number") {
                if (existing[subKey] === undefined) {
                  existing[subKey] = subValue * weight;
                } else {
                  existing[subKey] = existing[subKey] + subValue * weight;
                }
              }
            }
          }
        }
      }
    }

    for (const [key, weight] of Object.entries(fieldWeights)) {
      if (typeof (merged as any)[key] === "number") {
        (merged as any)[key] = Math.round(((merged as any)[key] / weight) * 10) / 10;
      }
    }

    return merged;
  }

  async assessRisks(
    entries: DiaryEntry[],
    profile?: HealthProfile
  ): Promise<RiskAssessment> {
    let riskScore = 0;
    const factors: string[] = [];
    const recommendations: string[] = [];

    const recentEntries = entries.filter(
      (e) => e.createdAt > Date.now() - 14 * 24 * 60 * 60 * 1000
    );

    if (recentEntries.length === 0) {
      return {
        level: "low",
        score: 15,
        factors: ["近期日记记录不足，无法准确评估风险"],
        recommendations: ["建议每天记录心情日记，以便更准确地了解情绪状态"],
        lastUpdated: Date.now(),
      };
    }

    const negativeCount = recentEntries.filter((e) => NEGATIVE_EMOTIONS.has(e.mood)).length;
    const negativeRatio = negativeCount / recentEntries.length;

    if (negativeRatio > 0.6) {
      riskScore += 35;
      factors.push(`近期${Math.round(negativeRatio * 100)}%的日记呈现消极情绪`);
      recommendations.push("消极情绪持续时间较长，建议与专业心理咨询师沟通");
    } else if (negativeRatio > 0.4) {
      riskScore += 20;
      factors.push(`近期${Math.round(negativeRatio * 100)}%的日记呈现消极情绪`);
      recommendations.push("消极情绪较多，建议增加社交活动和运动");
    }

    const trajectory = emotionTrajectoryEngine.buildTrajectory(entries);
    const patterns = emotionTrajectoryEngine.detectPatterns(trajectory);

    const reactivePatterns = patterns.filter((p) => p.patternType === "reactive");
    if (reactivePatterns.length > 0) {
      riskScore += 15;
      factors.push("检测到情绪反应性波动模式");
      recommendations.push("情绪波动较大，建议学习情绪调节技巧，如深呼吸和正念练习");
    }

    const avgSentiment =
      recentEntries.reduce((sum, e) => sum + e.sentimentScore, 0) / recentEntries.length;
    if (avgSentiment < -0.3) {
      riskScore += 20;
      factors.push(`平均情绪得分偏低 (${avgSentiment.toFixed(2)})`);
      recommendations.push("整体情绪状态偏低，建议记录每天的积极时刻");
    }

    const entriesLastWeek = entries.filter(
      (e) => e.createdAt > Date.now() - 7 * 24 * 60 * 60 * 1000
    ).length;
    if (entriesLastWeek < 3) {
      riskScore += 10;
      factors.push("近期日记记录频率较低");
      recommendations.push("保持规律的日记记录有助于情绪管理");
    }

    if (profile) {
      if (profile.wellbeingScore < 40) {
        riskScore += 15;
        factors.push(`心理健康综合评分偏低 (${profile.wellbeingScore}/100)`);
      }
      if (profile.riskIndicators.length > 0) {
        riskScore += profile.riskIndicators.length * 5;
        factors.push(...profile.riskIndicators.map((r) => `风险指标: ${r}`));
      }
    }

    for (const entry of recentEntries) {
      if (entry.physiologicalData) {
        const { stressLevel, heartRate, sleepQuality } = entry.physiologicalData;
        if (stressLevel !== undefined && stressLevel > 7) {
          riskScore += 5;
          factors.push("检测到高压力水平的生理指标");
          recommendations.push("压力水平较高，建议进行放松练习");
          break;
        }
        if (heartRate !== undefined && heartRate > 100) {
          factors.push("静息心率偏高，建议关注身体状态");
        }
        if (sleepQuality !== undefined && sleepQuality < 4) {
          factors.push("睡眠质量较差，建议改善作息");
          recommendations.push("睡眠质量影响情绪状态，建议保持规律作息");
          break;
        }
      }
    }

    let level: RiskAssessment["level"] = "low";
    if (riskScore >= 70) level = "critical";
    else if (riskScore >= 45) level = "high";
    else if (riskScore >= 25) level = "moderate";

    if (recommendations.length === 0) {
      recommendations.push("继续保持良好的情绪管理习惯");
    }

    return {
      level,
      score: Math.min(Math.round(riskScore), 100),
      factors,
      recommendations,
      lastUpdated: Date.now(),
    };
  }

  generateCopingStrategies(
    assessment: RiskAssessment,
    entries: DiaryEntry[]
  ): CopingStrategy[] {
    const strategies: CopingStrategy[] = [];
    const triggers = new Set<string>();

    for (const entry of entries) {
      if (NEGATIVE_EMOTIONS.has(entry.mood)) {
        for (const tag of entry.tags) {
          triggers.add(tag);
        }
      }
    }

    if (assessment.level === "high" || assessment.level === "critical") {
      strategies.push({
        id: generateId(),
        name: "专业咨询",
        description: "建议预约专业心理咨询师进行一对一咨询",
        category: "social",
        effectiveness: 0.9,
        usageCount: 0,
      });
    }

    strategies.push({
      id: generateId(),
      name: "深呼吸练习",
      description: "4-7-8 呼吸法：吸气4秒，屏息7秒，呼气8秒，重复5次",
      category: "relaxation",
      effectiveness: 0.75,
      usageCount: 0,
    });

    strategies.push({
      id: generateId(),
      name: "正念冥想",
      description: "每天进行5-10分钟的正念冥想，专注于当下的感受",
      category: "cognitive",
      effectiveness: 0.8,
      usageCount: 0,
    });

    strategies.push({
      id: generateId(),
      name: "有氧运动",
      description: "每天进行30分钟有氧运动，如快走、跑步或游泳",
      category: "physical",
      effectiveness: 0.85,
      usageCount: 0,
    });

    strategies.push({
      id: generateId(),
      name: "社交支持",
      description: "与信任的朋友或家人分享你的感受",
      category: "social",
      effectiveness: 0.7,
      usageCount: 0,
    });

    strategies.push({
      id: generateId(),
      name: "情绪日记",
      description: "继续记录情绪日记，识别情绪触发因素",
      category: "cognitive",
      effectiveness: 0.65,
      usageCount: 0,
    });

    if (triggers.size > 0) {
      strategies.push({
        id: generateId(),
        name: "触发因素管理",
        description: `尝试减少接触以下触发因素: ${Array.from(triggers).slice(0, 3).join(", ")}`,
        category: "behavioral",
        effectiveness: 0.6,
        usageCount: 0,
      });
    }

    return strategies.sort((a, b) => b.effectiveness - a.effectiveness);
  }

  async syncWithHealthSystem(entries: DiaryEntry[]): Promise<{
    success: boolean;
    syncedCount: number;
    message?: string;
  }> {
    if (!this.apiEndpoint || !this.syncToken) {
      return {
        success: false,
        syncedCount: 0,
        message: "未配置健康系统API",
      };
    }

    try {
      const syncData = entries
        .filter((e) => !e.checksum)
        .map((entry) => ({
          entryId: entry.id,
          timestamp: entry.createdAt,
          sentimentScore: entry.sentimentScore,
          mood: entry.mood,
          emotionVector: entry.emotionVector,
          semanticAlignment: entry.semanticAlignment
            ? {
                alignmentConfidence: entry.semanticAlignment.alignmentConfidence,
                alignedEmotion: entry.semanticAlignment.alignedEmotion,
              }
            : null,
          physiologicalData: entry.physiologicalData
            ? {
                heartRate: entry.physiologicalData.heartRate,
                stressLevel: entry.physiologicalData.stressLevel,
                sleepQuality: entry.physiologicalData.sleepQuality,
              }
            : null,
        }));

      const response = await fetch(`${this.apiEndpoint}/api/v1/emotion/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.syncToken}`,
        },
        body: JSON.stringify({
          data: syncData,
          syncTimestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        syncedCount: syncData.length,
        message: result.message,
      };
    } catch (error) {
      return {
        success: false,
        syncedCount: 0,
        message: `同步失败: ${error}`,
      };
    }
  }

  async fetchRecommendationsFromSystem(
    profile: HealthProfile,
    entries: DiaryEntry[]
  ): Promise<string[]> {
    if (!this.apiEndpoint || !this.syncToken) {
      return [];
    }

    try {
      const response = await fetch(`${this.apiEndpoint}/api/v1/recommendations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.syncToken}`,
        },
        body: JSON.stringify({
          profile: {
            wellbeingScore: profile.wellbeingScore,
            emotionTriggers: profile.emotionTriggers,
          },
          recentEntriesCount: entries.length,
          avgSentiment:
            entries.length > 0
              ? entries.reduce((sum, e) => sum + e.sentimentScore, 0) / entries.length
              : 0,
        }),
      });

      if (!response.ok) return [];
      const result = await response.json();
      return result.recommendations || [];
    } catch {
      return [];
    }
  }

  generateHealthReport(
    entries: DiaryEntry[],
    profile: HealthProfile,
    timeframe: "week" | "month" | "year" = "month"
  ): {
    summary: string;
    emotionBreakdown: Record<EmotionType, number>;
    sentimentTrend: number[];
    keyInsights: string[];
    recommendations: string[];
    generatedAt: number;
    timeframe: string;
  } {
    const now = Date.now();
    const timeframes: Record<string, number> = {
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      year: 365 * 24 * 60 * 60 * 1000,
    };

    const timeframeMs = timeframes[timeframe];
    const filteredEntries = entries.filter((e) => e.createdAt > now - timeframeMs);

    const emotionBreakdown: Record<EmotionType, number> = {} as Record<EmotionType, number>;
    for (const emotion of EMOTION_TYPES) {
      emotionBreakdown[emotion] = 0;
    }

    for (const entry of filteredEntries) {
      for (const emotion of EMOTION_TYPES) {
        emotionBreakdown[emotion] += entry.emotionVector[emotion] || 0;
      }
    }

    const total = Object.values(emotionBreakdown).reduce((sum, v) => sum + v, 0);
    if (total > 0) {
      for (const emotion of EMOTION_TYPES) {
        emotionBreakdown[emotion] = emotionBreakdown[emotion] / total;
      }
    }

    const sortedEntries = [...filteredEntries].sort((a, b) => a.createdAt - b.createdAt);
    const sentimentTrend = sortedEntries.map((e) => e.sentimentScore);

    const trajectory = emotionTrajectoryEngine.buildTrajectory(filteredEntries);
    const patterns = emotionTrajectoryEngine.detectPatterns(trajectory);
    const insights = emotionTrajectoryEngine.generateInsights(
      filteredEntries,
      trajectory,
      patterns,
      profile
    );

    const avgSentiment =
      filteredEntries.length > 0
        ? filteredEntries.reduce((sum, e) => sum + e.sentimentScore, 0) / filteredEntries.length
        : 0;

    let summary = "";
    if (avgSentiment > 0.3) {
      summary = `在过去的${timeframe === "week" ? "一周" : timeframe === "month" ? "一个月" : "一年"}中，你的整体情绪状态积极。`;
    } else if (avgSentiment < -0.3) {
      summary = `在过去的${timeframe === "week" ? "一周" : timeframe === "month" ? "一个月" : "一年"}中，你的情绪状态需要关注。`;
    } else {
      summary = `在过去的${timeframe === "week" ? "一周" : timeframe === "month" ? "一个月" : "一年"}中，你的情绪状态整体平稳。`;
    }

    const positiveCount = filteredEntries.filter((e) => POSITIVE_EMOTIONS.has(e.mood)).length;
    const negativeCount = filteredEntries.filter((e) => NEGATIVE_EMOTIONS.has(e.mood)).length;
    summary += `共记录 ${filteredEntries.length} 篇日记，其中积极情绪 ${positiveCount} 篇，消极情绪 ${negativeCount} 篇。`;

    const keyInsights = insights.slice(0, 5).map((i) => i.title);
    const recommendations = insights
      .filter((i) => i.type === "recommendation")
      .map((i) => i.description);

    return {
      summary,
      emotionBreakdown,
      sentimentTrend,
      keyInsights,
      recommendations: recommendations.length > 0 ? recommendations : ["继续保持良好的记录习惯"],
      generatedAt: now,
      timeframe,
    };
  }
}

export const healthIntegrationService = new HealthIntegrationService();

export default healthIntegrationService;

export const defaultCopingStrategies: CopingStrategy[] = [
  {
    id: "deep-breathing",
    name: "深呼吸练习",
    description: "4-7-8 呼吸法：吸气4秒，屏息7秒，呼气8秒",
    category: "relaxation",
    effectiveness: 0.75,
    usageCount: 0,
  },
  {
    id: "progressive-muscle",
    name: "渐进式肌肉放松",
    description: "从头到脚逐组肌肉紧绷再放松",
    category: "relaxation",
    effectiveness: 0.7,
    usageCount: 0,
  },
  {
    id: "mindfulness",
    name: "正念冥想",
    description: "专注于呼吸和当下的感受，持续5-10分钟",
    category: "cognitive",
    effectiveness: 0.8,
    usageCount: 0,
  },
  {
    id: "cognitive-reframing",
    name: "认知重构",
    description: "识别并挑战消极的思维模式",
    category: "cognitive",
    effectiveness: 0.75,
    usageCount: 0,
  },
  {
    id: "exercise",
    name: "有氧运动",
    description: "30分钟快走、跑步或其他有氧运动",
    category: "physical",
    effectiveness: 0.85,
    usageCount: 0,
  },
  {
    id: "social-connection",
    name: "社交联结",
    description: "与朋友或家人进行有意义的对话",
    category: "social",
    effectiveness: 0.7,
    usageCount: 0,
  },
];
