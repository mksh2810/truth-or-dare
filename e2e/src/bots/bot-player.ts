import type { Browser, BrowserContext, Page } from '@playwright/test';

export type VoteVerdict = 'APPROVE' | 'REJECT';
export type TurnChoice = 'TRUTH' | 'DARE';
export type DareType = 'INSTANT' | 'SOCIAL';

export interface BotPlayerOptions {
  name: string;
  baseUrl?: string;
}

/**
 * Headless Playwright bot representing one player in a multi-client Vowlet room.
 * Selectors are placeholders to be bound to Phase 1 `data-testid` / ARIA contracts.
 */
export class BotPlayer {
  readonly name: string;
  readonly baseUrl: string;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  constructor(options: BotPlayerOptions) {
    this.name = options.name;
    this.baseUrl = options.baseUrl ?? process.env.BASE_URL ?? 'http://localhost:5173';
  }

  /** Initializes an isolated browser context and page for this bot. */
  async init(browser: Browser): Promise<Page> {
    this.context = await browser.newContext({
      viewport: { width: 360, height: 800 },
    });
    this.page = await this.context.newPage();
    await this.page.goto(this.baseUrl);
    return this.page;
  }

  getPage(): Page {
    if (!this.page) {
      throw new Error(`BotPlayer(${this.name}) has not been initialized. Call init() first.`);
    }
    return this.page;
  }

  /** Accepts first-run 18+ self-declaration & table rules consent screen if shown. */
  async acceptConsentIfPresent(): Promise<void> {
    const page = this.getPage();
    // TODO(Phase 1): Bind to consent screen testid/role once FE2 implements it.
    const consentBtn = page.getByTestId('consent-accept');
    if (await consentBtn.isVisible().catch(() => false)) {
      await consentBtn.click();
    }
  }

  /** Joins an existing room by code. */
  async joinRoom(roomCode: string): Promise<void> {
    const page = this.getPage();
    // TODO(Phase 1): Bind to Join Table form selectors.
    await page.getByTestId('join-room-code').fill(roomCode);
    await page.getByTestId('join-player-name').fill(this.name);
    await page.getByTestId('join-submit').click();
  }

  /** Toggles ready state in the Lobby. */
  async toggleReady(): Promise<void> {
    const page = this.getPage();
    // TODO(Phase 1): Bind to Lobby ready toggle.
    await page.getByTestId('lobby-ready-toggle').click();
  }

  /** Submits a chit during the WRITING phase. */
  async submitChit(text: string, dareType: DareType = 'INSTANT'): Promise<void> {
    const page = this.getPage();
    // TODO(Phase 1): Bind to Write Chits screen selectors.
    await page.getByTestId('chit-input').fill(text);
    await page.getByTestId(`chit-dare-type-${dareType.toLowerCase()}`).click();
    await page.getByTestId('chit-submit').click();
  }

  /** Chooses Truth or Dare when selected as performer in CHOOSE phase. */
  async choose(choice: TurnChoice): Promise<void> {
    const page = this.getPage();
    // TODO(Phase 1): Bind to Chosen screen selectors.
    await page.getByTestId(`choose-${choice.toLowerCase()}`).click();
  }

  /** Marks performance complete or skips during PERFORM phase. */
  async completePerform(action: 'DONE' | 'SKIP' = 'DONE'): Promise<void> {
    const page = this.getPage();
    // TODO(Phase 1): Bind to Unseal/Perform screen selectors.
    await page.getByTestId(`perform-${action.toLowerCase()}`).click();
  }

  /** Casts Approve or Reject vote during VOTE phase. */
  async castVote(verdict: VoteVerdict): Promise<void> {
    const page = this.getPage();
    // TODO(Phase 1): Bind to Vote screen selectors (Approve / Reject).
    await page.getByTestId(`vote-${verdict.toLowerCase()}`).click();
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
