import { expect, test } from '@playwright/test';

test('shows a labelled grid and distinct endpoints', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('A* 寻路实验室');
  await expect(page.getByRole('heading', { name: '寻路地图' })).toBeVisible();
  await expect(page.locator('#grid [role="gridcell"]')).toHaveCount(21 * 31);
  await expect(page.locator('#cell-1-1 .marker')).toHaveText('S');
  await expect(page.locator('.marker').filter({ hasText: 'E' })).toHaveCount(1);
});

test('single step expands one node and can pause and continue', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '单步' }).click();
  await expect(page.locator('#stat-expanded')).toHaveText('1');
  await expect(page.getByRole('button', { name: '继续搜索' })).toBeVisible();
  await page.getByRole('button', { name: '继续搜索' }).click();
  await expect(page.getByRole('button', { name: '暂停搜索' })).toBeVisible();
  await page.getByRole('button', { name: '暂停搜索' }).click();
  await expect(page.locator('#map-status')).toHaveText('搜索已暂停');
});

test('supports wall editing, clearing, and responsive grid presets', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '画墙' }).click();
  await page.locator('#cell-5-5').click();
  await expect(page.locator('#cell-5-5')).toHaveAttribute('aria-label', /墙壁/);
  await page.getByRole('button', { name: '清空墙壁' }).click();
  await expect(page.locator('#cell-5-5')).toHaveAttribute('aria-label', /通路/);
  await page.getByLabel('网格尺寸').selectOption('compact');
  await expect(page.locator('#map-dimensions')).toHaveText('15 行 × 21 列');
  await expect(page.locator('#grid [role="gridcell"]')).toHaveCount(15 * 21);
});

test('moves the single keyboard focus across the grid', async ({ page }) => {
  await page.goto('/');
  await page.locator('#grid').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#grid')).toHaveAttribute('aria-activedescendant', 'cell-1-2');
  await expect(page.locator('#cell-1-2')).toHaveAttribute('id', 'cell-1-2');
});

test('keeps the mobile page within the viewport and scrolls the grid independently', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const pageWidths = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(pageWidths.document).toBeLessThanOrEqual(pageWidths.viewport);
  const gridWidths = await page.locator('#grid-scroll').evaluate((element) => ({
    content: element.scrollWidth,
    viewport: element.clientWidth,
  }));
  expect(gridWidths.content).toBeGreaterThan(gridWidths.viewport);
});