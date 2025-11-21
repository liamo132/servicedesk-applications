import { test, expect } from '@playwright/test';

test('Ticket search returns filtered results', async ({ page }) => {
  await page.goto('http://localhost:3001/login');
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');

  const uniqueTitle = `SearchTest ${Date.now()}`;

  // Create ticket
  await page.goto('http://localhost:3001/tickets/new');
  await page.fill('input[name="title"]', uniqueTitle);
  await page.selectOption('select[name="category"]', 'IT Support');
  await page.fill('textarea[name="description"]', 'Test');
  await page.click('button[type="submit"]');

  // Search for it
  await page.fill('input[name="search"]', uniqueTitle);
  await page.click('button:has-text("Search")');

  await expect(page.getByRole('link', { name: uniqueTitle })).toBeVisible();
});