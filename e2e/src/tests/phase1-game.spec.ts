import { expect, test } from '@playwright/test';
import { BotPlayer, type TurnChoice } from '../bots/bot-player';

const PLAYERS = ['Aria', 'Kabir', 'Meera', 'Dev'] as const;
const TOTAL_ROUNDS = 5;

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

/**
 * Asserts zero unexpected console/page errors.
 * Concurrent clients calling /api/turn/advance or /api/room/settings can receive expected
 * 409 Conflict responses (VERSION_MISMATCH or DEADLINE_NOT_REACHED) from the server arbiter.
 */
function assertNoUnexpectedErrors(bots: BotPlayer[]): void {
  for (const bot of bots) {
    const { consoleErrors, pageErrors } = bot.getErrors();
    const unexpectedConsoleErrors = consoleErrors.filter(
      (msg) => !msg.includes('status of 409 (Conflict)'),
    );
    const unexpectedPageErrors = pageErrors.filter(
      (msg) =>
        !/^Expected phase \w+ v\d+, got \w+ v\d+$/.test(msg) &&
        !/deadline has not been reached yet/i.test(msg),
    );
    expect(unexpectedConsoleErrors, `Console errors for ${bot.name}`).toEqual([]);
    expect(unexpectedPageErrors, `Page errors for ${bot.name}`).toEqual([]);
  }
}

test.describe('Phase 1 Core In-Person Loop', () => {
  test('4-client full Quick Play game (5 rounds) from Consent to Podium with zero errors', async ({
    browser,
  }) => {
    const bots = PLAYERS.map((name) => new BotPlayer({ name }));
    const host = bots[0]!;
    const guests = bots.slice(1);

    try {
      // 1. Initialize 4 isolated BrowserContexts and accept 18+ consent
      await Promise.all(bots.map((bot) => bot.init(browser)));
      await Promise.all(bots.map((bot) => bot.acceptConsentIfPresent()));

      // 2. Host creates a 5-round Quick Play table; 3 other players join
      const roomCode = await host.createRoom({ rounds: TOTAL_ROUNDS, quickPlay: true });
      await Promise.all(guests.map((bot) => bot.joinRoom(roomCode)));

      // 3. All 4 players mark ready; host starts the game
      await Promise.all(bots.map((bot) => bot.toggleReady()));
      await expect(host.getPage().getByTestId('start-game-btn')).toBeEnabled();
      await host.startGame();

      // 4. Play 5 full turns: Spin -> Choose -> Perform -> Vote -> Result
      for (let round = 1; round <= TOTAL_ROUNDS; round++) {
        // SPIN
        await waitForAllTestId(bots, 'bottle-spin-screen');

        // CHOOSE (auto-advances after spin deadline)
        await waitForAllTestId(bots, 'chosen-screen');
        const performer = await findPerformerInChoose(bots);
        const choice: TurnChoice = round % 2 === 0 ? 'DARE' : 'TRUTH';
        await performer.choose(choice);

        // PERFORM
        await waitForAllTestId(bots, 'perform-screen');
        await performer.getPage().getByTestId('perform-done-btn').waitFor({ state: 'visible' });
        await performer.completePerform('DONE');

        // VOTE (all 3 witnesses approve -> auto-advances to RESULT)
        await waitForAllTestId(bots, 'vote-screen');
        const witnesses = bots.filter((bot) => bot !== performer);
        await Promise.all(witnesses.map((witness) => witness.castVote('APPROVE')));

        // RESULT -> advance to next turn or podium
        await waitForAllTestId(bots, 'result-screen');
        await host.nextFromResult();
      }

      // 5. Summary / Podium rendered for all 4 players
      await waitForAllTestId(bots, 'podium-screen');
      for (const bot of bots) {
        await expect(bot.getPage().getByTestId('podium-screen')).toBeVisible();
        await expect(bot.getPage().getByText('Final Podium')).toBeVisible();
      }

      // 6. Zero unexpected console/page errors across all 4 contexts
      assertNoUnexpectedErrors(bots);
    } finally {
      await Promise.all(bots.map((bot) => bot.close()));
    }
  });

  test('Bottle target consistency across 360x800, 390x844, and 430x932 viewports', async ({
    browser,
  }) => {
    const deviceConfigs = [
      { name: 'Aria', viewport: { width: 360, height: 800 } },
      { name: 'Kabir', viewport: { width: 390, height: 844 } },
      { name: 'Meera', viewport: { width: 430, height: 932 } },
    ];
    const bots = deviceConfigs.map((cfg) => new BotPlayer(cfg));
    const host = bots[0]!;
    const guests = bots.slice(1);

    try {
      await Promise.all(
        bots.map(async (bot) => {
          const page = await bot.init(browser);
          // Reduced motion snaps the bottle immediately so "The bottle has chosen {name}" is
          // deterministically visible before the 4.5s SPIN deadline auto-advances to CHOOSE.
          await page.emulateMedia({ reducedMotion: 'reduce' });
        }),
      );
      await Promise.all(bots.map((bot) => bot.acceptConsentIfPresent()));

      const roomCode = await host.createRoom({ rounds: 5, quickPlay: true });
      await Promise.all(guests.map((bot) => bot.joinRoom(roomCode)));

      await Promise.all(bots.map((bot) => bot.toggleReady()));
      await expect(host.getPage().getByTestId('start-game-btn')).toBeEnabled();
      await host.startGame();

      await waitForAllTestId(bots, 'bottle-spin-screen');

      const chosenTexts = await Promise.all(
        bots.map(async (bot) => {
          const chosenBanner = bot.getPage().getByText(/The bottle has chosen .+/);
          await chosenBanner.waitFor({ state: 'visible', timeout: 15_000 });
          return (await chosenBanner.textContent())?.trim() ?? '';
        }),
      );

      expect(chosenTexts[0]).toMatch(/^The bottle has chosen (Aria|Kabir|Meera)$/);
      expect(chosenTexts[1]).toBe(chosenTexts[0]);
      expect(chosenTexts[2]).toBe(chosenTexts[0]);

      assertNoUnexpectedErrors(bots);
    } finally {
      await Promise.all(bots.map((bot) => bot.close()));
    }
  });
});
