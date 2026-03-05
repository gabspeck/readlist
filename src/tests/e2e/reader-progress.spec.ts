import { test, expect } from '@playwright/test';
import type { Article } from '../../lib/types';

const ARTICLE_ID = 'e2e-progress-article';

const testArticle: Article = {
	id: ARTICLE_ID,
	url: 'https://example.com/long-article',
	title: 'Long Article for Progress Testing',
	author: 'Test Author',
	publishedAt: null,
	excerpt: 'A long article to test scroll progress.',
	content: '<p>' + 'This is paragraph content. '.repeat(200) + '</p>',
	savedAt: Date.now() - 5000,
	updatedAt: Date.now() - 5000,
	isRead: false,
	tags: [],
	archived: false,
	siteName: 'Test Site',
	wordCount: 1000
};

async function seedArticle(page: import('@playwright/test').Page, article: Article) {
	await page.evaluate(async (a) => {
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
			req.onsuccess = (e) => {
				const db = (e.target as IDBOpenDBRequest).result;
				const tx = db.transaction('articles', 'readwrite');
				tx.objectStore('articles').put(a);
				tx.oncomplete = () => resolve();
				tx.onerror = () => reject(tx.error);
			};
			req.onerror = () => reject(req.error);
		});
	}, article);
}

test('scroll to bottom marks article as read', async ({ page }) => {
	await page.goto('/');
	await seedArticle(page, testArticle);

	// Navigate to reader
	await page.goto(`/read/${ARTICLE_ID}`);
	await page.waitForLoadState('networkidle');

	// Article should load (title appears in both header and h1; use first match)
	await expect(page.getByText('Long Article for Progress Testing').first()).toBeVisible({ timeout: 10_000 });

	// Scroll the article container (main.reader-main) to the bottom
	// and dispatch the scroll event so the progress handler fires
	await page.locator('main.reader-main').evaluate((el) => {
		el.scrollTop = el.scrollHeight;
		el.dispatchEvent(new Event('scroll'));
	});

	// Wait for progress tracking debounce + markRead to settle
	await page.waitForTimeout(1000);

	// Navigate back home and check article appears in read tab
	await page.goto('/?filter=read');
	await page.waitForLoadState('networkidle');
	await expect(page.getByText('Long Article for Progress Testing')).toBeVisible({ timeout: 5000 });
});
