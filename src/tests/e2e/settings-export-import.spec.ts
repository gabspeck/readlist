import { test, expect } from '@playwright/test';
import type { Article } from '../../lib/types';

function makeArticle(id: string): Article {
	return {
		id,
		url: `https://example.com/${id}`,
		title: `Export Test Article ${id}`,
		author: 'Test Author',
		publishedAt: null,
		excerpt: 'Test excerpt',
		content: '<p>Test content</p>',
		savedAt: Date.now() - parseInt(id) * 1000,
		updatedAt: Date.now(),
		isRead: false,
		tags: [],
		archived: false,
		siteName: 'Test Site',
		wordCount: 50
	};
}

async function seedArticles(page: import('@playwright/test').Page, articles: Article[]) {
	await page.evaluate(async (arts) => {
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
				for (const a of arts) tx.objectStore('articles').put(a);
				tx.oncomplete = () => resolve();
				tx.onerror = () => reject(tx.error);
			};
			req.onerror = () => reject(req.error);
		});
	}, articles);
}

test('export JSON then import restores articles', async ({ page }) => {
	await page.goto('/');
	await seedArticles(page, [makeArticle('1'), makeArticle('2')]);
	await page.reload();
	await page.waitForLoadState('networkidle');

	// Navigate to settings
	await page.goto('/settings');
	await page.waitForLoadState('networkidle');

	// Trigger JSON export and capture the download (blob URL download)
	const downloadPromise = page.waitForEvent('download');
	const exportButton = page.getByRole('button', { name: /export/i }).first();
	await exportButton.click();
	const download = await downloadPromise;

	// Read the downloaded file contents
	const exportPath = await download.path();
	expect(exportPath).toBeTruthy();

	const fs = await import('fs/promises');
	const jsonContent = await fs.readFile(exportPath!, 'utf-8');
	// Export format is a raw JSON array of articles (not { articles: [] })
	const exportedArticles = JSON.parse(jsonContent) as Article[];

	expect(exportedArticles).toHaveLength(2);
	expect(exportedArticles.map((a: Article) => a.id)).toEqual(
		expect.arrayContaining(['1', '2'])
	);

	// Clear storage by emptying each object store (deleting the DB would
	// block indefinitely because the app holds an open connection)
	await page.evaluate(async () => {
		await new Promise<void>((resolve, reject) => {
			const req = indexedDB.open('readlist', 2);
			req.onsuccess = (e) => {
				const db = (e.target as IDBOpenDBRequest).result;
				const tx = db.transaction(['articles', 'highlights'], 'readwrite');
				tx.objectStore('articles').clear();
				tx.objectStore('highlights').clear();
				tx.oncomplete = () => { db.close(); resolve(); };
				tx.onerror = () => reject(tx.error);
			};
			req.onerror = () => reject(req.error);
		});
	});

	await page.reload();
	await page.waitForLoadState('networkidle');
	await page.goto('/settings');

	// Import the exported file back
	const fileInput = page.locator('input[type="file"]');
	await fileInput.setInputFiles(exportPath!);

	// Wait for import success
	await page.waitForTimeout(1000);

	// Navigate home and verify articles restored
	await page.goto('/');
	await page.waitForLoadState('networkidle');
	await expect(page.getByText('Export Test Article 1')).toBeVisible({ timeout: 5000 });
	await expect(page.getByText('Export Test Article 2')).toBeVisible();
});
