/**
 * DOM preprocessors run on the parsed document before Readability extracts
 * content. Readability strips most CSS styling (both inline styles and
 * class-based styles from external sheets), so preprocessors detect styled
 * elements and stamp a stable `className` on them. That class is then added
 * to Readability's `classesToPreserve` and styled in the reader page.
 *
 * To add a new workaround: implement `DomPreprocessor`, add the class to
 * the `preprocessors` array, and add a matching CSS rule in the reader page.
 */

export interface DomPreprocessor {
	/** Unique CSS class stamped onto matched elements. */
	className: string;
	/** Mutate `doc` to mark all elements that need this treatment. */
	mark(doc: Document): void;
}

// ---------------------------------------------------------------------------
// Small caps
// ---------------------------------------------------------------------------

const SMALL_CAPS_CLASS_RE = /^(small-?caps?|text-small-?caps?|smcp|sc)$/i;

function collectSmallCapsClasses(doc: Document): Set<string> {
	const found = new Set<string>();

	// Classes defined in inline <style> blocks
	doc.querySelectorAll('style').forEach((el) => {
		const re = /\.([\w-]+)[^{]*\{[^}]*font-variant(?:-caps)?\s*:\s*(?:all-)?small-caps/gi;
		let m: RegExpExecArray | null;
		while ((m = re.exec(el.textContent ?? '')) !== null) found.add(m[1]);
	});

	// Well-known class-name patterns used by publishing sites with external CSS
	doc.querySelectorAll<HTMLElement>('[class]').forEach((el) => {
		el.classList.forEach((c) => { if (SMALL_CAPS_CLASS_RE.test(c)) found.add(c); });
	});

	return found;
}

const smallCaps: DomPreprocessor = {
	className: 'readlist-sc',
	mark(doc) {
		const scClasses = collectSmallCapsClasses(doc);
		doc.querySelectorAll<HTMLElement>('*').forEach((el) => {
			const byInlineStyle =
				/small-caps/i.test(el.style.fontVariant) ||
				/small-caps/i.test(el.style.fontVariantCaps);
			const byClass = [...el.classList].some((c) => scClasses.has(c));
			if (byInlineStyle || byClass) el.classList.add('readlist-sc');
		});
	},
};

// ---------------------------------------------------------------------------
// Registry — add future preprocessors here
// ---------------------------------------------------------------------------

export const preprocessors: DomPreprocessor[] = [
	smallCaps,
];
