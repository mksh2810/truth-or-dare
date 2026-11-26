import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { BotPlayer } from '../bots/bot-player';

async function assertNoCriticalAxeViolations(page: Page, screenName: string): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  const critical = results.violations.filter((v) => v.impact === 'critical');
  expect(
    critical,
    `Expected 0 critical axe violations on ${screenName}, found: ${JSON.stringify(
      critical.map((v) => ({ id: v.id, description: v.description, nodes: v.nodes.length })),
      null,
      2,
    )}`,
  ).toEqual([]);
}

async function assertNoHorizontalOverflow(page: Page, screenName: string): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow, `Expected no horizontal overflow on ${screenName}`).toBe(false);
}

test.describe('Phase 2 Accessibility Audit (D24 / Section 9.4)', () => {
  test('Consent, Home, and Lobby screens have zero critical axe-core violations and no horizontal overflow', async ({
    browser,
  }) => {
    const bot = new BotPlayer({ name: 'Aria' });

    try {
      const page = await bot.init(browser);

      // 1. Consent Screen
      await page.getByTestId('consent-screen').waitFor({ state: 'visible' });
      await assertNoCriticalAxeViolations(page, 'ConsentScreen');
      await assertNoHorizontalOverflow(page, 'ConsentScreen');

      // Verify primary action button >= 44px height
      const acceptBox = await page.getByTestId('consent-accept').boundingBox();
      expect(acceptBox?.height ?? 0).toBeGreaterThanOrEqual(44);

      // 2. Home Screen
      await bot.acceptConsentIfPresent();
      await page.getByTestId('home-screen').waitFor({ state: 'visible' });
      await assertNoCriticalAxeViolations(page, 'HomeScreen');
      await assertNoHorizontalOverflow(page, 'HomeScreen');

      const settingsBox = await page.getByTestId('settings-btn').boundingBox();
      expect(settingsBox?.width ?? 0).toBeGreaterThanOrEqual(44);
      expect(settingsBox?.height ?? 0).toBeGreaterThanOrEqual(44);

      // 3. Lobby Screen
      await bot.createRoom({ rounds: 5, quickPlay: true });
      await page.getByTestId('lobby-screen').waitFor({ state: 'visible' });
      await assertNoCriticalAxeViolations(page, 'LobbyScreen');
      await assertNoHorizontalOverflow(page, 'LobbyScreen');

      const readyBox = await page.getByTestId('ready-toggle-btn').boundingBox();
      expect(readyBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    } finally {
      await bot.close();
    }
  });

  test('Reduced motion preference preserves screen accessibility on Consent, Home, and Lobby', async ({
    browser,
  }) => {
    const bot = new BotPlayer({ name: 'Meera' });

    try {
      const page = await bot.init(browser);
      await page.emulateMedia({ reducedMotion: 'reduce' });

      await page.getByTestId('consent-screen').waitFor({ state: 'visible' });
      await assertNoCriticalAxeViolations(page, 'ConsentScreen (reduced-motion)');

      await bot.acceptConsentIfPresent();
      await page.getByTestId('home-screen').waitFor({ state: 'visible' });
      await assertNoCriticalAxeViolations(page, 'HomeScreen (reduced-motion)');

      await bot.createRoom({ rounds: 5, quickPlay: true });
      await page.getByTestId('lobby-screen').waitFor({ state: 'visible' });
      await assertNoCriticalAxeViolations(page, 'LobbyScreen (reduced-motion)');
    } finally {
      await bot.close();
    }
  });
});
