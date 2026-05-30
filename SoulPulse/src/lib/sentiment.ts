import {
  LinguisticFeatures,
  EmotionType,
  SentimentLevel,
  DiaryEntry,
} from "@/types";
import {
  EMOTION_TYPES,
  SENTIMENT_LEVELS,
  FIRST_PERSON_PRONOUNS,
  SECOND_PERSON_PRONOUNS,
  THIRD_PERSON_PRONOUNS,
  PAST_TENSE_WORDS,
  PRESENT_TENSE_WORDS,
  FUTURE_TENSE_WORDS,
  COGNITIVE_INSIGHT_WORDS,
  COGNITIVE_CAUSATION_WORDS,
  COGNITIVE_DISCREPANCY_WORDS,
  COGNITIVE_TENTATIVE_WORDS,
  COGNITIVE_CERTAINTY_WORDS,
  POSITIVE_EMOTIONS,
  NEGATIVE_EMOTIONS,
} from "@/lib/constants";
import { parseText, tokenize, mean, normalize, clamp } from "@/lib/utils";

const CHINESE_POSITIVE_WORDS = [
  "开心", "快乐", "幸福", "喜悦", "满足", "感恩", "希望", "乐观", "自信", "勇敢",
  "温暖", "美好", "成功", "进步", "成长", "爱", "喜欢", "感激", "欣慰", "安心",
  "平静", "放松", "舒适", "愉快", "兴奋", "激动", "惊喜", "感动", "充实", "满足",
  "good", "happy", "joy", "love", "great", "excellent", "amazing", "wonderful", "fantastic",
  "positive", "optimistic", "grateful", "blessed", "content", "peaceful", "calm",
];

const CHINESE_NEGATIVE_WORDS = [
  "难过", "悲伤", "痛苦", "焦虑", "恐惧", "愤怒", "失望", "绝望", "自卑", "孤独",
  "疲惫", "压力", "紧张", "烦躁", "担忧", "害怕", "生气", "讨厌", "悔恨", "迷茫",
  "空虚", "无聊", "沮丧", "失落", "挫败", "失败", "受伤", "委屈", "难过", "不安",
  "sad", "angry", "fear", "anxious", "depressed", "stressed", "worried", "scared",
  "negative", "pessimistic", "lonely", "tired", "exhausted", "frustrated", "disappointed",
];

const EMOTION_KEYWORDS: Record<EmotionType, string[]> = {
  joy: ["开心", "快乐", "喜悦", "愉快", "兴奋", "高兴", "欢乐", "欣喜", "happy", "joy", "excited", "delighted"],
  trust: ["信任", "相信", "依赖", "安全", "安心", "放心", "faith", "trust", "believe", "confident"],
  fear: ["害怕", "恐惧", "担忧", "焦虑", "紧张", "不安", "afraid", "fear", "anxious", "worried", "scared"],
  surprise: ["惊讶", "吃惊", "意外", "惊喜", "震惊", "突然", "surprise", "amazed", "astonished", "shocked"],
  sadness: ["难过", "悲伤", "伤心", "痛苦", "失落", "沮丧", "sad", "sadness", "grief", "sorrow", "depressed"],
  disgust: ["厌恶", "讨厌", "恶心", "反感", "排斥", "disgust", "hate", "repulsed", "nauseated"],
  anger: ["愤怒", "生气", "恼火", "气愤", "暴怒", "愤恨", "anger", "angry", "furious", "irritated", "annoyed"],
  anticipation: ["期待", "盼望", "希望", "期盼", "憧憬", "未来", "anticipation", "expect", "hope", "looking forward"],
  neutral: ["平静", "一般", "平常", "普通", "正常", "neutral", "calm", "normal", "average"],
};

interface SentimentResult {
  sentimentScore: number;
  sentimentLevel: SentimentLevel;
  emotionVector: Record<EmotionType, number>;
  dominantEmotion: EmotionType;
  linguisticFeatures: LinguisticFeatures;
}

interface AnalysisTask {
  text: string;
  resolve: (result: SentimentResult) => void;
  reject: (error: Error) => void;
}

class AsyncSentimentEngine {
  private taskQueue: AnalysisTask[] = [];
  private isProcessing: boolean = false;
  private maxBatchSize: number = 5;

  async analyze(text: string): Promise<SentimentResult> {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({ text, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.taskQueue.length === 0) return;

    this.isProcessing = true;

    try {
      while (this.taskQueue.length > 0) {
        const batch = this.taskQueue.splice(0, this.maxBatchSize);

        await Promise.all(
          batch.map(async (task) => {
            try {
              const result = await this.performAnalysis(task.text);
              task.resolve(result);
            } catch (error) {
              task.reject(error as Error);
            }
          })
        );

        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async performAnalysis(text: string): Promise<SentimentResult> {
    await new Promise((resolve) => setTimeout(resolve, 10));

    const linguisticFeatures = this.extractLinguisticFeatures(text);
    const sentimentScore = this.calculateSentimentScore(text, linguisticFeatures);
    const emotionVector = this.calculateEmotionVector(text);
    const dominantEmotion = this.getDominantEmotion(emotionVector);
    const sentimentLevel = this.getSentimentLevel(sentimentScore);

    return {
      sentimentScore,
      sentimentLevel,
      emotionVector,
      dominantEmotion,
      linguisticFeatures,
    };
  }

  extractLinguisticFeatures(text: string): LinguisticFeatures {
    const words = parseText(text);
    const tokens = tokenize(text);
    const sentences = text.split(/[.!?。！？]+/).filter((s) => s.trim().length > 0);

    const wordCount = words.length;
    const sentenceCount = sentences.length;
    const avgWordLength = wordCount > 0 ? mean(tokens.map((t) => t.length)) : 0;

    const uniqueWords = new Set(words);
    const vocabularyRichness = wordCount > 0 ? uniqueWords.size / wordCount : 0;

    const pronounUsage = this.analyzePronounUsage(words);
    const emotionalWords = this.analyzeEmotionalWords(words);
    const cognitiveProcesses = this.analyzeCognitiveProcesses(words);
    const temporalOrientation = this.analyzeTemporalOrientation(words);

    return {
      wordCount,
      sentenceCount,
      avgWordLength,
      vocabularyRichness,
      pronounUsage,
      emotionalWords,
      cognitiveProcesses,
      temporalOrientation,
    };
  }

  private analyzePronounUsage(words: string[]): LinguisticFeatures["pronounUsage"] {
    let firstPerson = 0;
    let secondPerson = 0;
    let thirdPerson = 0;

    for (const word of words) {
      if (FIRST_PERSON_PRONOUNS.includes(word)) firstPerson++;
      else if (SECOND_PERSON_PRONOUNS.includes(word)) secondPerson++;
      else if (THIRD_PERSON_PRONOUNS.includes(word)) thirdPerson++;
    }

    const total = firstPerson + secondPerson + thirdPerson || 1;

    return {
      firstPerson: firstPerson / total,
      secondPerson: secondPerson / total,
      thirdPerson: thirdPerson / total,
    };
  }

  private analyzeEmotionalWords(words: string[]): LinguisticFeatures["emotionalWords"] {
    const positive: string[] = [];
    const negative: string[] = [];

    for (const word of words) {
      if (CHINESE_POSITIVE_WORDS.some((w) => word.includes(w) || w.includes(word))) {
        positive.push(word);
      }
      if (CHINESE_NEGATIVE_WORDS.some((w) => word.includes(w) || w.includes(word))) {
        negative.push(word);
      }
    }

    const totalEmotional = positive.length + negative.length || 1;
    const intensity = (positive.length - negative.length) / totalEmotional;

    return {
      positive,
      negative,
      intensity,
    };
  }

  private analyzeCognitiveProcesses(words: string[]): LinguisticFeatures["cognitiveProcesses"] {
    const countMatches = (wordList: string[]) => {
      return words.filter((w) => wordList.some((kw) => w.includes(kw) || kw.includes(w))).length;
    };

    const totalWords = words.length || 1;

    return {
      insight: countMatches(COGNITIVE_INSIGHT_WORDS) / totalWords,
      causation: countMatches(COGNITIVE_CAUSATION_WORDS) / totalWords,
      discrepancy: countMatches(COGNITIVE_DISCREPANCY_WORDS) / totalWords,
      tentative: countMatches(COGNITIVE_TENTATIVE_WORDS) / totalWords,
      certainty: countMatches(COGNITIVE_CERTAINTY_WORDS) / totalWords,
    };
  }

  private analyzeTemporalOrientation(words: string[]): LinguisticFeatures["temporalOrientation"] {
    const countMatches = (wordList: string[]) => {
      return words.filter((w) => wordList.some((kw) => w.includes(kw) || kw.includes(w))).length;
    };

    const past = countMatches(PAST_TENSE_WORDS);
    const present = countMatches(PRESENT_TENSE_WORDS);
    const future = countMatches(FUTURE_TENSE_WORDS);

    const total = past + present + future || 1;

    return {
      past: past / total,
      present: present / total,
      future: future / total,
    };
  }

  private calculateSentimentScore(text: string, features: LinguisticFeatures): number {
    let score = 0;

    score += features.emotionalWords.intensity * 0.4;

    const positiveRatio = features.emotionalWords.positive.length / (features.wordCount || 1);
    const negativeRatio = features.emotionalWords.negative.length / (features.wordCount || 1);
    score += (positiveRatio - negativeRatio) * 2;

    score += features.cognitiveProcesses.certainty * 0.2;
    score -= features.cognitiveProcesses.tentative * 0.15;
    score -= features.cognitiveProcesses.discrepancy * 0.1;

    score += features.temporalOrientation.future * 0.15;
    score -= features.temporalOrientation.past * 0.1;

    score += features.pronounUsage.firstPerson * 0.1;

    for (const emotion of EMOTION_TYPES) {
      const keywords = EMOTION_KEYWORDS[emotion];
      const matches = keywords.filter((kw) =>
        text.toLowerCase().includes(kw.toLowerCase())
      ).length;

      if (matches > 0) {
        if (POSITIVE_EMOTIONS.has(emotion)) {
          score += matches * 0.05;
        } else if (NEGATIVE_EMOTIONS.has(emotion)) {
          score -= matches * 0.05;
        }
      }
    }

    return clamp(score, -1, 1);
  }

  private calculateEmotionVector(text: string): Record<EmotionType, number> {
    const vector: Record<EmotionType, number> = {} as Record<EmotionType, number>;
    const words = parseText(text);

    for (const emotion of EMOTION_TYPES) {
      const keywords = EMOTION_KEYWORDS[emotion];
      let matchCount = 0;

      for (const word of words) {
        for (const keyword of keywords) {
          if (word.includes(keyword) || keyword.includes(word)) {
            matchCount++;
            break;
          }
        }
      }

      const wordPositions: number[] = [];
      for (const keyword of keywords) {
        let pos = text.toLowerCase().indexOf(keyword.toLowerCase());
        while (pos !== -1) {
          wordPositions.push(pos);
          pos = text.toLowerCase().indexOf(keyword.toLowerCase(), pos + 1);
        }
      }

      let intensity = matchCount;

      if (wordPositions.length > 0) {
        const avgPosition = mean(wordPositions) / text.length;
        const recencyBoost = 1 - avgPosition;
        intensity *= 1 + recencyBoost * 0.3;
      }

      vector[emotion] = normalize(intensity, 0, Math.max(words.length * 0.3, 1));
    }

    const total = Object.values(vector).reduce((sum, v) => sum + v, 0);
    if (total > 0) {
      for (const emotion of EMOTION_TYPES) {
        vector[emotion] = vector[emotion] / total;
      }
    } else {
      for (const emotion of EMOTION_TYPES) {
        vector[emotion] = emotion === "neutral" ? 1 : 0;
      }
    }

    return vector;
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

  private getSentimentLevel(score: number): SentimentLevel {
    for (const level of SENTIMENT_LEVELS) {
      if (score >= level.min && score < level.max) {
        return level.value as SentimentLevel;
      }
    }
    return "neutral";
  }

  async analyzeEntry(
    title: string,
    content: string,
    tags: string[],
    mood: EmotionType
  ): Promise<Omit<DiaryEntry, "id" | "createdAt" | "updatedAt" | "checksum" | "isEncrypted">> {
    const fullText = `${title}\n${content}\n${tags.join(" ")}`;
    const analysis = await this.analyze(fullText);

    const emotionVector: Record<EmotionType, number> = { ...analysis.emotionVector };
    emotionVector[mood] = Math.max(emotionVector[mood], 0.3);

    const total = Object.values(emotionVector).reduce((sum, v) => sum + v, 0);
    for (const emotion of EMOTION_TYPES) {
      emotionVector[emotion] = emotionVector[emotion] / total;
    }

    return {
      title,
      content,
      tags,
      mood,
      sentimentScore: analysis.sentimentScore,
      sentimentLevel: analysis.sentimentLevel,
      linguisticFeatures: analysis.linguisticFeatures,
      emotionVector,
    };
  }

  batchAnalyze(texts: string[]): Promise<SentimentResult[]> {
    return Promise.all(texts.map((text) => this.analyze(text)));
  }

  getQueueSize(): number {
    return this.taskQueue.length;
  }

  isBusy(): boolean {
    return this.isProcessing;
  }
}

export const sentimentEngine = new AsyncSentimentEngine();

export default sentimentEngine;

export function getEmotionLabel(emotion: EmotionType): string {
  const labels: Record<EmotionType, string> = {
    joy: "喜悦",
    trust: "信任",
    fear: "恐惧",
    surprise: "惊讶",
    sadness: "悲伤",
    disgust: "厌恶",
    anger: "愤怒",
    anticipation: "期待",
    neutral: "平静",
  };
  return labels[emotion] || emotion;
}

export function getSentimentLabel(level: SentimentLevel): string {
  const labels: Record<SentimentLevel, string> = {
    very_negative: "非常消极",
    negative: "消极",
    neutral: "中性",
    positive: "积极",
    very_positive: "非常积极",
  };
  return labels[level] || level;
}

export function getEmotionColor(emotion: EmotionType): string {
  const colors: Record<EmotionType, string> = {
    joy: "#fbbf24",
    trust: "#10b981",
    fear: "#6366f1",
    surprise: "#ec4899",
    sadness: "#3b82f6",
    disgust: "#84cc16",
    anger: "#ef4444",
    anticipation: "#f97316",
    neutral: "#6b7280",
  };
  return colors[emotion] || "#6b7280";
}
