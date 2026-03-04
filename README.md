# Readlist

A free, open-source read-later PWA. No accounts, no telemetry — your articles stay on your device.

## Features

- **Save articles** by URL with automatic content extraction via Readability
- **Reader mode** with adjustable font, size, line height, and light/sepia/dark themes
- **Original web view** toggle to see the full page inside the app
- **EPUB export** for sending articles to Kindle or any e-reader
- **Reading progress** tracked per article, restored when you return
- **Bookmarklet** to save paywalled articles directly from your browser (runs in your session, no proxy)
- **Sorting** by date, title, length, reading progress, or last opened
- **Filter** by all / unread / read / archived
- **Offline support** via service worker (PWA)
- All data stored locally in IndexedDB — export/import JSON backups anytime

## Tech stack

- [SvelteKit](https://kit.svelte.dev) + Svelte 5 (runes)
- [@mozilla/readability](https://github.com/mozilla/readability) for article parsing
- [fflate](https://github.com/101arrowz/fflate) for in-browser EPUB generation
- [idb](https://github.com/jakearchibald/idb) for IndexedDB
- [@vite-pwa/sveltekit](https://vite-pwa-org.netlify.app/frameworks/sveltekit) for PWA/service worker
- Static adapter — deploys as a plain SPA (no server required)

## Getting started

```sh
npm install
npm run dev
```

### Build

```sh
npm run build
npm run preview
```

The output is a static site in `build/` — deploy to any static host (Netlify, Vercel, GitHub Pages, etc.).

## Bookmarklet (paywalled sites)

Go to **Settings → Bookmarklet**, drag the button to your bookmarks bar, then click it on any page to save the article using your existing browser session.

## License

MIT © Gabriel Speckhahn
