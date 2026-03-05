import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { articles, filterMode, sortMode, selectedTag, searchQuery, filteredArticles } from '$lib/stores/articles';
import type { Article } from '$lib/types';

function makeArticle(id: string, overrides: Partial<Article> = {}): Article {
	return {
		id,
		url: `https://example.com/${id}`,
		title: `Article ${id}`,
		author: `Author ${id}`,
		publishedAt: null,
		excerpt: `Excerpt ${id}`,
		content: `Content ${id}`,
		savedAt: parseInt(id) * 100 || 1000,
		updatedAt: 1000,
		isRead: false,
		tags: [],
		archived: false,
		siteName: `Site ${id}`,
		wordCount: 100,
		...overrides
	};
}

beforeEach(() => {
	articles.set([]);
	filterMode.set('all');
	sortMode.set('newest');
	selectedTag.set(null);
	searchQuery.set('');
	localStorage.clear();
});

describe('filter modes', () => {
	it('all — returns non-archived articles', () => {
		articles.set([
			makeArticle('1', { isRead: false }),
			makeArticle('2', { isRead: true }),
			makeArticle('3', { archived: true })
		]);
		filterMode.set('all');
		const result = get(filteredArticles);
		expect(result.map((a) => a.id)).toEqual(expect.arrayContaining(['1', '2']));
		expect(result.find((a) => a.id === '3')).toBeUndefined();
	});

	it('unread — returns only unread non-archived articles', () => {
		articles.set([
			makeArticle('1', { isRead: false }),
			makeArticle('2', { isRead: true }),
			makeArticle('3', { archived: true, isRead: false })
		]);
		filterMode.set('unread');
		const result = get(filteredArticles);
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('1');
	});

	it('read — returns only read non-archived articles', () => {
		articles.set([
			makeArticle('1', { isRead: false }),
			makeArticle('2', { isRead: true }),
			makeArticle('3', { isRead: true, archived: true })
		]);
		filterMode.set('read');
		const result = get(filteredArticles);
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('2');
	});

	it('archived — returns only archived articles', () => {
		articles.set([
			makeArticle('1', { archived: false }),
			makeArticle('2', { archived: true })
		]);
		filterMode.set('archived');
		const result = get(filteredArticles);
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('2');
	});

	it('inprogress — returns articles with progress in localStorage', () => {
		articles.set([
			makeArticle('1', { isRead: false, archived: false }),
			makeArticle('2', { isRead: false, archived: false }),
			makeArticle('3', { isRead: true })
		]);
		localStorage.setItem('readprogress:1', '50');
		filterMode.set('inprogress');
		const result = get(filteredArticles);
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('1');
	});
});

describe('sort modes', () => {
	// articles must be pre-sorted savedAt desc to match how storage.getAllArticles() delivers them
	beforeEach(() => {
		articles.set([
			makeArticle('2', { savedAt: 300, title: 'Apple', wordCount: 100 }),
			makeArticle('3', { savedAt: 200, title: 'Mango', wordCount: 200 }),
			makeArticle('1', { savedAt: 100, title: 'Zebra', wordCount: 300 })
		]);
	});

	it('newest — preserves storage order (savedAt descending)', () => {
		sortMode.set('newest');
		const ids = get(filteredArticles).map((a) => a.id);
		expect(ids).toEqual(['2', '3', '1']);
	});

	it('oldest — sorts by savedAt ascending', () => {
		sortMode.set('oldest');
		const ids = get(filteredArticles).map((a) => a.id);
		expect(ids).toEqual(['1', '3', '2']);
	});

	it('title — sorts alphabetically', () => {
		sortMode.set('title');
		const titles = get(filteredArticles).map((a) => a.title);
		expect(titles).toEqual(['Apple', 'Mango', 'Zebra']);
	});

	it('length — sorts by wordCount ascending', () => {
		sortMode.set('length');
		const ids = get(filteredArticles).map((a) => a.id);
		expect(ids).toEqual(['2', '3', '1']);
	});

	it('progress — sorts by localStorage readprogress descending', () => {
		localStorage.setItem('readprogress:1', '80');
		localStorage.setItem('readprogress:3', '40');
		sortMode.set('progress');
		const ids = get(filteredArticles).map((a) => a.id);
		expect(ids[0]).toBe('1');
		expect(ids[1]).toBe('3');
	});

	it('lastopened — sorts by localStorage lastopenat descending', () => {
		localStorage.setItem('lastopenat:2', '9999');
		localStorage.setItem('lastopenat:1', '5000');
		sortMode.set('lastopened');
		const ids = get(filteredArticles).map((a) => a.id);
		expect(ids[0]).toBe('2');
		expect(ids[1]).toBe('1');
	});
});

describe('tag filter', () => {
	it('returns only articles with the selected tag', () => {
		articles.set([
			makeArticle('1', { tags: ['tech'] }),
			makeArticle('2', { tags: ['news'] }),
			makeArticle('3', { tags: ['tech', 'news'] })
		]);
		selectedTag.set('tech');
		const result = get(filteredArticles);
		expect(result.map((a) => a.id)).toEqual(expect.arrayContaining(['1', '3']));
		expect(result.find((a) => a.id === '2')).toBeUndefined();
	});
});

describe('search query', () => {
	it('filters by title', () => {
		articles.set([makeArticle('1', { title: 'TypeScript Guide' }), makeArticle('2', { title: 'Python Tutorial' })]);
		searchQuery.set('typescript');
		const result = get(filteredArticles);
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('1');
	});

	it('filters by siteName', () => {
		articles.set([
			makeArticle('1', { siteName: 'TechCrunch' }),
			makeArticle('2', { siteName: 'BBC News' })
		]);
		searchQuery.set('bbc');
		const result = get(filteredArticles);
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('2');
	});

	it('filters by author', () => {
		articles.set([
			makeArticle('1', { author: 'John Doe' }),
			makeArticle('2', { author: 'Jane Smith' })
		]);
		searchQuery.set('jane');
		const result = get(filteredArticles);
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('2');
	});

	it('filters by excerpt', () => {
		articles.set([
			makeArticle('1', { excerpt: 'A story about dogs' }),
			makeArticle('2', { excerpt: 'A story about cats' })
		]);
		searchQuery.set('cats');
		const result = get(filteredArticles);
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('2');
	});

	it('is case-insensitive', () => {
		articles.set([makeArticle('1', { title: 'Hello World' })]);
		searchQuery.set('HELLO');
		expect(get(filteredArticles)).toHaveLength(1);
	});

	it('returns empty when nothing matches', () => {
		articles.set([makeArticle('1', { title: 'TypeScript' })]);
		searchQuery.set('python');
		expect(get(filteredArticles)).toHaveLength(0);
	});
});

describe('combined filter + sort', () => {
	it('applies filter then sort', () => {
		articles.set([
			makeArticle('1', { isRead: false, savedAt: 100, title: 'Zed' }),
			makeArticle('2', { isRead: true, savedAt: 200 }),
			makeArticle('3', { isRead: false, savedAt: 300, title: 'Alpha' })
		]);
		filterMode.set('unread');
		sortMode.set('title');
		const result = get(filteredArticles);
		expect(result.map((a) => a.id)).toEqual(['3', '1']);
	});
});
