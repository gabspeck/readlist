## Project Configuration

- **Language**: TypeScript
- **Package Manager**: npm
- **Add-ons**: none

---

# AGENTS.md — Readlist Development Guide

This file guides AI agents contributing to **Readlist**, a free, open-source PWA read-later app. It is an alternative to enshittifiable SaaS services like Instapaper, giving users full ownership of their data and reading experience.

---

## Project Philosophy

- **User sovereignty**: all data stays on the user's device (or their own sync backend). No accounts, no telemetry, no vendor lock-in.
- **Distraction-free reading**: content is king. Strip everything that isn't the article.
- **Progressive enhancement**: works offline-first as a PWA; advanced features (eBook export) are additive.
- **Minimal surface area**: do not add complexity unless it directly serves the reader.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | SvelteKit (file-based routing, SSR disabled / static adapter for PWA) |
| Styling | Vanilla CSS custom properties + scoped Svelte styles. No Tailwind, no CSS-in-JS. |
| Storage | IndexedDB via `idb` library (articles, metadata, settings) |
| Article parsing | `@mozilla/readability` + `DOMParser` (runs in the browser) |
| PWA | `@vite-pwa/sveltekit` (service worker, manifest, offline caching) |
| Component dev | Storybook 8+ with `@storybook/sveltekit` |
| E2E tests | Playwright |
| Unit/component tests | Vitest + `@testing-library/svelte` |
| eBook export | `epub-gen-memory` or equivalent (runs entirely in the browser / Web Worker) |

---

## Repository Structure

```
src/
  lib/
    components/       # All UI components — each has a .story.svelte (Storybook) file
    stores/           # Svelte stores: articles, settings, reader state
    services/
      parser.ts       # Readability wrapper — fetches & parses article HTML
      storage.ts      # IndexedDB CRUD via idb
      epub.ts         # eBook generation logic
      share.ts        # Web Share API + fallback (download)
    types.ts          # Shared TypeScript interfaces
  routes/
    +layout.svelte    # App shell, PWA meta tags
    +page.svelte      # Reading list (home)
    read/[id]/
      +page.svelte    # Reader view
    settings/
      +page.svelte    # User preferences
stories/              # Non-route Storybook stories (design tokens, typography)
tests/                # Playwright e2e tests
static/               # Icons, manifest.webmanifest
```

---

## UI & Design Principles

### Visual language
- **Color**: near-monochrome. Background `#fafafa` (light) / `#111` (dark). Accent is a single muted tone (e.g. `#4a6cf7` at low saturation). No gradients, no drop shadows beyond subtle `box-shadow`.
- **Typography**: system font stack for UI chrome; a comfortable serif (e.g. `Georgia`, `Lora` via Google Fonts optional download) for article body. Reader line-length capped at `68ch`.
- **Spacing**: generous whitespace. Let content breathe.
- **Icons**: inline SVG only, no icon font libraries.

### Reader mode rules
- Strip all `<script>`, ads, navbars, sidebars, comment sections, share widgets.
- Remove decorative images (heuristic: images inside `<header>`, `<nav>`, `<aside>`, images smaller than 200 × 100 px, tracking pixels).
- Keep images that appear inline within article `<p>` flow or are figures with captions.
- Normalize headings, remove custom `class` / `style` attributes.
- Preserve `<code>`, `<pre>`, `<blockquote>`, `<table>` with minimal styling.
- Never reflow or summarize text — show the full original content.

### Responsive & PWA
- Mobile-first. Touch targets ≥ 44 × 44 px.
- Bottom navigation bar on mobile; left sidebar on desktop.
- App installable (manifest + service worker). Offline reading of saved articles must work without a network connection.

---

## Core Features & Implementation Notes

### 1. Save Article
- User pastes a URL or uses the browser Share Target (registered in `manifest.webmanifest`).
- `parser.ts` fetches the URL via a CORS proxy (user-configurable, default: `https://corsproxy.io/?` or a self-hosted proxy). Never hard-code a proprietary proxy.
- Parsed result stored in IndexedDB: `{ id, url, title, author, publishedAt, excerpt, content (HTML string), savedAt, isRead, tags, archived }`.

### 2. Reading List
- Virtual-scroll list of saved articles sorted by `savedAt` desc.
- Swipe-to-archive on mobile (left), swipe-to-delete with undo toast.
- Filter by tag, read/unread, archived.

### 3. Reader View
- Renders stored HTML in a sandboxed `<article>` element (no iframe needed; just apply CSS resets and the reading stylesheet).
- Controls: font size, font family (serif / sans), line height, theme (light / sepia / dark). Persisted to `localStorage`.
- Progress bar & estimated reading time.
- Text selection → highlight & note (stored in IndexedDB alongside article).

### 4. Kindle / eBook Digest
- User selects articles (multi-select or "all unread") and taps **Export as eBook**.
- `epub.ts` generates an EPUB 3 file entirely in the browser (Web Worker to avoid blocking the UI).
- EPUB structure: cover page listing included articles, then one chapter per article with the same reader-mode HTML + minimal embedded CSS.
- Export uses Web Share API (`{ files: [epubBlob] }`) if available; falls back to `<a download>`.
- Share targets the user intends: **email client** and **Kindle app** (which accepts EPUB/MOBI via the Kindle email or direct open on Android/iOS). Provide a help tooltip explaining how to send to Kindle.
- No cloud upload, no Amazon API — the file is created and shared entirely on-device.

### 5. Sync (optional / future)
- Architecture should support a pluggable sync backend (e.g. self-hosted PocketBase, Supabase, or a flat-file server).
- Keep the sync layer behind a `SyncProvider` interface in `services/sync.ts`; ship with a no-op default.

---

## Component Guidelines

Every reusable UI component lives in `src/lib/components/`. Rules:

1. **One file per component**: `ComponentName.svelte`. Co-locate a `ComponentName.stories.svelte` in the same directory.
2. **Props over stores**: components receive data via props; they read from stores only in route-level `+page.svelte` files.
3. **No business logic in components**: parsing, storage, and EPUB generation belong in `services/`.
4. **Accessible by default**: use semantic HTML, `aria-*` where needed, keyboard navigable.
5. **Storybook stories**: every component must have at least a Default and a Loading/Empty state story.

---

## Testing Strategy

### Unit tests (Vitest)
- All functions in `src/lib/services/` must have unit tests.
- Mock `idb` and `fetch` in service tests.
- Run with: `npm run test:unit`

### Component tests (Vitest + Testing Library)
- Test user-facing behavior (what renders, what happens on interaction), not implementation details.
- Run with: `npm run test:component`

### E2E tests (Playwright)
- Cover critical user journeys:
  1. Save an article by URL → it appears in reading list.
  2. Open article → reader view renders stripped content.
  3. Change reader settings → persisted on reload.
  4. Export selected articles as EPUB → file download triggered.
  5. PWA offline: article saved while online is readable offline.
- Tests live in `tests/`. Use Playwright fixtures to seed IndexedDB state.
- Run with: `npm run test:e2e`

### Storybook
- Used for visual regression and isolated component development — not for E2E flows.
- Run with: `npm run storybook`

---

## Code Style & Conventions

- **TypeScript** everywhere. No `any`; use `unknown` and narrow explicitly.
- **No default exports** from service files; use named exports.
- Prefer `async/await` over raw promise chains.
- Svelte stores: use `readable` / `derived` where possible; reserve `writable` for state that truly needs external mutation.
- CSS custom properties for all design tokens (colors, spacing, font sizes). Define tokens in `:root` inside `src/app.css`.
- Do not use `!important`.
- Keep components under ~200 lines. If longer, extract sub-components.

---

## What Agents Should NOT Do

- Do not introduce analytics, tracking, or any third-party scripts that phone home.
- Do not add authentication or user accounts to the core app.
- Do not store article content on any server — parsing happens client-side.
- Do not use a UI component library (e.g. shadcn, Material) — build purpose-fit components.
- Do not reach for a new dependency without checking if the browser's built-in APIs suffice.
- Do not break offline functionality — every feature must degrade gracefully with no network.
