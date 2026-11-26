import { expect, test } from '@playwright/test';
import { BotPlayer } from '../bots/bot-player';

test.describe('Vowlet E2E Smoke Suite', () => {
  test('renders entry screen without console errors or horizontal overflow', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(pageErrors).toEqual([]);
    expect(hasHorizontalOverflow).toBe(false);
  });

  // Enable in Phase 1 once /apps/web + /api + Firebase Emulators are wired
  test.skip('4-player multi-context Quick Play smoke loop', async ({ browser }) => {
    const bots = ['Aria', 'Kabir', 'Meera', 'Dev'].map((name) => new BotPlayer({ name }));

    try {
      await Promise.all(bots.map((bot) => bot.init(browser)));
      await Promise.all(bots.map((bot) => bot.acceptConsentIfPresent()));

      // TODO(Phase 1): Host (bots[0]) creates room, extracts room code,
      // remaining bots join, all ready up, host starts Quick Play,
      // verify SPIN -> CHOOSE -> PERFORM -> VOTE -> RESULT transition.
    } finally {
      await Promise.all(bots.map((bot) => bot.close()));
    }
  });
});
