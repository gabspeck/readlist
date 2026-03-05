import { describe, it, expect } from 'vitest';
import { escapeXml, htmlToXhtmlFragment } from '$lib/services/xml-utils';

describe('escapeXml', () => {
	it('escapes ampersand', () => {
		expect(escapeXml('a & b')).toBe('a &amp; b');
	});

	it('escapes less-than', () => {
		expect(escapeXml('a < b')).toBe('a &lt; b');
	});

	it('escapes greater-than', () => {
		expect(escapeXml('a > b')).toBe('a &gt; b');
	});

	it('escapes double quote', () => {
		expect(escapeXml('"hello"')).toBe('&quot;hello&quot;');
	});

	it('escapes single quote', () => {
		expect(escapeXml("it's")).toBe('it&apos;s');
	});

	it('does not modify plain text', () => {
		expect(escapeXml('hello world')).toBe('hello world');
	});

	it('escapes all special chars together', () => {
		expect(escapeXml('<b class="x">it\'s & done</b>')).toBe(
			'&lt;b class=&quot;x&quot;&gt;it&apos;s &amp; done&lt;/b&gt;'
		);
	});
});

describe('htmlToXhtmlFragment', () => {
	it('self-closes <br>', () => {
		const out = htmlToXhtmlFragment('<p>Hello<br>World</p>');
		expect(out).toContain('<br/>');
		expect(out).not.toMatch(/<br>/);
	});

	it('self-closes <img> with attributes', () => {
		const out = htmlToXhtmlFragment('<img src="x.png" alt="x">');
		expect(out).toContain('<img');
		expect(out).toMatch(/\/>/);
	});

	it('self-closes <hr>', () => {
		const out = htmlToXhtmlFragment('<hr>');
		expect(out).toContain('<hr/>');
	});

	it('self-closes <wbr>', () => {
		const out = htmlToXhtmlFragment('<p>word<wbr>break</p>');
		expect(out).toContain('<wbr/>');
	});

	it('does not self-close regular block elements', () => {
		const out = htmlToXhtmlFragment('<p>hello</p><div>world</div>');
		expect(out).toContain('<p>hello</p>');
		expect(out).toContain('<div>world</div>');
	});

	it('preserves text content', () => {
		const out = htmlToXhtmlFragment('<p>Simple paragraph</p>');
		expect(out).toContain('Simple paragraph');
	});
});
