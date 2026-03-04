export interface Article {
	id: string;
	url: string;
	title: string;
	author: string;
	publishedAt: string | null;
	excerpt: string;
	content: string; // HTML string
	savedAt: number; // Date.now()
	updatedAt: number; // Date.now() — updated on every mutable write
	isRead: boolean;
	tags: string[];
	archived: boolean;
	siteName: string;
	wordCount: number;
}

export interface SyncFile {
	version: 1;
	exportedAt: number;
	articles: Article[];
	readerSettings?: ReaderSettings & { updatedAt: number };
	appTheme?: { value: 'system' | 'light' | 'dark'; updatedAt: number };
	readingProgress?: Record<string, number>; // articleId → 0-100
	lastOpenedAt?: Record<string, number>;    // articleId → timestamp
}

export interface Highlight {
	id: string;
	articleId: string;
	text: string;
	note: string;
	createdAt: number;
}

export interface ReaderSettings {
	fontSize: number; // px
	fontFamily: 'serif' | 'sans';
	lineHeight: number;
	theme: 'system' | 'light' | 'sepia' | 'dark';
}

export type FilterMode = 'all' | 'unread' | 'read' | 'archived';
export type SortMode = 'newest' | 'oldest' | 'title' | 'length' | 'progress' | 'lastopened';
