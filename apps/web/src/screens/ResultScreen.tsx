import { useEffect } from 'react';
import { Flame } from 'lucide-react';
import { SyncIndicator, TimerRing, playStampSound } from '../design';
import {
  BotanicalLayer,
  OwlArtwork,
  TopBar,
  WaxSealArtwork,
} from '../design/VowletUiPrimitives';
import { useGameStore } from '../state/useGameStore';

export function ResultScreen() {
  const room = useGameStore((s) => s.room)!;
  const turn = useGameStore((s) => s.turn)!;
  const players = useGameStore((s) => s.players);
  const syncState = useGameStore((s) => s.syncState);
  const clockOffsetMs = useGameStore((s) => s.clockOffsetMs);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const advanceTurn = useGameStore((s) => s.advanceTurn);

  const stamp = turn.resultStamp ?? 'PASSED';
  const delta = turn.sessionScoreDelta ?? 0;
  const performer = players.find((p) => p.uid === turn.performerUid);
  const isFinalRound = room.round >= room.totalRounds;

  useEffect(() => {
    playStampSound(soundEnabled, stamp === 'PASSED' || stamp === 'SPLIT');
  }, [soundEnabled, stamp, room.turnVersion]);

  const sealColor: 'green' | 'brass' | 'red' =
    stamp === 'PASSED' ? 'green' : stamp === 'SPLIT' ? 'brass' : 'red';
  const deltaLabel = delta > 0 ? `+${delta} XP` : `${delta} XP`;

  return (
    <main className="vowlet-shell" data-testid="result-screen">
      <div className="bg-parchment flex min-h-dvh flex-col pb-5">
        <BotanicalLayer />

        <TopBar
          rightSlot={
            <div className="flex items-center gap-2">
              <TimerRing
                deadlineAt={turn.deadlineAt}
                totalSec={6}
                clockOffsetMs={clockOffsetMs}
                size={38}
                onExpire={() => void advanceTurn()}
              />
              <SyncIndicator state={syncState} />
            </div>
          }
        />

        {/* Laurel Wreath + Large Embossed Verdict Wax Seal */}
        <section
          className="relative z-10 mt-4 flex flex-col items-center justify-center px-5"
          aria-live="polite"
        >
          <div className="relative flex h-[200px] w-[220px] items-center justify-center">
            {/* Laurel Wreath SVG */}
            <svg
              viewBox="0 0 220 200"
              className="pointer-events-none absolute inset-0 h-full w-full opacity-80"
              aria-hidden="true"
            >
              <g stroke="#7A865F" strokeWidth="1.8" fill="#8C996E" fillOpacity="0.45">
                <path d="M56 156 C24 128 24 72 64 36" fill="none" />
                <ellipse cx="42" cy="136" rx="12" ry="5" transform="rotate(-35 42 136)" />
                <ellipse cx="32" cy="112" rx="12" ry="5" transform="rotate(-18 32 112)" />
                <ellipse cx="32" cy="86" rx="12" ry="5" transform="rotate(6 32 86)" />
                <ellipse cx="42" cy="60" rx="12" ry="5" transform="rotate(28 42 60)" />
                <ellipse cx="60" cy="40" rx="11" ry="4.5" transform="rotate(45 60 40)" />

                <path d="M164 156 C196 128 196 72 156 36" fill="none" />
                <ellipse cx="178" cy="136" rx="12" ry="5" transform="rotate(35 178 136)" />
                <ellipse cx="188" cy="112" rx="12" ry="5" transform="rotate(18 188 112)" />
                <ellipse cx="188" cy="86" rx="12" ry="5" transform="rotate(-6 188 86)" />
                <ellipse cx="178" cy="60" rx="12" ry="5" transform="rotate(-28 178 60)" />
                <ellipse cx="160" cy="40" rx="11" ry="4.5" transform="rotate(-45 160 40)" />
              </g>
            </svg>

            <WaxSealArtwork
              color={sealColor}
              label={stamp}
              size={156}
              className="-rotate-6 drop-shadow-[0_10px_18px_rgba(48,25,14,0.3)]"
            />
          </div>

          <div
            className="font-cormorant mt-2 text-[34px] leading-none font-bold text-[#9f3322]"
            data-testid="result-score-delta"
          >
            {deltaLabel}
          </div>

          {(performer?.streak ?? 0) > 0 && (
            <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-[#d5ad76] bg-[#fbf0dc] px-4 py-1.5 text-sm font-bold text-[#75451f] shadow-sm">
              <Flame size={15} className="text-[#c4552d]" aria-hidden="true" />
              <span>Streak +{performer?.streak}</span>
            </div>
          )}
        </section>

        {/* Peeking Owl + Parchment Speech Bubble */}
        <section className="relative z-10 mt-auto flex items-end gap-2 px-4 pt-4 pb-4">
          <div className="-ml-2 shrink-0">
            <OwlArtwork className="h-[118px] w-[112px] drop-shadow-[0_6px_10px_rgba(45,27,13,0.22)]" />
          </div>

          <div className="chit-card relative mb-4 flex-1 rounded-2xl p-3.5">
            <p className="font-cormorant text-[18px] leading-snug font-semibold text-[#2b1d12]">
              {turn.owlLine || 'Bold choice! The table has spoken.'}
            </p>
          </div>
        </section>

        <div className="relative z-10 px-5">
          <button
            type="button"
            className="btn-teal w-full"
            data-testid="result-next-btn"
            onClick={() => void advanceTurn()}
          >
            <span>{isFinalRound ? 'View Summary' : 'Next Turn'}</span>
          </button>
        </div>
      </div>
    </main>
  );
}
