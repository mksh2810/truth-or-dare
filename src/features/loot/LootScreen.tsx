import React, { useState } from 'react';
import { Bottle } from '../../components/Bottle';
import { Sheet } from '../../components/Sheet';
import { Button } from '../../components/Button';
import { BottomNav } from '../../components/BottomNav';
import { MOCK_BOTTLES } from '../../data/mock';

export interface LootScreenProps {
  onEquipBottle?: (id: string) => void;
  userLevel?: number;
}

export const LootScreen: React.FC<LootScreenProps> = ({
  onEquipBottle,
  userLevel = 6,
}) => {
  const [selectedBottle, setSelectedBottle] = useState<typeof MOCK_BOTTLES[0] | null>(null);
  const [equippedId, setEquippedId] = useState('green');

  return (
    <div className="w-full flex-1 flex flex-col justify-between pb-24 max-w-[390px] mx-auto">
      <div className="space-y-6 pt-2">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-ink-muted">
            COLLECTION & SKINS
          </span>
          <h1 className="font-display text-3xl font-black text-ink mt-1">
            Bottle Shelf
          </h1>
          <p className="font-sans text-xs text-ink-muted">
            Level up to unlock custom bottles for table spins.
          </p>
        </div>

        {/* Wooden Shelf Grid */}
        <div className="p-4 bg-[#F5EDE6] border-2 border-ink shadow-hard rounded-btn space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {MOCK_BOTTLES.map((b) => {
              const isUnlocked = userLevel >= b.level;
              const isEquipped = equippedId === b.id;

              return (
                <button
                  key={b.id}
                  onClick={() => setSelectedBottle(b)}
                  className={`relative p-3 bg-chit border-2 border-ink rounded-btn flex flex-col items-center justify-between min-h-[140px] btn-press ${
                    isEquipped ? 'ring-2 ring-dare shadow-hard-sm' : 'shadow-sm'
                  } ${!isUnlocked ? 'opacity-60 bg-chit-shade' : ''}`}
                >
                  {isEquipped && (
                    <span className="absolute top-1 right-1 px-1 py-0.2 bg-dare text-white font-mono text-[8px] font-bold uppercase rounded">
                      Equipped
                    </span>
                  )}

                  {!isUnlocked && (
                    <span className="absolute top-1 right-1 text-sm">🔒</span>
                  )}

                  <div className="py-2 scale-75 transform origin-center">
                    <Bottle skin={b.skin} />
                  </div>

                  <div className="w-full text-center">
                    <div className="font-mono text-[10px] font-bold text-ink truncate">
                      {b.name}
                    </div>
                    <div className="font-mono text-[9px] text-ink-muted">
                      {isUnlocked ? 'Unlocked' : `Lv ${b.level}`}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {/* Wooden plank shelf divider */}
          <div className="w-full h-3 bg-[#D4A373] border-2 border-ink rounded-full shadow-sm" />
        </div>
      </div>

      {/* Bottle Detail Bottom Sheet */}
      <Sheet
        isOpen={!!selectedBottle}
        onClose={() => setSelectedBottle(null)}
        title={selectedBottle?.name}
      >
        {selectedBottle && (
          <div className="space-y-4 text-center">
            <div className="py-4 flex justify-center">
              <Bottle skin={selectedBottle.skin} />
            </div>

            <p className="font-mono text-xs text-ink-muted">
              {userLevel >= selectedBottle.level
                ? 'Ready to spin in multiplayer tables.'
                : `Requires Level ${selectedBottle.level} to unlock.`}
            </p>

            <Button
              fullWidth
              disabled={userLevel < selectedBottle.level}
              onClick={() => {
                setEquippedId(selectedBottle.id);
                onEquipBottle?.(selectedBottle.id);
                setSelectedBottle(null);
              }}
            >
              {equippedId === selectedBottle.id
                ? 'Currently Equipped'
                : 'Equip Bottle'}
            </Button>
          </div>
        )}
      </Sheet>

      <BottomNav currentTab="loot" />
    </div>
  );
};
