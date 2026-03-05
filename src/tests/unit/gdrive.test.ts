import { describe, it, expect } from 'vitest';
import { mergeArticles } from '$lib/services/gdrive';
import type { Article } from '$lib/types';

function makeArticle(id: string, overrides: Partial<Article> = {}): Article {
	return {
		id,
		url: `https://example.com/${id}`,
		title: `Article ${id}`,
		author: '',
		publishedAt: null,
		excerpt: '',
		content: `Content ${id}`,
		savedAt: 1000,
		updatedAt: 1000,
		isRead: false,
		tags: [],
		archived: false,
		siteName: '',
		wordCount: 100,
		...overrides
	};
}

describe('mergeArticles', () => {
	it('returns empty array when both inputs are empty', () => {
		expect(mergeArticles([], [])).toEqual([]);
	});

	it('includes local-only articles', () => {
		const local = [makeArticle('a')];
		const result = mergeArticles(local, []);
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('a');
	});

	it('includes remote-only articles', () => {
		const remote = [makeArticle('b')];
		const result = mergeArticles([], remote);
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('b');
	});

	it('includes articles from both when ids differ', () => {
		const local = [makeArticle('a')];
		const remote = [makeArticle('b')];
		const result = mergeArticles(local, remote);
		expect(result).toHaveLength(2);
	});

	it('remote wins when remote updatedAt is newer', () => {
		const local = [makeArticle('a', { isRead: false, updatedAt: 100 })];
		const remote = [makeArticle('a', { isRead: true, tags: ['news'], updatedAt: 200 })];
		const result = mergeArticles(local, remote);
		expect(result).toHaveLength(1);
		expect(result[0].isRead).toBe(true);
		expect(result[0].tags).toEqual(['news']);
	});

	it('local wins on timestamp tie', () => {
		const local = [makeArticle('a', { isRead: false, updatedAt: 100 })];
		const remote = [makeArticle('a', { isRead: true, updatedAt: 100 })];
		const result = mergeArticles(local, remote);
		expect(result[0].isRead).toBe(false);
	});

	it('local wins when local timestamp is newer', () => {
		const local = [makeArticle('a', { isRead: false, archived: false, updatedAt: 300 })];
		const remote = [makeArticle('a', { isRead: true, archived: true, updatedAt: 200 })];
		const result = mergeArticles(local, remote);
		expect(result[0].isRead).toBe(false);
		expect(result[0].archived).toBe(false);
	});

	it('preserves immutable fields from local when remote wins', () => {
		const local = [makeArticle('a', { content: 'local content', wordCount: 500, url: 'https://local.com', title: 'Local Title', updatedAt: 100 })];
		const remote = [makeArticle('a', { content: 'remote content', wordCount: 999, isRead: true, updatedAt: 200 })];
		const result = mergeArticles(local, remote);
		expect(result[0].content).toBe('local content');
		expect(result[0].wordCount).toBe(500);
		expect(result[0].url).toBe('https://local.com');
		expect(result[0].title).toBe('Local Title');
		// mutable fields come from remote
		expect(result[0].isRead).toBe(true);
	});

	it('falls back to savedAt when updatedAt is absent for comparison', () => {
		const local = [makeArticle('a', { savedAt: 100 })];
		// Cast to bypass TS — simulating old records without updatedAt
		const localNoUpdatedAt = [{ ...local[0], updatedAt: undefined }] as unknown as Article[];
		const remote = [makeArticle('a', { savedAt: 100, isRead: true, updatedAt: 200 })];
		const result = mergeArticles(localNoUpdatedAt, remote);
		expect(result[0].isRead).toBe(true);
	});

	it('sorts result by savedAt descending', () => {
		const local = [
			makeArticle('a', { savedAt: 100 }),
			makeArticle('b', { savedAt: 300 })
		];
		const remote = [makeArticle('c', { savedAt: 200 })];
		const result = mergeArticles(local, remote);
		expect(result.map((a) => a.id)).toEqual(['b', 'c', 'a']);
	});
});
