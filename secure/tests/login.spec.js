// tests/login.spec.js
import { test, expect } from '@playwright/test';

test('User can log in', async ({ page }) => {
  await page.goto('http://localhost:3001/login');

  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('http://localhost:3001/tickets');
  await expect(page.locator('text=Logged in as')).toBeVisible();
});
