import { useEffect, useRef, useState } from 'react';
import {
  Check,
  FastForward,
  Hourglass,
  Mic,
  MicOff,
  MonitorUp,
  RefreshCw,
  Video,
  VideoOff,
} from 'lucide-react';
import { ElapsedStopwatch, SyncIndicator } from '../design';
import {
  BotanicalLayer,
  PlayerSeatAvatar,
  TopBar,
  WaxSealArtwork,
} from '../design/VowletUiPrimitives';
import { useMediaCall } from '../media/useMediaCall';
import { useGameStore } from '../state/useGameStore';

export function PerformScreen() {
  const turn = useGameStore((s) => s.turn)!;
  const players = useGameStore((s) => s.players);
  const auth = useGameStore((s) => s.auth);
  const privatePrompt = useGameStore((s) => s.privatePrompt);
  const syncState = useGameStore((s) => s.syncState);
  const clockOffsetMs = useGameStore((s) => s.clockOffsetMs);
  const pendingAction = useGameStore((s) => s.pendingAction);
  const performDone = useGameStore((s) => s.performDone);
  const performSkip = useGameStore((s) => s.performSkip);
  const performSwap = useGameStore((s) => s.performSwap);
  const performStall = useGameStore((s) => s.performStall);

  const [unsealed, setUnsealed] = useState(true);
  const [answerText, setAnswerText] = useState('');
  const stageVideoRef = useRef<HTMLVideoElement | null>(null);

  const voiceJoined = useMediaCall((s) => s.voiceJoined);
  const micMuted = useMediaCall((s) => s.micMuted);
  const cameraOn = useMediaCall((s) => s.cameraOn);
  const screenSharing = useMediaCall((s) => s.screenSharing);
  const localStream = useMediaCall((s) => s.localStream);
  const screenStream = useMediaCall((s) => s.screenStream);
  const remoteStreams = useMediaCall((s) => s.remoteStreams);
  const remoteMediaState = useMediaCall((s) => s.remoteMediaState);
  const mediaError = useMediaCall((s) => s.mediaError);
  const joinVoice = useMediaCall((s) => s.joinVoice);
  const toggleMic = useMediaCall((s) => s.toggleMic);
  const toggleCamera = useMediaCall((s) => s.toggleCamera);
  const toggleScreenShare = useMediaCall((s) => s.toggleScreenShare);

  const myUid = auth?.uid ?? '';
  const isPerformer = myUid === turn.performerUid;
  const performer = players.find((p) => p.uid === turn.performerUid);
  const me = players.find((p) => p.uid === myUid);
  const witnesses = players.filter(
    (p) => !p.banned && !p.spectator && p.uid !== turn.performerUid,
  );
  const hasPressedStall = turn.stallVotes.includes(myUid);
  const isDare = turn.kind === 'DARE';

  const performerStageStream = isPerformer
    ? screenSharing && screenStream
      ? screenStream
      : cameraOn && localStream
        ? localStream
        : null
    : (remoteStreams[turn.performerUid] ?? null);

  const stageHasVideo = Boolean(
    performerStageStream &&
      performerStageStream.getVideoTracks().some((t) => t.readyState === 'live' && t.enabled),
  );
  const isPerformerScreenActive = isPerformer
    ? screenSharing
    : Boolean(remoteMediaState[turn.performerUid]?.screen);
  const isPerformerVoiceActive = isPerformer
    ? voiceJoined && !micMuted
    : Boolean(remoteMediaState[turn.performerUid]?.voice);

  useEffect(() => {
    const el = stageVideoRef.current;
    if (!el) return;
    if (stageHasVideo && performerStageStream) {
      if (el.srcObject !== performerStageStream) {
        el.srcObject = performerStageStream;
      }
    } else if (el.srcObject !== null) {
      el.srcObject = null;
    }
  }, [stageHasVideo, performerStageStream]);

  const dareStageBlock = isDare ? (
    <section
      aria-label="In-Table Dare Video and Screen Stage"
      data-testid="dare-video-stage"
      className="mt-3 w-full rounded-2xl border border-[#d9b061]/40 bg-[#1b110a]/85 p-3 text-[#faeed7] shadow-[0_10px_24px_rgba(0,0,0,0.45)]"
    >
      <div className="mb-2 flex items-center justify-between text-[11px] font-semibold tracking-wider text-[#e5cfa9] uppercase">
        <span>In-Table Dare Stage</span>
        {stageHasVideo && (
          <span className="rounded-full bg-[#C4552D] px-2 py-0.5 text-[10px] font-bold text-[#FFFDF9]">
            {isPerformerScreenActive ? 'SCREEN SHARE' : 'LIVE CAM'}
          </span>
        )}
      </div>

      {/* Performer Live Video / Screen or Seat Avatar */}
      <div className="relative flex h-[168px] w-full items-center justify-center overflow-hidden rounded-xl border border-[#d9b061]/25 bg-[#120b06]">
        {stageHasVideo ? (
          <video
            ref={stageVideoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-center">
            <PlayerSeatAvatar
              name={performer?.name ?? 'Performer'}
              stream={null}
              muted
              isVoiceActive={isPerformerVoiceActive}
              size={64}
            />
            <span className="text-xs text-[#e5cfa9]/80">
              {isPerformer
                ? 'Turn on camera or share screen for the table'
                : `${performer?.name ?? 'Performer'}’s camera is off`}
            </span>
          </div>
        )}
      </div>

      {/* Witness Video / Voice Strip */}
      {witnesses.length > 0 && (
        <div className="mt-2.5 flex items-center gap-2.5 overflow-x-auto pb-1">
          {witnesses.map((w) => {
            const isMe = w.uid === myUid;
            const wStream = isMe ? localStream : (remoteStreams[w.uid] ?? null);
            const wVoice = isMe
              ? voiceJoined && !micMuted
              : Boolean(remoteMediaState[w.uid]?.voice);
            return (
              <div key={w.uid} className="flex shrink-0 flex-col items-center gap-0.5">
                <PlayerSeatAvatar
                  name={w.name}
                  stream={wStream}
                  muted
                  isVoiceActive={wVoice}
                  size={36}
                />
                <span className="max-w-[56px] truncate text-[10px] text-[#e5cfa9]">{w.name}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Action Pills: Camera On/Off, Mic Mute/Unmute, Share Screen (performer only) */}
      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          data-testid="dare-camera-toggle-btn"
          onClick={() => void toggleCamera()}
          className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold ${
            cameraOn
              ? 'border-[#79a86b] bg-[#244429] text-[#f6f1e9]'
              : 'border-[#d9b061]/45 bg-[#2d1d12] text-[#f9e5be]'
          }`}
        >
          {cameraOn ? <Video size={14} aria-hidden="true" /> : <VideoOff size={14} aria-hidden="true" />}
          <span>{cameraOn ? 'Camera On' : 'Camera Off'}</span>
        </button>

        <button
          type="button"
          data-testid="dare-mic-toggle-btn"
          onClick={() => (voiceJoined ? toggleMic() : void joinVoice())}
          className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold ${
            voiceJoined && !micMuted
              ? 'border-[#79a86b] bg-[#244429] text-[#f6f1e9]'
              : voiceJoined && micMuted
                ? 'border-[#c4552d]/70 bg-[#5c2116] text-[#f9e5be]'
                : 'border-[#d9b061]/45 bg-[#2d1d12] text-[#f9e5be]'
          }`}
        >
          {voiceJoined && !micMuted ? (
            <Mic size={14} aria-hidden="true" />
          ) : (
            <MicOff size={14} aria-hidden="true" />
          )}
          <span>{!voiceJoined ? 'Join Mic' : micMuted ? 'Mic Muted' : 'Mic On'}</span>
        </button>

        {isPerformer && (
          <button
            type="button"
            data-testid="dare-screen-share-btn"
            onClick={() => void toggleScreenShare()}
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold ${
              screenSharing
                ? 'border-[#f6cf78] bg-[#8B611E] text-[#FFFDF9]'
                : 'border-[#d9b061]/45 bg-[#234950] text-[#f6e6c6]'
            }`}
          >
            <MonitorUp size={14} aria-hidden="true" />
            <span>{screenSharing ? 'Stop Share' : 'Share Screen'}</span>
          </button>
        )}
      </div>

      {mediaError && (
        <p role="alert" className="mt-2 text-center text-[11px] font-medium text-[#f59f8b]">
          {mediaError}
        </p>
      )}
    </section>
  ) : null;

  return (
    <main className="vowlet-shell" data-testid="perform-screen">
      <div className="bg-wood-candle flex min-h-dvh flex-col pb-5">
        <BotanicalLayer darkMode />

        {/* Overhead Spotlight */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-1/2 z-0 h-[340px] w-[360px] -translate-x-1/2"
          style={{
            background:
              'radial-gradient(ellipse at 50% 0%, rgba(245, 206, 132, 0.28) 0%, rgba(245, 206, 132, 0.06) 55%, transparent 80%)',
          }}
        />

        <TopBar
          dark
          rightSlot={
            <div className="flex items-center gap-2">
              <ElapsedStopwatch
                startedAt={turn.startedAt}
                clockOffsetMs={clockOffsetMs}
                surface="lamplit"
              />
              <SyncIndicator state={syncState} surface="lamplit" />
            </div>
          }
        />

        {isPerformer ? (
          <div className="relative z-10 flex flex-1 flex-col items-center px-5 pt-2">
            <h1 className="font-cormorant text-center text-[31px] leading-tight font-bold text-[#faeed7] italic">
              Unseal the Chit...
            </h1>

            {/* Kraft Sealed Envelope with animated flap & clickable WaxSeal */}
            <div
              className={`relative mt-5 mb-4 h-[132px] w-[224px] ${
                unsealed ? 'envelope-open' : ''
              }`}
              style={{ perspective: '700px' }}
            >
              {/* Envelope Body */}
              <div className="absolute inset-0 overflow-hidden rounded-xl border border-[#8e673b] bg-gradient-to-br from-[#d9b88c] via-[#c29967] to-[#9b7243] shadow-[0_14px_26px_rgba(0,0,0,0.6)]">
                <svg viewBox="0 0 224 132" className="h-full w-full" aria-hidden="true">
                  <path d="M0 0 L112 72 L224 0" fill="none" stroke="#855d32" strokeWidth="1.5" />
                  <path d="M0 132 L84 68 M224 132 L140 68" stroke="#855d32" strokeWidth="1.2" opacity="0.65" />
                </svg>
              </div>

              {/* Animated Envelope Flap */}
              <div className="envelope-flap pointer-events-none absolute top-0 right-0 left-0 h-[76px]">
                <svg viewBox="0 0 224 76" className="h-full w-full" aria-hidden="true">
                  <polygon
                    points="0,0 224,0 112,74"
                    fill="url(#envelopeFlapGrad)"
                    stroke="#7f572e"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>

              {/* Clickable Wax Seal */}
              <button
                type="button"
                aria-label={unsealed ? 'Chit unsealed' : 'Break wax seal to reveal chit'}
                onClick={() => setUnsealed((prev) => !prev)}
                className={`wax-btn absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 ${
                  unsealed ? 'seal-cracking' : ''
                }`}
              >
                <WaxSealArtwork color={isDare ? 'red' : 'brass'} icon="emblem" size={56} />
              </button>
            </div>

            {/* Torn Note Prompt Card */}
            <div
              className="torn-note w-full -rotate-[0.8deg] px-5 py-5 text-center"
              data-testid="unsealed-chit-card"
            >
              <div className="font-cinzel text-[10px] font-bold tracking-[0.22em] text-[#75522f] uppercase">
                {turn.kind ?? 'TRUTH'} CHIT
                {isDare && turn.dareType ? ` • ${turn.dareType}` : ''}
              </div>
              <p className="font-script mt-2.5 text-[28px] leading-snug font-bold text-[#2b1d12]">
                {privatePrompt?.text ?? 'Unsealing your prompt…'}
              </p>
            </div>

            {dareStageBlock}

            {/* Truth Answer Input (optional: answer aloud or type) */}
            {!isDare && (
              <div className="chit-card mt-3 w-full p-3.5 text-left">
                <label
                  htmlFor="truth-answer-input"
                  className="font-cinzel block text-[10px] font-bold tracking-[0.18em] text-[#75522f] uppercase"
                >
                  Your Truth Answer (or answer aloud)
                </label>
                <textarea
                  id="truth-answer-input"
                  data-testid="truth-answer-input"
                  rows={2}
                  maxLength={280}
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Type your answer here for the table to read…"
                  className="font-script mt-1 w-full resize-none bg-transparent text-[20px] leading-snug text-[#2b1d12] placeholder-[#8b6b4a]/70 outline-none"
                />
                <div className="text-right text-[11px] font-medium text-[#75522f] tabular-nums">
                  {answerText.length}/280
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-auto flex w-full flex-col gap-2.5 pt-4">
              <button
                type="button"
                className="btn-teal w-full"
                disabled={pendingAction}
                data-testid="perform-done-btn"
                onClick={() => void performDone(answerText.trim() || undefined)}
              >
                <Check size={18} aria-hidden="true" />
                <span>I&apos;ve completed it</span>
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={pendingAction || Boolean(me?.swapUsed)}
                  data-testid="perform-swap-btn"
                  onClick={() => void performSwap()}
                  className="btn-parchment w-full text-[14px]"
                >
                  <RefreshCw size={15} aria-hidden="true" />
                  <span>{me?.swapUsed ? 'Swap Used' : '1 Free Swap'}</span>
                </button>

                <button
                  type="button"
                  disabled={pendingAction}
                  data-testid="perform-skip-btn"
                  onClick={() => void performSkip()}
                  className="btn-parchment w-full text-[14px]"
                >
                  <FastForward size={15} aria-hidden="true" />
                  <span>Skip (-30)</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative z-10 flex flex-1 flex-col items-center px-5 pt-2">
            <h1
              aria-live="polite"
              className="font-cormorant text-center text-[30px] leading-tight font-bold text-[#faeed7] italic"
            >
              {performer?.name ?? 'Player'} is unsealing a{' '}
              {turn.kind === 'DARE' ? 'Dare' : 'Truth'}...
            </h1>

            <div className="relative mt-6 mb-5 h-[132px] w-[224px]" aria-hidden="true">
              <div className="absolute inset-0 overflow-hidden rounded-xl border border-[#8e673b] bg-gradient-to-br from-[#d9b88c] via-[#c29967] to-[#9b7243] shadow-[0_14px_26px_rgba(0,0,0,0.6)]">
                <svg viewBox="0 0 224 132" className="h-full w-full">
                  <polygon points="0,0 224,0 112,74" fill="url(#envelopeFlapGrad)" stroke="#7f572e" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <WaxSealArtwork color="red" icon="emblem" size={56} />
              </div>
            </div>

            <div className="torn-note w-full -rotate-[0.6deg] px-5 py-5 text-center">
              <div className="font-cinzel text-[10px] font-bold tracking-[0.22em] text-[#75522f] uppercase">
                WITNESS VIEW
              </div>
              <p className="font-script mt-2 text-[26px] leading-snug font-bold text-[#2b1d12]">
                Watch closely — you&apos;ll vote once they finish.
              </p>
            </div>

            {dareStageBlock}

            {!me?.spectator && (
              <div className="mt-auto w-full pt-4">
                <button
                  type="button"
                  className="btn-parchment w-full"
                  disabled={hasPressedStall || pendingAction}
                  data-testid="taking-too-long-btn"
                  onClick={() => void performStall()}
                >
                  <Hourglass size={16} aria-hidden="true" />
                  <span>
                    {hasPressedStall
                      ? `Stall Requested (${turn.stallVotes.length}/${witnesses.length})`
                      : `Taking Too Long (${turn.stallVotes.length}/${witnesses.length})`}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
