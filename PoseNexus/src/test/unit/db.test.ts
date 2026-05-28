import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { Course, TrainingSession, ActionTemplate } from '@/types/pose'
import {
  db,
  saveCourse,
  getAllCourses,
  getCourseById,
  saveTrainingSession,
  getTrainingSessionsByUser,
  getUnsyncedSessions,
  markSessionSynced,
  saveSnapshot,
  getLatestSnapshot
} from '@/utils/db'

function createMockCourse(id: string, category = '瑜伽'): Course {
  const actions: ActionTemplate[] = [
    {
      id: `act_${id}_001`,
      name: '测试动作',
      duration: 30,
      description: '测试动作描述',
      referencePose: {
        timestamp: 0,
        keypoints: Array(33).fill(null).map((_, i) => ({
          x: 0.5,
          y: 0.5,
          z: 0,
          visibility: 1,
          score: 1
        })),
        score: 1
      },
      keypointThresholds: {}
    }
  ]
  
  return {
    id,
    name: `测试课程 ${id}`,
    description: '测试课程描述',
    difficulty: 'beginner',
    duration: 15,
    category,
    thumbnail: '',
    actions
  }
}

function createMockSession(userId: string, courseId: string, synced = false): TrainingSession {
  return {
    id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    courseId,
    startTime: Date.now() - 60000,
    endTime: Date.now(),
    totalDuration: 60000,
    averageScore: 85.5,
    actions: [
      {
        actionId: 'act_001',
        actionName: '测试动作',
        startTime: Date.now() - 60000,
        endTime: Date.now() - 30000,
        scores: [80, 85, 90],
        averageScore: 85,
        corrections: []
      }
    ],
    synced,
    createdAt: Date.now()
  }
}

describe('IndexedDB 数据库操作', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  afterEach(async () => {
    await db.delete()
  })

  describe('课程数据操作', () => {
    it('应该能够保存课程', async () => {
      const course = createMockCourse('course_test_001')
      const id = await saveCourse(course)
      
      expect(id).toBe('course_test_001')
    })

    it('应该能够获取所有课程', async () => {
      const course1 = createMockCourse('course_test_001', '瑜伽')
      const course2 = createMockCourse('course_test_002', 'HIIT')
      
      await saveCourse(course1)
      await saveCourse(course2)
      
      const courses = await getAllCourses()
      expect(courses.length).toBe(2)
      expect(courses[0].id).toBe('course_test_001')
      expect(courses[1].id).toBe('course_test_002')
    })

    it('应该能够根据 ID 获取课程', async () => {
      const course = createMockCourse('course_test_001')
      await saveCourse(course)
      
      const found = await getCourseById('course_test_001')
      expect(found).not.toBeNull()
      expect(found?.id).toBe('course_test_001')
      expect(found?.name).toBe('测试课程 course_test_001')
    })

    it('获取不存在的课程应该返回 null', async () => {
      const found = await getCourseById('non_existent')
      expect(found).toBeUndefined()
    })

    it('保存相同 ID 的课程应该覆盖', async () => {
      const course1 = createMockCourse('course_test_001')
      course1.name = '原始名称'
      await saveCourse(course1)
      
      const course2 = createMockCourse('course_test_001')
      course2.name = '更新后的名称'
      await saveCourse(course2)
      
      const found = await getCourseById('course_test_001')
      expect(found?.name).toBe('更新后的名称')
    })
  })

  describe('训练记录操作', () => {
    it('应该能够保存训练记录', async () => {
      const session = createMockSession('user_001', 'course_001')
      const id = await saveTrainingSession(session)
      
      expect(id).toBe(session.id)
    })

    it('应该能够根据用户获取训练记录', async () => {
      const session1 = createMockSession('user_001', 'course_001')
      const session2 = createMockSession('user_001', 'course_002')
      const session3 = createMockSession('user_002', 'course_001')
      
      await saveTrainingSession(session1)
      await saveTrainingSession(session2)
      await saveTrainingSession(session3)
      
      const userSessions = await getTrainingSessionsByUser('user_001')
      expect(userSessions.length).toBe(2)
      userSessions.forEach(s => expect(s.userId).toBe('user_001'))
    })

    it('训练记录应该按创建时间倒序排列', async () => {
      const session1 = createMockSession('user_001', 'course_001')
      session1.createdAt = Date.now() - 10000
      const session2 = createMockSession('user_001', 'course_002')
      session2.createdAt = Date.now()
      
      await saveTrainingSession(session1)
      await saveTrainingSession(session2)
      
      const sessions = await getTrainingSessionsByUser('user_001')
      expect(sessions[0].createdAt).toBeGreaterThan(sessions[1].createdAt)
    })

    it('应该能够获取未同步的训练记录', async () => {
      const syncedSession = createMockSession('user_001', 'course_001', true)
      const unsyncedSession1 = createMockSession('user_001', 'course_002', false)
      const unsyncedSession2 = createMockSession('user_001', 'course_003', false)
      
      await saveTrainingSession(syncedSession)
      await saveTrainingSession(unsyncedSession1)
      await saveTrainingSession(unsyncedSession2)
      
      const unsynced = await getUnsyncedSessions()
      expect(unsynced.length).toBe(2)
      unsynced.forEach(s => expect(s.synced).toBe(false))
    })

    it('应该能够标记训练记录为已同步', async () => {
      const session = createMockSession('user_001', 'course_001', false)
      await saveTrainingSession(session)
      
      await markSessionSynced(session.id)
      
      const updated = await db.trainingSessions.get(session.id)
      expect(updated?.synced).toBe(true)
    })

    it('没有训练记录时应该返回空数组', async () => {
      const sessions = await getTrainingSessionsByUser('no_sessions')
      expect(sessions).toEqual([])
    })
  })

  describe('快照操作', () => {
    it('应该能够保存快照', async () => {
      const userId = 'user_snapshot_001'
      const type = 'training'
      const snapshotData = {
        poseData: [{ timestamp: Date.now(), keypoints: [], score: 1 }],
        currentActionIndex: 0,
        elapsedTime: 30000
      }
      
      const id = await saveSnapshot(userId, type, snapshotData)
      
      expect(id).toBeDefined()
      const snapshot = await db.snapshots.get(id)
      expect(snapshot).not.toBeUndefined()
      expect(snapshot?.userId).toBe(userId)
      expect(snapshot?.type).toBe(type)
    })

    it('应该能够获取最新快照', async () => {
      const userId = 'user_snapshot_002'
      const type = 'training'
      
      await saveSnapshot(userId, type, {
        poseData: [],
        currentActionIndex: 0,
        elapsedTime: 10000
      })
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      const latestData = {
        poseData: [],
        currentActionIndex: 1,
        elapsedTime: 20000
      }
      await saveSnapshot(userId, type, latestData)
      
      const latest = await getLatestSnapshot(userId, type)
      expect(latest).not.toBeNull()
      const latestObj = latest as { currentActionIndex: number; elapsedTime: number }
      expect(latestObj.currentActionIndex).toBe(1)
      expect(latestObj.elapsedTime).toBe(20000)
    })

    it('没有快照时应该返回 null', async () => {
      const latest = await getLatestSnapshot('non_existent_user', 'training')
      expect(latest).toBeNull()
    })

    it('同一 user 保存多个快照应该都能存储', async () => {
      const userId = 'user_snapshot_003'
      const type = 'training'
      
      for (let i = 0; i < 5; i++) {
        await saveSnapshot(userId, type, {
          poseData: [],
          currentActionIndex: i,
          elapsedTime: i * 10000
        })
        await new Promise(resolve => setTimeout(resolve, 5))
      }
      
      const count = await db.snapshots.where('userId').equals(userId).count()
      expect(count).toBe(5)
    })
  })

  describe('数据完整性', () => {
    it('保存的课程应该包含所有必要字段', async () => {
      const course = createMockCourse('course_integrity_001')
      await saveCourse(course)
      
      const saved = await getCourseById('course_integrity_001')
      expect(saved).toHaveProperty('id')
      expect(saved).toHaveProperty('name')
      expect(saved).toHaveProperty('description')
      expect(saved).toHaveProperty('difficulty')
      expect(saved).toHaveProperty('duration')
      expect(saved).toHaveProperty('category')
      expect(saved).toHaveProperty('actions')
      expect(Array.isArray(saved?.actions)).toBe(true)
    })

    it('保存的训练记录应该包含所有必要字段', async () => {
      const session = createMockSession('user_integrity', 'course_integrity')
      await saveTrainingSession(session)
      
      const sessions = await getTrainingSessionsByUser('user_integrity')
      const saved = sessions[0]
      
      expect(saved).toHaveProperty('id')
      expect(saved).toHaveProperty('userId')
      expect(saved).toHaveProperty('courseId')
      expect(saved).toHaveProperty('startTime')
      expect(saved).toHaveProperty('endTime')
      expect(saved).toHaveProperty('totalDuration')
      expect(saved).toHaveProperty('averageScore')
      expect(saved).toHaveProperty('actions')
      expect(saved).toHaveProperty('synced')
      expect(saved).toHaveProperty('createdAt')
    })
  })
})
