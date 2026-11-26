import { expect, test, type Page } from '@playwright/test';
import { BotPlayer, type TurnChoice } from '../bots/bot-player';

interface CapturedAnalyticsEvent {
  name: string;
  params: Record<string, unknown>;
}

const PLAYERS = ['AriaPII', 'KabirPII', 'MeeraPII', 'DevPII'] as const;
const TOTAL_ROUNDS = 5;

async function assertNoHorizontalOverflow(page: Page, contextLabel: string): Promise<void> {
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  expect(hasOverflow, `Horizontal overflow detected on ${contextLabel} at 360px`).toBe(false);
}

async function attachAnalyticsSpy(page: Page, sink: CapturedAnalyticsEvent[]): Promise<void> {
  await page.addInitScript(() => {
    const win = window as unknown as {
      __VOWLET_ANALYTICS_EVENTS__?: Array<{ name: string; params?: Record<string, unknown> }>;
      dataLayer?: unknown[];
    };
    if (!Array.isArray(win.__VOWLET_ANALYTICS_EVENTS__)) {
      win.__VOWLET_ANALYTICS_EVENTS__ = [];
    }
  });

  await page.route(
    (url) =>
      url.pathname.includes('/api/analytics') ||
      url.hostname.includes('google-analytics.com') ||
      url.hostname.includes('app-measurement.com'),
    async (route) => {
      const request = route.request();
      const postData = request.postData();
      if (postData) {
        try {
          const parsed = JSON.parse(postData) as Record<string, unknown>;
          if (typeof parsed.name === 'string') {
            sink.push({
              name: parsed.name,
              params: (parsed.params as Record<string, unknown>) ?? {},
            });
          }
        } catch {
          // Form-encoded or GA4 collect payload; inspect raw string for PII check
          sink.push({ name: 'network_collect', params: { raw: postData } });
        }
      }
      await route.fulfill({ status: 204, body: '' });
    },
  );
}

async function collectWindowAnalyticsEvents(page: Page): Promise<CapturedAnalyticsEvent[]> {
  return page.evaluate(() => {
    const win = window as unknown as {
      __VOWLET_ANALYTICS_EVENTS__?: Array<{ name: string; params?: Record<string, unknown> }>;
    };
    return (win.__VOWLET_ANALYTICS_EVENTS__ ?? []).map((evt) => ({
      name: evt.name,
      params: evt.params ?? {},
    }));
  });
}

function assertZeroPiiInEvents(
  events: CapturedAnalyticsEvent[],
  forbiddenStrings: readonly string[],
): void {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  for (const evt of events) {
    const serialized = JSON.stringify(evt);
    for (const secret of forbiddenStrings) {
      expect(
        serialized.toLowerCase(),
        `PII leak ("${secret}") found in analytics event "${evt.name}"`,
      ).not.toContain(secret.toLowerCase());
    }
    expect(
      emailRegex.test(serialized),
      `Email pattern found in analytics event "${evt.name}"`,
    ).toBe(false);
  }
}

async function findPerformerInChoose(bots: BotPlayer[]): Promise<BotPlayer> {
  const firstBot = bots[0];
  if (!firstBot) {
    throw new Error('findPerformerInChoose requires at least one bot');
  }
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    for (const bot of bots) {
      const visible = await bot
        .getPage()
        .getByTestId('choose-truth-btn')
        .isVisible()
        .catch(() => false);
      if (visible) {
        return bot;
      }
    }
    await firstBot.getPage().waitForTimeout(100);
  }
  throw new Error('Timed out waiting for performer to see choose-truth-btn');
}

async function waitForAllTestId(bots: BotPlayer[], testId: string, timeout = 20_000): Promise<void> {
  await Promise.all(
    bots.map((bot) =>
      bot.getPage().getByTestId(testId).waitFor({ state: 'visible', timeout }),
    ),
  );
}

test.describe('Phase 3 Retention, Growth, Table Mode & Zero-PII Analytics', () => {
  test('Table Mode and Pass-the-Phone toggles render and work without horizontal overflow at 360px', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/');

    const consentScreen = page.getByTestId('consent-screen');
    if (await consentScreen.isVisible().catch(() => false)) {
      await page.getByTestId('consent-checkbox').check();
      await page.getByTestId('consent-accept').click();
      await page.getByTestId('home-screen').waitFor({ state: 'visible' });
    }

    await assertNoHorizontalOverflow(page, 'HomeScreen');

    await page.getByTestId('create-table-nav').click();
    await page.getByTestId('create-table-screen').waitFor({ state: 'visible' });
    await assertNoHorizontalOverflow(page, 'CreateTableScreen');

    // Table Mode toggle
    const tableModeSwitch = page.getByRole('switch', { name: /Table Mode/i });
    await expect(tableModeSwitch).toBeVisible();
    const tableModeBox = await tableModeSwitch.boundingBox();
    expect(tableModeBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    await expect(tableModeSwitch).toHaveAttribute('aria-checked', 'false');
    await tableModeSwitch.click();
    await expect(tableModeSwitch).toHaveAttribute('aria-checked', 'true');
    await assertNoHorizontalOverflow(page, 'CreateTableScreen (Table Mode ON)');

    // Pass-the-Phone toggle (if rendered on CreateTableScreen or HomeScreen)
    const passPhoneSwitch = page.getByRole('switch', { name: /Pass-the-Phone/i });
    if (await passPhoneSwitch.isVisible().catch(() => false)) {
      const passBox = await passPhoneSwitch.boundingBox();
      expect(passBox?.height ?? 0).toBeGreaterThanOrEqual(44);
      const before = await passPhoneSwitch.getAttribute('aria-checked');
      await passPhoneSwitch.click();
      const after = await passPhoneSwitch.getAttribute('aria-checked');
      expect(after).not.toBe(before);
      await assertNoHorizontalOverflow(page, 'CreateTableScreen (Pass-the-Phone toggled)');
    }
  });

  test('Podium Share Recap works at 360px and emitted analytics events contain zero PII', async ({
    browser,
  }) => {
    const bots = PLAYERS.map((name) => new BotPlayer({ name, viewport: { width: 360, height: 800 } }));
    const host = bots[0]!;
    const guests = bots.slice(1);
    const networkEvents: CapturedAnalyticsEvent[] = [];

    try {
      await Promise.all(bots.map((bot) => bot.init(browser)));
      await attachAnalyticsSpy(host.getPage(), networkEvents);

      await Promise.all(bots.map((bot) => bot.acceptConsentIfPresent()));

      const roomCode = await host.createRoom({ rounds: TOTAL_ROUNDS, quickPlay: true });
      await Promise.all(guests.map((bot) => bot.joinRoom(roomCode)));
      await Promise.all(bots.map((bot) => bot.toggleReady()));
      await expect(host.getPage().getByTestId('start-game-btn')).toBeEnabled();
      await host.startGame();

      for (let round = 1; round <= TOTAL_ROUNDS; round++) {
        await waitForAllTestId(bots, 'bottle-spin-screen');
        await waitForAllTestId(bots, 'chosen-screen');
        const performer = await findPerformerInChoose(bots);
        const choice: TurnChoice = round % 2 === 0 ? 'DARE' : 'TRUTH';
        await performer.choose(choice);

        await waitForAllTestId(bots, 'perform-screen');
        await performer.getPage().getByTestId('perform-done-btn').waitFor({ state: 'visible' });
        await performer.completePerform('DONE');

        await waitForAllTestId(bots, 'vote-screen');
        const witnesses = bots.filter((bot) => bot !== performer);
        await Promise.all(witnesses.map((witness) => witness.castVote('APPROVE')));

        await waitForAllTestId(bots, 'result-screen');
        await host.nextFromResult();
      }

      // Advance from Summary/Loot screen to Final Podium
      const continueToPodiumBtn = host.getPage().getByTestId('continue-to-podium-btn');
      await continueToPodiumBtn.waitFor({ state: 'visible', timeout: 20_000 });
      await continueToPodiumBtn.click();

      // Verify Podium & Share Recap at 360px
      await waitForAllTestId(bots, 'podium-screen');
      const hostPage = host.getPage();
      await assertNoHorizontalOverflow(hostPage, 'PodiumScreen');

      const shareRecapBtn = hostPage.getByTestId('share-recap-btn');
      await expect(shareRecapBtn).toBeVisible();
      const shareBox = await shareRecapBtn.boundingBox();
      expect(shareBox?.height ?? 0).toBeGreaterThanOrEqual(44);

      await shareRecapBtn.click();
      await assertNoHorizontalOverflow(hostPage, 'PodiumScreen after Share Recap');

      // Verify zero-PII across any captured analytics events
      const windowEvents = await collectWindowAnalyticsEvents(hostPage);
      const allEvents = [...networkEvents, ...windowEvents];
      assertZeroPiiInEvents(allEvents, [...PLAYERS, roomCode]);

      // If analytics buffer is wired, verify core lifecycle events were emitted
      if (allEvents.length > 0) {
        const names = new Set(allEvents.map((e) => e.name));
        const hasCreateEvent = names.has('room_created') || names.has('table_created');
        const hasJoinOrStart =
          names.has('room_joined') || names.has('table_joined') || names.has('game_started');
        expect(hasCreateEvent || hasJoinOrStart).toBe(true);
      }
    } finally {
      await Promise.all(bots.map((bot) => bot.close()));
    }
  });
});
