import { Monitor, Smartphone, Users } from 'lucide-react';
import {
  BottleSpinner,
  ElapsedStopwatch,
  OwlMascot,
  RadialTable,
  SurfaceCard,
  SyncIndicator,
  TimerRing,
  WaxSeal,
} from '../design';
import { useGameStore } from '../state/useGameStore';

export function TableModeScreen() {
  const room = useGameStore((s) => s.room)!;
  const players = useGameStore((s) => s.players);
  const presence = useGameStore((s) => s.presence);
  const turn = useGameStore((s) => s.turn);
  const votes = useGameStore((s) => s.votes);
  const chits = useGameStore((s) => s.chits);
  const auth = useGameStore((s) => s.auth);
  const syncState = useGameStore((s) => s.syncState);
  const clockOffsetMs = useGameStore((s) => s.clockOffsetMs);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const reducedMotionOverride = useGameStore((s) => s.reducedMotionOverride);
  const selectedSkin = useGameStore((s) => s.selectedSkin);
  const setTableDisplayActive = useGameStore((s) => s.setTableDisplayActive);

  const activePlayers = players
    .filter((p) => !p.banned && !p.spectator)
    .slice()
    .sort((a, b) => a.seat - b.seat);

  const mySeatIndex = Math.max(
    0,
    activePlayers.findIndex((p) => p.uid === auth?.uid),
  );
  const targetSeatIndex = turn
    ? Math.max(
        0,
        activePlayers.findIndex((p) => p.uid === turn.performerUid),
      )
    : null;

  const performer = turn ? activePlayers.find((p) => p.uid === turn.performerUid) : null;
  const readyCount = activePlayers.filter((p) => p.ready).length;
  const sealedCount = chits.filter((c) => c.status === 'SEALED').length;
  const witnessCount = Math.max(0, activePlayers.length - 1);

  const sortedLeaderboard = activePlayers
    .slice()
    .sort((a, b) => b.sessionScore - a.sessionScore || a.seat - b.seat);

  return (
    <main
      data-testid="table-mode-screen"
      className="lamplit-backdrop mx-auto flex min-h-dvh w-full max-w-[760px] flex-col justify-between gap-4 px-4 py-4"
      style={{
        paddingTop: 'calc(var(--safe-top) + 12px)',
        paddingBottom: 'calc(var(--safe-bottom) + 20px)',
      }}
    >
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 text-xs font-bold tracking-[0.18em] text-[var(--color-cream)] tabular-nums">
            <Monitor className="h-4 w-4 text-[#F4C97A]" aria-hidden="true" />
            TABLE {room.code}
          </span>
          <span className="tabular-nums text-xs font-semibold text-[var(--color-lamplit-muted)]">
            {room.round > 0 ? `Round ${room.round} / ${room.totalRounds}` : 'Lobby'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <SyncIndicator state={syncState} surface="lamplit" />
          <button
            type="button"
            data-testid="exit-table-mode-btn"
            onClick={() => setTableDisplayActive(false)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 text-xs font-semibold text-[var(--color-cream)]"
          >
            <Smartphone className="h-4 w-4" aria-hidden="true" />
            Controller View
          </button>
        </div>
      </header>

      {/* Main Shared-Screen Stage */}
      <div className="my-auto grid grid-cols-1 items-center gap-6 md:grid-cols-2">
        {/* Radial Table + Bottle */}
        <div className="flex justify-center">
          <RadialTable
            players={players}
            presence={presence}
            myUid={auth?.uid ?? null}
            hostUid={room.hostUid}
            activePerformerUid={
              turn && room.phase !== 'LOBBY' && room.phase !== 'WRITING'
                ? turn.performerUid
                : null
            }
            showReadyBadge={room.phase === 'LOBBY'}
            centerContent={
              room.phase === 'SPIN' && turn ? (
                <BottleSpinner
                  targetSeatIndex={targetSeatIndex}
                  mySeatIndex={mySeatIndex}
                  totalSeats={activePlayers.length}
                  deadlineAt={turn.deadlineAt}
                  clockOffsetMs={clockOffsetMs}
                  turnVersion={room.turnVersion}
                  soundEnabled={soundEnabled}
                  reducedMotionOverride={reducedMotionOverride}
                  skin={selectedSkin}
                />
              ) : (
                <div className="px-3 text-center">
                  <OwlMascot pose="idle" size="sm" />
                  <p className="mt-1 text-[11px] font-semibold tracking-wider text-[var(--color-lamplit-muted)] uppercase">
                    {room.phase}
                  </p>
                </div>
              )
            }
          />
        </div>

        {/* Live Phase / Timer / Result Card */}
        <SurfaceCard surface="lamplit" data-testid="table-mode-status-card" className="space-y-4 text-center">
          {room.phase === 'LOBBY' && (
            <>
              <h1 className="font-display text-2xl font-bold text-[var(--color-cream)]">
                Pull Up a Chair
              </h1>
              <p className="text-sm text-[var(--color-lamplit-muted)]">
                Join with code <strong className="tracking-[0.18em] text-[var(--color-cream)]">{room.code}</strong> on your phone to use it as a controller.
              </p>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-[#A7D7A6]">
                <Users className="h-4 w-4" aria-hidden="true" />
                <span>
                  {readyCount} / {activePlayers.length} ready ({activePlayers.length}/8 seats)
                </span>
              </div>
            </>
          )}

          {room.phase === 'WRITING' && (
            <>
              <h1 className="font-display text-2xl font-bold text-[var(--color-cream)]">
                Write Your Chits
              </h1>
              <p className="text-sm text-[var(--color-lamplit-muted)]">
                Submit truths &amp; dares on your phone. {sealedCount} sealed so far.
              </p>
              {turn?.deadlineAt && (
                <div className="flex justify-center">
                  <TimerRing
                    deadlineAt={turn.deadlineAt}
                    totalSec={room.settings.writingDeadlineSec}
                    clockOffsetMs={clockOffsetMs}
                    label="Writing time remaining"
                  />
                </div>
              )}
            </>
          )}

          {room.phase === 'SPIN' && (
            <>
              <h1 className="font-display text-2xl font-bold text-[var(--color-cream)]">
                Spinning the Bottle…
              </h1>
              <p className="text-sm text-[var(--color-lamplit-muted)]">
                Eyes on the table! Choosing the next performer.
              </p>
            </>
          )}

          {room.phase === 'CHOOSE' && turn && (
            <>
              <h1 className="font-display text-2xl font-bold text-[var(--color-cream)]">
                {performer?.name ?? 'Player'} is Choosing
              </h1>
              <p className="text-sm text-[var(--color-lamplit-muted)]">
                Truth or Dare? Decision on their phone.
              </p>
              <div className="flex justify-center">
                <TimerRing
                  deadlineAt={turn.deadlineAt}
                  totalSec={room.settings.chooseDeadlineSec}
                  clockOffsetMs={clockOffsetMs}
                  label="Choose time remaining"
                />
              </div>
            </>
          )}

          {room.phase === 'PERFORM' && turn && (
            <>
              <h1 className="font-display text-2xl font-bold text-[var(--color-cream)]">
                {performer?.name ?? 'Player'}&apos;s Turn
              </h1>
              <p className="text-sm font-semibold text-[#F4C97A]">
                {turn.kind === 'DARE' ? 'Performing a Dare' : 'Answering a Truth'}
              </p>
              <p className="text-xs text-[var(--color-lamplit-muted)]">
                Prompt stays secret on the performer&apos;s controller.
              </p>
              <div className="flex justify-center">
                <ElapsedStopwatch startedAt={turn.startedAt} clockOffsetMs={clockOffsetMs} />
              </div>
            </>
          )}

          {room.phase === 'VOTE' && turn && (
            <>
              <h1 className="font-display text-2xl font-bold text-[var(--color-cream)]">
                Table Vote Open
              </h1>
              <p className="text-sm text-[var(--color-lamplit-muted)]">
                Witnesses: cast Approve or Reject on your phones.
              </p>
              <p className="tabular-nums text-lg font-bold text-[var(--color-cream)]">
                {votes.length} / {witnessCount} votes cast
              </p>
              <div className="flex justify-center">
                <TimerRing
                  deadlineAt={turn.deadlineAt}
                  totalSec={room.settings.voteDeadlineSec}
                  clockOffsetMs={clockOffsetMs}
                  label="Vote time remaining"
                />
              </div>
            </>
          )}

          {room.phase === 'RESULT' && turn && (
            <div className="flex flex-col items-center gap-3">
              <WaxSeal stamp={turn.resultStamp ?? 'PASSED'} size="md" />
              {turn.sessionScoreDelta != null && (
                <p className="tabular-nums text-lg font-bold text-[#F4C97A]">
                  {turn.sessionScoreDelta >= 0
                    ? `+${turn.sessionScoreDelta}`
                    : turn.sessionScoreDelta}{' '}
                  pts for {performer?.name ?? 'Performer'}
                </p>
              )}
              {turn.owlLine && (
                <p className="text-sm italic text-[var(--color-lamplit-muted)]">
                  &ldquo;{turn.owlLine}&rdquo;
                </p>
              )}
            </div>
          )}

          {(room.phase === 'SUMMARY' || room.phase === 'PODIUM') && (
            <div className="space-y-3">
              <h1 className="font-display text-2xl font-bold text-[var(--color-cream)]">
                Final Standings
              </h1>
              <ul className="space-y-1.5 text-left">
                {sortedLeaderboard.slice(0, 4).map((p, idx) => (
                  <li
                    key={p.uid}
                    className="flex items-center justify-between rounded-[12px] border border-white/15 bg-white/5 px-3 py-2 text-sm text-[var(--color-cream)]"
                  >
                    <span className="truncate font-semibold">
                      #{idx + 1} {p.avatar} {p.name}
                    </span>
                    <span className="tabular-nums font-bold text-[#F4C97A]">
                      {p.sessionScore} pts
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SurfaceCard>
      </div>
    </main>
  );
}
