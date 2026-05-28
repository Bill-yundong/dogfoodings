export interface Keypoint {
  x: number
  y: number
  z?: number
  visibility: number
  score?: number
}

export interface PoseData {
  timestamp: number
  keypoints: Keypoint[]
  score: number
}

export interface JointAngles {
  leftElbow: number
  rightElbow: number
  leftShoulder: number
  rightShoulder: number
  leftHip: number
  rightHip: number
  leftKnee: number
  rightKnee: number
}

export interface Correction {
  timestamp: number
  type: 'warning' | 'error'
  message: string
  keypointIndex: number
  suggestion: string
}

export interface TrainingAction {
  actionId: string
  actionName: string
  startTime: number
  endTime: number
  scores: number[]
  averageScore: number
  corrections: Correction[]
}

export interface TrainingSession {
  id: string
  userId: string
  courseId: string
  startTime: number
  endTime: number
  totalDuration: number
  averageScore: number
  actions: TrainingAction[]
  synced: boolean
  createdAt: number
}

export interface Course {
  id: string
  name: string
  description: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  duration: number
  category: string
  thumbnail: string
  actions: ActionTemplate[]
}

export interface ActionTemplate {
  id: string
  name: string
  duration: number
  description: string
  referencePose: PoseData
  keypointThresholds: Record<number, number>
}

export const KEYPOINT_NAMES: Record<number, string> = {
  0: '鼻', 1: '左眼内侧', 2: '左眼', 3: '左眼外侧',
  4: '右眼内侧', 5: '右眼', 6: '右眼外侧', 7: '左耳',
  8: '右耳', 9: '嘴左侧', 10: '嘴右侧', 11: '左肩',
  12: '右肩', 13: '左肘', 14: '右肘', 15: '左腕',
  16: '右腕', 17: '左小指', 18: '右小指', 19: '左食指',
  20: '右食指', 21: '左拇指', 22: '右拇指', 23: '左髋',
  24: '右髋', 25: '左膝', 26: '右膝', 27: '左踝',
  28: '右踝', 29: '左脚跟', 30: '右脚跟', 31: '左脚尖',
  32: '右脚尖'
}

export const SKELETON_CONNECTIONS: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26],
  [25, 27], [26, 28], [27, 29], [28, 30], [27, 31],
  [28, 32], [29, 31], [30, 32]
]
