import { Award, Bookmark, Crown, Play, Share2 } from 'lucide-react';
import {
  MainButton,
  TopBar,
  getPlayerColor,
  getPlayerInitials,
} from '../design/VowletUiPrimitives';
import { trackEvent } from '../analytics/events';
import { useGameStore } from '../state/useGameStore';

export function PodiumScreen() {
  const room = useGameStore((s) => s.room)!;
  const players = useGameStore((s) => s.players);
  const auth = useGameStore((s) => s.auth);
  const startGame = useGameStore((s) => s.startGame);
  const leaveRoom = useGameStore((s) => s.leaveRoom);
  const saveCurrentTable = useGameStore((s) => s.saveCurrentTable);
  const setPodiumSubView = useGameStore((s) => s.setPodiumSubView);
  const setShareSheetOpen = useGameStore((s) => s.setShareSheetOpen);
  const showToast = useGameStore((s) => s.showToast);

  const isHost = auth?.uid === room.hostUid;
  const sorted = players
    .filter((p) => !p.banned && !p.spectator)
    .slice()
    .sort((a, b) => b.sessionScore - a.sessionScore || a.seat - b.seat);

  const topThree = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  const winner = sorted[0];
  const bestStreak = sorted.reduce((max, p) => Math.max(max, p.streak), 0);

  const buildRecapText = () => {
    const lines = topThree.map((p, idx) => `${idx + 1}. ${p.name} — ${p.sessionScore} pts`);
    return `Vowlet Night Recap (${room.code}):\nWinner: ${winner?.name ?? 'Table'} (${winner?.sessionScore ?? 0} pts)\nRounds: ${room.totalRounds} • Best Streak: ${bestStreak}\n${lines.join('\n')}\n#Vowlet #TruthOrDare`;
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

  const podiumSlots = [
    { player: topThree[1], rank: 2, cls: 'second' },
    { player: topThree[0], rank: 1, cls: 'first' },
    { player: topThree[2], rank: 3, cls: 'third' },
  ];

  return (
    <main className="vowlet-shell" data-testid="podium-screen">
      <div className="podium-screen parchment">
        <TopBar back={() => void leaveRoom()} backLabel="Leave to Home" />

        <div className="podium-crown">
          <Crown size={28} aria-hidden="true" />
        </div>
        <h1>Final Podium</h1>

        <div className="podium" aria-label="Top three players">
          {podiumSlots.map(({ player, rank, cls }, idx) =>
            player ? (
              <div key={player.uid} className={`podium-place ${cls}`}>
                <span
                  className="pod-avatar"
                  style={{ background: getPlayerColor(idx) }}
                >
                  {getPlayerInitials(player.name)}
                </span>
                <b>{rank}</b>
                <small>{player.name}</small>
                <small>{player.sessionScore} XP</small>
              </div>
            ) : (
              <div key={rank} className="w-[31%]" />
            ),
          )}
        </div>

        {rest.length > 0 && (
          <div className="paper mx-5 mt-3 w-[calc(100%-40px)] p-3 text-xs">
            {rest.map((p, i) => (
              <div
                key={p.uid}
                className="flex items-center justify-between border-b border-black/10 py-1 last:border-b-0"
              >
                <span className="font-semibold">
                  #{i + 4} {p.name}
                </span>
                <span className="tabular-nums font-bold">{p.sessionScore} XP</span>
              </div>
            ))}
          </div>
        )}

        <div className="thanks">Thanks for playing!</div>

        {isHost && (
          <MainButton data-testid="rematch-btn" onClick={() => void startGame()}>
            <Play size={16} aria-hidden="true" /> Play Again
          </MainButton>
        )}

        <div className="flex w-[calc(100%-44px)] gap-2 my-1">
          <button
            type="button"
            className="main-btn secondary !m-0 !w-1/2"
            data-testid="share-recap-btn"
            onClick={() => void handleShareRecap()}
          >
            <Share2 size={15} aria-hidden="true" /> Share Recap
          </button>

          <button
            type="button"
            className="main-btn secondary !m-0 !w-1/2"
            data-testid="save-table-btn"
            onClick={saveCurrentTable}
          >
            <Bookmark size={15} aria-hidden="true" /> Save Table
          </button>
        </div>

        <MainButton
          secondary
          data-testid="view-summary-loot-btn"
          onClick={() => setPodiumSubView('SUMMARY')}
        >
          <Award size={15} aria-hidden="true" /> XP &amp; Bottle Skins
        </MainButton>
      </div>
    </main>
  );
}
