import { zipSync, strToU8, type Zippable } from 'fflate';
import type { Article } from '$lib/types';
import { shareOrDownload } from './share';
import { escapeXml, htmlToXhtmlFragment } from './xml-utils';

// ── EPUB file builders ───────────────────────────────────────────────────────

const READER_CSS = `
body {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1em;
  line-height: 1.7;
  margin: 0;
  padding: 1em 1.5em;
  color: #1a1a1a;
}
h1, h2, h3, h4, h5, h6 { line-height: 1.3; margin: 1.5em 0 0.4em; }
p { margin: 0 0 0.9em; }
a { color: #4a6cf7; }
img { max-width: 100%; height: auto; }
figure { margin: 1.5em 0; }
figcaption { font-size: 0.85em; color: #555; margin-top: 0.4em; text-align: center; }
blockquote { border-left: 3px solid #aaa; margin: 1.5em 0; padding: 0.5em 1em; color: #555; font-style: italic; }
code { font-family: "Courier New", monospace; font-size: 0.875em; background: #f4f4f4; padding: 0.1em 0.3em; border-radius: 3px; }
pre { background: #f4f4f4; padding: 1em; overflow-x: auto; margin: 1em 0; border-radius: 4px; }
pre code { background: none; padding: 0; }
table { width: 100%; border-collapse: collapse; margin: 1em 0; font-size: 0.9em; }
th, td { border: 1px solid #ddd; padding: 0.4em 0.6em; text-align: left; }
th { background: #f4f4f4; font-weight: 600; }
ul, ol { padding-left: 1.5em; margin: 0 0 1em; }
li { margin-bottom: 0.2em; }
hr { border: none; border-top: 1px solid #ddd; margin: 2em 0; }

/* Cover page */
.cover h1 { font-size: 2em; margin-top: 2em; }
.cover .date { color: #666; font-size: 0.9em; margin-bottom: 1em; }
.cover .count { color: #666; font-size: 0.9em; margin-bottom: 2em; }
.cover ol { font-size: 0.95em; line-height: 1.8; }
.cover .byline { color: #666; font-size: 0.85em; }

/* Article header */
.article-header { margin-bottom: 2em; padding-bottom: 1em; border-bottom: 1px solid #ddd; }
.article-header h1 { font-size: 1.6em; margin: 0 0 0.4em; }
.article-header .byline { color: #555; font-size: 0.85em; margin: 0 0 0.2em; }
.article-header .source { color: #888; font-size: 0.8em; margin: 0; }
`.trim();

function containerXml(): string {
	return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:schemas:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
}

function contentOpf(articles: Article[], date: string, uid: string): string {
	const manifestChapters = articles
		.map((_, i) => `    <item id="chapter${i}" href="chapter${i}.xhtml" media-type="application/xhtml+xml"/>`)
		.join('\n');

	const spineItems = articles
		.map((_, i) => `    <itemref idref="chapter${i}"/>`)
		.join('\n');

	return `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Readlist Digest — ${escapeXml(date)}</dc:title>
    <dc:language>en</dc:language>
    <dc:identifier id="uid">${escapeXml(uid)}</dc:identifier>
    <dc:date>${escapeXml(date)}</dc:date>
    <dc:creator>Readlist</dc:creator>
    <dc:description>${escapeXml(`${articles.length} article${articles.length !== 1 ? 's' : ''} from your reading list`)}</dc:description>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>
    <item id="css" href="styles/reader.css" media-type="text/css"/>
${manifestChapters}
  </manifest>
  <spine>
    <itemref idref="cover"/>
${spineItems}
  </spine>
</package>`;
}

function navXhtml(articles: Article[], date: string): string {
	const items = articles
		.map((a, i) => `      <li><a href="chapter${i}.xhtml">${escapeXml(a.title)}</a></li>`)
		.join('\n');

	return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Table of Contents</title>
  <link rel="stylesheet" href="styles/reader.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h2>Contents — ${escapeXml(date)}</h2>
    <ol>
${items}
    </ol>
  </nav>
</body>
</html>`;
}

function coverXhtml(articles: Article[], date: string): string {
	const items = articles
		.map(
			(a, i) => `      <li>
        <a href="chapter${i}.xhtml">${escapeXml(a.title)}</a>
        ${a.author ? `<br/><span class="byline">${escapeXml(a.author)}</span>` : ''}
      </li>`
		)
		.join('\n');

	return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Readlist Digest</title>
  <link rel="stylesheet" href="styles/reader.css"/>
</head>
<body class="cover">
  <h1>Readlist Digest</h1>
  <p class="date">${escapeXml(date)}</p>
  <p class="count">${articles.length} article${articles.length !== 1 ? 's' : ''}</p>
  <ol>
${items}
  </ol>
</body>
</html>`;
}

function chapterXhtml(article: Article, index: number): string {
	const body = htmlToXhtmlFragment(article.content);

	const publishedLine = article.publishedAt
		? `<p class="byline">${escapeXml(new Date(article.publishedAt).toLocaleDateString())}</p>`
		: '';
	const authorLine = article.author
		? `<p class="byline">${escapeXml(article.author)}</p>`
		: '';
	const sourceLine = article.siteName
		? `<p class="source"><a href="${escapeXml(article.url)}">${escapeXml(article.siteName)}</a></p>`
		: '';

	return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeXml(article.title)}</title>
  <link rel="stylesheet" href="styles/reader.css"/>
</head>
<body>
  <div class="article-header">
    <h1>${escapeXml(article.title)}</h1>
    ${authorLine}
    ${publishedLine}
    ${sourceLine}
  </div>
  <div class="article-body">
    ${body}
  </div>
</body>
</html>`;
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function exportArticlesAsEpub(articles: Article[]): Promise<void> {
	if (articles.length === 0) throw new Error('No articles to export');

	const date = new Date().toISOString().slice(0, 10);
	const uid = `readlist-${date}-${crypto.randomUUID().slice(0, 8)}`;

	const files: Zippable = {
		// mimetype MUST be first and MUST be uncompressed per EPUB spec
		mimetype: [strToU8('application/epub+zip'), { level: 0 }],
		'META-INF/container.xml': strToU8(containerXml()),
		'OEBPS/content.opf': strToU8(contentOpf(articles, date, uid)),
		'OEBPS/nav.xhtml': strToU8(navXhtml(articles, date)),
		'OEBPS/cover.xhtml': strToU8(coverXhtml(articles, date)),
		'OEBPS/styles/reader.css': strToU8(READER_CSS)
	};

	for (let i = 0; i < articles.length; i++) {
		files[`OEBPS/chapter${i}.xhtml`] = strToU8(chapterXhtml(articles[i], i));
	}

	const zipped = zipSync(files);
	const blob = new Blob([zipped.buffer as ArrayBuffer], { type: 'application/epub+zip' });
	await shareOrDownload(blob, `readlist-digest-${date}.epub`, 'Readlist Digest');
}
