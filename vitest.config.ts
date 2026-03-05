import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
	test: {
		environment: 'happy-dom',
		globals: true,
		setupFiles: ['src/tests/setup.ts'],
		include: ['src/**/*.test.ts'],
		coverage: {
			provider: 'v8',
			include: ['src/lib/**/*.ts']
		}
	},
	resolve: {
		alias: {
			$lib: resolve(__dirname, 'src/lib'),
			'$env/static/public': resolve(__dirname, 'src/tests/__mocks__/env.ts'),
			'$app/stores': resolve(__dirname, 'src/tests/__mocks__/app-stores.ts'),
			'$app/navigation': resolve(__dirname, 'src/tests/__mocks__/app-navigation.ts')
		}
	}
});
