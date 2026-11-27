import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from '../_lib/middleware.js';

interface SignalMessage {
  id: number;
  fromUid: string;
  toUid: string | '*';
  kind: 'offer' | 'answer' | 'ice' | 'media-state';
  payload: unknown;
  ts: number;
}

const roomSignals = new Map<string, SignalMessage[]>();
let nextSignalId = 1;

/**
 * Lightweight in-game WebRTC signaling relay (no external video service needed).
 * POST /api/rtc/signal -> enqueue offer/answer/ice/media-state for room peers
 * GET  /api/rtc/signal?roomCode=XXXXXX&since=0 -> fetch signals addressed to caller
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!applyCors(req, res)) return;

  const uid =
    typeof req.headers['x-test-uid'] === 'string' && req.headers['x-test-uid'].trim()
      ? req.headers['x-test-uid'].trim()
      : '';

  if (req.method === 'GET') {
    const roomCode = String(req.query.roomCode ?? '').toUpperCase();
    const since = Number(req.query.since ?? 0) || 0;
    const targetUid = String(req.query.uid ?? uid);
    if (!roomCode) {
      res.status(400).json({ ok: false, error: 'roomCode required' });
      return;
    }
    const list = roomSignals.get(roomCode) ?? [];
    const now = Date.now();
    // Prune signals older than 60s
    const fresh = list.filter((m) => now - m.ts < 60_000);
    roomSignals.set(roomCode, fresh);

    const matching = fresh.filter(
      (m) => m.id > since && m.fromUid !== targetUid && (m.toUid === '*' || m.toUid === targetUid),
    );
    res.status(200).json({
      ok: true,
      signals: matching,
      lastId: fresh.length > 0 ? fresh[fresh.length - 1]!.id : since,
    });
    return;
  }

  if (req.method === 'POST') {
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as {
      roomCode?: string;
      fromUid?: string;
      toUid?: string;
      kind?: SignalMessage['kind'];
      payload?: unknown;
    };
    const roomCode = String(body?.roomCode ?? '').toUpperCase();
    const fromUid = String(body?.fromUid ?? uid);
    if (!roomCode || !fromUid || !body?.kind) {
      res.status(400).json({ ok: false, error: 'roomCode, fromUid, and kind are required' });
      return;
    }
    const list = roomSignals.get(roomCode) ?? [];
    const msg: SignalMessage = {
      id: nextSignalId++,
      fromUid,
      toUid: body.toUid ?? '*',
      kind: body.kind,
      payload: body.payload ?? null,
      ts: Date.now(),
    };
    list.push(msg);
    if (list.length > 250) list.splice(0, list.length - 250);
    roomSignals.set(roomCode, list);
    res.status(200).json({ ok: true, id: msg.id });
    return;
  }

  res.status(405).json({ ok: false, error: 'Method not allowed' });
}
