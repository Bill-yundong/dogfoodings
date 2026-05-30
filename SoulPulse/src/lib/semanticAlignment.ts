import {
  PhysiologicalData,
  LinguisticFeatures,
  SemanticAlignment,
  EmotionType,
  DiaryEntry,
} from "@/types";
import { EMOTION_TYPES, POSITIVE_EMOTIONS, NEGATIVE_EMOTIONS } from "@/lib/constants";
import { correlation, normalize, mean, clamp, stdDev } from "@/lib/utils";

export interface PhysiologicalEmotionMapping {
  heartRate: Record<EmotionType, [number, number]>;
  heartRateVariability: Record<EmotionType, [number, number]>;
  skinTemperature: Record<EmotionType, [number, number]>;
  galvanicSkinResponse: Record<EmotionType, [number, number]>;
  respiratoryRate: Record<EmotionType, [number, number]>;
  stressLevel: Record<EmotionType, [number, number]>;
  energyLevel: Record<EmotionType, [number, number]>;
}

const PHYSIOLOGICAL_EMOTION_MAPPING: PhysiologicalEmotionMapping = {
  heartRate: {
    joy: [70, 90],
    trust: [60, 75],
    fear: [85, 110],
    surprise: [75, 100],
    sadness: [55, 70],
    disgust: [70, 85],
    anger: [80, 110],
    anticipation: [70, 90],
    neutral: [60, 80],
  },
  heartRateVariability: {
    joy: [40, 60],
    trust: [50, 70],
    fear: [20, 40],
    surprise: [30, 50],
    sadness: [30, 50],
    disgust: [30, 45],
    anger: [25, 40],
    anticipation: [35, 55],
    neutral: [45, 65],
  },
  skinTemperature: {
    joy: [32, 34],
    trust: [31, 33],
    fear: [30, 32],
    surprise: [31, 33],
    sadness: [30, 32],
    disgust: [31, 33],
    anger: [33, 35],
    anticipation: [31, 33],
    neutral: [31, 33],
  },
  galvanicSkinResponse: {
    joy: [3, 8],
    trust: [1, 4],
    fear: [8, 15],
    surprise: [6, 12],
    sadness: [2, 5],
    disgust: [4, 8],
    anger: [7, 14],
    anticipation: [5, 10],
    neutral: [2, 6],
  },
  respiratoryRate: {
    joy: [14, 20],
    trust: [12, 16],
    fear: [20, 30],
    surprise: [18, 25],
    sadness: [10, 14],
    disgust: [14, 18],
    anger: [18, 28],
    anticipation: [16, 22],
    neutral: [12, 18],
  },
  stressLevel: {
    joy: [1, 3],
    trust: [0, 2],
    fear: [6, 10],
    surprise: [4, 7],
    sadness: [4, 8],
    disgust: [3, 6],
    anger: [7, 10],
    anticipation: [3, 6],
    neutral: [1, 4],
  },
  energyLevel: {
    joy: [6, 10],
    trust: [4, 7],
    fear: [5, 8],
    surprise: [7, 10],
    sadness: [1, 4],
    disgust: [3, 6],
    anger: [6, 9],
    anticipation: [5, 8],
    neutral: [3, 6],
  },
};

export class SemanticAlignmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SemanticAlignmentError";
  }
}

export class SemanticAlignmentEngine {
  private physiologicalBaseline: Map<string, number[]> = new Map();

  updateBaseline(physiologicalData: PhysiologicalData): void {
    const fields: (keyof PhysiologicalData)[] = [
      "heartRate",
      "heartRateVariability",
      "skinTemperature",
      "galvanicSkinResponse",
      "respiratoryRate",
      "stressLevel",
      "energyLevel",
    ];

    for (const field of fields) {
      const value = physiologicalData[field];
      if (typeof value === "number") {
        const history = this.physiologicalBaseline.get(field) || [];
        history.push(value);
        if (history.length > 100) {
          history.shift();
        }
        this.physiologicalBaseline.set(field, history);
      }
    }
  }

  getBaseline(field: keyof PhysiologicalData): { mean: number; stdDev: number } | null {
    const history = this.physiologicalBaseline.get(field);
    if (!history || history.length < 5) return null;
    return {
      mean: mean(history),
      stdDev: stdDev(history),
    };
  }

  calculatePhysiologicalEmotionScore(
    physiologicalData: PhysiologicalData
  ): Record<EmotionType, number> {
    const scores: Record<EmotionType, number> = {} as Record<EmotionType, number>;

    for (const emotion of EMOTION_TYPES) {
      let emotionScore = 0;
      let weightSum = 0;

      const fieldWeights: Record<string, number> = {
        heartRate: 0.2,
        heartRateVariability: 0.2,
        skinTemperature: 0.1,
        galvanicSkinResponse: 0.15,
        respiratoryRate: 0.1,
        stressLevel: 0.15,
        energyLevel: 0.1,
      };

      for (const [field, weight] of Object.entries(fieldWeights)) {
        const value = physiologicalData[field as keyof PhysiologicalData];
        if (typeof value !== "number") continue;

        const mapping = PHYSIOLOGICAL_EMOTION_MAPPING[
          field as keyof PhysiologicalEmotionMapping
        ];
        if (!mapping) continue;

        const [minRange, maxRange] = mapping[emotion];
        const baseline = this.getBaseline(field as keyof PhysiologicalData);

        let normalizedValue: number;
        if (baseline) {
          normalizedValue = normalize(value, baseline.mean - baseline.stdDev * 2, baseline.mean + baseline.stdDev * 2);
        } else {
          normalizedValue = normalize(value, minRange - 20, maxRange + 20);
        }

        const idealMidpoint = (minRange + maxRange) / 2;
        const idealRange = maxRange - minRange;
        const matchScore = Math.max(0, 1 - Math.abs(value - idealMidpoint) / (idealRange || 1));

        emotionScore += matchScore * weight;
        weightSum += weight;
      }

      scores[emotion] = weightSum > 0 ? emotionScore / weightSum : 0;
    }

    const total = Object.values(scores).reduce((sum, s) => sum + s, 0);
    if (total > 0) {
      for (const emotion of EMOTION_TYPES) {
        scores[emotion] = scores[emotion] / total;
      }
    }

    return scores;
  }

  calculateLinguisticEmotionScore(
    linguisticFeatures: LinguisticFeatures,
    sentimentScore: number
  ): Record<EmotionType, number> {
    const scores: Record<EmotionType, number> = {} as Record<EmotionType, number>;

    for (const emotion of EMOTION_TYPES) {
      let score = 0;

      if (POSITIVE_EMOTIONS.has(emotion)) {
        score += Math.max(0, sentimentScore) * 0.4;
      } else if (NEGATIVE_EMOTIONS.has(emotion)) {
        score += Math.max(0, -sentimentScore) * 0.4;
      } else {
        score += (1 - Math.abs(sentimentScore)) * 0.4;
      }

      score += linguisticFeatures.emotionalWords.intensity * 0.2;

      if (emotion === "joy" || emotion === "trust") {
        score += linguisticFeatures.pronounUsage.firstPerson * 0.15;
        score += linguisticFeatures.temporalOrientation.present * 0.1;
      }

      if (emotion === "fear" || emotion === "sadness") {
        score += linguisticFeatures.temporalOrientation.past * 0.15;
        score += linguisticFeatures.cognitiveProcesses.discrepancy * 0.1;
      }

      if (emotion === "anticipation") {
        score += linguisticFeatures.temporalOrientation.future * 0.2;
      }

      if (emotion === "anger") {
        score += linguisticFeatures.cognitiveProcesses.certainty * 0.15;
      }

      if (emotion === "neutral") {
        score += (1 - Math.abs(linguisticFeatures.emotionalWords.intensity)) * 0.2;
      }

      score += linguisticFeatures.vocabularyRichness * 0.1;

      scores[emotion] = clamp(score, 0, 1);
    }

    const total = Object.values(scores).reduce((sum, s) => sum + s, 0);
    if (total > 0) {
      for (const emotion of EMOTION_TYPES) {
        scores[emotion] = scores[emotion] / total;
      }
    }

    return scores;
  }

  alignSemantics(
    linguisticFeatures: LinguisticFeatures,
    sentimentScore: number,
    physiologicalData?: PhysiologicalData
  ): SemanticAlignment {
    const linguisticScores = this.calculateLinguisticEmotionScore(
      linguisticFeatures,
      sentimentScore
    );

    let physiologicalScores: Record<EmotionType, number>;
    if (physiologicalData) {
      physiologicalScores = this.calculatePhysiologicalEmotionScore(physiologicalData);
    } else {
      physiologicalScores = { ...linguisticScores };
    }

    const linguisticVector = Object.values(linguisticScores);
    const physiologicalVector = Object.values(physiologicalScores);

    const correlationCoefficient = correlation(linguisticVector, physiologicalVector);

    const alignedScores: Record<EmotionType, number> = {} as Record<EmotionType, number>;
    const linguisticWeight = 0.6;
    const physiologicalWeight = 0.4;

    for (const emotion of EMOTION_TYPES) {
      alignedScores[emotion] =
        linguisticScores[emotion] * linguisticWeight +
        physiologicalScores[emotion] * physiologicalWeight;
    }

    let alignedEmotion: EmotionType = "neutral";
    let maxScore = 0;
    for (const emotion of EMOTION_TYPES) {
      if (alignedScores[emotion] > maxScore) {
        maxScore = alignedScores[emotion];
        alignedEmotion = emotion;
      }
    }

    const linguisticEmotionScore = Object.values(linguisticScores).reduce(
      (sum, v) => sum + v * (POSITIVE_EMOTIONS.has(EMOTION_TYPES[Object.values(linguisticScores).indexOf(v)]) ? 1 : NEGATIVE_EMOTIONS.has(EMOTION_TYPES[Object.values(linguisticScores).indexOf(v)]) ? -1 : 0),
      0
    );

    const physiologicalEmotionScore = Object.values(physiologicalScores).reduce(
      (sum, v) => sum + v * (POSITIVE_EMOTIONS.has(EMOTION_TYPES[Object.values(physiologicalScores).indexOf(v)]) ? 1 : NEGATIVE_EMOTIONS.has(EMOTION_TYPES[Object.values(physiologicalScores).indexOf(v)]) ? -1 : 0),
      0
    );

    const featureMatches: string[] = [];
    const discrepancies: string[] = [];

    for (const emotion of EMOTION_TYPES) {
      const diff = Math.abs(linguisticScores[emotion] - physiologicalScores[emotion]);
      if (diff < 0.1) {
        featureMatches.push(emotion);
      } else if (diff > 0.3) {
        discrepancies.push(emotion);
      }
    }

    if (physiologicalData && Math.abs(sentimentScore - (physiologicalData.energyLevel || 5) / 5 + 1) < 0.2) {
      featureMatches.push("sentiment-energy");
    } else if (physiologicalData) {
      discrepancies.push("sentiment-energy");
    }

    const alignmentConfidence = clamp(
      (correlationCoefficient + 1) / 2 * 0.6 +
        (1 - discrepancies.length / EMOTION_TYPES.length) * 0.4,
      0,
      1
    );

    return {
      linguisticEmotionScore: clamp(linguisticEmotionScore, -1, 1),
      physiologicalEmotionScore: clamp(physiologicalEmotionScore, -1, 1),
      alignmentConfidence,
      alignedEmotion,
      alignmentFeatures: {
        correlationCoefficient,
        featureMatches,
        discrepancies,
      },
    };
  }

  async alignEntry(entry: DiaryEntry): Promise<DiaryEntry> {
    const semanticAlignment = this.alignSemantics(
      entry.linguisticFeatures,
      entry.sentimentScore,
      entry.physiologicalData
    );

    return {
      ...entry,
      semanticAlignment,
    };
  }

  generateAlignmentReport(alignments: SemanticAlignment[]): {
    averageConfidence: number;
    commonMatches: string[];
    commonDiscrepancies: string[];
    alignmentTrend: number[];
  } {
    if (alignments.length === 0) {
      return {
        averageConfidence: 0,
        commonMatches: [],
        commonDiscrepancies: [],
        alignmentTrend: [],
      };
    }

    const averageConfidence = mean(alignments.map((a) => a.alignmentConfidence));

    const matchCounts: Record<string, number> = {};
    const discrepancyCounts: Record<string, number> = {};

    for (const alignment of alignments) {
      for (const match of alignment.alignmentFeatures.featureMatches) {
        matchCounts[match] = (matchCounts[match] || 0) + 1;
      }
      for (const discrepancy of alignment.alignmentFeatures.discrepancies) {
        discrepancyCounts[discrepancy] = (discrepancyCounts[discrepancy] || 0) + 1;
      }
    }

    const commonMatches = Object.entries(matchCounts)
      .sort((a, b) => b[1] - a[1])
      .filter(([, count]) => count > alignments.length * 0.3)
      .map(([feature]) => feature);

    const commonDiscrepancies = Object.entries(discrepancyCounts)
      .sort((a, b) => b[1] - a[1])
      .filter(([, count]) => count > alignments.length * 0.3)
      .map(([feature]) => feature);

    const alignmentTrend = alignments.map((a) => a.alignmentConfidence);

    return {
      averageConfidence,
      commonMatches,
      commonDiscrepancies,
      alignmentTrend,
    };
  }

  simulatePhysiologicalData(
    emotion: EmotionType,
    intensity: number = 0.5
  ): PhysiologicalData {
    const data: PhysiologicalData = {
      measurementTimestamp: Date.now(),
    };

    const fields: (keyof PhysiologicalEmotionMapping)[] = [
      "heartRate",
      "heartRateVariability",
      "skinTemperature",
      "galvanicSkinResponse",
      "respiratoryRate",
      "stressLevel",
      "energyLevel",
    ];

    for (const field of fields) {
      const [minRange, maxRange] = PHYSIOLOGICAL_EMOTION_MAPPING[field][emotion];
      const midpoint = (minRange + maxRange) / 2;
      const range = maxRange - minRange;

      const variance = (Math.random() - 0.5) * range * intensity;
      const value = midpoint + variance;

      (data as any)[field] = Math.round(value * 10) / 10;
    }

    return data;
  }
}

export const semanticAlignmentEngine = new SemanticAlignmentEngine();

export default semanticAlignmentEngine;

export function mapEmotionToPhysiologicalRange(
  emotion: EmotionType,
  metric: keyof PhysiologicalEmotionMapping
): [number, number] {
  return PHYSIOLOGICAL_EMOTION_MAPPING[metric][emotion];
}

export function calculateAlignmentQuality(
  linguisticScore: number,
  physiologicalScore: number
): "excellent" | "good" | "fair" | "poor" {
  const diff = Math.abs(linguisticScore - physiologicalScore);
  if (diff < 0.15) return "excellent";
  if (diff < 0.3) return "good";
  if (diff < 0.5) return "fair";
  return "poor";
}
