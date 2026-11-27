import { SyncIndicator, TimerRing } from '../design';
import { BotanicalLayer, OwlArtwork, TopBar } from '../design/VowletUiPrimitives';
import { useGameStore } from '../state/useGameStore';

export function ChosenScreen() {
  const room = useGameStore((s) => s.room)!;
  const turn = useGameStore((s) => s.turn)!;
  const players = useGameStore((s) => s.players);
  const auth = useGameStore((s) => s.auth);
  const syncState = useGameStore((s) => s.syncState);
  const clockOffsetMs = useGameStore((s) => s.clockOffsetMs);
  const choosePromptKind = useGameStore((s) => s.choosePromptKind);
  const advanceTurn = useGameStore((s) => s.advanceTurn);
  const pendingAction = useGameStore((s) => s.pendingAction);

  const isPerformer = auth?.uid === turn.performerUid;
  const performer = players.find((p) => p.uid === turn.performerUid);

  return (
    <main className="vowlet-shell" data-testid="chosen-screen">
      <div className="bg-wood-candle flex min-h-dvh flex-col pb-7">
        <BotanicalLayer darkMode />

        {/* Floating Sparkles */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
          <span className="sparkle-float absolute top-20 left-8 text-lg text-[#f4d284]">✦</span>
          <span
            className="sparkle-float absolute top-28 right-10 text-sm text-[#f4d284]"
            style={{ animationDelay: '0.7s' }}
          >
            ✦
          </span>
          <span
            className="sparkle-float absolute bottom-24 left-12 text-xs text-[#f4d284]"
            style={{ animationDelay: '1.3s' }}
          >
            ✦
          </span>
          <span
            className="sparkle-float absolute right-8 bottom-32 text-base text-[#f4d284]"
            style={{ animationDelay: '1.8s' }}
          >
            ✦
          </span>
        </div>

        <TopBar
          dark
          rightSlot={
            <div className="flex items-center gap-2">
              <TimerRing
                deadlineAt={turn.deadlineAt}
                totalSec={room.settings.chooseDeadlineSec}
                clockOffsetMs={clockOffsetMs}
                surface="lamplit"
                size={40}
                onExpire={() => void advanceTurn()}
              />
              <SyncIndicator state={syncState} surface="lamplit" />
            </div>
          }
        />

        {isPerformer ? (
          <div className="relative z-10 flex flex-1 flex-col justify-between px-4 pt-6">
            <div className="text-center">
              <span className="sparkle-float inline-block text-xl text-[#f4d284]" aria-hidden="true">
                ✦
              </span>
              <h1 className="font-cormorant mt-1 text-[34px] leading-tight font-bold text-[#faeed7] italic">
                You&apos;ve been chosen!
              </h1>
              <p className="font-cormorant mt-1 text-[17px] text-[#e5cfa9]">
                Auto-selects Truth if timer runs out.
              </p>
            </div>

            <div className="my-auto grid grid-cols-2 gap-3.5 py-6">
              <button
                type="button"
                className="tarot-card tarot-truth h-[272px] w-full"
                disabled={pendingAction}
                data-testid="choose-truth-btn"
                onClick={() => void choosePromptKind('TRUTH')}
              >
                <div className="tarot-inner">
                  <span className="text-[11px] tracking-[0.2em] text-[#e6be6c]/75" aria-hidden="true">
                    ✦
                  </span>
                  <svg width="46" height="46" viewBox="0 0 24 24" className="my-3" aria-hidden="true">
                    <path
                      d="M20.2 3.8C15.4 3.4 9.5 7.4 6.8 12.8L4 20l7.2-2.8c5.4-2.7 9.4-8.6 9-13.4zM9.2 15.8l-2.6 1 1-2.6"
                      fill="url(#goldQuillGrad)"
                    />
                  </svg>
                  <span className="font-cinzel text-[20px] font-extrabold tracking-[0.14em] text-[#faeed7]">
                    TRUTH
                  </span>
                  <span className="font-cormorant mt-2 text-[16px] leading-tight text-[#e8d5b3] italic">
                    Reveal what lies beneath.
                  </span>
                </div>
              </button>

              <button
                type="button"
                className="tarot-card tarot-dare h-[272px] w-full"
                disabled={pendingAction}
                data-testid="choose-dare-btn"
                onClick={() => void choosePromptKind('DARE')}
              >
                <div className="tarot-inner">
                  <span className="text-[11px] tracking-[0.2em] text-[#e6be6c]/75" aria-hidden="true">
                    ✦
                  </span>
                  <svg width="46" height="46" viewBox="0 0 24 24" className="my-3" aria-hidden="true">
                    <path
                      d="M12.5 2c.6 3.5-2 5.4-2 8.2 0 1.4 1 2.5 2.4 2.5 1.8 0 2.9-1.7 2.4-4 2.5 2.1 3.7 4.7 3.7 7.3 0 3.7-3 6.5-7 6.5s-7-2.8-7-6.5c0-3.4 2.2-6.5 4.9-8.8 1-.9 2-2.8 2.6-5.2z"
                      fill="url(#goldFlameGrad)"
                    />
                  </svg>
                  <span className="font-cinzel text-[20px] font-extrabold tracking-[0.14em] text-[#faeed7]">
                    DARE
                  </span>
                  <span className="font-cormorant mt-2 text-[16px] leading-tight text-[#f3d4b8] italic">
                    Make the evening memorable.
                  </span>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div
            className="relative z-10 flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center"
            aria-live="polite"
          >
            <OwlArtwork className="h-[170px] w-[170px] drop-shadow-[0_14px_20px_rgba(0,0,0,0.55)]" />
            <h1 className="font-cormorant text-[32px] leading-tight font-bold text-[#faeed7] italic">
              {performer?.name ?? 'Player'} is choosing...
            </h1>
            <p className="font-cormorant text-[18px] text-[#e5cfa9]">
              Truth or Dare? Stay tuned.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
