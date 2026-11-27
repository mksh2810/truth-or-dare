import { create } from 'zustand';
import type { Phase, PromptKind } from '@vowlet/shared';
import { getIdToken, isLocalDevMode } from '../auth/firebase';

export interface PeerMediaState {
  voice: boolean;
  video: boolean;
  screen: boolean;
}

interface SignalPayload {
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  state?: PeerMediaState;
}

interface SignalMessage {
  id: number;
  fromUid: string;
  toUid: string | '*';
  kind: 'offer' | 'answer' | 'ice' | 'media-state';
  payload: SignalPayload | null;
  ts: number;
}

interface RoomContextInput {
  roomCode: string | null;
  myUid: string | null;
  peerUids: string[];
  phase: Phase | null;
  turnKind: PromptKind | null;
}

export interface MediaCallState {
  voiceJoined: boolean;
  micMuted: boolean;
  autoCamForDares: boolean;
  cameraOn: boolean;
  screenSharing: boolean;
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  remoteMediaState: Record<string, PeerMediaState>;
  mediaError: string | null;

  joinVoice: () => Promise<void>;
  leaveVoice: () => void;
  toggleMic: () => void;
  setAutoCamForDares: (enabled: boolean) => void;
  toggleCamera: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  syncRoomContext: (ctx: RoomContextInput) => void;
  clearMediaError: () => void;
  cleanupAll: () => void;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

/**
 * Dare-Only Video Rule:
 * Video & screen sharing are permitted ONLY during PERFORM or VOTE when turnKind === 'DARE'.
 */
export function isDareVideoPhase(
  phase?: Phase | string | null,
  turnKind?: PromptKind | string | null,
): boolean {
  return (phase === 'PERFORM' || phase === 'VOTE') && turnKind === 'DARE';
}

// Module-level WebRTC & signaling manager state (kept outside Zustand to avoid proxy issues on MediaStream/RTCPeerConnection)
const peerConnections = new Map<string, RTCPeerConnection>();
const pendingIce = new Map<string, RTCIceCandidateInit[]>();
let activeRoomCode: string | null = null;
let activeMyUid: string | null = null;
let activePeerUids: string[] = [];
let prevDareVideoPhase = false;
let lastSignalId = 0;
let pollTimer: number | null = null;
let pollingInFlight = false;

async function buildSignalHeaders(myUid: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (isLocalDevMode) {
    headers['x-test-uid'] = myUid;
    return headers;
  }
  try {
    const token = await getIdToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // Fallback to uid in payload/query if token unavailable
  }
  return headers;
}

async function postSignal(
  toUid: string | '*',
  kind: SignalMessage['kind'],
  payload: SignalPayload,
): Promise<void> {
  if (!activeRoomCode || !activeMyUid) return;
  try {
    const headers = await buildSignalHeaders(activeMyUid);
    await fetch('/api/rtc/signal', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        roomCode: activeRoomCode,
        fromUid: activeMyUid,
        toUid,
        kind,
        payload,
      }),
    });
  } catch {
    // Ignore transient network errors in signaling relay
  }
}

function getCurrentMediaState(): PeerMediaState {
  const s = useMediaCall.getState();
  return {
    voice: s.voiceJoined && !s.micMuted,
    video: s.cameraOn,
    screen: s.screenSharing,
  };
}

function broadcastMediaState(toUid: string | '*' = '*'): void {
  void postSignal(toUid, 'media-state', { state: getCurrentMediaState() });
}

function getOutboundVideoTrack(): MediaStreamTrack | null {
  const s = useMediaCall.getState();
  if (s.screenSharing && s.screenStream) {
    const t = s.screenStream.getVideoTracks().find((tr) => tr.readyState === 'live');
    if (t) return t;
  }
  if (s.cameraOn && s.localStream) {
    const t = s.localStream.getVideoTracks().find((tr) => tr.readyState === 'live');
    if (t) return t;
  }
  return null;
}

function getOutboundAudioTrack(): MediaStreamTrack | null {
  const s = useMediaCall.getState();
  if (s.voiceJoined && s.localStream) {
    const t = s.localStream.getAudioTracks().find((tr) => tr.readyState === 'live');
    if (t) return t;
  }
  return null;
}

function attachLocalTracksToPeer(pc: RTCPeerConnection): boolean {
  let addedNewSender = false;
  const audioTrack = getOutboundAudioTrack();
  const videoTrack = getOutboundVideoTrack();
  const combinedStream = new MediaStream();
  if (audioTrack) combinedStream.addTrack(audioTrack);
  if (videoTrack) combinedStream.addTrack(videoTrack);

  const senders = pc.getSenders();
  const audioSender = senders.find((s) => s.track?.kind === 'audio');
  const videoSender = senders.find((s) => s.track?.kind === 'video');

  if (audioTrack) {
    if (audioSender) {
      if (audioSender.track !== audioTrack) {
        void audioSender.replaceTrack(audioTrack);
      }
    } else {
      pc.addTrack(audioTrack, combinedStream);
      addedNewSender = true;
    }
  } else if (audioSender) {
    void audioSender.replaceTrack(null);
  }

  if (videoTrack) {
    if (videoSender) {
      if (videoSender.track !== videoTrack) {
        void videoSender.replaceTrack(videoTrack);
      }
    } else {
      pc.addTrack(videoTrack, combinedStream);
      addedNewSender = true;
    }
  } else if (videoSender) {
    void videoSender.replaceTrack(null);
  }

  return addedNewSender;
}

async function sendOfferToPeer(peerUid: string, pc: RTCPeerConnection): Promise<void> {
  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await postSignal(peerUid, 'offer', { sdp: pc.localDescription ?? offer });
  } catch {
    // Ignore negotiation race
  }
}

function ensurePeerConnection(peerUid: string): RTCPeerConnection {
  const existing = peerConnections.get(peerUid);
  if (existing && existing.connectionState !== 'closed') {
    return existing;
  }

  const pc = new RTCPeerConnection(RTC_CONFIG);
  peerConnections.set(peerUid, pc);

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      void postSignal(peerUid, 'ice', { candidate: event.candidate.toJSON() });
    }
  };

  pc.ontrack = (event) => {
    const incomingStream = event.streams[0] ?? new MediaStream([event.track]);
    useMediaCall.setState((prev) => ({
      remoteStreams: {
        ...prev.remoteStreams,
        [peerUid]: incomingStream,
      },
    }));
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
      peerConnections.delete(peerUid);
    }
  };

  attachLocalTracksToPeer(pc);
  return pc;
}

function syncAllPeersTracksAndRenegotiate(): void {
  for (const peerUid of activePeerUids) {
    if (peerUid === activeMyUid) continue;
    const pc = ensurePeerConnection(peerUid);
    const needsRenegotiation = attachLocalTracksToPeer(pc);
    if (needsRenegotiation || pc.signalingState === 'stable') {
      if (activeMyUid && (activeMyUid < peerUid || pc.remoteDescription !== null)) {
        void sendOfferToPeer(peerUid, pc);
      }
    }
  }
}

async function handleIncomingSignal(msg: SignalMessage): Promise<void> {
  const fromUid = msg.fromUid;
  if (!fromUid || fromUid === activeMyUid) return;

  if (msg.kind === 'media-state') {
    const state = msg.payload?.state;
    if (state) {
      useMediaCall.setState((prev) => ({
        remoteMediaState: {
          ...prev.remoteMediaState,
          [fromUid]: state,
        },
      }));
    }
    return;
  }

  const pc = ensurePeerConnection(fromUid);

  if (msg.kind === 'offer' && msg.payload?.sdp) {
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(msg.payload.sdp));
      attachLocalTracksToPeer(pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await postSignal(fromUid, 'answer', { sdp: pc.localDescription ?? answer });

      const queued = pendingIce.get(fromUid) ?? [];
      pendingIce.delete(fromUid);
      for (const c of queued) {
        await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => undefined);
      }
    } catch {
      // Ignore malformed/stale offer
    }
    return;
  }

  if (msg.kind === 'answer' && msg.payload?.sdp) {
    try {
      if (pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.payload.sdp));
        const queued = pendingIce.get(fromUid) ?? [];
        pendingIce.delete(fromUid);
        for (const c of queued) {
          await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => undefined);
        }
      }
    } catch {
      // Ignore stale answer
    }
    return;
  }

  if (msg.kind === 'ice' && msg.payload?.candidate) {
    if (pc.remoteDescription) {
      await pc.addIceCandidate(new RTCIceCandidate(msg.payload.candidate)).catch(() => undefined);
    } else {
      const list = pendingIce.get(fromUid) ?? [];
      list.push(msg.payload.candidate);
      pendingIce.set(fromUid, list);
    }
  }
}

async function pollSignalsOnce(): Promise<void> {
  if (!activeRoomCode || !activeMyUid || pollingInFlight) return;
  pollingInFlight = true;
  try {
    const headers = await buildSignalHeaders(activeMyUid);
    const url = `/api/rtc/signal?roomCode=${encodeURIComponent(activeRoomCode)}&since=${lastSignalId}&uid=${encodeURIComponent(activeMyUid)}`;
    const res = await fetch(url, { method: 'GET', headers });
    if (!res.ok) return;
    const data = (await res.json()) as {
      ok?: boolean;
      signals?: SignalMessage[];
      lastId?: number;
    };
    if (typeof data.lastId === 'number' && data.lastId > lastSignalId) {
      lastSignalId = data.lastId;
    }
    if (Array.isArray(data.signals)) {
      for (const sig of data.signals) {
        await handleIncomingSignal(sig);
      }
    }
  } catch {
    // Ignore transient polling failures
  } finally {
    pollingInFlight = false;
  }
}

function startSignalingLoop(): void {
  if (pollTimer !== null || typeof window === 'undefined') return;
  void pollSignalsOnce();
  pollTimer = window.setInterval(() => {
    void pollSignalsOnce();
  }, 1500);
}

function stopSignalingLoop(): void {
  if (pollTimer !== null && typeof window !== 'undefined') {
    window.clearInterval(pollTimer);
    pollTimer = null;
  }
  pollingInFlight = false;
}

function closeAllPeers(): void {
  for (const pc of peerConnections.values()) {
    try {
      pc.close();
    } catch {
      // Ignore
    }
  }
  peerConnections.clear();
  pendingIce.clear();
}

function stopStreamTracks(stream: MediaStream | null, kind?: 'audio' | 'video'): void {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    if (!kind || track.kind === kind) {
      track.stop();
      stream.removeTrack(track);
    }
  }
}

function formatMediaError(err: unknown, fallback: string): string {
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      return 'Permission denied — allow microphone/camera access in your browser.';
    }
    if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      return 'No microphone or camera device found.';
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export const useMediaCall = create<MediaCallState>((set, get) => ({
  voiceJoined: false,
  micMuted: false,
  autoCamForDares: false,
  cameraOn: false,
  screenSharing: false,
  localStream: null,
  screenStream: null,
  remoteStreams: {},
  remoteMediaState: {},
  mediaError: null,

  joinVoice: async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      set({ mediaError: 'Voice call is not supported in this browser.' });
      return;
    }
    try {
      const existing = get().localStream;
      const existingVideo = existing?.getVideoTracks().find((t) => t.readyState === 'live') ?? null;
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const nextStream = new MediaStream();
      for (const t of micStream.getAudioTracks()) {
        t.enabled = true;
        nextStream.addTrack(t);
      }
      if (existingVideo) {
        nextStream.addTrack(existingVideo);
      }
      if (existing) {
        stopStreamTracks(existing, 'audio');
      }

      set({
        voiceJoined: true,
        micMuted: false,
        localStream: nextStream,
        mediaError: null,
      });

      startSignalingLoop();
      syncAllPeersTracksAndRenegotiate();
      broadcastMediaState();
    } catch (err) {
      set({ mediaError: formatMediaError(err, 'Could not join voice call.') });
    }
  },

  leaveVoice: () => {
    const { localStream, cameraOn, screenSharing } = get();
    stopStreamTracks(localStream, 'audio');
    const remainingTracks = localStream?.getTracks().filter((t) => t.readyState === 'live') ?? [];
    set({
      voiceJoined: false,
      micMuted: false,
      localStream: remainingTracks.length > 0 ? localStream : null,
    });
    if (!cameraOn && !screenSharing) {
      // Keep signaling loop if still in room so we can still receive others' Dare video,
      // but update peer senders and broadcast state.
    }
    syncAllPeersTracksAndRenegotiate();
    broadcastMediaState();
  },

  toggleMic: () => {
    const { voiceJoined, micMuted, localStream } = get();
    if (!voiceJoined) return;
    const nextMuted = !micMuted;
    if (localStream) {
      for (const track of localStream.getAudioTracks()) {
        track.enabled = !nextMuted;
      }
    }
    set({ micMuted: nextMuted });
    broadcastMediaState();
  },

  setAutoCamForDares: (enabled) => {
    set({ autoCamForDares: enabled });
  },

  toggleCamera: async () => {
    const { cameraOn, voiceJoined, micMuted, localStream } = get();
    if (cameraOn) {
      stopStreamTracks(localStream, 'video');
      const remaining = localStream?.getTracks().filter((t) => t.readyState === 'live') ?? [];
      set({
        cameraOn: false,
        localStream: remaining.length > 0 ? localStream : null,
      });
      syncAllPeersTracksAndRenegotiate();
      broadcastMediaState();
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      set({ mediaError: 'Camera is not supported in this browser.' });
      return;
    }

    try {
      const camStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: voiceJoined,
      });
      if (localStream) {
        stopStreamTracks(localStream);
      }
      for (const track of camStream.getAudioTracks()) {
        track.enabled = !micMuted;
      }
      set({
        cameraOn: true,
        localStream: camStream,
        mediaError: null,
      });
      startSignalingLoop();
      syncAllPeersTracksAndRenegotiate();
      broadcastMediaState();
    } catch (err) {
      set({ mediaError: formatMediaError(err, 'Could not turn on camera.') });
    }
  },

  toggleScreenShare: async () => {
    const { screenSharing, screenStream } = get();
    if (screenSharing) {
      stopStreamTracks(screenStream);
      set({ screenSharing: false, screenStream: null });
      syncAllPeersTracksAndRenegotiate();
      broadcastMediaState();
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
      set({ mediaError: 'Screen sharing is not supported in this browser.' });
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      const videoTrack = displayStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          const cur = get();
          if (cur.screenSharing) {
            stopStreamTracks(cur.screenStream);
            set({ screenSharing: false, screenStream: null });
            syncAllPeersTracksAndRenegotiate();
            broadcastMediaState();
          }
        };
      }
      set({
        screenSharing: true,
        screenStream: displayStream,
        mediaError: null,
      });
      startSignalingLoop();
      syncAllPeersTracksAndRenegotiate();
      broadcastMediaState();
    } catch (err) {
      set({ mediaError: formatMediaError(err, 'Could not start screen sharing.') });
    }
  },

  syncRoomContext: ({ roomCode, myUid, peerUids, phase, turnKind }) => {
    const roomChanged = roomCode !== activeRoomCode || myUid !== activeMyUid;
    if (roomChanged) {
      closeAllPeers();
      stopSignalingLoop();
      lastSignalId = 0;
      prevDareVideoPhase = false;
      activeRoomCode = roomCode;
      activeMyUid = myUid;
      set({ remoteStreams: {}, remoteMediaState: {} });
    }

    activePeerUids = peerUids.filter((u) => u && u !== myUid);

    // Clean up closed/left peers
    for (const [uid, pc] of peerConnections.entries()) {
      if (!activePeerUids.includes(uid)) {
        try {
          pc.close();
        } catch {
          // Ignore
        }
        peerConnections.delete(uid);
      }
    }

    if (!roomCode || !myUid) {
      get().cleanupAll();
      return;
    }

    startSignalingLoop();

    // Dare-Only Video Rule enforcement
    const dareVideo = isDareVideoPhase(phase, turnKind);
    const { cameraOn, screenSharing, localStream, screenStream, autoCamForDares } = get();

    if (!dareVideo) {
      let changed = false;
      if (cameraOn) {
        stopStreamTracks(localStream, 'video');
        changed = true;
      }
      if (screenSharing) {
        stopStreamTracks(screenStream);
        changed = true;
      }
      if (changed) {
        const remaining = localStream?.getTracks().filter((t) => t.readyState === 'live') ?? [];
        set({
          cameraOn: false,
          screenSharing: false,
          screenStream: null,
          localStream: remaining.length > 0 ? localStream : null,
        });
        syncAllPeersTracksAndRenegotiate();
        broadcastMediaState();
      }
    } else if (!prevDareVideoPhase && autoCamForDares && !cameraOn) {
      void get().toggleCamera();
    }

    prevDareVideoPhase = dareVideo;
  },

  clearMediaError: () => set({ mediaError: null }),

  cleanupAll: () => {
    const { localStream, screenStream } = get();
    stopStreamTracks(localStream);
    stopStreamTracks(screenStream);
    stopSignalingLoop();
    closeAllPeers();
    activeRoomCode = null;
    activeMyUid = null;
    activePeerUids = [];
    prevDareVideoPhase = false;
    lastSignalId = 0;
    set({
      voiceJoined: false,
      micMuted: false,
      cameraOn: false,
      screenSharing: false,
      localStream: null,
      screenStream: null,
      remoteStreams: {},
      remoteMediaState: {},
      mediaError: null,
    });
  },
}));
