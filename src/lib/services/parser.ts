import { Readability } from '@mozilla/readability';
import type { Article } from '$lib/types';
import { preprocessors } from './dom-preprocessors';

const DEFAULT_PROXY = 'https://corsproxy.io/?url=';

function getProxy(): string {
	if (typeof localStorage !== 'undefined') {
		return localStorage.getItem('corsProxy') ?? DEFAULT_PROXY;
	}
	return DEFAULT_PROXY;
}

function countWords(html: string): number {
	const text = html.replace(/<[^>]+>/g, ' ');
	return text.trim().split(/\s+/).filter(Boolean).length;
}

export async function parseArticle(url: string): Promise<Omit<Article, 'id' | 'savedAt' | 'updatedAt' | 'isRead' | 'tags' | 'archived'>> {
	const proxy = getProxy();
	const fetchUrl = proxy + encodeURIComponent(url);

	const response = await fetch(fetchUrl);
	if (!response.ok) {
		throw new Error(`Failed to fetch article: ${response.status} ${response.statusText}`);
	}

	const html = await response.text();
	const doc = new DOMParser().parseFromString(html, 'text/html');

	// Fix relative URLs before parsing
	const base = doc.createElement('base');
	base.href = url;
	doc.head.prepend(base);

	// Run preprocessors before Readability strips styling information
	for (const p of preprocessors) p.mark(doc);
	const reader = new Readability(doc, {
		classesToPreserve: preprocessors.map((p) => p.className),
	});
	const result = reader.parse();

	if (!result) {
		throw new Error('Could not parse article content. The page may not contain readable text.');
	}

	// Make all links open in a new tab
	const contentDoc = new DOMParser().parseFromString(result.content ?? '', 'text/html');
	for (const a of contentDoc.querySelectorAll('a[href]')) {
		a.setAttribute('target', '_blank');
		a.setAttribute('rel', 'noopener noreferrer');
	}
	const content = contentDoc.body.innerHTML;

	return {
		url,
		title: result.title || 'Untitled',
		author: result.byline || '',
		publishedAt: result.publishedTime || null,
		excerpt: result.excerpt || '',
		content,
		siteName: result.siteName || new URL(url).hostname,
		wordCount: countWords(content)
	};
}
