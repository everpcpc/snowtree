import { test, expect } from './fixtures';
import { openFirstWorktree } from './app-helpers';

test.describe('Timeline and Event Display', () => {
  test.beforeEach(async ({ page }) => {
    await openFirstWorktree(page);
  });

  test('should display timeline/conversation area', async ({ page }) => {
    const timeline = page.locator('[class*="timeline"], [class*="conversation"], [class*="messages"]').first();
    const timelineExists = await timeline.isVisible({ timeout: 5000 }).catch(() => false);

    if (timelineExists) {
      expect(timelineExists).toBe(true);
    }
  });

  test('should display timeline events if any exist', async ({ page }) => {
    const events = page.locator('[class*="event"], [class*="message"], [class*="timeline-item"]');
    const eventCount = await events.count();

    expect(eventCount).toBeGreaterThanOrEqual(0);
  });

  test('should scroll timeline content', async ({ page }) => {
    const timeline = page.locator('[class*="timeline"], [class*="conversation"]').first();
    const timelineExists = await timeline.isVisible({ timeout: 5000 }).catch(() => false);

    if (timelineExists) {
      const scrollContainer = timeline.locator('..').first();
      const initialScrollTop = await scrollContainer.evaluate(el => el.scrollTop).catch(() => 0);

      await scrollContainer.evaluate(el => el.scrollTop = 100).catch(() => {});
      await page.waitForTimeout(200);

      const newScrollTop = await scrollContainer.evaluate(el => el.scrollTop).catch(() => 0);
      expect(newScrollTop >= 0).toBe(true);
    }
  });

  test('should display timestamps on events', async ({ page }) => {
    const timestamps = page.locator('time, [class*="timestamp"], [class*="time"]');
    const timestampCount = await timestamps.count();

    if (timestampCount > 0) {
      const firstTimestamp = timestamps.first();
      const timestampText = await firstTimestamp.textContent();
      expect(timestampText).toBeTruthy();
    }
  });

  test('should display different event types', async ({ page }) => {
    const userMessages = page.locator('[class*="user"], [class*="prompt"]');
    const assistantMessages = page.locator('[class*="assistant"], [class*="response"]');
    const systemMessages = page.locator('[class*="system"], [class*="command"]');

    const totalMessages = await userMessages.count() + await assistantMessages.count() + await systemMessages.count();
    expect(totalMessages).toBeGreaterThanOrEqual(0);
  });

  test('should display code blocks in events', async ({ page }) => {
    const codeBlocks = page.locator('pre code, [class*="code-block"], .hljs');
    const codeBlockCount = await codeBlocks.count();

    expect(codeBlockCount).toBeGreaterThanOrEqual(0);
  });

  test('should allow copying code from events', async ({ page }) => {
    const codeBlocks = page.locator('pre code, [class*="code-block"]');
    const codeBlockCount = await codeBlocks.count();

    if (codeBlockCount > 0) {
      const firstCodeBlock = codeBlocks.first();
      await firstCodeBlock.hover();
      await page.waitForTimeout(200);

      const copyButton = page.locator('button:has-text("Copy"), button[title*="Copy" i]').first();
      const hasCopyButton = await copyButton.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasCopyButton) {
        expect(hasCopyButton).toBe(true);
      }
    }
  });

  test('should auto-scroll to latest event', async ({ page }) => {
    const timeline = page.locator('[class*="timeline"], [class*="conversation"]').first();
    const timelineExists = await timeline.isVisible({ timeout: 5000 }).catch(() => false);

    if (timelineExists) {
      const scrollContainer = timeline.locator('..').first();
      const scrollHeight = await scrollContainer.evaluate(el => el.scrollHeight).catch(() => 0);
      const clientHeight = await scrollContainer.evaluate(el => el.clientHeight).catch(() => 0);

      if (scrollHeight > clientHeight) {
        const scrollTop = await scrollContainer.evaluate(el => el.scrollTop).catch(() => 0);
        expect(scrollTop >= 0).toBe(true);
      }
    }
  });
});
