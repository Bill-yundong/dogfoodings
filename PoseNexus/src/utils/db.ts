import Dexie, { Table } from 'dexie'
import type { TrainingSession, Course, ActionTemplate } from '@/types/pose'

export class PoseNexusDB extends Dexie {
  trainingSessions!: Table<TrainingSession, string>
  courses!: Table<Course, string>
  actionTemplates!: Table<ActionTemplate, string>
  snapshots!: Table<{
    id: string
    userId: string
    timestamp: number
    data: unknown
    type: string
  }, string>

  constructor() {
    super('pose_nexus_db')
    this.version(1).stores({
      trainingSessions: 'id, userId, courseId, createdAt, synced',
      courses: 'id, category, difficulty',
      actionTemplates: 'id',
      snapshots: 'id, userId, timestamp, type, [userId+type]'
    })
  }
}

export const db = new PoseNexusDB()

export async function saveTrainingSession(session: TrainingSession): Promise<string> {
  return db.trainingSessions.put(session)
}

export async function getTrainingSessionsByUser(userId: string): Promise<TrainingSession[]> {
  return db.trainingSessions
    .where('userId')
    .equals(userId)
    .reverse()
    .sortBy('createdAt')
}

export async function getUnsyncedSessions(): Promise<TrainingSession[]> {
  return db.trainingSessions
    .filter(s => !s.synced)
    .toArray()
}

export async function markSessionSynced(sessionId: string): Promise<void> {
  await db.trainingSessions.update(sessionId, { synced: true })
}

export async function saveSnapshot(
  userId: string,
  type: string,
  data: unknown
): Promise<string> {
  const snapshot = {
    id: `${userId}_${type}_${Date.now()}`,
    userId,
    timestamp: Date.now(),
    type,
    data
  }
  return db.snapshots.put(snapshot)
}

export async function getLatestSnapshot(
  userId: string,
  type: string
): Promise<unknown | null> {
  const snapshots = await db.snapshots
    .where('[userId+type]')
    .equals([userId, type])
    .reverse()
    .sortBy('timestamp')
  
  return snapshots[0]?.data || null
}

export async function saveCourse(course: Course): Promise<string> {
  return db.courses.put(course)
}

export async function getAllCourses(): Promise<Course[]> {
  return db.courses.toArray()
}

export async function getCourseById(id: string): Promise<Course | undefined> {
  return db.courses.get(id)
}

export async function saveActionTemplate(template: ActionTemplate): Promise<string> {
  return db.actionTemplates.put(template)
}

export async function getActionTemplate(id: string): Promise<ActionTemplate | undefined> {
  return db.actionTemplates.get(id)
}

export async function clearOldSnapshots(userId: string, daysToKeep: number = 7): Promise<void> {
  const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000
  await db.snapshots
    .where('userId')
    .equals(userId)
    .and(s => s.timestamp < cutoff)
    .delete()
}
