import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './src/tests/e2e',
	webServer: {
		command: 'npx vite dev --port 4173',
		url: 'http://localhost:4173',
		reuseExistingServer: !process.env.CI,
		timeout: 60_000
	},
	use: {
		baseURL: 'http://localhost:4173'
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		},
		{
			name: 'chromium-mobile',
			use: {
				...devices['iPhone 12'],
				browserName: 'chromium'
			}
		}
	]
});
