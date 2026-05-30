import { BaseRepository } from './base';

export const booksRepo = new BaseRepository('books');
export const readingProgressRepo = new BaseRepository('readingProgress');
export const notesRepo = new BaseRepository('notes');
export const knowledgeNodesRepo = new BaseRepository('knowledgeNodes');
export const knowledgeEdgesRepo = new BaseRepository('knowledgeEdges');
export const reviewCardsRepo = new BaseRepository('reviewCards');
export const reviewLogsRepo = new BaseRepository('reviewLogs');
export const syncEventsRepo = new BaseRepository('syncEvents');
