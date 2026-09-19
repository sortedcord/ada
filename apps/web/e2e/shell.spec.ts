import { test, expect } from '@playwright/test';

test('loads the application shell', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Narrative Engine');
  await expect(page.getByRole('heading', { name: 'Build worlds that remember.' })).toBeVisible();
});
