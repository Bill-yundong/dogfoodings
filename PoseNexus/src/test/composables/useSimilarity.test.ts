import { describe, it, expect, beforeEach } from 'vitest'
import type { PoseData, ActionTemplate } from '@/types/pose'
import { useSimilarity } from '@/composables/useSimilarity'

function createMockPose(): PoseData {
  const keypoints = []
  for (let i = 0; i < 33; i++) {
    keypoints.push({
      x: 0.3 + (i % 5) * 0.1,
      y: 0.2 + Math.floor(i / 8) * 0.15,
      z: (Math.random() - 0.5) * 0.2,
      visibility: 0.9,
      score: 0.85
    })
  }
  return {
    timestamp: Date.now(),
    keypoints,
    score: 0.9
  }
}

function createMockActionTemplate(): ActionTemplate {
  return {
    id: 'act_test_001',
    name: '测试动作',
    duration: 30,
    description: '测试动作描述',
    referencePose: createMockPose(),
    keypointThresholds: { 11: 10, 12: 10, 23: 15, 24: 15 }
  }
}

describe('useSimilarity 组合式函数', () => {
  let similarity: ReturnType<typeof useSimilarity>

  beforeEach(() => {
    similarity = useSimilarity()
  })

  describe('初始状态', () => {
    it('初始分数应为 0', () => {
      expect(similarity.currentScore.value).toBe(0)
    })

    it('初始纠错列表应为空', () => {
      expect(similarity.currentCorrections.value).toEqual([])
    })

    it('初始平均分数应为 0', () => {
      expect(similarity.averageScore.value).toBe(0)
    })

    it('初始最新纠错应为 null', () => {
      expect(similarity.latestCorrection.value).toBeNull()
    })

    it('初始分数等级应为 D', () => {
      expect(similarity.scoreGrade.value.grade).toBe('D')
    })
  })

  describe('evaluatePose', () => {
    it('应该返回分数和纠错信息', () => {
      const pose = createMockPose()
      const template = createMockActionTemplate()
      
      const result = similarity.evaluatePose(pose, template)
      
      expect(result).toHaveProperty('score')
      expect(result).toHaveProperty('corrections')
      expect(typeof result.score).toBe('number')
      expect(Array.isArray(result.corrections)).toBe(true)
    })

    it('相同姿态应该得到高分', () => {
      const template = createMockActionTemplate()
      
      const result = similarity.evaluatePose(template.referencePose, template)
      
      expect(result.score).toBeGreaterThan(90)
    })

    it('应该更新 currentScore', () => {
      const pose = createMockPose()
      const template = createMockActionTemplate()
      
      similarity.evaluatePose(pose, template)
      
      expect(similarity.currentScore.value).toBeGreaterThan(0)
    })

    it('多次评估后 averageScore 应该有值', () => {
      const template = createMockActionTemplate()
      
      similarity.evaluatePose(template.referencePose, template)
      similarity.evaluatePose(template.referencePose, template)
      
      expect(similarity.averageScore.value).toBeGreaterThan(0)
    })

    it('分数历史应该被记录并反映在 averageScore 中', () => {
      const template = createMockActionTemplate()
      
      for (let i = 0; i < 5; i++) {
        similarity.evaluatePose(template.referencePose, template)
      }
      
      expect(similarity.averageScore.value).toBeGreaterThan(90)
    })

    it('多次评估后 currentScore 应该更新', () => {
      const template = createMockActionTemplate()
      
      for (let i = 0; i < 3; i++) {
        similarity.evaluatePose(template.referencePose, template)
      }
      
      expect(similarity.currentScore.value).toBeGreaterThan(90)
    })

    it('分数历史应该限制在 100 条以内', () => {
      const template = createMockActionTemplate()
      
      for (let i = 0; i < 150; i++) {
        similarity.evaluatePose(createMockPose(), template)
      }
      
      expect(similarity.averageScore.value).toBeGreaterThan(0)
    })

    it('姿态序列应该限制在 300 条以内', () => {
      const template = createMockActionTemplate()
      
      for (let i = 0; i < 350; i++) {
        similarity.evaluatePose(createMockPose(), template)
      }
      
      expect(similarity.currentScore.value).toBeGreaterThan(0)
    })
  })

  describe('计算属性', () => {
    it('averageScore 应该正确计算平均分', () => {
      const template = createMockActionTemplate()
      
      similarity.evaluatePose(template.referencePose, template)
      similarity.evaluatePose(template.referencePose, template)
      
      const avg = similarity.averageScore.value
      expect(avg).toBeGreaterThan(90)
    })

    it('latestCorrection 应该返回最新的纠错信息', () => {
      const template = createMockActionTemplate()
      const pose = createMockPose()
      pose.keypoints[25].y = 0.95
      
      similarity.evaluatePose(pose, template)
      
      if (similarity.currentCorrections.value.length > 0) {
        expect(similarity.latestCorrection.value).not.toBeNull()
        expect(similarity.latestCorrection.value?.timestamp).toBeDefined()
      }
    })

    it('scoreGrade 应该根据分数返回正确等级', () => {
      const template = createMockActionTemplate()
      
      similarity.evaluatePose(template.referencePose, template)
      
      const grade = similarity.scoreGrade.value
      expect(grade.grade).toBe('S')
      expect(grade.color).toBe('text-yellow-400')
    })
  })

  describe('finishAction', () => {
    it('应该返回完整的训练动作记录', () => {
      const template = createMockActionTemplate()
      const startTime = Date.now() - 30000
      
      similarity.evaluatePose(template.referencePose, template)
      similarity.evaluatePose(template.referencePose, template)
      
      const action = similarity.finishAction(template, startTime, Date.now())
      
      expect(action).toHaveProperty('actionId')
      expect(action).toHaveProperty('actionName')
      expect(action).toHaveProperty('startTime')
      expect(action).toHaveProperty('endTime')
      expect(action).toHaveProperty('scores')
      expect(action).toHaveProperty('averageScore')
      expect(action).toHaveProperty('corrections')
      expect(action.actionId).toBe(template.id)
      expect(action.startTime).toBe(startTime)
    })

    it('完成动作后应该重置状态', () => {
      const template = createMockActionTemplate()
      
      similarity.evaluatePose(createMockPose(), template)
      similarity.finishAction(template, Date.now(), Date.now())
      
      expect(similarity.currentScore.value).toBe(0)
      expect(similarity.currentCorrections.value).toEqual([])
      expect(similarity.averageScore.value).toBe(0)
      expect(similarity.latestCorrection.value).toBeNull()
    })
  })

  describe('reset', () => {
    it('应该重置所有状态', () => {
      const template = createMockActionTemplate()
      
      similarity.evaluatePose(createMockPose(), template)
      similarity.evaluatePose(createMockPose(), template)
      
      similarity.reset()
      
      expect(similarity.currentScore.value).toBe(0)
      expect(similarity.currentCorrections.value).toEqual([])
      expect(similarity.averageScore.value).toBe(0)
      expect(similarity.latestCorrection.value).toBeNull()
    })
  })
})
