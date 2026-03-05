import { test, expect } from '@playwright/test';

const MOCK_ARTICLE_HTML = `
<!DOCTYPE html>
<html>
<head><title>Test Article Title</title></head>
<body>
  <h1>Test Article Title</h1>
  <p>This is the article content for testing purposes.</p>
</body>
</html>
`;

test('add article URL → card appears in list → click → reader loads', async ({ page }) => {
	// Mock the CORS proxy so we don't need a real network
	await page.route('**/api/parse*', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'text/html',
			body: MOCK_ARTICLE_HTML
		});
	});

	// Also mock any direct URL fetch (the CORS proxy URL)
	await page.route('https://corsproxy.io/**', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'text/html',
			body: MOCK_ARTICLE_HTML
		});
	});

	await page.goto('/');

	// Open the add dialog (nav button has aria-label="Save article")
	const addButton = page.getByRole('button', { name: /save article/i });
	await addButton.click();

	// Fill in the URL
	const urlInput = page.getByRole('textbox');
	await urlInput.fill('https://example.com/test-article');

	// Submit
	await page.keyboard.press('Enter');

	// Article card should appear in the list
	await expect(page.getByText('Test Article Title')).toBeVisible({ timeout: 10_000 });

	// Click the article card to open reader
	await page.getByText('Test Article Title').first().click();

	// Should be on the reader page
	await expect(page).toHaveURL(/\/read\//);
});
