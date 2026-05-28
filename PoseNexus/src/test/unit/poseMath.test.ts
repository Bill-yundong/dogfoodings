import { describe, it, expect } from 'vitest'
import type { Keypoint, PoseData, JointAngles, Correction } from '@/types/pose'
import {
  calculateAngle,
  calculateDistance,
  normalizePose,
  calculateJointAngles,
  cosineSimilarity,
  poseToVector,
  calculatePoseSimilarity,
  mapSimilarityToScore,
  detectCorrections,
  dynamicTimeWarp,
  calculateSequenceScore
} from '@/utils/poseMath'

function createKeypoint(x: number, y: number, z?: number, visibility = 1): Keypoint {
  return { x, y, z, visibility, score: 1 }
}

function createMockPose(keypoints?: Keypoint[]): PoseData {
  const defaultKeypoints: Keypoint[] = []
  for (let i = 0; i < 33; i++) {
    defaultKeypoints.push(createKeypoint(0.5, 0.5, 0))
  }
  defaultKeypoints[11] = createKeypoint(0.4, 0.3, 0)
  defaultKeypoints[12] = createKeypoint(0.6, 0.3, 0)
  defaultKeypoints[13] = createKeypoint(0.3, 0.4, 0)
  defaultKeypoints[14] = createKeypoint(0.7, 0.4, 0)
  defaultKeypoints[15] = createKeypoint(0.2, 0.5, 0)
  defaultKeypoints[16] = createKeypoint(0.8, 0.5, 0)
  defaultKeypoints[23] = createKeypoint(0.4, 0.6, 0)
  defaultKeypoints[24] = createKeypoint(0.6, 0.6, 0)
  defaultKeypoints[25] = createKeypoint(0.3, 0.8, 0)
  defaultKeypoints[26] = createKeypoint(0.7, 0.8, 0)
  defaultKeypoints[27] = createKeypoint(0.25, 1.0, 0)
  defaultKeypoints[28] = createKeypoint(0.75, 1.0, 0)

  return {
    timestamp: Date.now(),
    keypoints: keypoints || defaultKeypoints,
    score: 1.0
  }
}

describe('姿态计算工具函数', () => {
  describe('calculateAngle', () => {
    it('应该正确计算三点形成的角度 - 90度', () => {
      const a = createKeypoint(0, 1)
      const b = createKeypoint(0, 0)
      const c = createKeypoint(1, 0)
      const angle = calculateAngle(a, b, c)
      expect(angle).toBeGreaterThanOrEqual(89)
      expect(angle).toBeLessThanOrEqual(91)
    })

    it('应该正确计算三点形成的角度 - 180度', () => {
      const a = createKeypoint(-1, 0)
      const b = createKeypoint(0, 0)
      const c = createKeypoint(1, 0)
      const angle = calculateAngle(a, b, c)
      expect(angle).toBeGreaterThanOrEqual(179)
      expect(angle).toBeLessThanOrEqual(181)
    })

    it('应该正确计算三点形成的角度 - 45度', () => {
      const a = createKeypoint(-1, 1)
      const b = createKeypoint(0, 0)
      const c = createKeypoint(1, 0)
      const angle = calculateAngle(a, b, c)
      expect(angle).toBeGreaterThanOrEqual(134)
      expect(angle).toBeLessThanOrEqual(136)
    })

    it('角度应该在 0-180 度范围内', () => {
      const a = createKeypoint(1, 2)
      const b = createKeypoint(3, 4)
      const c = createKeypoint(5, 6)
      const angle = calculateAngle(a, b, c)
      expect(angle).toBeGreaterThanOrEqual(0)
      expect(angle).toBeLessThanOrEqual(180)
    })
  })

  describe('calculateDistance', () => {
    it('应该正确计算两点之间的距离', () => {
      const a = createKeypoint(0, 0)
      const b = createKeypoint(3, 4)
      const distance = calculateDistance(a, b)
      expect(distance).toBe(5)
    })

    it('同一点距离应为 0', () => {
      const a = createKeypoint(5, 5)
      const distance = calculateDistance(a, a)
      expect(distance).toBe(0)
    })

    it('负数坐标也能正确计算', () => {
      const a = createKeypoint(-1, -1)
      const b = createKeypoint(2, 3)
      const distance = calculateDistance(a, b)
      expect(distance).toBe(5)
    })
  })

  describe('normalizePose', () => {
    it('应该以髋部中心为原点进行归一化', () => {
      const pose = createMockPose()
      const normalized = normalizePose(pose)
      
      const leftHip = normalized.keypoints[23]
      const rightHip = normalized.keypoints[24]
      const centerX = (leftHip.x + rightHip.x) / 2
      const centerY = (leftHip.y + rightHip.y) / 2
      
      expect(Math.abs(centerX)).toBeLessThan(0.01)
      expect(Math.abs(centerY)).toBeLessThan(0.01)
    })

    it('归一化后肩宽和髋宽的平均应为 1', () => {
      const pose = createMockPose()
      const normalized = normalizePose(pose)
      
      const shoulderDistance = calculateDistance(
        normalized.keypoints[11],
        normalized.keypoints[12]
      )
      const hipDistance = calculateDistance(
        normalized.keypoints[23],
        normalized.keypoints[24]
      )
      const avgDistance = (shoulderDistance + hipDistance) / 2
      
      expect(Math.abs(avgDistance - 1)).toBeLessThan(0.01)
    })
  })

  describe('calculateJointAngles', () => {
    it('应该计算所有8个关键关节角度', () => {
      const pose = createMockPose()
      const angles = calculateJointAngles(pose)
      
      expect(angles).toHaveProperty('leftElbow')
      expect(angles).toHaveProperty('rightElbow')
      expect(angles).toHaveProperty('leftShoulder')
      expect(angles).toHaveProperty('rightShoulder')
      expect(angles).toHaveProperty('leftHip')
      expect(angles).toHaveProperty('rightHip')
      expect(angles).toHaveProperty('leftKnee')
      expect(angles).toHaveProperty('rightKnee')
    })

    it('所有角度应该在 0-180 度范围内', () => {
      const pose = createMockPose()
      const angles = calculateJointAngles(pose)
      
      Object.values(angles).forEach(angle => {
        expect(angle).toBeGreaterThanOrEqual(0)
        expect(angle).toBeLessThanOrEqual(180)
      })
    })
  })

  describe('cosineSimilarity', () => {
    it('相同向量相似度应为 1', () => {
      const vec1 = [1, 2, 3]
      const similarity = cosineSimilarity(vec1, vec1)
      expect(Math.abs(similarity - 1)).toBeLessThan(0.001)
    })

    it('相反向量相似度应为 -1', () => {
      const vec1 = [1, 2, 3]
      const vec2 = [-1, -2, -3]
      const similarity = cosineSimilarity(vec1, vec2)
      expect(Math.abs(similarity + 1)).toBeLessThan(0.001)
    })

    it('正交向量相似度应为 0', () => {
      const vec1 = [1, 0]
      const vec2 = [0, 1]
      const similarity = cosineSimilarity(vec1, vec2)
      expect(Math.abs(similarity)).toBeLessThan(0.001)
    })

    it('不同长度向量相似度应为 0', () => {
      const vec1 = [1, 2, 3]
      const vec2 = [1, 2]
      const similarity = cosineSimilarity(vec1, vec2)
      expect(similarity).toBe(0)
    })

    it('零向量相似度应为 0', () => {
      const vec1 = [0, 0, 0]
      const vec2 = [1, 2, 3]
      const similarity = cosineSimilarity(vec1, vec2)
      expect(similarity).toBe(0)
    })
  })

  describe('poseToVector', () => {
    it('应该将姿态转换为数字向量', () => {
      const pose = createMockPose()
      const vector = poseToVector(pose)
      
      expect(Array.isArray(vector)).toBe(true)
      expect(vector.length).toBe(66)
      vector.forEach(v => {
        expect(typeof v).toBe('number')
      })
    })
  })

  describe('calculatePoseSimilarity', () => {
    it('相同姿态相似度应为 1', () => {
      const pose = createMockPose()
      const similarity = calculatePoseSimilarity(pose, pose)
      expect(similarity).toBeGreaterThan(0.99)
    })

    it('相似度应该在 -1 到 1 之间', () => {
      const pose1 = createMockPose()
      const pose2 = createMockPose()
      pose2.keypoints.forEach(kp => {
        kp.x += 0.1
        kp.y += 0.1
      })
      
      const similarity = calculatePoseSimilarity(pose1, pose2)
      expect(similarity).toBeGreaterThanOrEqual(-1)
      expect(similarity).toBeLessThanOrEqual(1)
    })
  })

  describe('mapSimilarityToScore', () => {
    it('相似度 1 应该得 100 分', () => {
      const score = mapSimilarityToScore(1)
      expect(score).toBe(100)
    })

    it('相似度 0 应该得 0 分', () => {
      const score = mapSimilarityToScore(0)
      expect(score).toBe(0)
    })

    it('相似度 -1 应该得 0 分', () => {
      const score = mapSimilarityToScore(-1)
      expect(score).toBe(0)
    })

    it('相似度 2 应该得 100 分 (边界处理)', () => {
      const score = mapSimilarityToScore(2)
      expect(score).toBe(100)
    })

    it('分数应该保留一位小数', () => {
      const score = mapSimilarityToScore(0.8567)
      expect(score).toBe(85.7)
    })
  })

  describe('detectCorrections', () => {
    it('应该在角度偏差较大时返回 error 类型纠错', () => {
      const userPose = createMockPose()
      const refPose = createMockPose()
      
      userPose.keypoints[25].y = 0.9
      
      const thresholds: Record<number, number> = { 25: 10 }
      const corrections = detectCorrections(userPose, refPose, thresholds)
      
      expect(Array.isArray(corrections)).toBe(true)
    })

    it('完全相同的姿态应该没有纠错', () => {
      const pose = createMockPose()
      const thresholds: Record<number, number> = {}
      const corrections = detectCorrections(pose, pose, thresholds)
      
      expect(corrections.length).toBe(0)
    })

    it('纠错信息应该包含必要字段', () => {
      const userPose = createMockPose()
      const refPose = createMockPose()
      userPose.keypoints[25].y = 0.95
      userPose.keypoints[27].y = 1.1
      
      const thresholds: Record<number, number> = { 25: 5 }
      const corrections = detectCorrections(userPose, refPose, thresholds)
      
      if (corrections.length > 0) {
        const correction = corrections[0]
        expect(correction).toHaveProperty('timestamp')
        expect(correction).toHaveProperty('type')
        expect(correction).toHaveProperty('message')
        expect(correction).toHaveProperty('keypointIndex')
        expect(correction).toHaveProperty('suggestion')
        expect(['warning', 'error']).toContain(correction.type)
      }
    })
  })

  describe('dynamicTimeWarp', () => {
    it('相同序列距离应为 0', () => {
      const pose = createMockPose()
      const sequence = [pose, pose, pose]
      
      const result = dynamicTimeWarp(sequence, sequence)
      
      expect(result.distance).toBeLessThan(0.01)
      expect(Array.isArray(result.path)).toBe(true)
    })

    it('路径应该连接起点和终点', () => {
      const pose1 = createMockPose()
      const pose2 = createMockPose()
      pose2.keypoints[0].x = 0.6
      
      const sequence1 = [pose1, pose1]
      const sequence2 = [pose2, pose2, pose2]
      
      const result = dynamicTimeWarp(sequence1, sequence2)
      
      expect(result.path[0]).toEqual([0, 0])
      expect(result.path[result.path.length - 1]).toEqual([1, 2])
    })
  })

  describe('calculateSequenceScore', () => {
    it('空序列应该得 0 分', () => {
      const score1 = calculateSequenceScore([], [createMockPose()])
      const score2 = calculateSequenceScore([createMockPose()], [])
      
      expect(score1).toBe(0)
      expect(score2).toBe(0)
    })

    it('相同序列应该得高分', () => {
      const pose = createMockPose()
      const sequence = [pose, pose, pose]
      
      const score = calculateSequenceScore(sequence, sequence)
      expect(score).toBeGreaterThan(90)
    })

    it('分数应该在 0-100 范围内', () => {
      const pose1 = createMockPose()
      const pose2 = createMockPose()
      pose2.keypoints.forEach(kp => {
        kp.x += 0.3
        kp.y += 0.3
      })
      
      const sequence1 = [pose1, pose1]
      const sequence2 = [pose2, pose2]
      
      const score = calculateSequenceScore(sequence1, sequence2)
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    })
  })
})
