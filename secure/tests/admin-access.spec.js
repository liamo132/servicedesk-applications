import { test, expect } from '@playwright/test';

test('Admin can access admin dashboard', async ({ page }) => {
  await page.goto('http://localhost:3001/login');

  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');

  await page.goto('http://localhost:3001/admin');

  // Unique selector: heading, not link
  await expect(page.getByRole('heading', { name: 'Admin Panel' })).toBeVisible();
});