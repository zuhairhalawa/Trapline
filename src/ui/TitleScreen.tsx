import { useMemo, useState } from 'react';
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

const BASE = import.meta.env.BASE_URL;

/**
 * Generated concept art (see docs/ASSET_PROVENANCE.md). Purely decorative: if it fails to load the art block
 * disappears and the title, Play button and the real-board demo are unaffected.
 */
function TitleArt() {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <div className="title-art" aria-hidden="true" data-testid="title-art">
      <picture>
        <source media="(max-width: 640px)" srcSet={`${BASE}art/title-hero-mobile.jpg`} />
        <img src={`${BASE}art/title-hero.jpg`} alt="" width={1600} height={893} decoding="async" onError={() => setFailed(true)} />
      </picture>
      <span className="art-tag">Concept art, not gameplay</span>
    </div>
  );
}

export function TitleScreen({ progress, continueIndex, onPlay, onAbout, muted, onToggleMute }: Props) {
  const narrow = useNarrow();
  const level = LEVELS[0]!;
  // Demo: a real engine state (bait armed, intruder lured next to the trap), drawn by the real board.
  const { state, preview } = useMemo(() => {
    const s = resolveTurn(level, createInitialState(level), { kind: 'bait', target: 'H' }).state;
    return { state: s, preview: previewTurn(level, s, null) };
  }, [level]);
  const anyDone = Object.keys(progress.completed).length > 0;
  const idx = continueIndex;
  return (
    <main className="title" data-testid="title">
      <TitleArt />
      <div className="title-copy">
        <p className="eyebrow">Playable prototype</p>
        <h1>TRAPLINE</h1>
        <p className="tagline">Lure the intruder into the trap. Keep the packet moving.</p>
        <div className="title-actions">
          <button className="btn primary big" onClick={() => onPlay(idx)} autoFocus>
            {anyDone ? `Continue: Level ${idx + 1}` : 'Play'}
          </button>
          <nav className="title-levels" aria-label="Levels">
            <span className="levels-label" aria-hidden="true">Levels</span>
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
        </div>
        <figure className="title-demo" data-testid="title-demo">
          <div className="title-board" aria-hidden="true">
            <Board level={level} state={state} preview={preview} selected={null} interactive={false} xScale={narrow ? 0.62 : 1} />
          </div>
          <figcaption><b>Real game board, Level 1.</b> Plan one command, preview both pieces, then Advance.</figcaption>
        </figure>
        <div className="title-foot">
          <button className="link" onClick={onToggleMute} aria-pressed={!muted}>Sound: {muted ? 'off' : 'on'}</button>
          <button className="link" onClick={onAbout}>About</button>
        </div>
      </div>
    </main>
  );
}