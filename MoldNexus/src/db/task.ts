import { getDB } from './index';
import type { Task } from '../types';

type TaskStatus = Task['status'];
type TaskPriority = Task['priority'];

export async function createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
  const db = getDB();
  const now = Date.now();
  const newTask: Task = {
    ...task,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  await db.add('tasks', newTask);
  return newTask;
}

export async function getTask(id: string): Promise<Task | undefined> {
  const db = getDB();
  return db.get('tasks', id);
}

export async function listTasks(options?: {
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  simulationId?: string;
}): Promise<Task[]> {
  const db = getDB();
  let tasks: Task[];

  if (options?.status) {
    tasks = await db.getAllFromIndex('tasks', 'by-status', options.status);
  } else if (options?.priority) {
    tasks = await db.getAllFromIndex('tasks', 'by-priority', options.priority);
  } else if (options?.assigneeId) {
    tasks = await db.getAllFromIndex('tasks', 'by-assigneeId', options.assigneeId);
  } else if (options?.simulationId) {
    tasks = await db.getAllFromIndex('tasks', 'by-simulationId', options.simulationId);
  } else {
    tasks = await db.getAll('tasks');
  }

  return tasks.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<void> {
  const db = getDB();
  const task = await db.get('tasks', id);
  if (task) {
    const updated: Task = {
      ...task,
      ...updates,
      updatedAt: Date.now(),
    };
    await db.put('tasks', updated);
  }
}

export async function deleteTask(id: string): Promise<void> {
  const db = getDB();
  await db.delete('tasks', id);
}

export async function countTasksByStatus(): Promise<Record<TaskStatus, number>> {
  const db = getDB();
  const allTasks = await db.getAll('tasks');
  const counts: Record<TaskStatus, number> = {
    todo: 0,
    in_progress: 0,
    review: 0,
    done: 0,
  };

  for (const task of allTasks) {
    const status = task.status as TaskStatus;
    counts[status] = (counts[status] || 0) + 1;
  }

  return counts;
}
