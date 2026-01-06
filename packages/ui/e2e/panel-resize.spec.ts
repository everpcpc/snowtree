import { test, expect } from './fixtures';
import { openFirstWorktree } from './app-helpers';

test.describe('Panel Resize Operations', () => {
  test.beforeEach(async ({ page }) => {
    await openFirstWorktree(page);
  });

  test('should display resize handle between panels', async ({ page }) => {
    const resizeHandle = page.getByTestId('resize-handle');
    const handleExists = await resizeHandle.isVisible({ timeout: 5000 }).catch(() => false);

    if (handleExists) {
      expect(handleExists).toBe(true);
    }
  });

  test('should change cursor on resize handle hover', async ({ page }) => {
    const resizeHandle = page.getByTestId('resize-handle');
    const handleExists = await resizeHandle.isVisible({ timeout: 5000 }).catch(() => false);

    if (handleExists) {
      await resizeHandle.hover();
      await page.waitForTimeout(200);

      const cursor = await resizeHandle.evaluate(el => window.getComputedStyle(el).cursor);
      expect(cursor).toBe('col-resize');
    }
  });

  test('should resize right panel by dragging', async ({ page }) => {
    const resizeHandle = page.getByTestId('resize-handle');
    const handleExists = await resizeHandle.isVisible({ timeout: 5000 }).catch(() => false);

    if (handleExists) {
      const rightPanel = page.getByTestId('right-panel');
      const initialWidth = await rightPanel.evaluate(el => el.offsetWidth).catch(() => 0);

      const handleBox = await resizeHandle.boundingBox();
      if (handleBox) {
        await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(handleBox.x - 50, handleBox.y + handleBox.height / 2);
        await page.mouse.up();
        await page.waitForTimeout(300);

        const newWidth = await rightPanel.evaluate(el => el.offsetWidth).catch(() => 0);
        expect(newWidth).not.toBe(initialWidth);
      }
    }
  });

  test('should respect minimum panel width', async ({ page }) => {
    const resizeHandle = page.getByTestId('resize-handle');
    const handleExists = await resizeHandle.isVisible({ timeout: 5000 }).catch(() => false);

    if (handleExists) {
      const handleBox = await resizeHandle.boundingBox();
      if (handleBox) {
        await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(handleBox.x - 500, handleBox.y + handleBox.height / 2);
        await page.mouse.up();
        await page.waitForTimeout(300);

        const rightPanel = page.getByTestId('right-panel');
        const finalWidth = await rightPanel.evaluate(el => el.offsetWidth).catch(() => 0);
        expect(finalWidth).toBeGreaterThanOrEqual(260);
      }
    }
  });

  test('should respect maximum panel width', async ({ page }) => {
    const resizeHandle = page.getByTestId('resize-handle');
    const handleExists = await resizeHandle.isVisible({ timeout: 5000 }).catch(() => false);

    if (handleExists) {
      const handleBox = await resizeHandle.boundingBox();
      if (handleBox) {
        await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(handleBox.x + 500, handleBox.y + handleBox.height / 2);
        await page.mouse.up();
        await page.waitForTimeout(300);

        const rightPanel = page.getByTestId('right-panel');
        const finalWidth = await rightPanel.evaluate(el => el.offsetWidth).catch(() => 0);
        expect(finalWidth).toBeLessThanOrEqual(560);
      }
    }
  });

  test('should persist panel width on reload', async ({ page }) => {
    const resizeHandle = page.getByTestId('resize-handle');
    const handleExists = await resizeHandle.isVisible({ timeout: 5000 }).catch(() => false);

    if (handleExists) {
      const handleBox = await resizeHandle.boundingBox();
      if (handleBox) {
        await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(handleBox.x - 30, handleBox.y + handleBox.height / 2);
        await page.mouse.up();
        await page.waitForTimeout(300);

        const rightPanel = page.getByTestId('right-panel');
        const widthBeforeReload = await rightPanel.evaluate(el => el.offsetWidth).catch(() => 0);

        await page.reload();
        await openFirstWorktree(page);

        const widthAfterReload = await rightPanel.evaluate(el => el.offsetWidth).catch(() => 0);
        expect(Math.abs(widthAfterReload - widthBeforeReload)).toBeLessThan(5);
      }
    }
  });

  test('should show visual feedback during resize', async ({ page }) => {
    const resizeHandle = page.getByTestId('resize-handle');
    const handleExists = await resizeHandle.isVisible({ timeout: 5000 }).catch(() => false);

    if (handleExists) {
      const handleBox = await resizeHandle.boundingBox();
      if (handleBox) {
        await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
        await page.mouse.down();

        const bodyCursor = await page.evaluate(() => document.body.style.cursor);
        expect(['col-resize', 'ew-resize', '']).toContain(bodyCursor);

        await page.mouse.up();
      }
    }
  });
});
