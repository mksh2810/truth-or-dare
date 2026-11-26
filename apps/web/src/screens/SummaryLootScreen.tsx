import { motion } from 'framer-motion';
import { Award, Bookmark, Check, Lock, Sparkles, Trophy } from 'lucide-react';
import { calculateLevel, xpForLevel } from '@vowlet/shared';
import { BOTTLE_SKINS, Button, OwlMascot, SurfaceCard, type BottleSkinId } from '../design';
import { useGameStore } from '../state/useGameStore';

export function SummaryLootScreen() {
  const room = useGameStore((s) => s.room);
  const players = useGameStore((s) => s.players);
  const auth = useGameStore((s) => s.auth);
  const lifetimeXp = useGameStore((s) => s.lifetimeXp);
  const skins = useGameStore((s) => s.skins);
  const selectedSkin = useGameStore((s) => s.selectedSkin);
  const setSelectedSkin = useGameStore((s) => s.setSelectedSkin);
  const savedTables = useGameStore((s) => s.savedTables);
  const saveCurrentTable = useGameStore((s) => s.saveCurrentTable);
  const advanceTurn = useGameStore((s) => s.advanceTurn);
  const setPodiumSubView = useGameStore((s) => s.setPodiumSubView);
  const showToast = useGameStore((s) => s.showToast);

  const me = players.find((p) => p.uid === auth?.uid);
  const sessionXp = Math.max(0, me?.sessionScore ?? 0);
  const projectedLifetimeXp = lifetimeXp + sessionXp;
  const currentLevel = calculateLevel(lifetimeXp);
  const projectedLevel = calculateLevel(projectedLifetimeXp);
  const leveledUp = projectedLevel > currentLevel;

  const floorXp = xpForLevel(projectedLevel);
  const nextLevelXp = xpForLevel(projectedLevel + 1);
  const levelSpan = Math.max(1, nextLevelXp - floorXp);
  const progressPct = Math.min(
    100,
    Math.max(0, Math.round(((projectedLifetimeXp - floorXp) / levelSpan) * 100)),
  );

  const isSkinUnlocked = (skinId: BottleSkinId, unlockLevel: number) =>
    skinId === 'amber' || skins.includes(skinId) || projectedLevel >= unlockLevel;

  const handleContinueToPodium = () => {
    if (room?.phase === 'SUMMARY') {
      void advanceTurn();
    } else {
      setPodiumSubView('PODIUM');
    }
  };

  return (
    <main
      data-testid="summary-loot-screen"
      className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col gap-4 px-4 py-5"
      style={{
        paddingTop: 'calc(var(--safe-top) + 16px)',
        paddingBottom: 'calc(var(--safe-bottom) + 24px)',
      }}
    >
      <header className="flex flex-col items-center text-center">
        <OwlMascot pose="approve" size="sm" />
        <h1 className="font-display mt-2 text-3xl font-bold">Table Summary &amp; Loot</h1>
        {room && (
          <p className="text-xs opacity-75">
            Table {room.code} • {room.totalRounds} Rounds
          </p>
        )}
      </header>

      {/* Level-up & Session-to-Lifetime XP Breakdown */}
      <SurfaceCard data-testid="xp-breakdown-card" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <motion.div
              initial={{ scale: 0.85, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              data-testid="level-badge"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-black/15 bg-[var(--color-linen)] px-3.5 py-1.5 text-sm font-bold text-[var(--color-brass-text)]"
            >
              <Award className="h-4 w-4" aria-hidden="true" />
              <span>Level {projectedLevel}</span>
            </motion.div>

            {leveledUp && (
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.35, delay: 0.1 }}
                data-testid="level-up-pill"
                className="inline-flex items-center gap-1 rounded-full bg-[var(--color-sage)] px-2.5 py-1 text-xs font-bold text-[var(--color-cream)]"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Level Up!
              </motion.span>
            )}
          </div>

          <span className="tabular-nums text-xs font-semibold opacity-75">
            {projectedLifetimeXp} / {nextLevelXp} XP
          </span>
        </div>

        {/* Exponential XP Progress Bar */}
        <div
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Lifetime XP progress to next level"
          className="h-3 w-full overflow-hidden rounded-full border border-black/15 bg-[var(--color-linen)]"
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full rounded-full bg-[var(--color-brass)]"
          />
        </div>

        {/* Breakdown Grid */}
        <div className="grid grid-cols-3 gap-2 pt-1 text-center">
          <div className="rounded-[12px] border border-black/10 bg-[var(--color-linen)] p-2">
            <p className="text-[11px] font-medium opacity-70">Previous</p>
            <p className="tabular-nums text-sm font-bold">{lifetimeXp} XP</p>
          </div>
          <div className="rounded-[12px] border border-black/10 bg-[var(--color-linen)] p-2">
            <p className="text-[11px] font-medium opacity-70">Session</p>
            <p className="tabular-nums text-sm font-bold text-[var(--color-sage-text)]">
              +{sessionXp} XP
            </p>
          </div>
          <div className="rounded-[12px] border border-black/10 bg-[var(--color-linen)] p-2">
            <p className="text-[11px] font-medium opacity-70">Lifetime</p>
            <p className="tabular-nums text-sm font-bold text-[var(--color-brass-text)]">
              {projectedLifetimeXp} XP
            </p>
          </div>
        </div>
        <p className="text-[11px] opacity-70">
          Lifetime XP is verified server-side from completed turn records at game end.
        </p>
      </SurfaceCard>

      {/* Bottle Skins Selector */}
      <SurfaceCard data-testid="bottle-skins-card" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Bottle Skins</h2>
          <span className="text-xs font-semibold opacity-70">
            {BOTTLE_SKINS.filter((s) => isSkinUnlocked(s.id, s.unlockLevel)).length}/
            {BOTTLE_SKINS.length} unlocked
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {BOTTLE_SKINS.map((skin) => {
            const unlocked = isSkinUnlocked(skin.id, skin.unlockLevel);
            const active = selectedSkin === skin.id;

            return (
              <button
                key={skin.id}
                type="button"
                data-testid={`skin-option-${skin.id}`}
                aria-pressed={active}
                disabled={!unlocked}
                onClick={() => {
                  if (!unlocked) return;
                  setSelectedSkin(skin.id);
                  showToast(`${skin.name} equipped!`, 'success');
                }}
                className="flex min-h-[76px] items-center gap-2.5 rounded-[14px] p-2.5 text-left transition-colors disabled:opacity-60"
                style={{
                  backgroundColor: active ? 'var(--color-ink)' : 'var(--color-linen)',
                  color: active ? 'var(--color-cream)' : 'var(--color-ink)',
                  border: active
                    ? '2px solid var(--color-brass)'
                    : 'var(--border-ink-hairline)',
                }}
              >
                {/* Mini Bottle Preview */}
                <svg
                  width="20"
                  height="42"
                  viewBox="0 0 44 104"
                  fill="none"
                  aria-hidden="true"
                  className="shrink-0"
                >
                  <rect x="17" y="4" width="10" height="8" rx="2" fill={skin.capFill} />
                  <path
                    d="M17 12 L27 12 L28 32 L35 44 L35 92 C35 96.5 31.5 100 27 100 L17 100 C12.5 100 9 96.5 9 92 L9 44 L16 32 Z"
                    fill={skin.bodyFill}
                  />
                  <rect x="12" y="54" width="20" height="26" rx="4" fill="#F6F1E9" />
                  <circle cx="22" cy="67" r="5" fill={skin.sealFill} />
                </svg>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-xs font-bold">{skin.name}</span>
                    {active ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-[var(--color-brass)]" aria-hidden="true" />
                    ) : !unlocked ? (
                      <Lock className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[11px] opacity-75">
                    {unlocked ? (active ? 'Equipped' : 'Tap to equip') : `Lv ${skin.unlockLevel}`}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </SurfaceCard>

      {/* Saved Table History */}
      <SurfaceCard data-testid="saved-tables-history" className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-xl font-bold">Table History</h2>
          {room && (
            <button
              type="button"
              data-testid="summary-save-table-btn"
              onClick={saveCurrentTable}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-black/15 bg-[var(--color-linen)] px-3 text-xs font-semibold"
            >
              <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
              Save Table
            </button>
          )}
        </div>

        {savedTables.length === 0 ? (
          <p className="text-xs opacity-70">
            No saved tables yet. Save this table to keep your night&apos;s record.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {savedTables.slice(0, 5).map((entry) => (
              <li
                key={`${entry.code}-${entry.dateIso}`}
                className="flex items-center justify-between rounded-[12px] border border-black/10 bg-[var(--color-linen)] px-3 py-2 text-xs"
              >
                <div>
                  <span className="font-bold tracking-wider">{entry.code}</span>
                  <span className="mx-1.5 opacity-50">•</span>
                  <span>Winner: {entry.winnerName}</span>
                </div>
                <span className="tabular-nums font-bold text-[var(--color-brass-text)]">
                  {entry.myScore} pts
                </span>
              </li>
            ))}
          </ul>
        )}
      </SurfaceCard>

      <Button
        variant="primary-dare"
        fullWidth
        data-testid="continue-to-podium-btn"
        onClick={handleContinueToPodium}
      >
        <Trophy className="h-4 w-4" aria-hidden="true" />
        View Final Podium
      </Button>
    </main>
  );
}
