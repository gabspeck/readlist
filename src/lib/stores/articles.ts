import { writable, derived, get } from 'svelte/store';
import type { Article, FilterMode, SortMode } from '$lib/types';
import * as storage from '$lib/services/storage';

export const articles = writable<Article[]>([]);
export const filterMode = writable<FilterMode>('all');
export const sortMode = writable<SortMode>('newest');
export const selectedTag = writable<string | null>(null);
export const isLoading = writable(true);

function readLocalInt(key: string): number {
	try {
		return parseInt(localStorage.getItem(key) ?? '0') || 0;
	} catch {
		return 0;
	}
}

function applySort(list: Article[], sort: SortMode): Article[] {
	const arr = [...list];
	switch (sort) {
		case 'newest':     return arr; // storage already returns savedAt desc
		case 'oldest':     return arr.reverse();
		case 'title':      return arr.sort((a, b) => a.title.localeCompare(b.title));
		case 'length':     return arr.sort((a, b) => a.wordCount - b.wordCount);
		case 'progress':   return arr.sort((a, b) => readLocalInt(`readprogress:${b.id}`) - readLocalInt(`readprogress:${a.id}`));
		case 'lastopened': return arr.sort((a, b) => readLocalInt(`lastopenat:${b.id}`) - readLocalInt(`lastopenat:${a.id}`));
	}
}

export const filteredArticles = derived(
	[articles, filterMode, selectedTag, sortMode],
	([$articles, $filter, $tag, $sort]) => {
		const filtered = $articles.filter((a) => {
			if ($tag && !a.tags.includes($tag)) return false;
			if ($filter === 'all') return !a.archived;
			if ($filter === 'unread') return !a.isRead && !a.archived;
			if ($filter === 'read') return a.isRead && !a.archived;
			if ($filter === 'archived') return a.archived;
			return true;
		});
		return applySort(filtered, $sort);
	}
);

export const allTags = derived(articles, ($articles) => {
	const tagSet = new Set<string>();
	for (const a of $articles) {
		for (const t of a.tags) tagSet.add(t);
	}
	return [...tagSet].sort();
});

export async function loadArticles(): Promise<void> {
	isLoading.set(true);
	try {
		const all = await storage.getAllArticles();
		articles.set(all);
	} finally {
		isLoading.set(false);
	}
}

export async function addArticle(article: Article): Promise<void> {
	await storage.saveArticle(article);
	articles.update((all) => [article, ...all]);
}

export async function markRead(id: string, isRead: boolean): Promise<void> {
	await storage.updateArticle(id, { isRead });
	articles.update((all) => all.map((a) => (a.id === id ? { ...a, isRead } : a)));
}

export async function archiveArticle(id: string): Promise<void> {
	await storage.updateArticle(id, { archived: true });
	articles.update((all) => all.map((a) => (a.id === id ? { ...a, archived: true } : a)));
}

export async function unarchiveArticle(id: string): Promise<void> {
	await storage.updateArticle(id, { archived: false });
	articles.update((all) => all.map((a) => (a.id === id ? { ...a, archived: false } : a)));
}

export async function removeArticle(id: string): Promise<Article | undefined> {
	const all = get(articles);
	const article = all.find((a) => a.id === id);
	await storage.deleteArticle(id);
	articles.update((all) => all.filter((a) => a.id !== id));
	return article;
}

export async function addTag(id: string, tag: string): Promise<void> {
	const all = get(articles);
	const article = all.find((a) => a.id === id);
	if (!article || article.tags.includes(tag)) return;
	const tags = [...article.tags, tag];
	await storage.updateArticle(id, { tags });
	articles.update((all) => all.map((a) => (a.id === id ? { ...a, tags } : a)));
}

export async function removeTag(id: string, tag: string): Promise<void> {
	const all = get(articles);
	const article = all.find((a) => a.id === id);
	if (!article) return;
	const tags = article.tags.filter((t) => t !== tag);
	await storage.updateArticle(id, { tags });
	articles.update((all) => all.map((a) => (a.id === id ? { ...a, tags } : a)));
}
