import { useState } from 'react';
import {
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
import { BottomSheet, Button, SyncIndicator } from '../design';
import { MainButton, Tabletop, TopBar } from '../design/VowletUiPrimitives';
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
    <main className="vowlet-shell" data-testid="lobby-screen">
      <div className="lobby-screen dark-scene">
        <TopBar
          dark
          back={() => void leaveRoom()}
          backLabel="Leave table"
          rightSlot={
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="icon-btn"
                aria-label="Show QR and share link"
                data-testid="qr-modal-btn"
                onClick={() => setQrOpen(true)}
              >
                <QrCode size={18} aria-hidden="true" />
              </button>
              <SyncIndicator state={syncState} surface="lamplit" />
            </div>
          }
        />

        <button
          type="button"
          className="room-code"
          aria-label={`Copy room code ${room.code}`}
          data-testid="copy-room-code"
          onClick={() => void handleCopyCode()}
        >
          <span>
            Room: <span data-testid="room-code-text">{room.code}</span>
          </span>
          {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
        </button>

        <p className="dark-sub">Waiting for everyone...</p>

        <Tabletop
          players={players}
          presence={presence}
          myUid={myUid}
          hostUid={room.hostUid}
          onSelectPlayer={(p) => setSelectedPlayer(p)}
        />

        <div className="ready-pill">
          <Hourglass size={16} aria-hidden="true" />
          <span>
            {readyCount} / {activePlayers.length} Players Ready
          </span>
        </div>

        {me && (
          <MainButton
            secondary={!me.ready}
            data-testid="ready-toggle-btn"
            onClick={() => void updateSettings({ ready: !me.ready })}
          >
            <Check size={16} aria-hidden="true" />
            {me.ready ? 'Ready!' : 'Mark Ready'}
          </MainButton>
        )}

        {isHost && (
          <MainButton
            disabled={presentPlayers.length < 3 || starting}
            data-testid="start-game-btn"
            onClick={() => void handleStart()}
          >
            <Play size={16} aria-hidden="true" />
            {starting ? 'Starting…' : presentPlayers.length < 3 ? 'Need 3+ Players' : 'Start Game'}
          </MainButton>
        )}

        <section
          aria-label="Table settings"
          className="mx-5 mt-2 space-y-2 rounded-2xl border border-[#b68a56]/40 bg-[#21170f]/80 p-3 text-xs text-[#f7e5c9]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="opacity-80">Call Link (optional)</span>
            {room.callLink && (
              <a
                href={room.callLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-1 font-semibold text-[#f4c97a] underline"
              >
                Join Call <ExternalLink size={13} aria-hidden="true" />
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
                aria-label="Optional call link"
                className="min-h-[44px] flex-1 rounded-xl border border-[#b68a56]/40 bg-black/30 px-3 text-xs text-[#fff3df] placeholder:text-white/40"
              />
              <button
                type="button"
                onClick={() => void updateSettings({ callLink: callInput.trim() || null })}
                className="min-h-[44px] rounded-xl border border-[#b68a56] bg-[#392719] px-3 font-semibold text-[#f7e5c9]"
              >
                Save
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="opacity-80">
              {room.totalRounds} rounds • {room.settings.packIds[0] ?? 'friends'}
            </span>
            {isHost && (
              <div className="flex gap-1">
                {([5, 10, 15] as TotalRounds[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => void updateSettings({ settings: { rounds: r } })}
                    className="min-h-[44px] min-w-[44px] rounded-xl px-2 font-bold tabular-nums"
                    style={{
                      backgroundColor: room.totalRounds === r ? '#b8893b' : 'rgba(255,255,255,0.08)',
                      color: '#fff3df',
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
              className="flex min-h-[44px] w-full items-center justify-between rounded-xl border border-white/15 bg-white/5 px-3 py-2 font-semibold"
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
              className="flex min-h-[44px] w-full items-center justify-between rounded-xl border border-white/15 bg-white/5 px-3 py-2 font-semibold"
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
            className="flex min-h-[44px] w-full items-center justify-between rounded-xl border border-white/15 bg-white/5 px-3 py-2 font-semibold"
          >
            <span>Pass-the-Phone (single-device)</span>
            <span>{passThePhone ? 'ON' : 'OFF'}</span>
          </button>

          {room.settings.tableMode && (
            <button
              type="button"
              data-testid="open-table-display-btn"
              onClick={() => setTableDisplayActive(true)}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#b68a56] bg-[#392719] px-3 py-2 font-semibold text-[#f7e5c9]"
            >
              <Monitor size={15} aria-hidden="true" />
              Open Table Display
            </button>
          )}
        </section>
      </div>

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

      <BottomSheet
        open={selectedPlayer !== null}
        onClose={() => setSelectedPlayer(null)}
        title={selectedPlayer?.name ?? 'Player'}
      >
        {selectedPlayer && (
          <div className="space-y-3">
            {isHost && selectedPlayer.uid !== myUid && (
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
