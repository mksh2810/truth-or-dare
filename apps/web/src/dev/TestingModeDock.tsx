import { useEffect, useRef, useState } from 'react';
import { FlaskConical, Users, Play, RefreshCw, Eye, X, Vote, AlertTriangle, FastForward } from 'lucide-react';
import { useGameStore } from '../state/useGameStore';
import type { VoteVerdict } from '@vowlet/shared';

const BOT_PROFILES = [
  { uid: 'bot-aarav', name: 'Aarav', avatar: 'owl-1' },
  { uid: 'bot-diya', name: 'Diya', avatar: 'owl-2' },
  { uid: 'bot-rohan', name: 'Rohan', avatar: 'owl-3' },
  { uid: 'bot-meera', name: 'Meera', avatar: 'owl-4' },
  { uid: 'bot-kabir', name: 'Kabir', avatar: 'owl-5' },
  { uid: 'bot-ananya', name: 'Ananya', avatar: 'owl-6' },
  { uid: 'bot-vikram', name: 'Vikram', avatar: 'owl-7' },
];

async function apiPostAs(uid: string, path: string, body: Record<string, unknown>) {
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-test-uid': uid,
    },
    body: JSON.stringify({
      ...body,
      idempotencyKey: crypto.randomUUID(),
    }),
  });
  return res.json().catch(() => ({ ok: false }));
}

export function TestingModeDock() {
  const [open, setOpen] = useState(false);
  const [autoPlayBots, setAutoPlayBots] = useState(true);
  const [busy, setBusy] = useState(false);

  const room = useGameStore((s) => s.room);
  const turn = useGameStore((s) => s.turn);
  const players = useGameStore((s) => s.players);
  const auth = useGameStore((s) => s.auth);
  const consentAccepted = useGameStore((s) => s.consentAccepted);
  const acceptConsent = useGameStore((s) => s.acceptConsent);
  const createRoom = useGameStore((s) => s.createRoom);
  const leaveRoom = useGameStore((s) => s.leaveRoom);
  const setTableDisplayActive = useGameStore((s) => s.setTableDisplayActive);
  const tableDisplayActive = useGameStore((s) => s.tableDisplayActive);
  const passThePhone = useGameStore((s) => s.passThePhone);
  const setPassThePhone = useGameStore((s) => s.setPassThePhone);
  const showToast = useGameStore((s) => s.showToast);

  const lastHandledRef = useRef<string>('');
  const originalUidRef = useRef<string | null>(null);

  useEffect(() => {
    if (auth?.uid && !auth.uid.startsWith('bot-') && !originalUidRef.current) {
      originalUidRef.current = auth.uid;
    }
  }, [auth?.uid]);

  // Fast auto-play bots across WRITING, SPIN, CHOOSE, PERFORM, VOTE, RESULT
  useEffect(() => {
    if (!autoPlayBots || !room) return;
    const key = `${room.code}:${room.phase}:${room.turnVersion}:${turn?.performerUid ?? ''}`;
    if (lastHandledRef.current === key) return;

    const botPlayers = players.filter((p) => p.uid.startsWith('bot-') && !p.banned && !p.spectator);
    if (botPlayers.length === 0) return;

    let cancelled = false;
    const delayMs = room.phase === 'RESULT' ? 1400 : room.phase === 'SPIN' ? 2200 : 350;

    const timer = window.setTimeout(async () => {
      if (cancelled) return;
      lastHandledRef.current = key;

      if (room.phase === 'WRITING') {
        for (const bot of botPlayers) {
          await apiPostAs(bot.uid, '/api/chit/submit', {
            roomCode: room.code,
            kind: 'TRUTH',
            text: `${bot.name}'s truth: What is your funniest midnight snack?`,
          });
          await apiPostAs(bot.uid, '/api/chit/submit', {
            roomCode: room.code,
            kind: 'DARE',
            dareType: 'INSTANT',
            text: `${bot.name}'s dare: Speak in a dramatic movie trailer voice for 15s.`,
          });
        }
        return;
      }

      if (room.phase === 'SPIN') {
        await apiPostAs(botPlayers[0]!.uid, '/api/turn/advance', {
          roomCode: room.code,
          expectedPhase: 'SPIN',
          expectedVersion: room.turnVersion,
          force: true,
        });
        return;
      }

      if (room.phase === 'CHOOSE' && turn?.performerUid?.startsWith('bot-')) {
        const choice = room.round % 2 === 0 ? 'DARE' : 'TRUTH';
        await apiPostAs(turn.performerUid, '/api/turn/choose', {
          roomCode: room.code,
          expectedPhase: 'CHOOSE',
          expectedVersion: room.turnVersion,
          choice,
        });
        return;
      }

      if (room.phase === 'PERFORM' && turn?.performerUid?.startsWith('bot-')) {
        await apiPostAs(turn.performerUid, '/api/turn/perform/done', {
          roomCode: room.code,
          expectedPhase: 'PERFORM',
          expectedVersion: room.turnVersion,
          ...(turn.kind === 'TRUTH'
            ? { answerText: `${players.find((p) => p.uid === turn.performerUid)?.name ?? 'Bot'}: Cold pizza at 2 AM!` }
            : {}),
        });
        return;
      }

      if (room.phase === 'VOTE') {
        const witnessBots = botPlayers.filter((b) => b.uid !== turn?.performerUid);
        for (const bot of witnessBots) {
          await apiPostAs(bot.uid, '/api/turn/vote', {
            roomCode: room.code,
            expectedPhase: 'VOTE',
            expectedVersion: room.turnVersion,
            verdict: 'APPROVE',
          });
        }
        // If human isn't a witness (i.e. human is performer), bots were all the witnesses -> advance!
        if (turn?.performerUid === auth?.uid) {
          await apiPostAs(botPlayers[0]!.uid, '/api/turn/advance', {
            roomCode: room.code,
            expectedPhase: 'VOTE',
            expectedVersion: room.turnVersion,
            force: true,
          });
        }
        return;
      }

      if (room.phase === 'RESULT') {
        await apiPostAs(botPlayers[0]!.uid, '/api/turn/advance', {
          roomCode: room.code,
          expectedPhase: 'RESULT',
          expectedVersion: room.turnVersion,
          force: true,
        });
      }
    }, delayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [autoPlayBots, room, turn, players, auth?.uid]);

  const handleQuickStartRoom = async () => {
    setBusy(true);
    try {
      if (!consentAccepted) acceptConsent();
      const code = await createRoom({
        name: 'You',
        settings: {
          quickPlay: true,
        },
      });
      for (const bot of BOT_PROFILES.slice(0, 3)) {
        await apiPostAs(bot.uid, '/api/room/join', {
          roomCode: code,
          name: bot.name,
          avatar: bot.avatar,
        });
        await apiPostAs(bot.uid, '/api/room/settings', {
          roomCode: code,
          expectedPhase: 'LOBBY',
          ready: true,
        });
      }
      showToast(`Test table ${code} ready with 3 bots!`, 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Quick start failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleAddBots = async (count: number) => {
    if (!room) return;
    setBusy(true);
    try {
      const existingUids = new Set(players.map((p) => p.uid));
      const available = BOT_PROFILES.filter((b) => !existingUids.has(b.uid)).slice(0, count);
      for (const bot of available) {
        await apiPostAs(bot.uid, '/api/room/join', {
          roomCode: room.code,
          name: bot.name,
          avatar: bot.avatar,
        });
        await apiPostAs(bot.uid, '/api/room/settings', {
          roomCode: room.code,
          expectedPhase: 'LOBBY',
          ready: true,
        });
      }
      showToast(`Added ${available.length} bot(s) & marked ready`, 'success');
    } finally {
      setBusy(false);
    }
  };

  const handleBotsVote = async (mode: 'APPROVE' | 'REJECT' | 'TIE') => {
    if (!room || room.phase !== 'VOTE') return;
    const witnessBots = players.filter(
      (p) => p.uid.startsWith('bot-') && !p.banned && !p.spectator && p.uid !== turn?.performerUid,
    );
    for (let i = 0; i < witnessBots.length; i++) {
      const bot = witnessBots[i]!;
      const verdict: VoteVerdict =
        mode === 'TIE' ? (i % 2 === 0 ? 'APPROVE' : 'REJECT') : mode;
      await apiPostAs(bot.uid, '/api/turn/vote', {
        roomCode: room.code,
        expectedPhase: 'VOTE',
        expectedVersion: room.turnVersion,
        verdict,
      });
    }
    showToast(`Bots voted: ${mode}`, 'info');
  };

  const handleBotsStall = async () => {
    if (!room || room.phase !== 'PERFORM') return;
    const witnessBots = players.filter(
      (p) => p.uid.startsWith('bot-') && !p.banned && !p.spectator && p.uid !== turn?.performerUid,
    );
    for (const bot of witnessBots) {
      await apiPostAs(bot.uid, '/api/turn/perform/stall', {
        roomCode: room.code,
        expectedPhase: 'PERFORM',
        expectedVersion: room.turnVersion,
      });
    }
    showToast('Bots triggered Taking Too Long (STALLED)', 'info');
  };

  const handleForceAdvance = async () => {
    if (!room || !auth) return;
    if (room.phase === 'LOBBY') {
      const res = await apiPostAs(room.hostUid, '/api/room/start', {
        roomCode: room.code,
        expectedPhase: 'LOBBY',
        expectedVersion: room.turnVersion,
      });
      if (!res.ok) showToast(res.error?.message ?? 'Need 3+ players', 'error');
      return;
    }
    if (room.phase === 'PERFORM' && turn?.performerUid) {
      await apiPostAs(turn.performerUid, '/api/turn/perform/done', {
        roomCode: room.code,
        expectedPhase: 'PERFORM',
        expectedVersion: room.turnVersion,
      });
      return;
    }
    const res = await apiPostAs(auth.uid, '/api/turn/advance', {
      roomCode: room.code,
      expectedPhase: room.phase,
      expectedVersion: room.turnVersion,
      force: true,
    });
    if (!res.ok) {
      showToast(res.error?.message ?? 'Could not force advance', 'error');
    }
  };

  const switchSeat = (uid: string, name: string) => {
    useGameStore.setState({
      auth: {
        uid,
        isAnonymous: true,
        displayName: name,
        email: null,
        photoURL: null,
      },
    });
    showToast(`Switched view to ${name}`, 'info');
  };

  if (!open) {
    return (
      <button
        type="button"
        data-testid="testing-mode-toggle"
        onClick={() => setOpen(true)}
        className="fixed bottom-3 right-3 z-50 flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#C99A4E] bg-[#17343A] px-3.5 py-2 text-xs font-semibold text-[#F6E6C6] shadow-lg"
      >
        <FlaskConical className="h-4 w-4 text-[#F2D296]" aria-hidden="true" />
        <span>Test Mode</span>
      </button>
    );
  }

  return (
    <aside
      data-testid="testing-mode-panel"
      aria-label="Testing Mode Controls"
      className="fixed bottom-3 right-3 z-50 w-[320px] max-w-[calc(100vw-24px)] max-h-[80dvh] overflow-y-auto rounded-2xl border border-[#C99A4E] bg-[#1B110B]/95 p-3.5 text-xs text-[#F6E6C6] shadow-2xl backdrop-blur-md"
    >
      <div className="mb-2.5 flex items-center justify-between border-b border-[#C99A4E]/30 pb-2">
        <div className="flex items-center gap-1.5 font-cinzel font-bold text-[#F2D296]">
          <FlaskConical className="h-4 w-4" aria-hidden="true" />
          <span>VOWLET TEST MODE</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close Test Mode"
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Room & Bot Setup */}
      <div className="space-y-2">
        {!room ? (
          <button
            type="button"
            disabled={busy}
            onClick={handleQuickStartRoom}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#244C53] px-3 py-2 font-semibold text-[#F6E6C6] border border-[#C99A4E]/60"
          >
            <Play className="h-3.5 w-3.5" />
            <span>Quick Start Room + 3 Bots</span>
          </button>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-1.5">
              <span>
                Room <strong>{room.code}</strong> · <strong>{room.phase}</strong> (v{room.turnVersion})
              </span>
              <button
                type="button"
                onClick={() => void leaveRoom()}
                className="text-[11px] text-red-300 underline"
              >
                Leave
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                disabled={busy || players.length >= 8}
                onClick={() => handleAddBots(3)}
                className="flex items-center justify-center gap-1 rounded-lg bg-white/10 px-2 py-1.5 font-medium hover:bg-white/15 disabled:opacity-40"
              >
                <Users className="h-3.5 w-3.5" />
                <span>+3 Bots</span>
              </button>
              <button
                type="button"
                data-testid="force-advance-btn"
                onClick={handleForceAdvance}
                className="flex items-center justify-center gap-1 rounded-lg bg-[#C99A4E] text-[#1B110B] px-2 py-1.5 font-bold hover:brightness-105"
              >
                <FastForward className="h-3.5 w-3.5" />
                <span>Force Advance</span>
              </button>
            </div>

            <label className="flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-1.5 cursor-pointer">
              <span>Auto-Play Bots (Fast)</span>
              <input
                type="checkbox"
                checked={autoPlayBots}
                onChange={(e) => setAutoPlayBots(e.target.checked)}
                className="accent-[#C99A4E]"
              />
            </label>

            {/* Perspective / Seat Switcher */}
            <div>
              <div className="mb-1 flex items-center gap-1 text-[11px] text-[#D4B07A]">
                <Eye className="h-3 w-3" />
                <span>Act as Player (switch perspective):</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {players.map((p) => {
                  const active = auth?.uid === p.uid;
                  const isPerf = turn?.performerUid === p.uid;
                  return (
                    <button
                      key={p.uid}
                      type="button"
                      onClick={() => switchSeat(p.uid, p.name)}
                      className={`rounded-full px-2.5 py-1 text-[11px] border ${
                        active
                          ? 'border-[#F2D296] bg-[#C99A4E] text-[#1B110B] font-bold'
                          : 'border-white/15 bg-white/5 text-[#F6E6C6]'
                      }`}
                    >
                      {p.name}
                      {isPerf ? ' ★' : ''}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Phase Simulators */}
            {room.phase === 'VOTE' && (
              <div className="space-y-1 pt-1 border-t border-white/10">
                <div className="flex items-center gap-1 text-[11px] text-[#D4B07A]">
                  <Vote className="h-3 w-3" />
                  <span>Simulate Bot Votes:</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => handleBotsVote('APPROVE')}
                    className="rounded-lg bg-[#275735] py-1.5 font-semibold"
                  >
                    All Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBotsVote('REJECT')}
                    className="rounded-lg bg-[#891F16] py-1.5 font-semibold"
                  >
                    All Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBotsVote('TIE')}
                    className="rounded-lg bg-[#8A6420] py-1.5 font-semibold"
                  >
                    Tie (Split)
                  </button>
                </div>
              </div>
            )}

            {room.phase === 'PERFORM' && (
              <button
                type="button"
                onClick={handleBotsStall}
                className="flex w-full items-center justify-center gap-1 rounded-lg bg-[#A63C24] py-1.5 font-semibold"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Bots: Trigger Stall (&gt;50%)</span>
              </button>
            )}

            {/* Mode Toggles */}
            <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-white/10">
              <button
                type="button"
                onClick={() => setTableDisplayActive(!tableDisplayActive)}
                className={`rounded-lg py-1.5 border ${
                  tableDisplayActive
                    ? 'border-[#F2D296] bg-[#C99A4E]/25 font-semibold'
                    : 'border-white/15 bg-white/5'
                }`}
              >
                Table Mode: {tableDisplayActive ? 'ON' : 'OFF'}
              </button>
              <button
                type="button"
                onClick={() => setPassThePhone(!passThePhone)}
                className={`rounded-lg py-1.5 border ${
                  passThePhone
                    ? 'border-[#F2D296] bg-[#C99A4E]/25 font-semibold'
                    : 'border-white/15 bg-white/5'
                }`}
              >
                Pass-Phone: {passThePhone ? 'ON' : 'OFF'}
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
