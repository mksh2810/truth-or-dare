import React, { useState } from 'react';
import { Button } from '../components/Button';
import { Chit } from '../components/Chit';
import { Stamp, StampType } from '../components/Stamp';
import { StickerAvatar, STICKER_LIST } from '../components/StickerAvatar';
import { JudgeBubble, JudgeExpression } from '../components/JudgeBubble';
import { RankLabel, XpBar } from '../components/RankLabel';
import { CodeBoxes } from '../components/CodeBoxes';
import { InkTimer } from '../components/InkTimer';
import { Sheet } from '../components/Sheet';
import { Toast } from '../components/Toast';
import { BottomNav } from '../components/BottomNav';
import { TableView } from '../components/TableView';
import { Bottle } from '../components/Bottle';
import { MOCK_PLAYERS } from '../data/mock';

export default function DevKit() {
  const [codeValue, setCodeValue] = useState('4A8K9Z');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const stamps: StampType[] = ['FINE', 'NOPE', 'TOO MILD', 'NOT DOABLE', 'PASSED', 'NOT IT'];
  const expressions: JudgeExpression[] = ['reading', 'approve', 'nope', 'bored', 'snoring'];

  return (
    <div className="w-full py-6 space-y-10 max-w-[390px] mx-auto pb-28">
      {/* Header */}
      <div className="space-y-2 border-b-2 border-ink pb-4">
        <div className="flex justify-between items-center">
          <span className="font-mono text-xs uppercase tracking-widest text-ink-muted">
            Design System · Prompt 1
          </span>
          <a
            href="/dev/screens"
            className="font-mono text-xs font-bold text-dare underline"
          >
            Go to Screens Catalog →
          </a>
        </div>
        <h1 className="font-display text-3xl font-black tracking-tight text-ink">
          Design Kit & Tokens
        </h1>
        <p className="font-handwriting text-lg text-ink-muted italic">
          Every component and variant from PACK.md section 3.4.
        </p>
      </div>

      {/* 1. Buttons */}
      <section className="space-y-3">
        <h2 className="font-mono text-xs uppercase tracking-wider font-bold text-ink">
          1. Buttons (Variants & Sizes)
        </h2>
        <div className="space-y-2.5">
          <Button fullWidth variant="primary">
            Primary (Dare Red · 56px)
          </Button>
          <Button fullWidth variant="secondary">
            Secondary (Peach · 48px)
          </Button>
          <Button fullWidth variant="danger">
            Danger Button
          </Button>
          <Button fullWidth variant="quiet">
            Quiet Text Action
          </Button>
          <Button fullWidth disabled>
            Disabled Button
          </Button>
          <div className="flex gap-2">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
        </div>
      </section>

      {/* 2. Rubber Stamps */}
      <section className="space-y-3">
        <h2 className="font-mono text-xs uppercase tracking-wider font-bold text-ink">
          2. Rubber Stamps (Words always shown)
        </h2>
        <div className="flex flex-wrap gap-2.5 items-center justify-start p-3 bg-chit border-2 border-ink shadow-hard-sm rounded-btn">
          {stamps.map((s, idx) => (
            <Stamp key={s} type={s} rotation={idx % 2 === 0 ? -6 : 6} />
          ))}
        </div>
      </section>

      {/* 3. Chits */}
      <section className="space-y-4">
        <h2 className="font-mono text-xs uppercase tracking-wider font-bold text-ink">
          3. Chits (Truth, Dare, Taped, Stamped, Folded)
        </h2>
        <div className="space-y-4">
          <Chit
            id="kit-truth"
            type="truth"
            taped
            stamp="FINE"
            text="What is your biggest fear that you have never told anyone?"
          />
          <Chit
            id="kit-dare"
            type="dare"
            tilted
            text="Call the pizza place and ask if they deliver to a treehouse."
          />
          <div className="flex justify-center">
            <Chit id="kit-folded" type="dare" folded />
          </div>
        </div>
      </section>

      {/* 4. Sticker Avatars */}
      <section className="space-y-3">
        <h2 className="font-mono text-xs uppercase tracking-wider font-bold text-ink">
          4. Sticker Avatars (12 Stickers & States)
        </h2>
        <div className="p-3 bg-chit border-2 border-ink shadow-hard-sm rounded-btn space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {STICKER_LIST.map((s) => (
              <div key={s.id} className="flex flex-col items-center">
                <StickerAvatar avatarId={s.id} size="sm" />
                <span className="font-mono text-[9px] text-ink-muted truncate max-w-[55px]">
                  {s.name}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-chit-shade pt-2 flex justify-around">
            <div className="text-center">
              <StickerAvatar avatarId="fox" state="idle" size="sm" />
              <div className="font-mono text-[9px]">Idle</div>
            </div>
            <div className="text-center">
              <StickerAvatar avatarId="fox" state="ready" size="sm" />
              <div className="font-mono text-[9px]">Ready</div>
            </div>
            <div className="text-center">
              <StickerAvatar avatarId="fox" state="active" size="sm" />
              <div className="font-mono text-[9px]">Active Ring</div>
            </div>
            <div className="text-center">
              <StickerAvatar avatarId="fox" state="voted" size="sm" />
              <div className="font-mono text-[9px]">Voted</div>
            </div>
            <div className="text-center">
              <StickerAvatar avatarId="fox" state="away" size="sm" />
              <div className="font-mono text-[9px]">Away</div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Owl Judge Bubble */}
      <section className="space-y-3">
        <h2 className="font-mono text-xs uppercase tracking-wider font-bold text-ink">
          5. Owl Judge (5 Expressions)
        </h2>
        <div className="space-y-3">
          {expressions.map((exp) => (
            <JudgeBubble
              key={exp}
              expression={exp}
              text={
                exp === 'approve'
                  ? 'Fine. That is evil enough.'
                  : exp === 'nope'
                  ? 'Nope. Someone ends up in the ER with this one.'
                  : exp === 'bored'
                  ? 'Too mild. Your granny would do this on a Sunday.'
                  : exp === 'snoring'
                  ? 'Boring. Try again.'
                  : 'Hmm, let me read this.'
              }
            />
          ))}
        </div>
      </section>

      {/* 6. Rank Label & Xp Bar */}
      <section className="space-y-3">
        <h2 className="font-mono text-xs uppercase tracking-wider font-bold text-ink">
          6. Rank Label & XpBar
        </h2>
        <div className="p-4 bg-chit border-2 border-ink shadow-hard-sm rounded-btn space-y-3">
          <RankLabel level={6} />
          <XpBar currentXp={420} neededXp={600} />
        </div>
      </section>

      {/* 7. CodeBoxes */}
      <section className="space-y-3">
        <h2 className="font-mono text-xs uppercase tracking-wider font-bold text-ink">
          7. Code Boxes (6 Alphanumeric Slots)
        </h2>
        <div className="p-4 bg-chit border-2 border-ink shadow-hard-sm rounded-btn space-y-2">
          <CodeBoxes value={codeValue} onChange={setCodeValue} />
          <div className="text-center font-mono text-xs text-ink-muted">
            Current: {codeValue || '(empty)'}
          </div>
        </div>
      </section>

      {/* 8. Ink Timer */}
      <section className="space-y-3">
        <h2 className="font-mono text-xs uppercase tracking-wider font-bold text-ink">
          8. InkTimer (Truth Blue, Dare Red, Urgent Pulse)
        </h2>
        <div className="p-4 bg-chit border-2 border-ink shadow-hard-sm rounded-btn flex justify-around items-center">
          <div className="text-center">
            <InkTimer secondsLeft={42} totalSeconds={60} type="truth" size={60} />
            <div className="font-mono text-[10px] mt-1">Truth</div>
          </div>
          <div className="text-center">
            <InkTimer secondsLeft={55} totalSeconds={90} type="dare" size={60} />
            <div className="font-mono text-[10px] mt-1">Dare</div>
          </div>
          <div className="text-center">
            <InkTimer secondsLeft={8} totalSeconds={30} type="dare" size={60} />
            <div className="font-mono text-[10px] mt-1">Urgent (&lt;10s)</div>
          </div>
        </div>
      </section>

      {/* 9. Table View */}
      <section className="space-y-3">
        <h2 className="font-mono text-xs uppercase tracking-wider font-bold text-ink">
          9. TableView (Top-down round table)
        </h2>
        <TableView players={MOCK_PLAYERS} performerUid="u1" />
      </section>

      {/* 10. Bottles (Loot skins) */}
      <section className="space-y-3">
        <h2 className="font-mono text-xs uppercase tracking-wider font-bold text-ink">
          10. Bottles (Default, Green, Amber, Gold)
        </h2>
        <div className="p-4 bg-chit border-2 border-ink shadow-hard-sm rounded-btn flex justify-around">
          <Bottle skin="default" />
          <Bottle skin="green" />
          <Bottle skin="amber" />
          <Bottle skin="gold" />
        </div>
      </section>

      {/* 11. Sheet & Toast Triggers */}
      <section className="space-y-3">
        <h2 className="font-mono text-xs uppercase tracking-wider font-bold text-ink">
          11. Sheet & Toast
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setSheetOpen(true)}
            className="flex-1 h-12 bg-peach text-ink border-2 border-ink rounded-btn font-mono text-xs font-bold uppercase btn-press"
          >
            Open Bottom Sheet
          </button>
          <button
            onClick={() => setToastMessage('Chit stamped FINE by the Judge!')}
            className="flex-1 h-12 bg-highlighter text-ink border-2 border-ink rounded-btn font-mono text-xs font-bold uppercase btn-press"
          >
            Show Toast
          </button>
        </div>
      </section>

      <Sheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Sample Bottom Sheet"
      >
        <p className="font-sans text-sm text-ink">
          Bottom sheets contain secondary menus, suggestions, report actions, and settings without cluttering the main screen.
        </p>
        <Button fullWidth onClick={() => setSheetOpen(false)}>
          Close Sheet
        </Button>
      </Sheet>

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* 12. BottomNav preview */}
      <BottomNav currentTab="table" />
    </div>
  );
}
