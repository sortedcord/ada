import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('application shell has no serious accessibility violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter(
      (violation) => violation.impact === 'critical' || violation.impact === 'serious',
    ),
  ).toEqual([]);
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
  await page.keyboard.press('Control+K');
  await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
});
