import { test, expect } from '@playwright/test';

test('User can create a ticket', async ({ page }) => {
  await page.goto('http://localhost:3001/login');
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');

  await page.goto('http://localhost:3001/tickets/new');

  const title = `Playwright Test Ticket ${Date.now()}`;
  await page.fill('input[name="title"]', title);
  await page.selectOption('select[name="category"]', 'IT Support');
  await page.fill('textarea[name="description"]', 'Automated test description');

  await page.click('button[type="submit"]');

  await expect(page.getByRole('link', { name: title })).toBeVisible();
});