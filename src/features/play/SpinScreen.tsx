import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TableView, TablePlayer } from '../../components/TableView';
import { Bottle } from '../../components/Bottle';
import { Button } from '../../components/Button';
import { Chit } from '../../components/Chit';
import { MOCK_PLAYERS } from '../../data/mock';

export interface SpinScreenProps {
  players?: TablePlayer[];
  onLanded?: (performer: TablePlayer) => void;
  onProceedToPerform?: () => void;
}

export const SpinScreen: React.FC<SpinScreenProps> = ({
  players = MOCK_PLAYERS,
  onLanded,
  onProceedToPerform,
}) => {
  const navigate = useNavigate();
  const params = useParams<{ code?: string }>();
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'landed'>('idle');
  const [rotation, setRotation] = useState(0);
  const [landedPerformer, setLandedPerformer] = useState<TablePlayer | null>(null);

  const startSpin = () => {
    if (phase === 'spinning') return;
    setPhase('spinning');

    // Pick target player randomly
    const targetIdx = Math.floor(Math.random() * players.length);
    const targetPlayer = players[targetIdx] || players[0];
    const totalSlots = Math.max(players.length, 6);
    // Angle in degrees corresponding to target slot (offset by 90deg for top center orientation)
    const targetAngle = (targetIdx / totalSlots) * 360 + 90;
    // Accumulate 5 full turns (1800 deg) plus target angle
    const finalRot = rotation + 1800 + targetAngle;
    setRotation(finalRot);

    setTimeout(() => {
      setPhase('landed');
      setLandedPerformer(targetPlayer);
      onLanded?.(targetPlayer);
    }, 3500); // 3.5 seconds spin as specified in 3.6
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-between py-4 max-w-[390px] mx-auto text-center">
      {/* Top Header */}
      <div>
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-ink-muted">
          ROUND 1 OF 1
        </span>
        <h1 className="font-display text-3xl font-black text-ink">
          The Bottle Decides
        </h1>
      </div>

      {/* Center Table & Bottle */}
      <div className="py-2 flex flex-col items-center">
        <TableView
          players={players}
          performerUid={landedPerformer?.uid}
          centerElement={
            <Bottle
              skin="green"
              rotation={rotation}
              spinning={phase === 'spinning'}
              onClick={startSpin}
            />
          }
        />

        {/* Status prompt */}
        {phase === 'idle' && (
          <p className="font-handwriting text-xl text-ink-muted italic mt-4">
            Flick the bottle to spin...
          </p>
        )}
        {phase === 'spinning' && (
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-dare animate-pulse mt-4">
            Spinning...
          </p>
        )}
        {phase === 'landed' && landedPerformer && (
          <div className="mt-4 w-full animate-fade-in space-y-2">
            <p className="font-mono text-xs uppercase font-bold text-ink">
              Landed on <span className="text-dare font-black">{landedPerformer.name}</span>!
            </p>
            <Chit
              type="dare"
              stamp="FINE"
              text="Do your best runway model walk across the room while giving a dramatic speech."
            />
          </div>
        )}
      </div>

      {/* Bottom Action */}
      <div className="pt-4">
        {phase === 'idle' && (
          <Button fullWidth onClick={startSpin}>
            Spin the Bottle
          </Button>
        )}
        {phase === 'spinning' && (
          <Button fullWidth disabled>
            Spinning...
          </Button>
        )}
        {phase === 'landed' && (
          <Button
            fullWidth
            onClick={() => {
              if (onProceedToPerform) {
                onProceedToPerform();
              } else {
                const code = params.code || 'local';
                navigate(`/table/${code}/summary`);
              }
            }}
          >
            Perform Dare →
          </Button>
        )}
      </div>
    </div>
  );
};
