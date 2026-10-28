import { useMemo } from 'react';
import { Board } from '../presentation/Board';
import { LEVELS } from '../levels/levels';
import { createInitialState, previewTurn, resolveTurn } from '../engine';
import type { Progress } from '../persistence/progress';
import { isUnlocked } from '../persistence/progress';
import { useNarrow } from './hooks';

interface Props {
  progress: Progress;
  continueIndex: number;
  onPlay: (index: number) => void;
  onAbout: () => void;
  muted: boolean;
  onToggleMute: () => void;
}

export function TitleScreen({ progress, continueIndex, onPlay, onAbout, muted, onToggleMute }: Props) {
  const narrow = useNarrow();
  const level = LEVELS[0]!;
  // Decorative hero: a real engine state (bait armed, intruder lured next to the trap).
  const { state, preview } = useMemo(() => {
    const s = resolveTurn(level, createInitialState(level), { kind: 'bait', target: 'H' }).state;
    return { state: s, preview: previewTurn(level, s, null) };
  }, [level]);
  const anyDone = Object.keys(progress.completed).length > 0;
  const idx = continueIndex;
  return (
    <main className="title" data-testid="title">
      <div className="title-copy">
        <p className="eyebrow">Unreleased playable slice</p>
        <h1>TRAPLINE</h1>
        <p className="tagline">Lure the intruder into the trap. Keep the packet moving.</p>
        <div className="title-actions">
          <button className="btn primary big" onClick={() => onPlay(idx)} autoFocus>
            {anyDone ? `Continue: Level ${idx + 1}` : 'Play'}
          </button>
        </div>
        <nav className="title-levels" aria-label="Levels">
          {LEVELS.map((l, i) => {
            const open = isUnlocked(progress, i);
            const done = !!progress.completed[l.id];
            return (
              <button key={l.id} className={`chip ${done ? 'done' : ''}`} disabled={!open} onClick={() => onPlay(i)}
                aria-label={`Level ${l.number}: ${l.title}${done ? ', completed' : open ? '' : ', locked'}`}>
                <span className="chip-num">{l.number}</span>
                <span className="chip-name">{l.title}</span>
                {done && <span className="chip-mark" aria-hidden="true">✓</span>}
                {!open && <span className="chip-mark" aria-hidden="true">·</span>}
              </button>
            );
          })}
        </nav>
        <ul className="how">
          <li><b>Plan</b> one command a turn.</li>
          <li><b>Preview</b> where both pieces will go.</li>
          <li><b>Advance</b> and watch the trap work.</li>
        </ul>
        <div className="title-foot">
          <button className="link" onClick={onToggleMute} aria-pressed={!muted}>Sound: {muted ? 'off' : 'on'}</button>
          <button className="link" onClick={onAbout}>About</button>
        </div>
      </div>
      <div className="title-board" aria-hidden="true">
        <Board level={level} state={state} preview={preview} selected={null} interactive={false} xScale={narrow ? 0.62 : 1} />
      </div>
    </main>
  );
}