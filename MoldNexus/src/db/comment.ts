import { getDB } from './index';
import type { Comment } from '../types';

export async function createComment(comment: Omit<Comment, 'id' | 'createdAt'>): Promise<Comment> {
  const db = getDB();
  const newComment: Comment = {
    ...comment,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  await db.add('comments', newComment);
  return newComment;
}

export async function listComments(): Promise<Comment[]> {
  const db = getDB();
  const comments = await db.getAll('comments');
  return comments.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getCommentsBySimulation(simulationId: string): Promise<Comment[]> {
  const db = getDB();
  const comments = await db.getAllFromIndex('comments', 'by-simulationId', simulationId);
  return comments.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getCommentsByTask(taskId: string): Promise<Comment[]> {
  const db = getDB();
  const comments = await db.getAllFromIndex('comments', 'by-taskId', taskId);
  return comments.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteComment(id: string): Promise<void> {
  const db = getDB();
  await db.delete('comments', id);
}
