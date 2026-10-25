import React, { useState } from 'react';
import { TableView, TablePlayer } from '../../components/TableView';
import { Button } from '../../components/Button';
import { MOCK_PLAYERS } from '../../data/mock';

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
  roomCode = '4A8K9Z',
  isHost = true,
  isReady = false,
  players = MOCK_PLAYERS,
  onToggleReady,
  onStartGame,
  onKickPlayer,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const unreadyPlayer = players.find((p) => p.state !== 'ready');
  const waitingText = unreadyPlayer
    ? `Still waiting on ${unreadyPlayer.name}, as always.`
    : 'All chits ready. Time for chaos.';

  return (
    <div className="w-full flex-1 flex flex-col justify-between py-4 max-w-[390px] mx-auto text-center">
      {/* Top: Ticket-stub room code */}
      <div className="flex items-center justify-between px-4 py-2 bg-chit border-2 border-ink shadow-hard-sm rounded-btn">
        <div className="text-left">
          <div className="text-[10px] font-mono uppercase text-ink-muted">Room Code</div>
          <div className="font-mono text-xl font-black text-ink tracking-widest">{roomCode}</div>
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
          players={players}
          maxPlayers={6}
          onSeatClick={(p) => {
            if (isHost && !p.isHost) {
              if (window.confirm(`Kick ${p.name} from the table?`)) {
                onKickPlayer?.(p.uid);
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
        {isHost ? (
          <Button fullWidth onClick={onStartGame}>
            Start Game
          </Button>
        ) : (
          <Button
            fullWidth
            variant={isReady ? 'secondary' : 'primary'}
            onClick={onToggleReady}
          >
            {isReady ? 'Ready! (Tap to Unready)' : "I'm Ready"}
          </Button>
        )}
      </div>
    </div>
  );
};
