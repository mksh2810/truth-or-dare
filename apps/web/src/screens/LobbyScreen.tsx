import { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Crown,
  Flag,
  Hourglass,
  Mic,
  MicOff,
  Monitor,
  PhoneOff,
  Play,
  QrCode,
  Share2,
  UserX,
  Video,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { PlayerDoc, TotalRounds } from '@vowlet/shared';
import { BottomSheet, Button, SyncIndicator } from '../design';
import {
  AmberBottleSvg,
  BotanicalLayer,
  PlayerSeatAvatar,
  TopBar,
  WoodenTableSvg,
} from '../design/VowletUiPrimitives';
import { useMediaCall } from '../media/useMediaCall';
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
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerDoc | null>(null);
  const [reportTarget, setReportTarget] = useState<PlayerDoc | null>(null);
  const [starting, setStarting] = useState(false);

  const voiceJoined = useMediaCall((s) => s.voiceJoined);
  const micMuted = useMediaCall((s) => s.micMuted);
  const autoCamForDares = useMediaCall((s) => s.autoCamForDares);
  const localStream = useMediaCall((s) => s.localStream);
  const remoteStreams = useMediaCall((s) => s.remoteStreams);
  const remoteMediaState = useMediaCall((s) => s.remoteMediaState);
  const mediaError = useMediaCall((s) => s.mediaError);
  const joinVoice = useMediaCall((s) => s.joinVoice);
  const leaveVoice = useMediaCall((s) => s.leaveVoice);
  const toggleMic = useMediaCall((s) => s.toggleMic);
  const setAutoCamForDares = useMediaCall((s) => s.setAutoCamForDares);

  const myUid = auth?.uid ?? null;
  const isHost = myUid === room.hostUid;
  const activePlayers = useMemo(
    () =>
      players
        .filter((p) => !p.banned && !p.spectator)
        .slice()
        .sort((a, b) => a.seat - b.seat),
    [players],
  );
  const presentPlayers = activePlayers.filter((p) => presence[p.uid]?.online ?? true);
  const readyCount = activePlayers.filter((p) => p.ready).length;
  const me = activePlayers.find((p) => p.uid === myUid);

  const myIndex = Math.max(0, activePlayers.findIndex((p) => p.uid === myUid));
  const seatCount = Math.max(1, activePlayers.length);

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

  const readyPct = activePlayers.length > 0 ? Math.round((readyCount / activePlayers.length) * 100) : 0;

  return (
    <main className="vowlet-shell" data-testid="lobby-screen">
      <div className="bg-wood-candle flex min-h-dvh flex-col pb-5">
        <BotanicalLayer darkMode />

        <TopBar
          dark
          back={() => void leaveRoom()}
          backLabel="Leave table"
          rightSlot={
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="grid min-h-[44px] min-w-[44px] place-items-center rounded-full border-0 bg-transparent text-[#f8e8ce]"
                aria-label="Show QR and share link"
                data-testid="qr-modal-btn"
                onClick={() => setQrOpen(true)}
              >
                <QrCode size={19} aria-hidden="true" />
              </button>
              <SyncIndicator state={syncState} surface="lamplit" />
            </div>
          }
        />

        {/* Room Code Pill */}
        <div className="relative z-10 flex flex-col items-center px-4">
          <button
            type="button"
            aria-label={`Copy room code ${room.code}`}
            data-testid="copy-room-code"
            onClick={() => void handleCopyCode()}
            className="flex min-h-[44px] items-center gap-2.5 rounded-full border border-[#d9b061]/60 bg-[#21150d]/85 px-5 py-2 text-[#f9e7c6] shadow-[0_6px_16px_rgba(0,0,0,0.45)]"
          >
            <span className="font-cinzel text-sm font-bold tracking-wider">
              Room: <span data-testid="room-code-text">{room.code}</span>
            </span>
            {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
          </button>

          <h1 className="font-cormorant mt-2 text-center text-[25px] font-semibold text-[#faeed7] italic">
            Waiting for everyone...
          </h1>
        </div>

        {/* Radial Wooden Table + Amber Bottle + 3-8 Seats */}
        <div className="relative z-10 mx-auto my-2 flex h-[300px] w-full max-w-[340px] items-center justify-center">
          <WoodenTableSvg className="h-[232px] w-[232px] drop-shadow-[0_18px_28px_rgba(0,0,0,0.65)]" />

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <AmberBottleSvg className="h-[88px] w-[42px] drop-shadow-[0_6px_10px_rgba(0,0,0,0.6)]" />
          </div>

          {activePlayers.map((player, index) => {
            const relIdx = (index - myIndex + seatCount) % seatCount;
            // Place local player (relIdx === 0) at bottom (90 deg)
            const angleDeg = 90 + (relIdx / seatCount) * 360;
            const angleRad = (angleDeg * Math.PI) / 180;
            const rx = 128;
            const ry = 122;
            const left = 50 + (Math.cos(angleRad) * rx * 100) / 340;
            const top = 50 + (Math.sin(angleRad) * ry * 100) / 300;
            const isOnline = presence[player.uid]?.online ?? true;
            const isTableHost = player.uid === room.hostUid;
            const isMe = player.uid === myUid;
            const seatStream = isMe ? localStream : (remoteStreams[player.uid] ?? null);
            const isVoiceActive = isMe
              ? voiceJoined && !micMuted
              : Boolean(remoteMediaState[player.uid]?.voice);

            return (
              <button
                key={player.uid}
                type="button"
                onClick={() => setSelectedPlayer(player)}
                aria-label={`${player.name}${isTableHost ? ' (Host)' : ''}${player.ready ? ', Ready' : ''}${isVoiceActive ? ', Voice active' : ''}`}
                className="absolute flex min-h-[44px] min-w-[44px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5 border-0 bg-transparent p-0"
                style={{ left: `${left}%`, top: `${top}%`, opacity: isOnline ? 1 : 0.45 }}
              >
                <div className="relative">
                  {isTableHost && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-3 left-1/2 -translate-x-1/2 text-[#f6cf78] drop-shadow"
                    >
                      <Crown size={14} fill="#f6cf78" />
                    </span>
                  )}
                  <PlayerSeatAvatar
                    name={player.name}
                    stream={seatStream}
                    muted
                    isVoiceActive={isVoiceActive}
                    size={44}
                    className={`shadow-[0_4px_10px_rgba(0,0,0,0.6)] ${
                      player.ready ? 'ring-2 ring-[#79a86b]' : ''
                    }`}
                  />
                </div>
                <span className="max-w-[78px] truncate rounded-full border border-[#d9b061]/35 bg-[#1b110a]/90 px-2 py-0.5 text-[11px] font-semibold text-[#faeed7]">
                  {player.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Ready Progress Card + Actions */}
        <div className="relative z-10 mt-auto flex flex-col gap-2.5 px-5">
          <div className="btn-parchment pointer-events-none flex-col gap-1.5 py-2.5">
            <div className="flex w-full items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 font-semibold">
                <Hourglass size={15} aria-hidden="true" />
                {readyCount} / {activePlayers.length} Players Ready
              </span>
              <span className="font-cinzel text-xs font-bold text-[#8a6420]">{readyPct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#c9a373]/40">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#3f6b3e] to-[#68985f] transition-all"
                style={{ width: `${readyPct}%` }}
              />
            </div>
          </div>

          {me && (
            <button
              type="button"
              className={me.ready ? 'btn-teal w-full' : 'btn-parchment w-full'}
              data-testid="ready-toggle-btn"
              onClick={() => void updateSettings({ ready: !me.ready })}
            >
              <Check size={17} aria-hidden="true" />
              <span>{me.ready ? 'Ready!' : 'Mark Ready'}</span>
            </button>
          )}

          {isHost && (
            <button
              type="button"
              className="btn-parchment w-full"
              disabled={presentPlayers.length < 3 || starting}
              data-testid="start-game-btn"
              onClick={() => void handleStart()}
            >
              <Play size={17} aria-hidden="true" />
              <span>
                {starting
                  ? 'Starting…'
                  : presentPlayers.length < 3
                    ? 'Need 3+ Players'
                    : 'Start Game'}
              </span>
            </button>
          )}

          {/* Compact Lobby Controls: Share / Table Mode / Quick Play / Call Link */}
          <section
            aria-label="Table settings"
            className="mt-1 space-y-2 rounded-2xl border border-[#d9b061]/35 bg-[#1b110a]/85 p-3 text-xs text-[#f7e5c9]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="opacity-85">
                {room.totalRounds} rounds • {room.settings.packIds[0] ?? 'friends'}
              </span>
              <button
                type="button"
                onClick={() => void handleShareLink()}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#d9b061]/45 bg-[#2d1d12] px-3 font-semibold text-[#f9e5be]"
              >
                <Share2 size={14} aria-hidden="true" />
                Share Link
              </button>
            </div>

            {isHost && (
              <div className="flex items-center justify-between gap-2">
                <span className="opacity-80">Rounds</span>
                <div className="flex gap-1.5">
                  {([5, 10, 15] as TotalRounds[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => void updateSettings({ settings: { rounds: r } })}
                      className="min-h-[44px] min-w-[44px] rounded-xl px-2 font-bold tabular-nums"
                      style={{
                        backgroundColor:
                          room.totalRounds === r ? '#b8893b' : 'rgba(255,255,255,0.08)',
                        color: '#fff3df',
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 rounded-xl border border-[#d9b061]/30 bg-black/25 p-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-[#f9e5be]">Voice &amp; Video Call</span>
                <div className="flex items-center gap-2">
                  {voiceJoined ? (
                    <>
                      <button
                        type="button"
                        data-testid="lobby-mic-toggle-btn"
                        onClick={() => toggleMic()}
                        className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3 font-semibold ${
                          micMuted
                            ? 'border-[#c4552d]/70 bg-[#5c2116] text-[#f9e5be]'
                            : 'border-[#79a86b] bg-[#244429] text-[#f6f1e9]'
                        }`}
                      >
                        {micMuted ? <MicOff size={15} aria-hidden="true" /> : <Mic size={15} aria-hidden="true" />}
                        <span>{micMuted ? 'Unmute' : 'Mic On'}</span>
                      </button>
                      <button
                        type="button"
                        data-testid="lobby-leave-voice-btn"
                        onClick={() => leaveVoice()}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#d9b061]/45 bg-[#392719] px-3 font-semibold text-[#f7e5c9]"
                      >
                        <PhoneOff size={14} aria-hidden="true" />
                        <span>Leave Voice</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      data-testid="lobby-join-voice-btn"
                      onClick={() => void joinVoice()}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#d9b061]/55 bg-[#234950] px-3 font-semibold text-[#f6e6c6]"
                    >
                      <Mic size={15} aria-hidden="true" />
                      <span>Join Voice Call</span>
                    </button>
                  )}
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={autoCamForDares}
                data-testid="lobby-autocam-toggle"
                onClick={() => setAutoCamForDares(!autoCamForDares)}
                className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-left"
              >
                <div className="flex items-start gap-2">
                  <Video size={15} className="mt-0.5 shrink-0 text-[#d9b061]" aria-hidden="true" />
                  <div>
                    <div className="font-semibold">Auto-Cam for Dares</div>
                    <div className="text-[11px] opacity-75">
                      Camera turns on automatically only during Dare turns
                    </div>
                  </div>
                </div>
                <span className="shrink-0 font-bold text-[#f6cf78]">
                  {autoCamForDares ? 'ON' : 'OFF'}
                </span>
              </button>

              {mediaError && (
                <p role="alert" className="text-[11px] font-medium text-[#f59f8b]">
                  {mediaError}
                </p>
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
      </div>

      <BottomSheet
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        title="Invite Players"
        data-testid="qr-modal"
      >
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
