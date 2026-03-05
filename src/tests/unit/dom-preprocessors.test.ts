import { describe, it, expect } from 'vitest';
import { preprocessors } from '$lib/services/dom-preprocessors';

const smallCaps = preprocessors[0];

function parseDoc(html: string): Document {
	return new DOMParser().parseFromString(html, 'text/html');
}

describe('smallCaps preprocessor', () => {
	it('stamps readlist-sc on elements with small-caps in inline <style>', () => {
		const doc = parseDoc(`
			<html><head>
			<style>.my-class { font-variant: small-caps; }</style>
			</head><body>
			<span class="my-class">text</span>
			</body></html>
		`);
		smallCaps.mark(doc);
		const span = doc.querySelector('.my-class') as HTMLElement;
		expect(span.classList.contains('readlist-sc')).toBe(true);
	});

	it('stamps readlist-sc on elements with well-known class "small-caps"', () => {
		const doc = parseDoc('<html><body><span class="small-caps">text</span></body></html>');
		smallCaps.mark(doc);
		const span = doc.querySelector('.small-caps') as HTMLElement;
		expect(span.classList.contains('readlist-sc')).toBe(true);
	});

	it('stamps readlist-sc on elements with well-known class "smcp"', () => {
		const doc = parseDoc('<html><body><span class="smcp">text</span></body></html>');
		smallCaps.mark(doc);
		const span = doc.querySelector('.smcp') as HTMLElement;
		expect(span.classList.contains('readlist-sc')).toBe(true);
	});

	it('stamps readlist-sc on elements with well-known class "sc"', () => {
		const doc = parseDoc('<html><body><span class="sc">text</span></body></html>');
		smallCaps.mark(doc);
		const span = doc.querySelector('.sc') as HTMLElement;
		expect(span.classList.contains('readlist-sc')).toBe(true);
	});

	it('stamps readlist-sc on elements with well-known class "text-small-caps"', () => {
		const doc = parseDoc('<html><body><span class="text-small-caps">text</span></body></html>');
		smallCaps.mark(doc);
		const span = doc.querySelector('.text-small-caps') as HTMLElement;
		expect(span.classList.contains('readlist-sc')).toBe(true);
	});

	it('stamps readlist-sc on elements with inline style font-variant: small-caps', () => {
		const doc = parseDoc(
			'<html><body><span style="font-variant: small-caps">text</span></body></html>'
		);
		smallCaps.mark(doc);
		const span = doc.querySelector('span') as HTMLElement;
		expect(span.classList.contains('readlist-sc')).toBe(true);
	});

	it('does not stamp readlist-sc on elements with none of the above', () => {
		const doc = parseDoc('<html><body><span class="normal">text</span></body></html>');
		smallCaps.mark(doc);
		const span = doc.querySelector('.normal') as HTMLElement;
		expect(span.classList.contains('readlist-sc')).toBe(false);
	});
});
