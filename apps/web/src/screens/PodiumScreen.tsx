import { Bookmark, Crown, RotateCcw, Share2 } from 'lucide-react';
import { Button, OwlMascot, SurfaceCard } from '../design';
import { useGameStore } from '../state/useGameStore';

export function PodiumScreen() {
  const room = useGameStore((s) => s.room)!;
  const players = useGameStore((s) => s.players);
  const auth = useGameStore((s) => s.auth);
  const startGame = useGameStore((s) => s.startGame);
  const leaveRoom = useGameStore((s) => s.leaveRoom);
  const saveCurrentTable = useGameStore((s) => s.saveCurrentTable);
  const setShareSheetOpen = useGameStore((s) => s.setShareSheetOpen);
  const showToast = useGameStore((s) => s.showToast);

  const isHost = auth?.uid === room.hostUid;
  const sorted = players
    .filter((p) => !p.banned && !p.spectator)
    .slice()
    .sort((a, b) => b.sessionScore - a.sessionScore || a.seat - b.seat);

  const topThree = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  const handleShareRecap = async () => {
    const lines = topThree.map((p, idx) => `${idx + 1}. ${p.name} — ${p.sessionScore} pts`);
    const recapText = `Vowlet Night Recap (${room.code}):\n${lines.join('\n')}\n#Vowlet #TruthOrDare`;
    setShareSheetOpen(true);
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Vowlet Night Recap', text: recapText });
      } else {
        await navigator.clipboard.writeText(recapText);
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

        <Button variant="ghost" fullWidth onClick={() => void leaveRoom()}>
          Leave to Home
        </Button>
      </section>
    </main>
  );
}
