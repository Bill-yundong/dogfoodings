import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  AppState,
  DiaryEntry,
  HealthProfile,
  EmotionInsight,
  DatabaseStats,
  EmotionType,
  EmotionTrajectoryPoint,
  EmotionEvolutionPattern,
  RiskAssessment,
  WellbeingScore,
} from "@/types";
import { database } from "@/lib/database";
import { sentimentEngine } from "@/lib/sentiment";
import { semanticAlignmentEngine } from "@/lib/semanticAlignment";
import { emotionTrajectoryEngine } from "@/lib/emotionTrajectory";
import { generateMasterKey, storeMasterKey, getMasterKey, hasMasterKey, clearMasterKey, hashPassword, verifyPassword } from "@/lib/crypto";
import { generateId } from "@/lib/utils";
import { EMOTION_TYPES } from "@/lib/constants";

interface AppStore extends AppState {
  init: () => Promise<void>;
  initialize: () => Promise<void>;
  unlock: (password: string) => Promise<boolean>;
  setupPassword: (password: string) => Promise<boolean>;
  lock: () => void;
  createEntry: (title: string, content: string, tags: string[], mood: EmotionType, physiologicalData?: any) => Promise<DiaryEntry>;
  updateEntry: (entry: DiaryEntry) => Promise<DiaryEntry>;
  deleteEntry: (id: string) => Promise<void>;
  getEntry: (id: string) => Promise<DiaryEntry | null>;
  loadEntries: (limit?: number) => Promise<void>;
  loadAllEntries: (limit?: number) => Promise<void>;
  loadEntriesByDateRange: (startTime: number, endTime: number) => Promise<DiaryEntry[]>;
  setCurrentEntry: (entry: DiaryEntry | null) => void;
  loadHealthProfile: (userId: string) => Promise<void>;
  saveHealthProfile: (profile: Partial<HealthProfile>) => Promise<HealthProfile>;
  generateInsights: () => Promise<EmotionInsight[]>;
  assessRisk: () => Promise<RiskAssessment | null>;
  loadDatabaseStats: () => Promise<DatabaseStats>;
  getStats: () => Promise<DatabaseStats>;
  exportData: () => Promise<string>;
  importData: (data: string) => Promise<void>;
  clearAllData: () => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  verifyPassword: (password: string) => Promise<boolean>;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

const initialState: AppState = {
  isUnlocked: false,
  hasPassword: false,
  entries: [],
  currentEntry: null,
  healthProfile: null,
  profile: null,
  insights: [],
  trajectory: [],
  patterns: [],
  wellbeingScore: null,
  riskAssessment: null,
  isLoading: false,
  error: null,
  databaseStats: null,
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      init: async () => {
        await get().initialize();
      },

      initialize: async () => {
        set({ isLoading: true, error: null });
        try {
          await database.init();
          const hasKey = hasMasterKey();
          const storedHash = await database.getMetadata<string>("password_hash");
          const hasPassword = !!storedHash;
          set({ isUnlocked: hasKey, hasPassword, isLoading: false });
        } catch (error) {
          set({ error: `初始化失败: ${error}`, isLoading: false, isUnlocked: false, hasPassword: false });
        }
      },

      setupPassword: async (password: string): Promise<boolean> => {
        set({ isLoading: true, error: null });
        try {
          const { hash, salt } = hashPassword(password);
          await database.setMetadata("password_hash", hash);
          await database.setMetadata("password_salt", salt);

          const masterKey = generateMasterKey();
          storeMasterKey(masterKey);

          set({ isUnlocked: true, hasPassword: true, isLoading: false });
          return true;
        } catch (error) {
          set({ error: `设置密码失败: ${error}`, isLoading: false });
          return false;
        }
      },

      unlock: async (password: string): Promise<boolean> => {
        set({ isLoading: true, error: null });
        try {
          const [storedHash, storedSalt] = await Promise.all([
            database.getMetadata<string>("password_hash"),
            database.getMetadata<string>("password_salt"),
          ]);

          if (!storedHash || !storedSalt) {
            set({ error: "请先设置密码", isLoading: false });
            return false;
          }

          if (!verifyPassword(password, storedHash, storedSalt)) {
            set({ error: "密码错误", isLoading: false });
            return false;
          }

          const masterKey = generateMasterKey();
          storeMasterKey(masterKey);

          set({ isUnlocked: true, isLoading: false });
          return true;
        } catch (error) {
          set({ error: `解锁失败: ${error}`, isLoading: false });
          return false;
        }
      },

      lock: () => {
        clearMasterKey();
        set({
          isUnlocked: false,
          entries: [],
          currentEntry: null,
          insights: [],
          trajectory: [],
          patterns: [],
          wellbeingScore: null,
          riskAssessment: null,
          healthProfile: null,
          profile: null,
        });
      },

      createEntry: async (
        title: string,
        content: string,
        tags: string[],
        mood: EmotionType,
        physiologicalData?: any
      ): Promise<DiaryEntry> => {
        set({ isLoading: true, error: null });
        try {
          const analyzed = await sentimentEngine.analyzeEntry(title, content, tags, mood);

          let entryWithPhysio = { ...analyzed };
          if (physiologicalData) {
            entryWithPhysio = {
              ...entryWithPhysio,
              physiologicalData: {
                ...physiologicalData,
                measurementTimestamp: Date.now(),
              },
            };
          }

          const timestamp = Date.now();
          const entryData = {
            ...entryWithPhysio,
            createdAt: timestamp,
            updatedAt: timestamp,
          };

          const alignedEntry = await semanticAlignmentEngine.alignEntry(entryData as any);
          const savedEntry = await database.addEntry(alignedEntry);

          set((state) => ({
            entries: [savedEntry, ...state.entries],
            isLoading: false,
          }));

          return savedEntry;
        } catch (error) {
          set({ error: `创建日记失败: ${error}`, isLoading: false });
          throw error;
        }
      },

      updateEntry: async (entry: DiaryEntry): Promise<DiaryEntry> => {
        set({ isLoading: true, error: null });
        try {
          const reanalyzed = await sentimentEngine.analyzeEntry(
            entry.title,
            entry.content,
            entry.tags,
            entry.mood
          );

          const updatedData = {
            ...entry,
            ...reanalyzed,
            updatedAt: Date.now(),
          };

          const alignedEntry = await semanticAlignmentEngine.alignEntry(updatedData);
          const savedEntry = await database.updateEntry(alignedEntry);

          set((state) => ({
            entries: state.entries.map((e) => (e.id === savedEntry.id ? savedEntry : e)),
            currentEntry: state.currentEntry?.id === savedEntry.id ? savedEntry : state.currentEntry,
            isLoading: false,
          }));

          return savedEntry;
        } catch (error) {
          set({ error: `更新日记失败: ${error}`, isLoading: false });
          throw error;
        }
      },

      deleteEntry: async (id: string): Promise<void> => {
        set({ isLoading: true, error: null });
        try {
          await database.deleteEntry(id);
          set((state) => ({
            entries: state.entries.filter((e) => e.id !== id),
            currentEntry: state.currentEntry?.id === id ? null : state.currentEntry,
            isLoading: false,
          }));
        } catch (error) {
          set({ error: `删除日记失败: ${error}`, isLoading: false });
          throw error;
        }
      },

      getEntry: async (id: string): Promise<DiaryEntry | null> => {
        set({ error: null });
        try {
          return await database.getEntry(id);
        } catch (error) {
          set({ error: `获取日记失败: ${error}` });
          return null;
        }
      },

      loadEntries: async (limit?: number): Promise<void> => {
        await get().loadAllEntries(limit);
      },

      loadAllEntries: async (limit?: number): Promise<void> => {
        set({ isLoading: true, error: null });
        try {
          const entries = await database.getAllEntries(limit);
          const sortedEntries = entries.sort((a, b) => b.createdAt - a.createdAt);
          set({ entries: sortedEntries, isLoading: false });
        } catch (error) {
          set({ error: `加载日记失败: ${error}`, isLoading: false });
        }
      },

      loadEntriesByDateRange: async (startTime: number, endTime: number): Promise<DiaryEntry[]> => {
        set({ error: null });
        try {
          return await database.getEntriesByDateRange(startTime, endTime);
        } catch (error) {
          set({ error: `加载日记失败: ${error}` });
          return [];
        }
      },

      setCurrentEntry: (entry: DiaryEntry | null) => {
        set({ currentEntry: entry });
      },

      loadHealthProfile: async (userId: string): Promise<void> => {
        set({ isLoading: true, error: null });
        try {
          const profile = await database.getProfile(userId);
          if (!profile) {
            const defaultProfile: Omit<HealthProfile, "id"> = {
              userId,
              baselineEmotions: EMOTION_TYPES.reduce(
                (acc, emotion) => ({ ...acc, [emotion]: emotion === "neutral" ? 0.5 : 1 / EMOTION_TYPES.length }),
                {} as Record<EmotionType, number>
              ),
              emotionTriggers: [],
              copingStrategies: [],
              wellbeingScore: 75,
              lastUpdated: Date.now(),
              riskIndicators: [],
              protectiveFactors: [],
            };
            const savedProfile = await database.saveProfile(defaultProfile);
            set({ healthProfile: savedProfile, isLoading: false });
          } else {
            set({ healthProfile: profile, isLoading: false });
          }
        } catch (error) {
          set({ error: `加载健康档案失败: ${error}`, isLoading: false });
        }
      },

      saveHealthProfile: async (profile: Partial<HealthProfile>): Promise<HealthProfile> => {
        set({ isLoading: true, error: null });
        try {
          const currentProfile = get().healthProfile;
          const updatedProfile = {
            ...currentProfile,
            ...profile,
            lastUpdated: Date.now(),
          } as HealthProfile;

          const savedProfile = await database.saveProfile(updatedProfile);
          set({ healthProfile: savedProfile, isLoading: false });
          return savedProfile;
        } catch (error) {
          set({ error: `保存健康档案失败: ${error}`, isLoading: false });
          throw error;
        }
      },

      generateInsights: async (): Promise<EmotionInsight[]> => {
        set({ isLoading: true, error: null });
        try {
          const { entries, healthProfile } = get();
          const trajectory = emotionTrajectoryEngine.buildTrajectory(entries);
          const patterns = emotionTrajectoryEngine.detectPatterns(trajectory);
          const insights = emotionTrajectoryEngine.generateInsights(
            entries,
            trajectory,
            patterns,
            healthProfile || undefined
          );

          for (const insight of insights) {
            await database.addInsight(insight);
          }

          const wellbeingScore = emotionTrajectoryEngine.calculateWellbeingScore(entries, trajectory);
          if (healthProfile) {
            await database.saveProfile({
              ...healthProfile,
              wellbeingScore: wellbeingScore.overall,
              lastUpdated: Date.now(),
            });
            set({
              healthProfile: { ...healthProfile, wellbeingScore: wellbeingScore.overall },
            });
          }

          set({
            insights,
            trajectory,
            patterns,
            wellbeingScore,
            profile: healthProfile,
            isLoading: false,
          });
          return insights;
        } catch (error) {
          set({ error: `生成洞察失败: ${error}`, isLoading: false });
          return [];
        }
      },

      getStats: async (): Promise<DatabaseStats> => {
        return await get().loadDatabaseStats();
      },

      loadDatabaseStats: async (): Promise<DatabaseStats> => {
        try {
          const dbStats = await database.getStats();
          const entries = get().entries;
          const totalWords = entries.reduce((sum, e) => sum + e.linguisticFeatures.wordCount, 0);
          const totalTags = new Set(entries.flatMap((e) => e.tags)).size;
          const stats: DatabaseStats = {
            totalEntries: dbStats.totalEntries,
            totalWords,
            totalTags,
            totalSize: dbStats.storageUsed,
            encryptedEntries: dbStats.encryptedEntries,
            storageUsed: dbStats.storageUsed,
            lastSync: dbStats.lastSync,
            databaseVersion: dbStats.databaseVersion,
          };
          set({ databaseStats: stats });
          return stats;
        } catch (error) {
          set({ error: `加载统计信息失败: ${error}` });
          return {
            totalEntries: 0,
            totalWords: 0,
            totalTags: 0,
            totalSize: 0,
            encryptedEntries: 0,
            storageUsed: 0,
            lastSync: 0,
            databaseVersion: 1,
          };
        }
      },

      assessRisk: async (): Promise<RiskAssessment | null> => {
        try {
          const { entries, healthProfile, trajectory } = get();
          if (entries.length === 0) return null;

          const avgSentiment = entries.reduce((sum, e) => sum + e.sentimentScore, 0) / entries.length;
          const recentEntries = entries.slice(0, 7);
          const negativeCount = recentEntries.filter((e) => e.sentimentScore < -0.2).length;

          let riskLevel: RiskAssessment["riskLevel"] = "low";
          let overallScore = 0.2;

          if (avgSentiment < -0.5 || negativeCount >= 5) {
            riskLevel = "high";
            overallScore = 0.7;
          } else if (avgSentiment < -0.2 || negativeCount >= 3) {
            riskLevel = "moderate";
            overallScore = 0.4;
          } else if (avgSentiment > 0.3) {
            riskLevel = "low";
            overallScore = 0.1;
          }

          const factors: RiskAssessment["factors"] = [];
          if (avgSentiment < -0.3) {
            factors.push({ type: "emotional", name: "持续负面情绪", score: 0.8 });
          }
          if (recentEntries.length > 0) {
            const avgStress = recentEntries
              .filter((e) => e.physiologicalData?.stressLevel)
              .reduce((sum, e) => sum + (e.physiologicalData?.stressLevel || 0), 0) / recentEntries.length;
            if (avgStress > 7) {
              factors.push({ type: "physical", name: "高压力水平", score: avgStress / 10 });
            }
          }
          if (entries.length < 3) {
            factors.push({ type: "behavioral", name: "记录频率低", score: 0.5 });
          }

          const recommendations: string[] = [];
          if (riskLevel === "high") {
            recommendations.push("建议寻求专业心理咨询帮助");
            recommendations.push("增加日记记录频率，跟踪情绪变化");
            recommendations.push("尝试放松技巧，如深呼吸和冥想");
          } else if (riskLevel === "moderate") {
            recommendations.push("保持规律的作息和运动");
            recommendations.push("记录积极的事情和感恩清单");
            recommendations.push("与朋友家人保持社交联系");
          } else {
            recommendations.push("继续保持良好的情绪记录习惯");
            recommendations.push("定期回顾情绪模式，了解自己");
          }

          const assessment: RiskAssessment = {
            riskLevel,
            overallScore,
            factors,
            recommendations,
            assessmentDate: Date.now(),
          };

          set({ riskAssessment: assessment });
          return assessment;
        } catch (error) {
          set({ error: `风险评估失败: ${error}` });
          return null;
        }
      },

      verifyPassword: async (password: string): Promise<boolean> => {
        try {
          const [storedHash, storedSalt] = await Promise.all([
            database.getMetadata<string>("password_hash"),
            database.getMetadata<string>("password_salt"),
          ]);
          if (!storedHash || !storedSalt) return false;
          return verifyPassword(password, storedHash, storedSalt);
        } catch (error) {
          set({ error: `密码验证失败: ${error}` });
          return false;
        }
      },

      changePassword: async (oldPassword: string, newPassword: string): Promise<boolean> => {
        set({ isLoading: true, error: null });
        try {
          const isVerified = await get().verifyPassword(oldPassword);
          if (!isVerified) {
            set({ error: "原密码错误", isLoading: false });
            return false;
          }

          const { hash, salt } = hashPassword(newPassword);
          await database.setMetadata("password_hash", hash);
          await database.setMetadata("password_salt", salt);

          const masterKey = generateMasterKey();
          storeMasterKey(masterKey);

          set({ isLoading: false });
          return true;
        } catch (error) {
          set({ error: `修改密码失败: ${error}`, isLoading: false });
          return false;
        }
      },

      exportData: async (): Promise<string> => {
        set({ isLoading: true, error: null });
        try {
          const data = await database.exportAll();
          const jsonString = JSON.stringify(data, null, 2);
          set({ isLoading: false });
          return jsonString;
        } catch (error) {
          set({ error: `导出数据失败: ${error}`, isLoading: false });
          throw error;
        }
      },

      importData: async (dataString: string): Promise<void> => {
        set({ isLoading: true, error: null });
        try {
          const data = JSON.parse(dataString);
          await database.importAll(data);
          await get().loadAllEntries();
          set({ isLoading: false });
        } catch (error) {
          set({ error: `导入数据失败: ${error}`, isLoading: false });
          throw error;
        }
      },

      clearAllData: async (): Promise<void> => {
        set({ isLoading: true, error: null });
        try {
          await database.clearAll();
          set({
            ...initialState,
            isLoading: false,
          });
        } catch (error) {
          set({ error: `清除数据失败: ${error}`, isLoading: false });
          throw error;
        }
      },

      setError: (error: string | null) => {
        set({ error });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: "soulpulse-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isUnlocked: state.isUnlocked,
        databaseStats: state.databaseStats,
      }),
    }
  )
);

export default useAppStore;
