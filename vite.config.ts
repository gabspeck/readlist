import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			strategies: 'generateSW',
			registerType: 'autoUpdate',
			manifest: false, // we use our own static/manifest.webmanifest
			workbox: {
				globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'google-fonts-cache',
							expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
						}
					}
				]
			},
			devOptions: {
				enabled: false
			}
		})
	]
});
