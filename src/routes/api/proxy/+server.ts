import type { RequestHandler } from './$types';

const BLOCKED_PATTERNS = [
	/^localhost$/i,
	/^127\./,
	/^10\./,
	/^172\.(1[6-9]|2\d|3[01])\./,
	/^192\.168\./,
	/^0\./,
	/^\[::1\]$/,
];

export const GET: RequestHandler = async ({ url, fetch }) => {
	const target = url.searchParams.get('url');

	if (!target) {
		return new Response('Missing "url" query parameter', { status: 400 });
	}

	let parsed: URL;
	try {
		parsed = new URL(target);
	} catch {
		return new Response('Invalid URL', { status: 400 });
	}

	if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
		return new Response('Only http and https URLs are allowed', { status: 400 });
	}

	if (BLOCKED_PATTERNS.some((p) => p.test(parsed.hostname))) {
		return new Response('Requests to private addresses are not allowed', { status: 403 });
	}

	try {
		const res = await fetch(target, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (compatible; Readlist/1.0; +https://github.com)',
				Accept: 'text/html,application/xhtml+xml,*/*',
			},
			redirect: 'follow',
		});

		if (!res.ok) {
			return new Response(`Upstream returned ${res.status}`, { status: 502 });
		}

		const body = await res.text();
		return new Response(body, {
			headers: { 'Content-Type': 'text/html; charset=utf-8' },
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Fetch failed';
		return new Response(message, { status: 502 });
	}
};
