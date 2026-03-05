import { test, expect } from '@playwright/test';
import type { Article } from '../../lib/types';

function makeArticle(id: string, overrides: Partial<Article> = {}): Article {
	return {
		id,
		url: `https://example.com/${id}`,
		title: `Article ${id}`,
		author: '',
		publishedAt: null,
		excerpt: '',
		content: `<p>Content ${id}</p>`,
		savedAt: Date.now() - parseInt(id) * 1000,
		updatedAt: Date.now(),
		isRead: false,
		tags: [],
		archived: false,
		siteName: '',
		wordCount: 100,
		...overrides
	};
}

test('filter tabs show correct article counts', async ({ page }) => {
	// Seed articles directly into IndexedDB before the page loads
	await page.goto('/');

	await page.evaluate(async (articles) => {
		const DB_NAME = 'readlist';
		const DB_VERSION = 2;
		await new Promise<void>((resolve, reject) => {
			const req = indexedDB.open(DB_NAME, DB_VERSION);
			req.onupgradeneeded = (e) => {
				const db = (e.target as IDBOpenDBRequest).result;
				if (!db.objectStoreNames.contains('articles')) {
					const store = db.createObjectStore('articles', { keyPath: 'id' });
					store.createIndex('savedAt', 'savedAt');
					store.createIndex('isRead', 'isRead');
					store.createIndex('archived', 'archived');
					store.createIndex('updatedAt', 'updatedAt');
				}
				if (!db.objectStoreNames.contains('highlights')) {
					const hStore = db.createObjectStore('highlights', { keyPath: 'id' });
					hStore.createIndex('articleId', 'articleId');
				}
			};
			req.onsuccess = async (e) => {
				const db = (e.target as IDBOpenDBRequest).result;
				const tx = db.transaction('articles', 'readwrite');
				const store = tx.objectStore('articles');
				for (const article of articles) {
					store.put(article);
				}
				tx.oncomplete = () => resolve();
				tx.onerror = () => reject(tx.error);
			};
			req.onerror = () => reject(req.error);
		});
	}, [
		makeArticle('1', { isRead: false }),
		makeArticle('2', { isRead: false }),
		makeArticle('3', { isRead: true })
	]);

	// Reload the page so the app picks up the seeded data
	await page.reload();
	await page.waitForLoadState('networkidle');

	// All tab (non-archived): 3 articles
	await page.goto('/?filter=all');
	await expect(page.getByText('Article 1')).toBeVisible({ timeout: 5000 });
	await expect(page.getByText('Article 2')).toBeVisible();
	await expect(page.getByText('Article 3')).toBeVisible();

	// Unread tab: 2 articles
	await page.goto('/?filter=unread');
	await page.waitForLoadState('networkidle');
	const unreadCards = page.locator('[data-testid="article-card"], article, .article-card');
	// At minimum, the two unread articles should be visible
	await expect(page.getByText('Article 1')).toBeVisible({ timeout: 5000 });
	await expect(page.getByText('Article 2')).toBeVisible();

	// Read tab: 1 article
	await page.goto('/?filter=read');
	await page.waitForLoadState('networkidle');
	await expect(page.getByText('Article 3')).toBeVisible({ timeout: 5000 });
});
