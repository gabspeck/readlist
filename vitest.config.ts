import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
	plugins: [svelte()],
	test: {
		environment: 'happy-dom',
		globals: true,
		setupFiles: ['src/tests/setup.ts'],
		include: ['src/**/*.test.ts'],
		coverage: {
			provider: 'v8',
			include: ['src/lib/**/*.ts', 'src/lib/**/*.svelte.ts']
		}
	},
	resolve: {
		alias: {
			$lib: resolve(__dirname, 'src/lib'),
			'$env/static/public': resolve(__dirname, 'src/tests/__mocks__/env.ts'),
			'$app/state': resolve(__dirname, 'src/tests/__mocks__/app-state.ts'),
			'$app/navigation': resolve(__dirname, 'src/tests/__mocks__/app-navigation.ts')
		}
	}
});
