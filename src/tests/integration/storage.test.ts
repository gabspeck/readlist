import { describe, it, expect, afterEach } from 'vitest';
import {
	saveArticle,
	getArticle,
	getAllArticles,
	updateArticle,
	deleteArticle,
	saveHighlight,
	getHighlightsForArticle,
	deleteHighlight,
	_resetForTests
} from '$lib/services/storage';
import type { Article, Highlight } from '$lib/types';

function makeArticle(id: string, overrides: Partial<Article> = {}): Article {
	return {
		id,
		url: `https://example.com/${id}`,
		title: `Article ${id}`,
		author: '',
		publishedAt: null,
		excerpt: '',
		content: `Content ${id}`,
		savedAt: Date.now(),
		updatedAt: Date.now(),
		isRead: false,
		tags: [],
		archived: false,
		siteName: '',
		wordCount: 100,
		...overrides
	};
}

function makeHighlight(id: string, articleId: string): Highlight {
	return {
		id,
		articleId,
		text: `Highlight ${id}`,
		note: '',
		createdAt: Date.now()
	};
}

afterEach(() => {
	_resetForTests();
});

describe('Article CRUD', () => {
	it('saveArticle + getArticle round-trip', async () => {
		const article = makeArticle('a1');
		await saveArticle(article);
		const retrieved = await getArticle('a1');
		expect(retrieved).toBeDefined();
		expect(retrieved?.title).toBe('Article a1');
		expect(retrieved?.url).toBe('https://example.com/a1');
	});

	it('getArticle returns undefined for unknown id', async () => {
		const result = await getArticle('nonexistent');
		expect(result).toBeUndefined();
	});

	it('getAllArticles returns articles sorted by savedAt descending', async () => {
		await saveArticle(makeArticle('a1', { savedAt: 100 }));
		await saveArticle(makeArticle('a2', { savedAt: 300 }));
		await saveArticle(makeArticle('a3', { savedAt: 200 }));
		const all = await getAllArticles();
		expect(all.map((a) => a.id)).toEqual(['a2', 'a3', 'a1']);
	});

	it('getAllArticles returns empty array when no articles', async () => {
		const all = await getAllArticles();
		expect(all).toEqual([]);
	});

	it('updateArticle merges patch into existing article', async () => {
		await saveArticle(makeArticle('a1', { isRead: false }));
		await updateArticle('a1', { isRead: true, tags: ['tech'] });
		const updated = await getArticle('a1');
		expect(updated?.isRead).toBe(true);
		expect(updated?.tags).toEqual(['tech']);
		expect(updated?.title).toBe('Article a1'); // unchanged field preserved
	});

	it('updateArticle is a no-op for unknown id', async () => {
		// Should not throw
		await expect(updateArticle('nonexistent', { isRead: true })).resolves.toBeUndefined();
	});

	it('deleteArticle removes the article', async () => {
		await saveArticle(makeArticle('a1'));
		await deleteArticle('a1');
		const result = await getArticle('a1');
		expect(result).toBeUndefined();
	});

	it('deleteArticle removes only the specified article', async () => {
		await saveArticle(makeArticle('a1'));
		await saveArticle(makeArticle('a2'));
		await deleteArticle('a1');
		const remaining = await getAllArticles();
		expect(remaining).toHaveLength(1);
		expect(remaining[0].id).toBe('a2');
	});
});

describe('Highlight CRUD', () => {
	it('saveHighlight + getHighlightsForArticle round-trip', async () => {
		await saveArticle(makeArticle('a1'));
		const highlight = makeHighlight('h1', 'a1');
		await saveHighlight(highlight);
		const highlights = await getHighlightsForArticle('a1');
		expect(highlights).toHaveLength(1);
		expect(highlights[0].text).toBe('Highlight h1');
	});

	it('getHighlightsForArticle returns empty array for unknown article', async () => {
		const highlights = await getHighlightsForArticle('nonexistent');
		expect(highlights).toEqual([]);
	});

	it('getHighlightsForArticle returns only highlights for the given article', async () => {
		await saveHighlight(makeHighlight('h1', 'a1'));
		await saveHighlight(makeHighlight('h2', 'a2'));
		const highlights = await getHighlightsForArticle('a1');
		expect(highlights).toHaveLength(1);
		expect(highlights[0].id).toBe('h1');
	});

	it('deleteHighlight removes the highlight', async () => {
		await saveHighlight(makeHighlight('h1', 'a1'));
		await deleteHighlight('h1');
		const highlights = await getHighlightsForArticle('a1');
		expect(highlights).toHaveLength(0);
	});

	it('can save multiple highlights for one article', async () => {
		await saveHighlight(makeHighlight('h1', 'a1'));
		await saveHighlight(makeHighlight('h2', 'a1'));
		await saveHighlight(makeHighlight('h3', 'a1'));
		const highlights = await getHighlightsForArticle('a1');
		expect(highlights).toHaveLength(3);
	});
});
