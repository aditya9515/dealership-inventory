import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

async function login(page: Page, role: 'Admin' | 'Customer' = 'Admin') {
  await page.goto('/');
  await page.getByRole('button', { name: `${role} demo`, exact: true }).click();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'The collection' })).toBeVisible();
  await expect(page.locator('.vehicle-card')).toHaveCount(6);
}

test('desktop and mobile showroom render without browser errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  mkdirSync('docs/screenshots', { recursive: true });
  await page.goto('/');
  await page.screenshot({ path: 'docs/screenshots/sign-in.png', fullPage: true });
  await login(page);
  await page.screenshot({ path: 'docs/screenshots/inventory.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Add vehicle', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'docs/screenshots/mobile.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('admin can add, edit, restock, purchase and delete a vehicle', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: 'Add vehicle', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Make', { exact: true }).fill('Test Motors');
  await dialog.getByLabel('Model', { exact: true }).fill('Roadster');
  await dialog.getByLabel('Category', { exact: true }).fill('Coupe');
  await dialog.getByLabel('Price (₹)', { exact: true }).fill('990000');
  await dialog.getByLabel('Initial stock').fill('1');
  await dialog.getByRole('button', { name: 'Save vehicle' }).click();
  const card = page.getByRole('article', { name: 'Test Motors Roadster', exact: true });
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Edit Roadster' }).click();
  await dialog.getByLabel('Model', { exact: true }).fill('Roadster Plus');
  await dialog.getByRole('button', { name: 'Save vehicle' }).click();
  const updated = page.getByRole('article', { name: 'Test Motors Roadster Plus', exact: true });
  await expect(updated).toBeVisible();
  await updated.getByRole('button', { name: 'Restock Roadster Plus' }).click();
  await dialog.getByLabel('Quantity').fill('3');
  await dialog.getByRole('button', { name: 'Restock vehicle' }).click();
  await expect(updated.getByText('4 in stock')).toBeVisible();
  await updated.getByRole('button', { name: 'Purchase', exact: true }).click();
  await dialog.getByLabel('Quantity').fill('2');
  await dialog.getByRole('button', { name: 'Confirm purchase', exact: true }).click();
  await expect(updated.getByText('2 in stock')).toBeVisible();
  await page.getByRole('button', { name: 'Activity', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Inventory activity' })).toBeVisible();
  await expect(
    page
      .locator('.activity-row')
      .filter({ hasText: 'Test Motors Roadster Plus' })
      .filter({ hasText: 'Purchased' }),
  ).toContainText('-2 units');
  await page.screenshot({ path: 'docs/screenshots/activity.png', fullPage: true });
  await page.getByRole('button', { name: /^Inventory/ }).click();
  await updated.getByRole('button', { name: 'Delete Roadster Plus' }).click();
  await dialog.getByRole('button', { name: 'Delete vehicle', exact: true }).click();
  await expect(updated).toHaveCount(0);
});

test.afterEach(async ({ request }) => {
  // Cleanup also runs after a failed UI assertion, keeping later tests independent.
  const auth = await request.post('/api/auth/login', {
    data: { email: 'admin@demo.local', password: 'AdminDemo123!' },
  });
  const { token } = await auth.json();
  const headers = { Authorization: `Bearer ${token}` };
  const results = await request.get('/api/vehicles/search?make=Test%20Motors', { headers });
  for (const vehicle of (await results.json()).vehicles)
    await request.delete(`/api/vehicles/${vehicle.id}`, { headers });
});

test('customer searches, filters and purchases while admin actions stay hidden', async ({
  page,
}) => {
  await login(page, 'Customer');
  await expect(page.getByRole('button', { name: 'Add vehicle', exact: true })).toHaveCount(0);
  await expect(
    page
      .getByRole('article', { name: 'Tata Tiago EV', exact: true })
      .getByRole('button', { name: 'Unavailable' }),
  ).toBeDisabled();
  await page.getByRole('textbox', { name: 'Search vehicles' }).fill('Nexon');
  const card = page.getByRole('article', { name: 'Tata Nexon', exact: true });
  await expect(page.locator('.vehicle-card')).toHaveCount(1);
  await card.getByRole('button', { name: 'Purchase', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm purchase' }).click();
  await expect(card.getByText('7 in stock')).toBeVisible();
  await page.getByRole('textbox', { name: 'Search vehicles' }).fill('not-a-real-car');
  await expect(page.getByRole('heading', { name: 'No vehicles found' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear all', exact: false }).click();
  await expect(page.locator('.vehicle-card')).toHaveCount(6);
  await page.getByRole('button', { name: 'Filters', exact: false }).click();
  await page.getByLabel('Minimum price').fill('1200000');
  await expect(page.locator('.vehicle-card')).toHaveCount(2);
  await page.getByLabel('Filter availability').selectOption('true');
  await expect(page.locator('.vehicle-card')).toHaveCount(2);
});

test('registration, session restoration and logout work end to end', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create an account' }).click();
  await page.getByLabel('Full name').fill('New Customer');
  await page.getByLabel('Email address').fill(`customer-${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill('NewCustomer123!');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'The collection' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'The collection' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('motorstock.token'))).toBeNull();
});

test('invalid credentials show an actionable error', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Email address').fill('missing@example.com');
  await page.getByLabel('Password', { exact: true }).fill('WrongPassword123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Email or password is incorrect.');
});
