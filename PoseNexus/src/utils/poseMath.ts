import type { Keypoint, PoseData, JointAngles, Correction } from '@/types/pose'

export function calculateAngle(a: Keypoint, b: Keypoint, c: Keypoint): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x)
  let angle = Math.abs((radians * 180) / Math.PI)
  if (angle > 180)
    angle = 360 - angle
  return angle
}

export function calculateDistance(a: Keypoint, b: Keypoint): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

export function normalizePose(pose: PoseData): PoseData {
  const keypoints = pose.keypoints

  const leftHip = keypoints[23]
  const rightHip = keypoints[24]
  const centerX = (leftHip.x + rightHip.x) / 2
  const centerY = (leftHip.y + rightHip.y) / 2

  const shoulderDistance = calculateDistance(keypoints[11], keypoints[12])
  const hipDistance = calculateDistance(leftHip, rightHip)
  const scale = (shoulderDistance + hipDistance) / 2

  const normalizedKeypoints = keypoints.map(kp => ({
    ...kp,
    x: (kp.x - centerX) / scale,
    y: (kp.y - centerY) / scale,
    z: kp.z ? kp.z / scale : undefined
  }))

  return {
    ...pose,
    keypoints: normalizedKeypoints
  }
}

export function calculateJointAngles(pose: PoseData): JointAngles {
  const kp = pose.keypoints
  return {
    leftElbow: calculateAngle(kp[11], kp[13], kp[15]),
    rightElbow: calculateAngle(kp[12], kp[14], kp[16]),
    leftShoulder: calculateAngle(kp[13], kp[11], kp[23]),
    rightShoulder: calculateAngle(kp[14], kp[12], kp[24]),
    leftHip: calculateAngle(kp[11], kp[23], kp[25]),
    rightHip: calculateAngle(kp[12], kp[24], kp[26]),
    leftKnee: calculateAngle(kp[23], kp[25], kp[27]),
    rightKnee: calculateAngle(kp[24], kp[26], kp[28])
  }
}

export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) return 0
  
  let dotProduct = 0
  let norm1 = 0
  let norm2 = 0

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i]
    norm1 += vec1[i] * vec1[i]
    norm2 += vec2[i] * vec2[i]
  }

  norm1 = Math.sqrt(norm1)
  norm2 = Math.sqrt(norm2)

  if (norm1 === 0 || norm2 === 0) return 0
  return dotProduct / (norm1 * norm2)
}

export function poseToVector(pose: PoseData): number[] {
  const normalized = normalizePose(pose)
  const vector: number[] = []
  
  for (let i = 0; i < normalized.keypoints.length; i++) {
    const kp = normalized.keypoints[i]
    vector.push(kp.x, kp.y)
    if (kp.z !== undefined) {
      vector.push(kp.z)
    }
  }
  
  return vector
}

export function calculatePoseSimilarity(pose1: PoseData, pose2: PoseData): number {
  const vec1 = poseToVector(pose1)
  const vec2 = poseToVector(pose2)
  return cosineSimilarity(vec1, vec2)
}

export function mapSimilarityToScore(similarity: number): number {
  const score = Math.max(0, Math.min(1, similarity)) * 100
  return Math.round(score * 10) / 10
}

export function detectCorrections(
  userPose: PoseData,
  referencePose: PoseData,
  thresholds: Record<number, number>
): Correction[] {
  const corrections: Correction[] = []
  const userAngles = calculateJointAngles(userPose)
  const refAngles = calculateJointAngles(referencePose)

  const anglePairs: [keyof JointAngles, number, string][] = [
    ['leftElbow', 11, '左肘'],
    ['rightElbow', 12, '右肘'],
    ['leftShoulder', 13, '左肩'],
    ['leftHip', 23, '左髋'],
    ['rightHip', 24, '右髋'],
    ['leftKnee', 25, '左膝'],
    ['rightKnee', 26, '右膝']
  ]

  for (const [angleKey, keypointIndex, jointName] of anglePairs) {
    const userAngle = userAngles[angleKey]
    const refAngle = refAngles[angleKey]
    const diff = Math.abs(userAngle - refAngle)
    const threshold = thresholds[keypointIndex] || 15

    if (diff > threshold * 2) {
      corrections.push({
        timestamp: Date.now(),
        type: 'error',
        message: `${jointName}角度偏差过大`,
        keypointIndex,
        suggestion: `请将${jointName}调整至约${Math.round(refAngle)}°`
      })
    } else if (diff > threshold) {
      corrections.push({
        timestamp: Date.now(),
        type: 'warning',
        message: `${jointName}需要微调`,
        keypointIndex,
        suggestion: `建议${jointName}角度约${Math.round(refAngle)}°`
      })
    }
  }

  return corrections
}

export function dynamicTimeWarp(
  sequence1: PoseData[],
  sequence2: PoseData[]
): { distance: number; path: [number, number][] } {
  const n = sequence1.length
  const m = sequence2.length
  const dtw: number[][] = Array(n + 1).fill(null).map(() => Array(m + 1).fill(Infinity))
  dtw[0][0] = 0

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = 1 - calculatePoseSimilarity(sequence1[i - 1], sequence2[j - 1])
      dtw[i][j] = cost + Math.min(dtw[i - 1][j], dtw[i][j - 1], dtw[i - 1][j - 1])
    }
  }

  const path: [number, number][] = []
  let i = n
  let j = m
  while (i > 0 || j > 0) {
    path.unshift([i - 1, j - 1])
    const minPrev = Math.min(dtw[i - 1]?.[j] ?? Infinity, dtw[i]?.[j - 1] ?? Infinity, dtw[i - 1]?.[j - 1] ?? Infinity)
    if (dtw[i - 1]?.[j] === minPrev) {
      i--
    } else if (dtw[i]?.[j - 1] === minPrev) {
      j--
    } else {
      i--
      j--
    }
  }

  return { distance: dtw[n][m], path }
}

export function calculateSequenceScore(
  userSequence: PoseData[],
  refSequence: PoseData[]
): number {
  if (userSequence.length === 0 || refSequence.length === 0) return 0
  
  const { distance, path } = dynamicTimeWarp(userSequence, refSequence)
  const normalizedDistance = distance / path.length
  const score = Math.max(0, 100 - normalizedDistance * 50)
  
  return Math.round(score * 10) / 10
}
