import { Award, Bookmark, Copy, Crown, RotateCcw, Share2 } from 'lucide-react';
import { Button, OwlMascot, SurfaceCard } from '../design';
import { trackEvent } from '../analytics/events';
import { useGameStore } from '../state/useGameStore';

export function PodiumScreen() {
  const room = useGameStore((s) => s.room)!;
  const players = useGameStore((s) => s.players);
  const auth = useGameStore((s) => s.auth);
  const savedTables = useGameStore((s) => s.savedTables);
  const startGame = useGameStore((s) => s.startGame);
  const leaveRoom = useGameStore((s) => s.leaveRoom);
  const saveCurrentTable = useGameStore((s) => s.saveCurrentTable);
  const setPodiumSubView = useGameStore((s) => s.setPodiumSubView);
  const setShareSheetOpen = useGameStore((s) => s.setShareSheetOpen);
  const showToast = useGameStore((s) => s.showToast);

  const isHost = auth?.uid === room.hostUid;
  const isSignedIn = Boolean(auth && !auth.isAnonymous);
  const sorted = players
    .filter((p) => !p.banned && !p.spectator)
    .slice()
    .sort((a, b) => b.sessionScore - a.sessionScore || a.seat - b.seat);

  const topThree = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  const winner = sorted[0];
  const bestStreak = sorted.reduce((max, p) => Math.max(max, p.streak), 0);
  const totalTurns = sorted.reduce((sum, p) => sum + p.turnsTaken, 0);

  const buildRecapText = () => {
    const lines = topThree.map((p, idx) => `${idx + 1}. ${p.name} — ${p.sessionScore} pts`);
    return `Vowlet Night Recap (${room.code}):\nWinner: ${winner?.name ?? 'Table'} (${winner?.sessionScore ?? 0} pts)\nRounds: ${room.totalRounds} • Best Streak: ${bestStreak}\n${lines.join('\n')}\n#Vowlet #TruthOrDare`;
  };

  const handleCopyRecap = async () => {
    const recapText = buildRecapText();
    try {
      await navigator.clipboard.writeText(recapText);
      trackEvent('recap_shared', { method: 'clipboard' });
      showToast('Recap copied to clipboard!', 'success');
    } catch {
      showToast('Could not copy recap.', 'error');
    }
  };

  const handleShareRecap = async () => {
    const recapText = buildRecapText();
    setShareSheetOpen(true);
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Vowlet Night Recap', text: recapText });
        trackEvent('recap_shared', { method: 'web_share' });
      } else {
        await navigator.clipboard.writeText(recapText);
        trackEvent('recap_shared', { method: 'clipboard' });
        showToast('Recap copied to clipboard!', 'success');
      }
    } catch {
      // cancelled
    } finally {
      setShareSheetOpen(false);
    }
  };

  return (
    <main
      data-testid="podium-screen"
      className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-between gap-4 px-4 py-5"
      style={{
        paddingTop: 'calc(var(--safe-top) + 16px)',
        paddingBottom: 'calc(var(--safe-bottom) + 24px)',
      }}
    >
      <header className="text-center">
        <OwlMascot pose="approve" size="sm" />
        <h1 className="font-display mt-2 text-3xl font-bold">Final Podium</h1>
        <p className="text-xs opacity-75">Table {room.code} • {room.totalRounds} Rounds</p>
      </header>

      {/* Top 3 Podium */}
      <section aria-label="Top three players" className="grid grid-cols-3 gap-2">
        {[topThree[1], topThree[0], topThree[2]].map((player, visualIdx) => {
          if (!player) return <div key={visualIdx} />;
          const rank = visualIdx === 1 ? 1 : visualIdx === 0 ? 2 : 3;
          return (
            <SurfaceCard
              key={player.uid}
              className="flex flex-col items-center justify-end text-center"
              style={{
                paddingTop: rank === 1 ? 20 : 14,
                border: rank === 1 ? '2px solid var(--color-brass)' : 'var(--border-ink-hairline)',
              }}
            >
              {rank === 1 && (
                <Crown className="mb-1 h-5 w-5 text-[var(--color-brass)]" aria-hidden="true" />
              )}
              <span className="text-xl" aria-hidden="true">
                {player.avatar || '🦉'}
              </span>
              <span className="mt-1 w-full truncate text-xs font-bold">{player.name}</span>
              <span className="tabular-nums text-sm font-bold text-[var(--color-brass-text)]">
                {player.sessionScore}
              </span>
              <span className="text-[11px] opacity-70">#{rank}</span>
            </SurfaceCard>
          );
        })}
      </section>

      {/* Ranks 4-8 (3-8 player responsive list) */}
      {rest.length > 0 && (
        <SurfaceCard className="space-y-2">
          {rest.map((p, i) => (
            <div
              key={p.uid}
              className="flex items-center justify-between border-b border-black/10 pb-1.5 text-sm last:border-b-0 last:pb-0"
            >
              <span className="truncate font-medium">
                #{i + 4} {p.name}
              </span>
              <span className="tabular-nums font-bold">{p.sessionScore} pts</span>
            </div>
          ))}
        </SurfaceCard>
      )}

      {/* Night Recap Share Card (B2, D23) */}
      <SurfaceCard data-testid="night-recap-card" className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-brass-text)]">
              Night Recap
            </p>
            <p className="font-display text-lg font-bold">
              {winner ? `${winner.avatar} ${winner.name} takes the crown` : 'Table Complete'}
            </p>
          </div>
          <span className="rounded-full border border-black/15 bg-[var(--color-linen)] px-2.5 py-1 text-[11px] font-bold">
            {room.code}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-[10px] bg-[var(--color-linen)] p-2">
            <p className="text-[10px] opacity-70">Rounds</p>
            <p className="tabular-nums text-xs font-bold">{room.totalRounds}</p>
          </div>
          <div className="rounded-[10px] bg-[var(--color-linen)] p-2">
            <p className="text-[10px] opacity-70">Turns</p>
            <p className="tabular-nums text-xs font-bold">{totalTurns}</p>
          </div>
          <div className="rounded-[10px] bg-[var(--color-linen)] p-2">
            <p className="text-[10px] opacity-70">Best Streak</p>
            <p className="tabular-nums text-xs font-bold">{bestStreak}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-xs font-semibold text-[var(--color-truth-teal)]">
            #Vowlet #TruthOrDare
          </span>
          <button
            type="button"
            data-testid="copy-recap-btn"
            onClick={() => void handleCopyRecap()}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-black/15 bg-[var(--color-linen)] px-3 text-xs font-semibold"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            Copy Recap
          </button>
        </div>
      </SurfaceCard>

      {/* Signed-in Saved Tables */}
      {isSignedIn && savedTables.length > 0 && (
        <SurfaceCard data-testid="podium-saved-tables" className="space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-wider opacity-75">Your Saved Tables</p>
          {savedTables.slice(0, 3).map((t) => (
            <div
              key={`${t.code}-${t.dateIso}`}
              className="flex items-center justify-between text-xs"
            >
              <span>
                <strong>{t.code}</strong> • Winner: {t.winnerName}
              </span>
              <span className="tabular-nums font-bold text-[var(--color-brass-text)]">
                {t.myScore} pts
              </span>
            </div>
          ))}
        </SurfaceCard>
      )}

      {/* Actions */}
      <section className="flex flex-col gap-2.5">
        {isHost && (
          <Button
            variant="primary-dare"
            fullWidth
            data-testid="rematch-btn"
            onClick={() => void startGame()}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Rematch
          </Button>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="primary-truth"
            data-testid="share-recap-btn"
            onClick={() => void handleShareRecap()}
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
            Share Recap
          </Button>

          <Button
            variant="secondary"
            data-testid="save-table-btn"
            onClick={saveCurrentTable}
          >
            <Bookmark className="h-4 w-4" aria-hidden="true" />
            Save Table
          </Button>
        </div>

        <Button
          variant="secondary"
          fullWidth
          data-testid="view-summary-loot-btn"
          onClick={() => setPodiumSubView('SUMMARY')}
        >
          <Award className="h-4 w-4" aria-hidden="true" />
          XP &amp; Bottle Skins
        </Button>

        <Button variant="ghost" fullWidth onClick={() => void leaveRoom()}>
          Leave to Home
        </Button>
      </section>
    </main>
  );
}
