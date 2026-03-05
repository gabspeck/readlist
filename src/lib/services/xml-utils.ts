export function escapeXml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

/**
 * Convert an HTML string (from Readability) into something safe to embed in
 * an XHTML document. We parse it in the browser, then re-serialize innerHTML
 * (which the browser normalises) and fix void elements that need self-closing
 * tags in XML.
 */
export function htmlToXhtmlFragment(html: string): string {
	const doc = new DOMParser().parseFromString(
		`<!doctype html><html><body>${html}</body></html>`,
		'text/html'
	);
	let out = doc.body.innerHTML;
	// Void elements must be self-closed in XHTML
	out = out.replace(
		/<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)(\s[^>]*)?>(?!<\/\1>)/gi,
		'<$1$2/>'
	);
	return out;
}
