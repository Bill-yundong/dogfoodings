import { EmotionType } from "@/types";

export const EMOTION_TYPES: EmotionType[] = [
  "joy",
  "trust",
  "fear",
  "surprise",
  "sadness",
  "disgust",
  "anger",
  "anticipation",
  "neutral",
];

export const EMOTION_COLORS: Record<EmotionType, string> = {
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

export const EMOTION_LABELS: Record<EmotionType, string> = {
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

export const EMOTION_ICONS: Record<EmotionType, string> = {
  joy: "smile",
  trust: "heart",
  fear: "alert-circle",
  surprise: "zap",
  sadness: "cloud-rain",
  disgust: "frown",
  anger: "flame",
  anticipation: "clock",
  neutral: "circle",
};

export const SENTIMENT_LEVELS = [
  { value: "very_negative", label: "非常消极", min: -1, max: -0.6 },
  { value: "negative", label: "消极", min: -0.6, max: -0.2 },
  { value: "neutral", label: "中性", min: -0.2, max: 0.2 },
  { value: "positive", label: "积极", min: 0.2, max: 0.6 },
  { value: "very_positive", label: "非常积极", min: 0.6, max: 1 },
];

export const POSITIVE_EMOTIONS = new Set<EmotionType>(["joy", "trust", "anticipation"]);
export const NEGATIVE_EMOTIONS = new Set<EmotionType>(["fear", "sadness", "disgust", "anger"]);
export const NEUTRAL_EMOTIONS = new Set<EmotionType>(["surprise", "neutral"]);

export const FIRST_PERSON_PRONOUNS = ["我", "我们", "咱", "咱们", "俺", "俺们", "i", "me", "my", "mine", "we", "us", "our", "ours"];
export const SECOND_PERSON_PRONOUNS = ["你", "你们", "您", "you", "your", "yours"];
export const THIRD_PERSON_PRONOUNS = ["他", "她", "它", "他们", "她们", "它们", "he", "she", "it", "him", "her", "his", "hers", "its", "they", "them", "their", "theirs"];

export const PAST_TENSE_WORDS = [
  "曾经", "以前", "过去", "昨天", "前天", "上周", "去年", "之前", "刚才",
  "was", "were", "had", "did", "have been", "has been",
];

export const PRESENT_TENSE_WORDS = [
  "现在", "今天", "如今", "此刻", "当前", "正在",
  "is", "are", "am", "do", "does", "have", "has",
];

export const FUTURE_TENSE_WORDS = [
  "将要", "即将", "以后", "明天", "后天", "下周", "明年", "未来", "将会", "打算",
  "will", "shall", "going to", "about to", "future",
];

export const COGNITIVE_INSIGHT_WORDS = [
  "觉得", "认为", "知道", "明白", "理解", "意识到", "发现", "看到", "感觉",
  "think", "know", "believe", "understand", "realize", "see", "feel",
];

export const COGNITIVE_CAUSATION_WORDS = [
  "因为", "所以", "因此", "导致", "造成", "使得", "源于", "由于", "鉴于",
  "because", "so", "therefore", "cause", "due to", "since", "as",
];

export const COGNITIVE_DISCREPANCY_WORDS = [
  "但是", "可是", "然而", "不过", "却", "尽管", "虽然", "反而", "反倒",
  "but", "however", "although", "though", "yet", "still", "nevertheless",
];

export const COGNITIVE_TENTATIVE_WORDS = [
  "可能", "也许", "或许", "大概", "估计", "应该", "好像", "似乎", "仿佛",
  "maybe", "perhaps", "possibly", "probably", "might", "could", "should",
];

export const COGNITIVE_CERTAINTY_WORDS = [
  "肯定", "一定", "必定", "绝对", "必然", "确定", "无疑", "确实", "当然",
  "definitely", "certainly", "absolutely", "surely", "must", "will",
];

export const DATABASE_NAME = "soulpulse_db";
export const DATABASE_VERSION = 1;
export const ENCRYPTION_VERSION = "1.0.0";
export const ENABLE_ENCRYPTION = true;
