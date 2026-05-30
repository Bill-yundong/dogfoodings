export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  category: string;
  totalChapters: number;
  createdAt: number;
  updatedAt: number;
}

export interface ReadingProgress {
  id: string;
  bookId: string;
  currentChapter: number;
  progress: number;
  intakeIndex: number;
  lastReadAt: number;
}

export interface Note {
  id: string;
  bookId: string;
  title: string;
  content: string;
  tags: string[];
  backlinks: string[];
  createdAt: number;
  updatedAt: number;
}

export interface KnowledgeNode {
  id: string;
  label: string;
  type: string;
  strength: number;
  sourceNoteId: string;
  lastAccessedAt: number;
  createdAt: number;
}

export interface KnowledgeEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relationType: string;
  weight: number;
}

export interface ReviewCard {
  id: string;
  noteId: string;
  nodeId: string;
  front: string;
  back: string;
  difficulty: number;
  stability: number;
  retrievability: number;
  nextReviewAt: number;
  reviewCount: number;
  lapseCount: number;
  easeFactor: number;
}

export interface ReviewLog {
  id: string;
  cardId: string;
  rating: number;
  cognitiveLoad: number;
  elapsedDays: number;
  scheduledDays: number;
  reviewedAt: number;
}

export interface SyncEvent {
  id: string;
  entityType: string;
  entityId: string;
  operation: string;
  payload: any;
  timestamp: number;
  synced: boolean;
}

export interface SearchIndexEntry {
  id: string;
  term: string;
  entityType: string;
  entityId: string;
  frequency: number;
}
