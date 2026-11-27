import { Award, Bookmark, Crown, Play, Share2 } from 'lucide-react';
import {
  BotanicalLayer,
  PlayerAvatarArtwork,
  TopBar,
} from '../design/VowletUiPrimitives';
import { trackEvent } from '../analytics/events';
import { useGameStore } from '../state/useGameStore';

const CONFETTI_PIECES = [
  { left: '8%', delay: '0s', color: '#D9B061', w: 8, h: 12 },
  { left: '19%', delay: '0.7s', color: '#2E5E6B', w: 7, h: 10 },
  { left: '31%', delay: '1.4s', color: '#C4552D', w: 9, h: 9 },
  { left: '46%', delay: '0.4s', color: '#D9B061', w: 7, h: 12 },
  { left: '59%', delay: '1.1s', color: '#5B8C5A', w: 8, h: 10 },
  { left: '72%', delay: '0.2s', color: '#C4552D', w: 7, h: 11 },
  { left: '84%', delay: '1.7s', color: '#2E5E6B', w: 8, h: 9 },
  { left: '92%', delay: '0.9s', color: '#D9B061', w: 6, h: 11 },
];

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
    {
      player: topThree[1],
      rank: 2,
      heightCls: 'h-[155px]',
      bgStyle: 'linear-gradient(180deg, #E2DDD5 0%, #ABA296 100%)',
      borderCls: 'border-[#968C7E]',
    },
    {
      player: topThree[0],
      rank: 1,
      heightCls: 'h-[205px]',
      bgStyle: 'linear-gradient(180deg, #F5DA9A 0%, #BF8B38 100%)',
      borderCls: 'border-[#9B6E24]',
    },
    {
      player: topThree[2],
      rank: 3,
      heightCls: 'h-[122px]',
      bgStyle: 'linear-gradient(180deg, #DFB995 0%, #9E6E46 100%)',
      borderCls: 'border-[#845732]',
    },
  ];

  return (
    <main className="vowlet-shell" data-testid="podium-screen">
      <div className="bg-parchment flex min-h-dvh flex-col pb-5">
        <BotanicalLayer />

        {/* Confetti Layer */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
          {CONFETTI_PIECES.map((c, idx) => (
            <span
              key={idx}
              className="confetti-piece"
              style={{
                left: c.left,
                width: `${c.w}px`,
                height: `${c.h}px`,
                backgroundColor: c.color,
                animationDelay: c.delay,
              }}
            />
          ))}
        </div>

        <TopBar back={() => void leaveRoom()} backLabel="Leave to Home" />

        {/* Crown + Title */}
        <div className="relative z-10 flex flex-col items-center px-5 text-center">
          <Crown size={30} className="text-[#9c7228]" aria-hidden="true" />
          <h1 className="font-cormorant mt-1 text-[32px] leading-tight font-bold text-[#2b1d12]">
            Final Podium
          </h1>
        </div>

        {/* 3-Step Ornate Podium */}
        <div
          className="relative z-10 mt-6 flex h-[270px] w-full items-end justify-center gap-2 px-5"
          aria-label="Top three players"
        >
          {podiumSlots.map(({ player, rank, heightCls, bgStyle, borderCls }) =>
            player ? (
              <div
                key={player.uid}
                className={`relative flex w-[31%] flex-col items-center rounded-t-xl border pt-8 text-[#23170d] shadow-[0_6px_14px_rgba(70,45,20,0.22)] ${heightCls} ${borderCls}`}
                style={{ background: bgStyle }}
              >
                <div className="absolute -top-7 left-1/2 -translate-x-1/2">
                  <PlayerAvatarArtwork
                    name={player.name}
                    size={52}
                    className={`rounded-full ${
                      rank === 1 ? 'halo-chosen' : 'shadow-md'
                    }`}
                  />
                </div>
                <b className="font-cormorant text-[40px] leading-none font-bold">{rank}</b>
                <small className="mt-0.5 max-w-[90%] truncate text-xs font-bold">
                  {player.name}
                </small>
                <small className="text-[11px] font-semibold opacity-85 tabular-nums">
                  {player.sessionScore} XP
                </small>
              </div>
            ) : (
              <div key={rank} className="w-[31%]" />
            ),
          )}
        </div>

        {/* Rest of players (4-8 player support) */}
        {rest.length > 0 && (
          <div className="chit-card relative z-10 mx-5 mt-3 p-3 text-xs">
            {rest.map((p, i) => (
              <div
                key={p.uid}
                className="flex items-center justify-between border-b border-black/10 py-1.5 last:border-b-0"
              >
                <span className="font-semibold">
                  #{i + 4} {p.name}
                </span>
                <span className="font-bold tabular-nums">{p.sessionScore} XP</span>
              </div>
            ))}
          </div>
        )}

        {/* Torn Note Thanks */}
        <div className="relative z-10 mx-auto my-4 px-5">
          <div className="torn-note px-7 py-3 text-center">
            <span className="font-cormorant text-[22px] font-semibold text-[#2b1d12] italic">
              Thanks for playing!
            </span>
          </div>
        </div>

        {/* Action Stack */}
        <div className="relative z-10 mt-auto flex flex-col gap-2.5 px-5">
          {isHost && (
            <button
              type="button"
              className="btn-teal w-full"
              data-testid="rematch-btn"
              onClick={() => void startGame()}
            >
              <Play size={16} aria-hidden="true" />
              <span>Play Again</span>
            </button>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              className="btn-parchment w-full text-[14px]"
              data-testid="share-recap-btn"
              onClick={() => void handleShareRecap()}
            >
              <Share2 size={15} aria-hidden="true" />
              <span>Share Recap</span>
            </button>

            <button
              type="button"
              className="btn-parchment w-full text-[14px]"
              data-testid="save-table-btn"
              onClick={saveCurrentTable}
            >
              <Bookmark size={15} aria-hidden="true" />
              <span>Save Table</span>
            </button>
          </div>

          <button
            type="button"
            className="btn-parchment w-full text-[14px]"
            data-testid="view-summary-loot-btn"
            onClick={() => setPodiumSubView('SUMMARY')}
          >
            <Award size={15} aria-hidden="true" />
            <span>XP &amp; Bottle Skins</span>
          </button>
        </div>
      </div>
    </main>
  );
}
