import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TableView, TablePlayer } from '../../components/TableView';
import { Button } from '../../components/Button';
import { MOCK_PLAYERS } from '../../data/mock';
import { useAuthStore } from '../auth/authStore';
import {
  subscribeToRoom,
  subscribeToPlayers,
  setPlayerReady,
  sendHeartbeat,
  evaluateHostMigration,
  kickPlayer as firestoreKickPlayer,
  startRoomGame,
  RoomDoc,
  PlayerDoc,
} from '../../lib/firestore-room';

export interface LobbyScreenProps {
  roomCode?: string;
  isHost?: boolean;
  isReady?: boolean;
  players?: TablePlayer[];
  onToggleReady?: () => void;
  onStartGame?: () => void;
  onKickPlayer?: (uid: string) => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  roomCode: propRoomCode,
  isHost: propIsHost,
  isReady: propIsReady,
  players: propPlayers,
  onToggleReady,
  onStartGame,
  onKickPlayer,
}) => {
  const navigate = useNavigate();
  const params = useParams<{ code?: string }>();
  const { profile } = useAuthStore();

  const code = params.code || propRoomCode || '4A8K9Z';
  const isDirectRoute = Boolean(params.code);

  const [copied, setCopied] = useState(false);
  const [liveRoom, setLiveRoom] = useState<RoomDoc | null>(null);
  const [livePlayers, setLivePlayers] = useState<PlayerDoc[]>([]);

  // Real-time Firestore subscriptions for live tables
  useEffect(() => {
    if (!isDirectRoute || !code) return;

    const unsubRoom = subscribeToRoom(code, (room) => {
      setLiveRoom(room);
      if (room?.status === 'writing') {
        navigate(`/table/${code}/write`);
      }
    });

    const unsubPlayers = subscribeToPlayers(code, (playersList) => {
      setLivePlayers(playersList);
    });

    return () => {
      unsubRoom();
      unsubPlayers();
    };
  }, [isDirectRoute, code, navigate]);

  // Presence heartbeat & host migration check
  useEffect(() => {
    if (!isDirectRoute || !code || !profile?.uid) return;

    // Send immediate heartbeat on mount
    sendHeartbeat(code, profile.uid);

    const interval = setInterval(() => {
      sendHeartbeat(code, profile.uid);
      if (liveRoom && livePlayers.length > 0) {
        evaluateHostMigration(code, liveRoom.hostUid, livePlayers);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [isDirectRoute, code, profile?.uid, liveRoom, livePlayers]);

  // Check if current user got kicked
  useEffect(() => {
    if (!isDirectRoute || !profile?.uid || livePlayers.length === 0) return;
    const me = livePlayers.find((p) => p.uid === profile.uid);
    if (me?.kicked) {
      alert('You have been kicked from the table.');
      navigate('/home');
    }
  }, [isDirectRoute, profile?.uid, livePlayers, navigate]);

  // Derive active players and host status
  const currentIsHost = isDirectRoute
    ? (liveRoom ? liveRoom.hostUid === profile?.uid : false)
    : (propIsHost ?? true);

  const currentPlayer = isDirectRoute
    ? livePlayers.find((p) => p.uid === profile?.uid)
    : null;

  const currentIsReady = isDirectRoute
    ? Boolean(currentPlayer?.ready)
    : (propIsReady ?? false);

  const displayPlayers: TablePlayer[] = isDirectRoute && livePlayers.length > 0
    ? livePlayers.map((p) => ({
        uid: p.uid,
        name: p.name,
        avatarId: p.avatarId,
        isHost: p.uid === (liveRoom?.hostUid || p.isHost),
        state: (p.ready ? 'ready' : 'idle') as TablePlayer['state'],
      }))
    : (propPlayers || MOCK_PLAYERS);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleReady = async () => {
    if (onToggleReady) {
      onToggleReady();
      return;
    }
    if (isDirectRoute && code && profile?.uid) {
      await setPlayerReady(code, profile.uid, !currentIsReady);
    }
  };

  const handleStartGame = async () => {
    if (onStartGame) {
      onStartGame();
      return;
    }
    if (isDirectRoute && code) {
      await startRoomGame(code);
      navigate(`/table/${code}/write`);
    }
  };

  const handleKick = async (targetUid: string) => {
    if (onKickPlayer) {
      onKickPlayer(targetUid);
      return;
    }
    if (isDirectRoute && code) {
      await firestoreKickPlayer(code, targetUid);
    }
  };

  const unreadyPlayer = displayPlayers.find((p) => p.state !== 'ready');
  const waitingText = unreadyPlayer
    ? `Still waiting on ${unreadyPlayer.name}, as always.`
    : 'All chits ready. Time for chaos.';

  return (
    <div className="w-full flex-1 flex flex-col justify-between py-4 max-w-[390px] mx-auto text-center">
      {/* Top: Ticket-stub room code */}
      <div className="flex items-center justify-between px-4 py-2 bg-chit border-2 border-ink shadow-hard-sm rounded-btn">
        <div className="text-left">
          <div className="text-[10px] font-mono uppercase text-ink-muted">Room Code</div>
          <div className="font-mono text-xl font-black text-ink tracking-widest">{code}</div>
        </div>
        <button
          onClick={handleCopy}
          className="px-3 py-1.5 bg-chit-shade text-ink border border-ink rounded font-mono text-xs font-bold uppercase btn-press"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Center Table View */}
      <div className="py-2 flex flex-col items-center">
        <TableView
          players={displayPlayers}
          maxPlayers={liveRoom?.settings?.maxPlayers || 6}
          onSeatClick={(p) => {
            if (currentIsHost && !p.isHost) {
              if (window.confirm(`Kick ${p.name} from the table?`)) {
                handleKick(p.uid);
              }
            }
          }}
        />

        {/* Handwritten waiting line */}
        <p className="font-handwriting text-lg text-ink-muted italic mt-4 px-2">
          {waitingText}
        </p>
      </div>

      {/* Bottom Action */}
      <div className="pt-2">
        {currentIsHost ? (
          <Button fullWidth onClick={handleStartGame}>
            Start Game
          </Button>
        ) : (
          <Button
            fullWidth
            variant={currentIsReady ? 'secondary' : 'primary'}
            onClick={handleToggleReady}
          >
            {currentIsReady ? 'Ready! (Tap to Unready)' : "I'm Ready"}
          </Button>
        )}
      </div>
    </div>
  );
};
