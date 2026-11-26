import type { Browser, BrowserContext, Page } from '@playwright/test';

export type VoteVerdict = 'APPROVE' | 'REJECT';
export type TurnChoice = 'TRUTH' | 'DARE';
export type DareType = 'INSTANT' | 'SOCIAL';

export interface BotPlayerOptions {
  name: string;
  baseUrl?: string;
  viewport?: { width: number; height: number };
}

export interface CreateRoomOptions {
  rounds?: 5 | 10 | 15;
  quickPlay?: boolean;
}

/**
 * Headless Playwright bot representing one player in a multi-client Vowlet room.
 * Bound to Phase 1 `data-testid` / role / text contracts.
 */
export class BotPlayer {
  readonly name: string;
  readonly baseUrl: string;
  readonly viewport: { width: number; height: number };
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private consoleErrors: string[] = [];
  private pageErrors: string[] = [];

  constructor(options: BotPlayerOptions) {
    this.name = options.name;
    this.baseUrl = options.baseUrl ?? process.env.BASE_URL ?? 'http://localhost:5173';
    this.viewport = options.viewport ?? { width: 360, height: 800 };
  }

  /** Initializes an isolated browser context and page for this bot. */
  async init(browser: Browser): Promise<Page> {
    this.consoleErrors = [];
    this.pageErrors = [];
    this.context = await browser.newContext({
      viewport: this.viewport,
    });
    this.page = await this.context.newPage();
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        this.consoleErrors.push(msg.text());
      }
    });
    this.page.on('pageerror', (err) => {
      this.pageErrors.push(err.message);
    });
    await this.page.goto(this.baseUrl);
    return this.page;
  }

  getPage(): Page {
    if (!this.page) {
      throw new Error(`BotPlayer(${this.name}) has not been initialized. Call init() first.`);
    }
    return this.page;
  }

  getErrors(): { consoleErrors: string[]; pageErrors: string[] } {
    return {
      consoleErrors: [...this.consoleErrors],
      pageErrors: [...this.pageErrors],
    };
  }

  /** Accepts first-run 18+ self-declaration & table rules consent screen if shown. */
  async acceptConsentIfPresent(): Promise<void> {
    const page = this.getPage();
    const consentScreen = page.getByTestId('consent-screen');
    if (await consentScreen.isVisible().catch(() => false)) {
      const checkbox = page.getByTestId('consent-checkbox');
      if (!(await checkbox.isChecked())) {
        await checkbox.check();
      }
      await page.getByTestId('consent-accept').click();
      await page.getByTestId('home-screen').waitFor({ state: 'visible' });
    }
  }

  /** Navigates from Home -> Create Table, configures options, creates room, and returns room code. */
  async createRoom(options: CreateRoomOptions = {}): Promise<string> {
    const page = this.getPage();
    await page.getByTestId('create-table-nav').click();
    await page.getByTestId('create-table-screen').waitFor({ state: 'visible' });

    await page.getByTestId('create-name-input').fill(this.name);

    if (options.rounds !== undefined) {
      const labelMap: Record<5 | 10 | 15, string> = {
        5: 'Short (5)',
        10: 'Standard (10)',
        15: 'Long (15)',
      };
      await page.getByRole('button', { name: labelMap[options.rounds] }).click();
    }

    if (options.quickPlay !== undefined) {
      const toggle = page.getByTestId('create-quickplay-toggle');
      const checked = await toggle.getAttribute('aria-checked');
      if ((checked === 'true') !== options.quickPlay) {
        await toggle.click();
      }
    }

    await page.getByTestId('create-submit-btn').click();
    await page.getByTestId('lobby-screen').waitFor({ state: 'visible' });
    const code = (await page.getByTestId('room-code-text').textContent())?.trim() ?? '';
    if (!code) {
      throw new Error(`BotPlayer(${this.name}) failed to read room code from lobby`);
    }
    return code;
  }

  /** Navigates to Join Table (if on Home) and joins an existing room by code. */
  async joinRoom(roomCode: string): Promise<void> {
    const page = this.getPage();
    const joinNav = page.getByTestId('join-table-nav');
    if (await joinNav.isVisible().catch(() => false)) {
      await joinNav.click();
    }
    await page.getByTestId('join-table-screen').waitFor({ state: 'visible' });
    await page.getByTestId('join-code-input').fill(roomCode);
    await page.getByTestId('join-name-input').fill(this.name);
    await page.getByTestId('join-submit-btn').click();
    await page.getByTestId('lobby-screen').waitFor({ state: 'visible' });
  }

  /** Toggles ready state in the Lobby. */
  async toggleReady(): Promise<void> {
    const page = this.getPage();
    await page.getByTestId('ready-toggle-btn').click();
  }

  /** Starts the game from the Lobby (host only). */
  async startGame(): Promise<void> {
    const page = this.getPage();
    const startBtn = page.getByTestId('start-game-btn');
    await startBtn.waitFor({ state: 'visible' });
    await startBtn.click();
  }

  /** Submits a chit during the WRITING phase. */
  async submitChit(
    text: string,
    dareType: DareType = 'INSTANT',
    kind: TurnChoice = 'DARE',
  ): Promise<void> {
    const page = this.getPage();
    await page.getByTestId(`chit-kind-${kind.toLowerCase()}`).click();
    if (kind === 'DARE') {
      const dareLabel = dareType === 'INSTANT' ? 'Instant (at table)' : 'Social (phone/call)';
      await page.getByRole('button', { name: dareLabel }).click();
    }
    await page.getByTestId('chit-textarea').fill(text);
    await page.getByTestId('seal-chit-btn').click();
  }

  /** Chooses Truth or Dare when selected as performer in CHOOSE phase. */
  async choose(choice: TurnChoice): Promise<void> {
    const page = this.getPage();
    await page.getByTestId(`choose-${choice.toLowerCase()}-btn`).click();
  }

  /** Marks performance complete, swaps, or skips during PERFORM phase. */
  async completePerform(action: 'DONE' | 'SKIP' | 'SWAP' = 'DONE'): Promise<void> {
    const page = this.getPage();
    await page.getByTestId(`perform-${action.toLowerCase()}-btn`).click();
  }

  /** Casts Approve or Reject vote during VOTE phase. */
  async castVote(verdict: VoteVerdict): Promise<void> {
    const page = this.getPage();
    await page.getByTestId(`vote-${verdict.toLowerCase()}-btn`).click();
  }

  /** Advances from RESULT screen to next turn or podium. */
  async nextFromResult(): Promise<void> {
    const page = this.getPage();
    await page.getByTestId('result-next-btn').click();
  }

  /** Simulates network offline/online state for chaos testing. */
  async setOffline(offline: boolean): Promise<void> {
    if (!this.context) {
      throw new Error(`BotPlayer(${this.name}) has no active context.`);
    }
    await this.context.setOffline(offline);
  }

  /** Closes the bot's isolated browser context. */
  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
      this.page = null;
    }
  }
}
