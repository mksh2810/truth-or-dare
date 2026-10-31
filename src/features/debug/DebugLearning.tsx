import React, { useState } from 'react';
import { Button } from '../../components/Button';
import { ChitCandidate, meetsPromotionCriteria } from '../../game/learning-rules';
import { wilsonScoreLower } from '../../game/wilson';

// Mock candidates for testing and interactive review
const MOCK_CANDIDATES: ChitCandidate[] = [
  {
    id: 'cand-101',
    text: 'Confess the most ridiculous lie you told to escape an awkward date.',
    normalisedText: 'confess the most ridiculous lie you told to escape an awkward date.',
    type: 'truth',
    tier: 'spicy',
    authorUid: 'user-77',
    embedding: [0.1, 0.4, 0.6, 0.2],
    plays: 5,
    passes: 5,
    fails: 0,
    fire: 9,
    mid: 1,
    tooMuch: 0,
    distinctRaters: 7,
    raterUids: ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7'],
    reports: 0,
    status: 'candidate',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cand-102',
    text: 'Attempt to breakdance for 30 seconds with dramatic facial expressions.',
    normalisedText: 'attempt to breakdance for 30 seconds with dramatic facial expressions.',
    type: 'dare',
    tier: 'spicy',
    authorUid: 'user-88',
    embedding: [0.3, 0.5, 0.2, 0.7],
    plays: 4,
    passes: 3,
    fails: 1,
    fire: 7,
    mid: 2,
    tooMuch: 1,
    distinctRaters: 6,
    raterUids: ['u1', 'u2', 'u3', 'u4', 'u5', 'u6'],
    reports: 0,
    status: 'candidate',
    createdAt: new Date().toISOString(),
  },
];

export interface ProposedJudgeLine {
  id: string;
  text: string;
  language: 'en' | 'hi';
  verdictContext: string;
  tier: string;
  up: number;
  down: number;
  distinctRaters: number;
  reports: number;
  status: 'candidate' | 'promoted' | 'rejected';
}

const MOCK_LINES: ProposedJudgeLine[] = [
  {
    id: 'line-1',
    text: 'That chit belongs in a preschool playground.',
    language: 'en',
    verdictContext: 'TOO_MILD',
    tier: 'spicy',
    up: 5,
    down: 1,
    distinctRaters: 5,
    reports: 0,
    status: 'candidate',
  },
  {
    id: 'line-2',
    text: 'Bhai, isme toh nani bhi nahi daregi.',
    language: 'hi',
    verdictContext: 'TOO_MILD',
    tier: 'mild',
    up: 4,
    down: 0,
    distinctRaters: 4,
    reports: 0,
    status: 'candidate',
  },
];

export const DebugLearning: React.FC = () => {
  const [candidates, setCandidates] = useState<ChitCandidate[]>(MOCK_CANDIDATES);
  const [lines, setLines] = useState<ProposedJudgeLine[]>(MOCK_LINES);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLog((prev) => [msg, ...prev.slice(0, 20)]);
  };

  const handleApproveChit = (id: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'promoted', promotedAt: new Date().toISOString() } : c))
    );
    addLog(`✅ Approved Chit [${id}] to Community Deck.`);
  };

  const handleRejectChit = (id: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'rejected', rejectionReason: 'Admin rejected' } : c))
    );
    addLog(`❌ Rejected Chit [${id}]. Marked as non-retryable.`);
  };

  const handleApproveLine = (id: string) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: 'promoted' } : l))
    );
    addLog(`🦉 Approved Owl Take [${id}] for Judge in-game use.`);
  };

  const handleRejectLine = (id: string) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: 'rejected' } : l))
    );
    addLog(`❌ Rejected Owl Take [${id}].`);
  };

  return (
    <div className="w-full py-6 space-y-8 max-w-[420px] mx-auto text-left pb-24">
      <div className="border-b-2 border-ink pb-3">
        <span className="font-mono text-xs uppercase font-bold text-dare">
          ADMIN · INTERNAL ONLY
        </span>
        <h1 className="font-display text-2xl font-black text-ink">
          /debug/learning
        </h1>
        <p className="font-sans text-xs text-ink-muted">
          Review community candidate chits and owl takes before promotion to the live deck.
        </p>
      </div>

      {/* Activity Log */}
      {log.length > 0 && (
        <div className="p-3 bg-chit border-2 border-ink rounded-btn shadow-hard-sm space-y-1">
          <div className="text-[10px] font-mono uppercase font-bold text-ink-muted">Log</div>
          {log.map((entry, idx) => (
            <div key={idx} className="font-mono text-[11px] text-ink">
              {entry}
            </div>
          ))}
        </div>
      )}

      {/* 1. Proposed Chit Promotions (LEARN-5) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-xs uppercase font-bold text-ink">
            1. Chit Candidates ({candidates.filter((c) => c.status === 'candidate').length} Pending)
          </h2>
        </div>

        <div className="space-y-3">
          {candidates.map((c) => {
            const evalResult = meetsPromotionCriteria(c);
            const total = c.fire + c.mid + c.tooMuch;
            const wilson = wilsonScoreLower(c.fire, total);

            return (
              <div
                key={c.id}
                className="p-3.5 bg-chit border-2 border-ink rounded-btn shadow-hard-sm space-y-2"
              >
                <div className="flex justify-between items-center text-[10px] font-mono uppercase">
                  <span className={`px-1.5 py-0.5 rounded font-bold ${c.type === 'truth' ? 'bg-truth text-white' : 'bg-dare text-white'}`}>
                    {c.type} · {c.tier}
                  </span>
                  <span className="text-ink-muted">
                    Wilson: {wilson.toFixed(2)}
                  </span>
                </div>

                <p className="font-handwriting text-base italic text-ink">
                  "{c.text}"
                </p>

                <div className="grid grid-cols-3 gap-1 font-mono text-[10px] text-ink-muted border-t pt-1 border-chit-shade">
                  <div>Plays: {c.plays}</div>
                  <div>Raters: {c.distinctRaters}</div>
                  <div>Fire: {((c.fire / Math.max(1, total)) * 100).toFixed(0)}%</div>
                </div>

                {c.status === 'candidate' ? (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleApproveChit(c.id)}
                      disabled={!evalResult.eligible}
                      className="flex-1 py-1 bg-pass text-white font-mono text-xs font-bold uppercase rounded border border-ink btn-press disabled:opacity-40"
                    >
                      {evalResult.eligible ? 'Approve' : 'Ineligible'}
                    </button>
                    <button
                      onClick={() => handleRejectChit(c.id)}
                      className="flex-1 py-1 bg-fail text-white font-mono text-xs font-bold uppercase rounded border border-ink btn-press"
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <div className={`font-mono text-[11px] font-bold uppercase text-center py-1 ${c.status === 'promoted' ? 'text-pass' : 'text-fail'}`}>
                    {c.status}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Proposed Owl Takes (LEARN-8) */}
      <section className="space-y-3">
        <h2 className="font-mono text-xs uppercase font-bold text-ink">
          2. Owl Roast Lines ({lines.filter((l) => l.status === 'candidate').length} Pending)
        </h2>

        <div className="space-y-3">
          {lines.map((l) => {
            const total = l.up + l.down;
            const ratio = total > 0 ? l.up / total : 0;
            const eligible = l.up >= 3 && l.distinctRaters >= 3 && ratio >= 0.7 && l.reports === 0;

            return (
              <div
                key={l.id}
                className="p-3.5 bg-chit border-2 border-ink rounded-btn shadow-hard-sm space-y-2"
              >
                <div className="flex justify-between items-center text-[10px] font-mono uppercase text-ink-muted">
                  <span>Lang: {l.language.toUpperCase()} · {l.verdictContext}</span>
                  <span>Upvote: {(ratio * 100).toFixed(0)}% ({l.up}↑ / {l.down}↓)</span>
                </div>

                <p className="font-handwriting text-base italic text-ink">
                  🦉 "{l.text}"
                </p>

                {l.status === 'candidate' ? (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleApproveLine(l.id)}
                      disabled={!eligible}
                      className="flex-1 py-1 bg-pass text-white font-mono text-xs font-bold uppercase rounded border border-ink btn-press disabled:opacity-40"
                    >
                      Approve Line
                    </button>
                    <button
                      onClick={() => handleRejectLine(l.id)}
                      className="flex-1 py-1 bg-fail text-white font-mono text-xs font-bold uppercase rounded border border-ink btn-press"
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <div className={`font-mono text-[11px] font-bold uppercase text-center py-1 ${l.status === 'promoted' ? 'text-pass' : 'text-fail'}`}>
                    {l.status}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="pt-4">
        <a
          href="/home"
          className="font-mono text-xs font-bold text-ink underline hover:text-dare block text-center"
        >
          ← Return to Home
        </a>
      </div>
    </div>
  );
};
