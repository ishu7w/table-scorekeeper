const { test, expect } = require('@playwright/test');

async function setup(page, mode = 'blind') {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  if (mode === 'normal') await page.locator('[data-mode="normal"]').click();
  for (const [i, name] of ['A', 'B', 'C', 'D'].entries()) {
    await page.locator('#names input').nth(i).fill(name);
  }
  await page.getByRole('button', { name: 'Start game' }).click();
}

async function blindPredictions(page, scores) {
  for (let i = 0; i < scores.length; i++) {
    const input = page.locator('#round-0 [data-field="expected"]');
    await input.fill(String(scores[i]));
    await input.press('Enter');
  }
}

test('blind predictions stay masked, and reshuffle at sum 9', async ({ page }) => {
  await setup(page);
  await page.locator('#round-0 [data-field="expected"]').fill('2');
  await page.locator('#round-0 [data-field="expected"]').press('Enter');
  await expect(page.locator('#round-0 .expected')).toContainText('••••');
  await page.locator('#round-0 [data-field="expected"]').fill('2');
  await page.locator('#round-0 [data-field="expected"]').press('Enter');
  await page.locator('#round-0 [data-field="expected"]').fill('2');
  await page.locator('#round-0 [data-field="expected"]').press('Enter');
  await page.locator('#round-0 [data-field="expected"]').fill('3');
  await page.locator('#round-0 [data-field="expected"]').press('Enter');
  await expect(page.locator('#round-0 .score')).toContainText('3');
  await expect(page.locator('#round-0 .expected')).toContainText('R1*');
  await expect(page.getByRole('button', { name: 'Add round' })).toBeVisible();
  await page.getByRole('button', { name: 'Total' }).click();
  await expect(page.locator('#standings')).toContainText('3');
});

test('exactly 10 reveals predictions and proceeds to Made', async ({ page }) => {
  await setup(page);
  await blindPredictions(page, [2, 2, 3, 3]);
  await expect(page.locator('#round-0 .expected')).toContainText('2');
  await expect(page.locator('#round-0 .expected')).not.toContainText('••••');
  await expect(page.getByRole('button', { name: 'Save results' })).toBeVisible();
});

test('sum greater than 10 proceeds without reshuffle', async ({ page }) => {
  await setup(page);
  await blindPredictions(page, [3, 3, 3, 3]);
  await expect(page.locator('#round-0 .expected')).not.toContainText('R1*');
  await expect(page.getByRole('button', { name: 'Save results' })).toBeVisible();
});

test('click navigation and browser refresh preserve private turn', async ({ page }) => {
  await setup(page);
  await page.locator('#round-0 [data-field="expected"]').fill('2');
  await page.locator('#round-0 [data-field="expected"]').press('Enter');
  await page.locator('#round-0 .expected button[aria-label*="Select C"]').click();
  await page.locator('#round-0 [data-field="expected"]').fill('3');
  await page.reload();
  await expect(page.locator('#round-0 [data-field="expected"][data-player="2"]')).toBeVisible();
  await expect(page.locator('#round-0 .expected')).toContainText('••••');
  await page.locator('#round-0 [data-field="expected"]').press('Shift+Tab');
  await expect(page.locator('#round-0 [data-field="expected"][data-player="1"]')).toBeVisible();
});

test('normal play shows predictions and does not reshuffle low totals', async ({ page }) => {
  await setup(page, 'normal');
  for (const [i, score] of [2, 2, 2, 2].entries()) {
    await page.locator('#round-0 [data-field="expected"]').nth(i).fill(String(score));
  }
  await page.getByRole('button', { name: 'Save expected' }).click();
  await expect(page.locator('#round-0 .expected')).not.toContainText('R1*');
  await expect(page.getByRole('button', { name: 'Save results' })).toBeVisible();
  for (const [i, score] of [2, 3, 1, 4].entries()) {
    await page.locator('#round-0 [data-field="made"]').nth(i).fill(String(score));
  }
  await page.getByRole('button', { name: 'Save results' }).click();
  await page.getByRole('button', { name: 'Total' }).click();
  await expect(page.locator('#standings')).toContainText('2.1');
  await expect(page.locator('#standings')).toContainText('C-2');
});

test('reshuffle totals carry into subsequent rounds', async ({ page }) => {
  await setup(page);
  await blindPredictions(page, [2, 2, 2, 2]);
  await page.getByRole('button', { name: 'Add round' }).click();
  await expect(page.locator('#round-1')).toBeVisible();
  await page.getByRole('button', { name: 'Total' }).click();
  await expect(page.locator('#standings')).toContainText('2');
});
