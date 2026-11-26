import { useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Flag,
  Hourglass,
  Monitor,
  Play,
  QrCode,
  Share2,
  UserX,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { PlayerDoc, TotalRounds } from '@vowlet/shared';
import {
  BotanicalCorners,
  BottomSheet,
  Button,
  RadialTable,
  SurfaceCard,
  SyncIndicator,
} from '../design';
import { useGameStore } from '../state/useGameStore';
import { ReportBlockSheet } from './ReportBlockSheet';

export function LobbyScreen() {
  const room = useGameStore((s) => s.room)!;
  const players = useGameStore((s) => s.players);
  const presence = useGameStore((s) => s.presence);
  const auth = useGameStore((s) => s.auth);
  const syncState = useGameStore((s) => s.syncState);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const startGame = useGameStore((s) => s.startGame);
  const leaveRoom = useGameStore((s) => s.leaveRoom);
  const kickPlayer = useGameStore((s) => s.kickPlayer);
  const setShareSheetOpen = useGameStore((s) => s.setShareSheetOpen);
  const passThePhone = useGameStore((s) => s.passThePhone);
  const setPassThePhone = useGameStore((s) => s.setPassThePhone);
  const setTableDisplayActive = useGameStore((s) => s.setTableDisplayActive);
  const showToast = useGameStore((s) => s.showToast);

  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [callInput, setCallInput] = useState(room.callLink ?? '');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerDoc | null>(null);
  const [reportTarget, setReportTarget] = useState<PlayerDoc | null>(null);
  const [starting, setStarting] = useState(false);

  const myUid = auth?.uid ?? null;
  const isHost = myUid === room.hostUid;
  const activePlayers = players.filter((p) => !p.banned && !p.spectator);
  const presentPlayers = activePlayers.filter((p) => presence[p.uid]?.online ?? true);
  const readyCount = activePlayers.filter((p) => p.ready).length;
  const readyPct = activePlayers.length > 0 ? Math.round((readyCount / activePlayers.length) * 100) : 0;
  const me = activePlayers.find((p) => p.uid === myUid);

  const inviteUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?join=${room.code}`
      : `https://vowlet.app/?join=${room.code}`;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast('Could not copy code.', 'error');
    }
  };

  const handleShareLink = async () => {
    setShareSheetOpen(true);
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Join my Vowlet table',
          text: `Pull up a chair! Code: ${room.code}`,
          url: inviteUrl,
        });
      } else {
        await navigator.clipboard.writeText(inviteUrl);
        showToast('Invite link copied!', 'success');
      }
    } catch {
      // User cancelled share
    } finally {
      setShareSheetOpen(false);
    }
  };

  const handleStart = async () => {
    setStarting(true);
    try {
      await startGame();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Cannot start yet', 'error');
    } finally {
      setStarting(false);
    }
  };

  return (
    <main
      data-testid="lobby-screen"
      className="lamplit-backdrop relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col gap-3.5 overflow-hidden px-4 py-4"
      style={{
        paddingTop: 'calc(var(--safe-top) + 12px)',
        paddingBottom: 'calc(var(--safe-bottom) + 20px)',
      }}
    >
      <BotanicalCorners surface="lamplit" />

      {/* Top Bar */}
      <header className="relative z-10 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => void leaveRoom()}
          aria-label="Leave table"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[var(--color-cream)]"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label={`Copy room code ${room.code}`}
            data-testid="copy-room-code"
            onClick={() => void handleCopyCode()}
            className="tabular-nums inline-flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-full border border-[#F4C97A]/40 bg-black/35 px-3.5 text-sm font-bold tracking-[0.12em] text-[var(--color-cream)]"
          >
            <span className="text-xs font-medium tracking-normal text-[#F4C97A]">Room:</span>
            <span data-testid="room-code-text">{room.code}</span>
            {copied ? (
              <Check className="h-4 w-4 text-[#A7D7A6]" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4 text-[#F4C97A]" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            aria-label="Show QR and share link"
            data-testid="qr-modal-btn"
            onClick={() => setQrOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[var(--color-cream)]"
          >
            <QrCode className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <SyncIndicator state={syncState} surface="lamplit" />
      </header>

      <p className="relative z-10 text-center text-sm font-medium text-[var(--color-lamplit-muted)]">
        Waiting for everyone...
      </p>

      {/* Radial Wooden Table with Amber Bottle */}
      <div className="relative z-10">
        <RadialTable
          players={players}
          presence={presence}
          myUid={myUid}
          hostUid={room.hostUid}
          isHost={isHost}
          showReadyBadge
          onSelectPlayer={(p) => setSelectedPlayer(p)}
          centerContent={
            <div className="flex flex-col items-center justify-center text-center">
              <svg
                width="36"
                height="82"
                viewBox="0 0 48 110"
                fill="none"
                aria-hidden="true"
                className="drop-shadow-[0_6px_12px_rgba(0,0,0,0.65)]"
              >
                <rect x="19" y="4" width="10" height="9" rx="2" fill="#C99B48" stroke="#23201C" strokeWidth="1.4" />
                <path
                  d="M18.5 16 L29.5 16 L30.5 34 L38 46 L38 95 C38 100 34 104 29 104 L19 104 C14 104 10 100 10 95 L10 46 L17.5 34 Z"
                  fill="#9E521C"
                  stroke="#FFFDF9"
                  strokeOpacity="0.4"
                  strokeWidth="1.4"
                />
                <path d="M14.5 48 L14.5 93" stroke="#F4C97A" strokeOpacity="0.55" strokeWidth="2.5" strokeLinecap="round" />
                <rect x="13" y="55" width="22" height="26" rx="4" fill="#F6EBDC" stroke="#8A6420" strokeWidth="1.2" />
                <circle cx="24" cy="68" r="5" fill="#9C3325" />
              </svg>
              {presentPlayers.length < 3 && (
                <span className="mt-1 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-medium text-[#F4C97A]">
                  Need 3+ players
                </span>
              )}
            </div>
          }
        />
      </div>

      {/* Cream Players Ready Progress Card */}
      <div
        className="parchment-card relative z-10 rounded-[16px] px-4 py-3 text-[var(--color-ink)]"
      >
        <div className="flex items-center justify-between text-sm font-bold">
          <span className="inline-flex items-center gap-2">
            <Hourglass className="h-4 w-4 text-[var(--color-brass-text)]" aria-hidden="true" />
            <span>
              {readyCount} / {activePlayers.length} Players Ready
            </span>
          </span>
          <span className="tabular-nums text-xs font-semibold text-[var(--color-brass-text)]">
            {activePlayers.length}/8 seats
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#23201C]/12">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${readyPct}%`,
              background: 'linear-gradient(90deg, #B8893B 0%, #5B8C5A 100%)',
            }}
          />
        </div>
      </div>

      {/* Ready & Start Game Primary Row */}
      <div className="relative z-10 flex gap-2">
        {me && (
          <Button
            variant={me.ready ? 'primary-truth' : 'secondary'}
            surface="lamplit"
            fullWidth
            data-testid="ready-toggle-btn"
            onClick={() => void updateSettings({ ready: !me.ready })}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            {me.ready ? 'Ready!' : 'Mark Ready'}
          </Button>
        )}

        {isHost && (
          <button
            type="button"
            disabled={presentPlayers.length < 3 || starting}
            data-testid="start-game-btn"
            onClick={() => void handleStart()}
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[14px] px-4 py-2.5 text-sm font-bold text-[var(--color-ink)] transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: 'linear-gradient(180deg, #FFFDF9 0%, #EFE2CB 100%)',
              border: '1.5px solid #B8893B',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
            }}
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            <span>{starting ? 'Starting…' : 'Start Game'}</span>
          </button>
        )}
      </div>

      {/* Call Link & Settings */}
      <SurfaceCard surface="lamplit" className="relative z-10 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-[var(--color-lamplit-muted)]">
            Optional Call Link (Meet / WhatsApp / Discord)
          </span>
          {room.callLink && (
            <a
              href={room.callLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-1 text-xs font-semibold text-[#F4C97A] underline"
            >
              Join Call <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          )}
        </div>
        {isHost && (
          <div className="flex gap-2">
            <input
              type="url"
              value={callInput}
              onChange={(e) => setCallInput(e.target.value)}
              placeholder="https://meet.google.com/..."
              className="min-h-[44px] flex-1 rounded-[14px] border border-white/20 bg-black/30 px-3 text-xs text-[var(--color-cream)] placeholder:text-white/40"
            />
            <Button
              variant="secondary"
              surface="lamplit"
              onClick={() => void updateSettings({ callLink: callInput.trim() || null })}
            >
              Save
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-[var(--color-lamplit-muted)]">
            {room.totalRounds} rounds • {room.settings.packIds[0] ?? 'friends'}
          </span>
          {isHost && (
            <div className="flex gap-1">
              {([5, 10, 15] as TotalRounds[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => void updateSettings({ settings: { rounds: r } })}
                  className="min-h-[44px] min-w-[44px] rounded-xl px-2 text-xs font-bold tabular-nums"
                  style={{
                    backgroundColor: room.totalRounds === r ? 'var(--color-brass)' : 'rgba(255,255,255,0.08)',
                    color: 'var(--color-cream)',
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>

        {isHost && (
          <button
            type="button"
            role="switch"
            aria-checked={room.settings.quickPlay}
            data-testid="lobby-quickplay-toggle"
            onClick={() =>
              void updateSettings({
                settings: { quickPlay: !room.settings.quickPlay },
              })
            }
            className="flex min-h-[44px] w-full items-center justify-between rounded-[14px] border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold"
          >
            <span>Quick Play (skip writing chits)</span>
            <span>{room.settings.quickPlay ? 'ON' : 'OFF'}</span>
          </button>
        )}

        {isHost && (
          <button
            type="button"
            role="switch"
            aria-checked={room.settings.tableMode}
            data-testid="lobby-tablemode-toggle"
            onClick={() =>
              void updateSettings({
                settings: { tableMode: !room.settings.tableMode },
              })
            }
            className="flex min-h-[44px] w-full items-center justify-between rounded-[14px] border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold"
          >
            <span>Table Mode (shared screen)</span>
            <span>{room.settings.tableMode ? 'ON' : 'OFF'}</span>
          </button>
        )}

        <button
          type="button"
          role="switch"
          aria-checked={passThePhone}
          data-testid="lobby-passthephone-toggle"
          onClick={() => setPassThePhone(!passThePhone)}
          className="flex min-h-[44px] w-full items-center justify-between rounded-[14px] border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold"
        >
          <span>Pass-the-Phone (single-device)</span>
          <span>{passThePhone ? 'ON' : 'OFF'}</span>
        </button>

        {room.settings.tableMode && (
          <Button
            variant="secondary"
            surface="lamplit"
            fullWidth
            data-testid="open-table-display-btn"
            onClick={() => setTableDisplayActive(true)}
          >
            <Monitor className="h-4 w-4" aria-hidden="true" />
            Open Table Display
          </Button>
        )}
      </SurfaceCard>

      {/* QR & Share Modal */}
      <BottomSheet open={qrOpen} onClose={() => setQrOpen(false)} title="Invite Players" data-testid="qr-modal">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded-2xl border border-black/10 bg-white p-4">
            <QRCodeSVG value={inviteUrl} size={180} />
          </div>
          <p className="tabular-nums text-lg font-bold tracking-[0.2em]">{room.code}</p>
          <Button variant="primary-truth" fullWidth onClick={() => void handleShareLink()}>
            <Share2 className="h-4 w-4" aria-hidden="true" />
            Share Invite Link
          </Button>
        </div>
      </BottomSheet>

      {/* Player Action Sheet (Kick / Report) */}
      <BottomSheet
        open={selectedPlayer !== null}
        onClose={() => setSelectedPlayer(null)}
        title={selectedPlayer?.name ?? 'Player'}
      >
        {selectedPlayer && (
          <div className="space-y-3">
            {isHost && (
              <Button
                variant="danger"
                fullWidth
                data-testid="kick-player-btn"
                onClick={() => {
                  const uid = selectedPlayer.uid;
                  setSelectedPlayer(null);
                  void kickPlayer(uid);
                }}
              >
                <UserX className="h-4 w-4" aria-hidden="true" />
                Kick &amp; Ban from Table
              </Button>
            )}
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                const target = selectedPlayer;
                setSelectedPlayer(null);
                setReportTarget(target);
              }}
            >
              <Flag className="h-4 w-4" aria-hidden="true" />
              Report Player
            </Button>
          </div>
        )}
      </BottomSheet>

      <ReportBlockSheet
        open={reportTarget !== null}
        onClose={() => setReportTarget(null)}
        targetUid={reportTarget?.uid}
        targetName={reportTarget?.name}
      />
    </main>
  );
}
