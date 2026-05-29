export interface FocusSample {
  timestamp: number
  value: number
  type: "deep" | "moderate" | "distracted" | "idle"
}

export interface TaskItem {
  id: string
  title: string
  urgency: number
  importance: number
  focusNeed: number
  deadline: number | null
  estimatedMinutes: number
  source: "work" | "personal"
  status: "pending" | "active" | "completed" | "deferred"
  recommendedSlot: TimeSlot | null
  createdAt: number
  completedAt: number | null
}

export interface TimeSlot {
  start: number
  end: number
  quality: "peak" | "normal" | "low"
}

export interface FocusSession {
  id: string
  startTime: number
  endTime: number | null
  samples: FocusSample[]
  deepFocusIntervals: Array<{ start: number; end: number }>
  distractions: Array<{ timestamp: number; type: string; note?: string }>
}

export interface EfficiencyRecord {
  date: string
  focusScore: number
  taskCompletionRate: number
  timeUtilization: number
  rhythmStability: number
  recoveryEfficiency: number
  totalDeepFocusMinutes: number
  totalTasksCompleted: number
}

export interface OptimizationWeights {
  urgency: number
  importance: number
  focusNeed: number
  deadline: number
}

export interface TimeSliceAllocation {
  taskId: string
  slot: TimeSlot
  score: number
  factors: Record<string, number>
}

export interface DistractionEvent {
  id: string
  timestamp: number
  type: string
  note?: string
}

export type FocusLevel = "deep" | "moderate" | "distracted" | "idle"

export interface HourlyFocusProfile {
  hour: number
  avgFocus: number
  sampleCount: number
}
