import { openDB, type IDBPDatabase } from 'idb';
import type { Article, Highlight } from '$lib/types';

const DB_NAME = 'readlist';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
	if (!dbPromise) {
		dbPromise = openDB(DB_NAME, DB_VERSION, {
			upgrade(db, oldVersion, _newVersion, transaction) {
				if (oldVersion < 1) {
					const articles = db.createObjectStore('articles', { keyPath: 'id' });
					articles.createIndex('savedAt', 'savedAt');
					articles.createIndex('isRead', 'isRead');
					articles.createIndex('archived', 'archived');
					const highlights = db.createObjectStore('highlights', { keyPath: 'id' });
					highlights.createIndex('articleId', 'articleId');
				}
				if (oldVersion < 2) {
					transaction.objectStore('articles').createIndex('updatedAt', 'updatedAt');
				}
			}
		});
	}
	return dbPromise;
}

export async function saveArticle(article: Article): Promise<void> {
	const db = await getDB();
	await db.put('articles', { ...article, updatedAt: article.updatedAt ?? Date.now() });
}

export async function getArticle(id: string): Promise<Article | undefined> {
	const db = await getDB();
	return db.get('articles', id);
}

export async function getAllArticles(): Promise<Article[]> {
	const db = await getDB();
	const all = await db.getAll('articles');
	return all.sort((a, b) => b.savedAt - a.savedAt);
}

export async function updateArticle(id: string, patch: Partial<Article>): Promise<void> {
	const db = await getDB();
	const existing = await db.get('articles', id);
	if (!existing) return;
	await db.put('articles', { ...existing, ...patch, updatedAt: patch.updatedAt ?? Date.now() });
}

export async function deleteArticle(id: string): Promise<void> {
	const db = await getDB();
	await db.delete('articles', id);
}

export async function saveHighlight(highlight: Highlight): Promise<void> {
	const db = await getDB();
	await db.put('highlights', highlight);
}

export async function getHighlightsForArticle(articleId: string): Promise<Highlight[]> {
	const db = await getDB();
	return db.getAllFromIndex('highlights', 'articleId', articleId);
}

export async function deleteHighlight(id: string): Promise<void> {
	const db = await getDB();
	await db.delete('highlights', id);
}
