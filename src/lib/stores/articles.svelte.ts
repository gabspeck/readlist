import type { Article, FilterMode, SortMode } from '$lib/types';
import * as storage from '$lib/services/storage';

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
		case 'newest':     return arr;
		case 'oldest':     return arr.reverse();
		case 'title':      return arr.sort((a, b) => a.title.localeCompare(b.title));
		case 'length':     return arr.sort((a, b) => a.wordCount - b.wordCount);
		case 'progress':   return arr.sort((a, b) => readLocalInt(`readprogress:${b.id}`) - readLocalInt(`readprogress:${a.id}`));
		case 'lastopened': return arr.sort((a, b) => readLocalInt(`lastopenat:${b.id}`) - readLocalInt(`lastopenat:${a.id}`));
	}
}

class ArticleState {
	items = $state<Article[]>([]);
	filterMode = $state<FilterMode>('all');
	sortMode = $state<SortMode>('newest');
	selectedTag = $state<string | null>(null);
	searchQuery = $state('');
	isLoading = $state(true);

	filtered = $derived.by(() => {
		const q = this.searchQuery.trim().toLowerCase();
		const filtered = this.items.filter((a) => {
			if (this.selectedTag && !a.tags.includes(this.selectedTag)) return false;
			if (this.filterMode === 'all') { if (a.archived) return false; }
			else if (this.filterMode === 'unread') { if (a.isRead || a.archived) return false; }
			else if (this.filterMode === 'inprogress') { if (a.archived || a.isRead || readLocalInt(`readprogress:${a.id}`) === 0) return false; }
			else if (this.filterMode === 'read') { if (!a.isRead || a.archived) return false; }
			else if (this.filterMode === 'archived') { if (!a.archived) return false; }
			if (q) {
				const haystack = `${a.title} ${a.siteName} ${a.author} ${a.excerpt}`.toLowerCase();
				if (!haystack.includes(q)) return false;
			}
			return true;
		});
		return applySort(filtered, this.sortMode);
	});

	allTags = $derived.by(() => {
		const tagSet = new Set<string>();
		for (const a of this.items) {
			for (const t of a.tags) tagSet.add(t);
		}
		return [...tagSet].sort();
	});

	async load(): Promise<void> {
		this.isLoading = true;
		try {
			this.items = await storage.getAllArticles();
		} finally {
			this.isLoading = false;
		}
	}

	async add(article: Article): Promise<void> {
		const stamped = { ...article, updatedAt: Date.now() };
		await storage.saveArticle(stamped);
		this.items = [stamped, ...this.items];
	}

	async markRead(id: string, isRead: boolean): Promise<void> {
		await storage.updateArticle(id, { isRead });
		this.items = this.items.map((a) => (a.id === id ? { ...a, isRead } : a));
	}

	async archive(id: string): Promise<void> {
		await storage.updateArticle(id, { archived: true });
		this.items = this.items.map((a) => (a.id === id ? { ...a, archived: true } : a));
	}

	async unarchive(id: string): Promise<void> {
		await storage.updateArticle(id, { archived: false });
		this.items = this.items.map((a) => (a.id === id ? { ...a, archived: false } : a));
	}

	async remove(id: string): Promise<Article | undefined> {
		const article = this.items.find((a) => a.id === id);
		await storage.deleteArticle(id);
		this.items = this.items.filter((a) => a.id !== id);
		return article;
	}

	async addTag(id: string, tag: string): Promise<void> {
		const article = this.items.find((a) => a.id === id);
		if (!article || article.tags.includes(tag)) return;
		const tags = [...article.tags, tag];
		await storage.updateArticle(id, { tags });
		this.items = this.items.map((a) => (a.id === id ? { ...a, tags } : a));
	}

	async removeTag(id: string, tag: string): Promise<void> {
		const article = this.items.find((a) => a.id === id);
		if (!article) return;
		const tags = article.tags.filter((t) => t !== tag);
		await storage.updateArticle(id, { tags });
		this.items = this.items.map((a) => (a.id === id ? { ...a, tags } : a));
	}
}

export const articles = new ArticleState();
