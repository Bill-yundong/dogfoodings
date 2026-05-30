import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';

interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  coverUrl: string;
  description: string;
  createdAt: number;
  updatedAt: number;
}

interface ReadingProgress {
  id: string;
  bookId: string;
  currentPage: number;
  totalPages: number;
  percentage: number;
  lastReadAt: number;
}

interface Note {
  id: string;
  bookId: string;
  content: string;
  tags: string[];
  pageNumber: number;
  createdAt: number;
  updatedAt: number;
}

interface KnowledgeNode {
  id: string;
  label: string;
  type: string;
  description: string;
  sourceNoteId: string;
  createdAt: number;
}

interface KnowledgeEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relationType: string;
  createdAt: number;
}

interface ReviewCard {
  id: string;
  noteId: string;
  nodeId: string;
  front: string;
  back: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewAt: number;
  lastReviewedAt: number;
  createdAt: number;
}

interface ReviewLog {
  id: string;
  cardId: string;
  rating: number;
  reviewedAt: number;
  timeTaken: number;
}

interface SearchIndexEntry {
  id: string;
  term: string;
  entityType: string;
  entityId: string;
  frequency: number;
}

interface SyncEvent {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  timestamp: number;
  synced: number;
  payload: string;
}

interface KnowledgeLinkDB extends DBSchema {
  books: {
    key: string;
    value: Book;
    indexes: {
      title: string;
      category: string;
      updatedAt: number;
    };
  };
  readingProgress: {
    key: string;
    value: ReadingProgress;
    indexes: {
      bookId: string;
    };
  };
  notes: {
    key: string;
    value: Note;
    indexes: {
      bookId: string;
      tags: string;
      createdAt: number;
      updatedAt: number;
    };
  };
  knowledgeNodes: {
    key: string;
    value: KnowledgeNode;
    indexes: {
      label: string;
      type: string;
      sourceNoteId: string;
    };
  };
  knowledgeEdges: {
    key: string;
    value: KnowledgeEdge;
    indexes: {
      sourceId: string;
      targetId: string;
    };
  };
  reviewCards: {
    key: string;
    value: ReviewCard;
    indexes: {
      noteId: string;
      nodeId: string;
      nextReviewAt: number;
    };
  };
  reviewLogs: {
    key: string;
    value: ReviewLog;
    indexes: {
      cardId: string;
      reviewedAt: number;
    };
  };
  searchIndex: {
    key: string;
    value: SearchIndexEntry;
    indexes: {
      term: string;
      entityType: string;
      entityId: string;
    };
  };
  syncEvents: {
    key: string;
    value: SyncEvent;
    indexes: {
      entityType: string;
      timestamp: number;
      synced: number;
    };
  };
}

let db: IDBPDatabase<KnowledgeLinkDB> | null = null;

export async function initDB(): Promise<IDBPDatabase<KnowledgeLinkDB>> {
  db = await openDB<KnowledgeLinkDB>('knowledgelink_db', 1, {
    upgrade(database) {
      const books = database.createObjectStore('books', { keyPath: 'id' });
      books.createIndex('title', 'title');
      books.createIndex('category', 'category');
      books.createIndex('updatedAt', 'updatedAt');

      const readingProgress = database.createObjectStore('readingProgress', { keyPath: 'id' });
      readingProgress.createIndex('bookId', 'bookId');

      const notes = database.createObjectStore('notes', { keyPath: 'id' });
      notes.createIndex('bookId', 'bookId');
      notes.createIndex('tags', 'tags', { multiEntry: true });
      notes.createIndex('createdAt', 'createdAt');
      notes.createIndex('updatedAt', 'updatedAt');

      const knowledgeNodes = database.createObjectStore('knowledgeNodes', { keyPath: 'id' });
      knowledgeNodes.createIndex('label', 'label');
      knowledgeNodes.createIndex('type', 'type');
      knowledgeNodes.createIndex('sourceNoteId', 'sourceNoteId');

      const knowledgeEdges = database.createObjectStore('knowledgeEdges', { keyPath: 'id' });
      knowledgeEdges.createIndex('sourceId', 'sourceId');
      knowledgeEdges.createIndex('targetId', 'targetId');

      const reviewCards = database.createObjectStore('reviewCards', { keyPath: 'id' });
      reviewCards.createIndex('noteId', 'noteId');
      reviewCards.createIndex('nodeId', 'nodeId');
      reviewCards.createIndex('nextReviewAt', 'nextReviewAt');

      const reviewLogs = database.createObjectStore('reviewLogs', { keyPath: 'id' });
      reviewLogs.createIndex('cardId', 'cardId');
      reviewLogs.createIndex('reviewedAt', 'reviewedAt');

      const searchIndex = database.createObjectStore('searchIndex', { keyPath: 'id' });
      searchIndex.createIndex('term', 'term');
      searchIndex.createIndex('entityType', 'entityType');
      searchIndex.createIndex('entityId', 'entityId');

      const syncEvents = database.createObjectStore('syncEvents', { keyPath: 'id' });
      syncEvents.createIndex('entityType', 'entityType');
      syncEvents.createIndex('timestamp', 'timestamp');
      syncEvents.createIndex('synced', 'synced');
    },
  });
  return db;
}

export async function getDb(): Promise<IDBPDatabase<KnowledgeLinkDB>> {
  if (!db) {
    db = await initDB();
  }
  return db;
}
