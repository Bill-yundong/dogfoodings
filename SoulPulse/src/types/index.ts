export type EmotionType =
  | "joy"
  | "trust"
  | "fear"
  | "surprise"
  | "sadness"
  | "disgust"
  | "anger"
  | "anticipation"
  | "neutral";

export type SentimentLevel = "very_negative" | "negative" | "neutral" | "positive" | "very_positive";

export interface LinguisticFeatures {
  wordCount: number;
  sentenceCount: number;
  avgWordLength: number;
  vocabularyRichness: number;
  pronounUsage: {
    firstPerson: number;
    secondPerson: number;
    thirdPerson: number;
  };
  emotionalWords: {
    positive: string[];
    negative: string[];
    intensity: number;
  };
  cognitiveProcesses: {
    insight: number;
    causation: number;
    discrepancy: number;
    tentative: number;
    certainty: number;
  };
  temporalOrientation: {
    past: number;
    present: number;
    future: number;
  };
}

export interface PhysiologicalData {
  heartRate?: number;
  heartRateVariability?: number;
  bloodPressure?: {
    systolic: number;
    diastolic: number;
  };
  skinTemperature?: number;
  galvanicSkinResponse?: number;
  respiratoryRate?: number;
  sleepQuality?: number;
  activityLevel?: number;
  stressLevel?: number;
  energyLevel?: number;
  measurementTimestamp: number;
}

export interface SemanticAlignment {
  linguisticEmotionScore: number;
  physiologicalEmotionScore: number;
  alignmentConfidence: number;
  alignedEmotion: EmotionType;
  alignmentFeatures: {
    correlationCoefficient: number;
    featureMatches: string[];
    discrepancies: string[];
  };
}

export interface DiaryEntry {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  mood: EmotionType;
  sentimentScore: number;
  sentimentLevel: SentimentLevel;
  linguisticFeatures: LinguisticFeatures;
  physiologicalData?: PhysiologicalData;
  semanticAlignment?: SemanticAlignment;
  emotionVector: Record<EmotionType, number>;
  isEncrypted: boolean;
  checksum: string;
}

export interface EmotionTrajectoryPoint {
  timestamp: number;
  emotion: EmotionType;
  dominantEmotion: EmotionType;
  intensity: number;
  sentimentScore: number;
  alignmentConfidence: number;
  entryId: string;
  triggers: string[];
  context: string;
}

export interface EmotionEvolutionPattern {
  type: "cyclical" | "progressive" | "reactive" | "stable";
  patternType?: "cyclical" | "progressive" | "reactive" | "stable";
  confidence: number;
  description: string;
  triggerEvents: string[];
  triggerFactors: string[];
  duration: number;
  intensityVariation: number;
  recoveryRate: number;
  associatedEmotions: EmotionType[];
}

export interface EmotionInsight {
  id: string;
  type: "pattern" | "trigger" | "correlation" | "recommendation";
  category: "emotional_trend" | "cyclical_pattern" | "trigger_detection" | "trigger_analysis" | "linguistic_correlation" | "wellbeing_recommendation" | "trend" | "trigger" | "recommendation" | "warning" | "achievement" | "linguistic";
  title: string;
  description: string;
  confidence: number;
  evidence: string[];
  timestamp: number;
  relatedEntryIds: string[];
  actionableSteps: string[];
}

export interface RiskFactor {
  type: "emotional" | "physical" | "behavioral";
  name: string;
  score: number;
}

export interface RiskAssessment {
  riskLevel: "low" | "moderate" | "high" | "critical";
  overallScore: number;
  factors: RiskFactor[];
  recommendations: string[];
  assessmentDate: number;
}

export interface WellbeingDimensions {
  emotional: number;
  cognitive: number;
  physical: number;
  social: number;
  behavioral: number;
}

export interface WellbeingScore {
  overall: number;
  dimensions: WellbeingDimensions;
}

export interface DatabaseStats {
  totalEntries: number;
  totalWords?: number;
  totalTags?: number;
  totalSize?: number;
  encryptedEntries: number;
  storageUsed: number;
  lastSync: number;
  databaseVersion: number;
}

export interface HealthProfile {
  id: string;
  userId: string;
  baselineEmotions: Record<EmotionType, number>;
  emotionTriggers: string[];
  copingStrategies: string[];
  wellbeingScore: number;
  lastUpdated: number;
  riskIndicators: string[];
  protectiveFactors: string[];
}

export interface EncryptedData {
  iv: string;
  encryptedData: string;
  salt: string;
  version: string;
}

export interface SyncConfig {
  enabled: boolean;
  endpoint: string;
  lastSyncTime: number;
  syncFrequency: number;
  conflicts: SyncConflict[];
}

export interface SyncConflict {
  entryId: string;
  localVersion: DiaryEntry;
  remoteVersion: DiaryEntry;
  resolved: boolean;
  resolutionStrategy: "local" | "remote" | "merge";
}

export interface AppState {
  isUnlocked: boolean;
  hasPassword: boolean;
  entries: DiaryEntry[];
  currentEntry: DiaryEntry | null;
  healthProfile: HealthProfile | null;
  profile?: HealthProfile | null;
  insights: EmotionInsight[];
  trajectory: EmotionTrajectoryPoint[];
  patterns: EmotionEvolutionPattern[];
  wellbeingScore: WellbeingScore | null;
  riskAssessment: RiskAssessment | null;
  isLoading: boolean;
  error: string | null;
  databaseStats: DatabaseStats | null;
}
