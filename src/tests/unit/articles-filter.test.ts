import { describe, it, expect, beforeEach } from 'vitest';
import { articles } from '$lib/stores/articles.svelte';
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
	articles.items = [];
	articles.filterMode = 'all';
	articles.sortMode = 'newest';
	articles.selectedTag = null;
	articles.searchQuery = '';
	localStorage.clear();
});

describe('filter modes', () => {
	it('all — returns non-archived articles', () => {
		articles.items.push(
			makeArticle('1', { isRead: false }),
			makeArticle('2', { isRead: true }),
			makeArticle('3', { archived: true })
		);
		articles.filterMode = 'all';
		expect(articles.filtered.map((a) => a.id)).toEqual(expect.arrayContaining(['1', '2']));
		expect(articles.filtered.find((a) => a.id === '3')).toBeUndefined();
	});

	it('unread — returns only unread non-archived articles', () => {
		articles.items.push(
			makeArticle('1', { isRead: false }),
			makeArticle('2', { isRead: true }),
			makeArticle('3', { archived: true, isRead: false })
		);
		articles.filterMode = 'unread';
		expect(articles.filtered).toHaveLength(1);
		expect(articles.filtered[0].id).toBe('1');
	});

	it('read — returns only read non-archived articles', () => {
		articles.items.push(
			makeArticle('1', { isRead: false }),
			makeArticle('2', { isRead: true }),
			makeArticle('3', { isRead: true, archived: true })
		);
		articles.filterMode = 'read';
		expect(articles.filtered).toHaveLength(1);
		expect(articles.filtered[0].id).toBe('2');
	});

	it('archived — returns only archived articles', () => {
		articles.items.push(
			makeArticle('1', { archived: false }),
			makeArticle('2', { archived: true })
		);
		articles.filterMode = 'archived';
		expect(articles.filtered).toHaveLength(1);
		expect(articles.filtered[0].id).toBe('2');
	});

	it('inprogress — returns articles with progress in localStorage', () => {
		articles.items.push(
			makeArticle('1', { isRead: false, archived: false }),
			makeArticle('2', { isRead: false, archived: false }),
			makeArticle('3', { isRead: true })
		);
		localStorage.setItem('readprogress:1', '50');
		articles.filterMode = 'inprogress';
		expect(articles.filtered).toHaveLength(1);
		expect(articles.filtered[0].id).toBe('1');
	});
});

describe('sort modes', () => {
	// articles must be pre-sorted savedAt desc to match how storage.getAllArticles() delivers them
	beforeEach(() => {
		articles.items.push(
			makeArticle('2', { savedAt: 300, title: 'Apple', wordCount: 100 }),
			makeArticle('3', { savedAt: 200, title: 'Mango', wordCount: 200 }),
			makeArticle('1', { savedAt: 100, title: 'Zebra', wordCount: 300 })
		);
	});

	it('newest — preserves storage order (savedAt descending)', () => {
		articles.sortMode = 'newest';
		const ids = articles.filtered.map((a) => a.id);
		expect(ids).toEqual(['2', '3', '1']);
	});

	it('oldest — sorts by savedAt ascending', () => {
		articles.sortMode = 'oldest';
		const ids = articles.filtered.map((a) => a.id);
		expect(ids).toEqual(['1', '3', '2']);
	});

	it('title — sorts alphabetically', () => {
		articles.sortMode = 'title';
		const titles = articles.filtered.map((a) => a.title);
		expect(titles).toEqual(['Apple', 'Mango', 'Zebra']);
	});

	it('length — sorts by wordCount ascending', () => {
		articles.sortMode = 'length';
		const ids = articles.filtered.map((a) => a.id);
		expect(ids).toEqual(['2', '3', '1']);
	});

	it('progress — sorts by localStorage readprogress descending', () => {
		localStorage.setItem('readprogress:1', '80');
		localStorage.setItem('readprogress:3', '40');
		articles.sortMode = 'progress';
		const ids = articles.filtered.map((a) => a.id);
		expect(ids[0]).toBe('1');
		expect(ids[1]).toBe('3');
	});

	it('lastopened — sorts by localStorage lastopenat descending', () => {
		localStorage.setItem('lastopenat:2', '9999');
		localStorage.setItem('lastopenat:1', '5000');
		articles.sortMode = 'lastopened';
		const ids = articles.filtered.map((a) => a.id);
		expect(ids[0]).toBe('2');
		expect(ids[1]).toBe('1');
	});
});

describe('tag filter', () => {
	it('returns only articles with the selected tag', () => {
		articles.items.push(
			makeArticle('1', { tags: ['tech'] }),
			makeArticle('2', { tags: ['news'] }),
			makeArticle('3', { tags: ['tech', 'news'] })
		);
		articles.selectedTag = 'tech';
		expect(articles.filtered.map((a) => a.id)).toEqual(expect.arrayContaining(['1', '3']));
		expect(articles.filtered.find((a) => a.id === '2')).toBeUndefined();
	});
});

describe('search query', () => {
	it('filters by title', () => {
		articles.items.push(makeArticle('1', { title: 'TypeScript Guide' }), makeArticle('2', { title: 'Python Tutorial' }));
		articles.searchQuery = 'typescript';
		expect(articles.filtered).toHaveLength(1);
		expect(articles.filtered[0].id).toBe('1');
	});

	it('filters by siteName', () => {
		articles.items.push(
			makeArticle('1', { siteName: 'TechCrunch' }),
			makeArticle('2', { siteName: 'BBC News' })
		);
		articles.searchQuery = 'bbc';
		expect(articles.filtered).toHaveLength(1);
		expect(articles.filtered[0].id).toBe('2');
	});

	it('filters by author', () => {
		articles.items.push(
			makeArticle('1', { author: 'John Doe' }),
			makeArticle('2', { author: 'Jane Smith' })
		);
		articles.searchQuery = 'jane';
		expect(articles.filtered).toHaveLength(1);
		expect(articles.filtered[0].id).toBe('2');
	});

	it('filters by excerpt', () => {
		articles.items.push(
			makeArticle('1', { excerpt: 'A story about dogs' }),
			makeArticle('2', { excerpt: 'A story about cats' })
		);
		articles.searchQuery = 'cats';
		expect(articles.filtered).toHaveLength(1);
		expect(articles.filtered[0].id).toBe('2');
	});

	it('is case-insensitive', () => {
		articles.items.push(makeArticle('1', { title: 'Hello World' }));
		articles.searchQuery = 'HELLO';
		expect(articles.filtered).toHaveLength(1);
	});

	it('returns empty when nothing matches', () => {
		articles.items.push(makeArticle('1', { title: 'TypeScript' }));
		articles.searchQuery = 'python';
		expect(articles.filtered).toHaveLength(0);
	});
});

describe('combined filter + sort', () => {
	it('applies filter then sort', () => {
		articles.items.push(
			makeArticle('1', { isRead: false, savedAt: 100, title: 'Zed' }),
			makeArticle('2', { isRead: true, savedAt: 200 }),
			makeArticle('3', { isRead: false, savedAt: 300, title: 'Alpha' })
		);
		articles.filterMode = 'unread';
		articles.sortMode = 'title';
		expect(articles.filtered.map((a) => a.id)).toEqual(['3', '1']);
	});
});
