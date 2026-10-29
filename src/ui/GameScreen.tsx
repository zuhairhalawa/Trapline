import { useEffect, useMemo, useReducer, useState } from 'react';
import type { Command, LevelDef } from '../engine';
import { resolveTurn, validateCommand } from '../engine';
import { LEVELS } from '../levels/levels';
import { Board } from '../presentation/Board';
import {
  coachLine, courierLine, describeCommand, intruderLine, outcomeLine, outcomeTag, queuedPhrase, shortCourier, shortIntruder, turnAnnouncement,
} from '../presentation/text';
import { isUnlocked, type Progress } from '../persistence/progress';
import type { Cue } from '../audio/audio';
import { newSession, reducer, sameCommand } from './gameReducer';
import { useNarrow, useReducedMotion } from './hooks';

/** Actor travel is 0.62 s (board.css). Capture / delivery / breach visuals wait for it; rules never do. */
const MOVE_MS = 620;
/** Advance stays locked while the move plays; a level-ending turn also leaves time for the trap slam / vault shake. */
const ANIM_MS = 760;
const ANIM_END_MS = 1150;

interface Props {
  level: LevelDef;
  index: number;
  progress: Progress;
  cue: (c: Cue) => void;
  unlock: () => void;
  onWin: (levelId: string, turns: number, charges: number) => void;
  onSelectLevel: (index: number) => void;
  onHome: () => void;
  onAbout: () => void;
  muted: boolean;
  onToggleMute: () => void;
}

function commandsFor(level: LevelDef): Command[] {
  const out: Command[] = [];
  if (level.allowed.includes('bait')) for (const t of level.honeypots) out.push({ kind: 'bait', target: t });
  if (level.allowed.includes('reroute')) for (const s of level.switches) out.push({ kind: 'reroute', id: s.id });
  if (level.allowed.includes('shutter')) for (const s of level.shutters) out.push({ kind: 'shutter', id: s.id });
  return out;
}
const NBSP = ' ';
const KEYS: Record<Command['kind'], string> = { bait: 'B', reroute: 'R', shutter: 'S' };

export function GameScreen(p: Props) {
  const { level } = p;
  const reduced = useReducedMotion();
  const narrow = useNarrow();
  const [session, dispatch] = useReducer(reducer, level, (l) => newSession(l));
  const { current, selected, lastTurn, busy, history, notice } = session;
  const playing = current.status === 'playing';
  const cmds = useMemo(() => commandsFor(level), [level]);

  const preview = useMemo(
    () => (playing && !busy ? resolveTurn(level, current, selected) : null),
    [level, current, selected, playing, busy],
  );

  // Animation lock only; it never changes rules. Cleared by undo/restart via animSeq.
  const endsLevel = !!lastTurn && lastTurn.state.status !== 'playing';
  useEffect(() => {
    if (!busy) return;
    const seq = session.animSeq;
    const id = window.setTimeout(() => dispatch({ type: 'animationDone', seq }), endsLevel ? ANIM_END_MS : ANIM_MS);
    return () => window.clearTimeout(id);
  }, [busy, session.animSeq, endsLevel]);

  // Presentation only: the capture / delivery / breach visuals wait until the pieces have arrived. The committed state
  // (and the win/loss result) is already final; undo/restart (busy -> false) or reduced motion show it immediately,
  // and a stale timer from an undone turn is cancelled by the effect cleanup.
  const [arrivedSeq, setArrivedSeq] = useState(-1);
  useEffect(() => {
    if (!busy) return;
    const seq = session.animSeq;
    const id = window.setTimeout(() => setArrivedSeq(seq), MOVE_MS);
    return () => window.clearTimeout(id);
  }, [busy, session.animSeq]);
  const arrived = !busy || arrivedSeq === session.animSeq;

  // Sound + progress follow committed results. Timers are cancelled if the turn is undone/restarted.
  useEffect(() => {
    if (!lastTurn) return;
    const ids: number[] = [];
    const later = (c: Cue, ms: number) => ids.push(window.setTimeout(() => p.cue(c), ms));
    p.cue('move');
    const t = lastTurn.events;
    if (t.some((e) => e.type === 'captured')) later('capture', MOVE_MS + 20); // when the trap visibly closes
    if (t.some((e) => e.type === 'victory')) later('success', MOVE_MS + 420);
    if (t.some((e) => e.type === 'breach' || e.type === 'timeout')) later('failure', MOVE_MS + 30);
    if (lastTurn.state.status === 'won') {
      p.onWin(level.id, lastTurn.state.turn, level.budget - lastTurn.state.charges);
    }
    return () => ids.forEach((i) => window.clearTimeout(i));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastTurn]);

  const select = (c: Command | null) => {
    p.unlock();
    p.cue('select');
    dispatch({ type: 'select', command: c });
  };
  const advance = () => {
    p.unlock();
    dispatch({ type: 'advance', animate: !reduced });
  };
  const undo = () => { p.unlock(); dispatch({ type: 'undo' }); };
  const restart = () => { p.unlock(); dispatch({ type: 'restart' }); };

  // Keyboard shortcuts (all actions are also real buttons).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      if (document.querySelector('[role="dialog"]')) return;
      const k = e.key;
      const byKind = (kind: Command['kind']) => cmds.find((c) => c.kind === kind);
      if (k === 'R') return restart();
      switch (k.toLowerCase()) {
        case 'b': { const c = byKind('bait'); if (c) select(c); break; }
        case 'r': { const c = byKind('reroute'); if (c) select(c); break; }
        case 's': { const c = byKind('shutter'); if (c) select(c); break; }
        case 'w': select(null); break;
        case 'a': advance(); break;
        case 'u': undo(); break;
        default: break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cmds, reduced, p.unlock, p.cue]);

  const info = describeCommand(level, current, selected);
  const status = current.status;
  const over = !playing && !busy;
  const nextIndex = p.index + 1 < LEVELS.length ? p.index + 1 : -1;

  const announce = selected && preview
    ? `Queued ${info.name}. ${intruderLine(level, preview, preview.state.armed)}`
    : lastTurn
      ? turnAnnouncement(level, lastTurn)
      : notice ?? `Level ${level.number}. Turn ${current.turn} of ${level.turnLimit}. ${current.charges} commands left.`;

  // Level 1 doubles as the interactive introduction. Advice follows the current state and the queued action only.
  const coach = coachLine(level, current, selected, preview);
  const tag = preview ? (notice ? { tone: 'note' as const, text: notice } : outcomeTag(preview)) : notice ? { tone: 'note' as const, text: notice } : null;

  const trapped = current.intruder.captured;
  const delivered = current.courier.delivered;
  const lossText =
    current.lossReason === 'breach'
      ? 'The intruder reached the vault. The packet may be delivered, but the level is lost.'
      : trapped
        ? 'Out of turns. The intruder is trapped, but the packet was not delivered in time.'
        : 'Out of turns. The intruder was not trapped in time.';

  return (
    <div className="game" data-testid="game" data-level={level.id}>
      <header className="topbar">
        <button className="brand" onClick={p.onHome} aria-label="TRAPLINE, back to start">TRAPLINE</button>
        <nav className="level-chips" aria-label="Levels">
          {LEVELS.map((l, i) => {
            const open = isUnlocked(p.progress, i);
            const done = !!p.progress.completed[l.id];
            return (
              <button
                key={l.id}
                className={`chip ${i === p.index ? 'current' : ''} ${done ? 'done' : ''}`}
                disabled={!open}
                aria-current={i === p.index ? 'true' : undefined}
                aria-label={`Level ${l.number}: ${l.title}${done ? ', completed' : open ? '' : ', locked'}`}
                data-testid={`level-chip-${l.number}`}
                data-done={done}
                onClick={() => p.onSelectLevel(i)}
              >
                <span className="chip-num">{l.number}</span>
                {done && <span className="chip-mark" aria-hidden="true">✓</span>}
              </button>
            );
          })}
        </nav>
        <div className="top-actions">
          <button className="link" onClick={p.onToggleMute} aria-pressed={!p.muted} aria-label={`Sound: ${p.muted ? 'off' : 'on'}`} data-testid="sound">
            <span className="lbl">Sound: {p.muted ? 'off' : 'on'}</span>
            <svg className="ico" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 9v6h4l5 4V5L8 9H4z" />
              {p.muted ? <path d="M17 9l5 6m0-6l-5 6" /> : <path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12" />}
            </svg>
          </button>
          <button className="link" onClick={p.onAbout} aria-label="About">
            <span className="lbl">About</span>
            <svg className="ico" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.01" />
            </svg>
          </button>
        </div>
      </header>

      <main className="stage">
        {/* Scroll region: board + details. On phones it is the only thing that scrolls; the dock below never overlays it. */}
        <div className="scroller" data-testid="scroller">
          <section className="board-wrap" aria-label="Board">
            <Board
              level={level}
              state={current}
              preview={preview}
              selected={selected}
              interactive={playing}
              onCommand={(c) => select(c)}
              xScale={narrow ? 0.62 : 1}
              animate={!reduced}
              arrived={arrived}
            />
            <p className="legend" aria-hidden="true">
              <span className="lg coral">Intruder</span>
              <span className="lg mint">Courier</span>
              <span className="lg dash">Dashed arrows: next turn</span>
              <span className="lg queue">Dashed amber: queued change</span>
            </p>
          </section>

          <aside className="panel" aria-label="Mission">
            <div className="panel-top">
              <p className="eyebrow">Level {level.number} of {LEVELS.length}</p>
              <h2>{level.title}</h2>
              <p className="brief">{level.briefing}</p>
              <ul className="objective" aria-label="Objective">
                <li className={trapped ? 'done' : ''} data-testid="obj-trap"><span className="check" aria-hidden="true">{trapped ? '✓' : ''}</span>Trap the intruder.</li>
                <li className={delivered ? 'done' : ''} data-testid="obj-deliver"><span className="check" aria-hidden="true">{delivered ? '✓' : ''}</span>Deliver the packet.</li>
              </ul>
              <div className="stats">
                <p><span>Turn</span><b data-testid="turn">{current.turn} / {level.turnLimit}</b></p>
                <p><span>Commands</span><b data-testid="charges">{current.charges}</b></p>
              </div>
            </div>

            {playing && (
              <>
                <section className="intel" aria-label="Next turn preview" data-testid="intel">
                  <h3>{busy ? 'Moving…' : 'Next turn'}</h3>
                  {preview && (
                    <>
                      <p className="line coral" data-testid="intruder-line">{intruderLine(level, preview, preview.state.armed)}</p>
                      <p className="line mint" data-testid="courier-line">{courierLine(level, preview)}</p>
                      {outcomeLine(preview) && <p className="outcome" data-testid="outcome">{outcomeLine(preview)}</p>}
                    </>
                  )}
                </section>
                <section className="explain" aria-label="Selected action">
                  <h3 data-testid="selected-name">{info.name}{selected ? ' queued' : ''}</h3>
                  <p>{info.explain}</p>
                </section>
                {!coach && <p className="tip">{level.tip}</p>}
              </>
            )}
          </aside>
        </div>

        {/* Dock: its own grid row (never overlaid on content). Commands, the compact decision summary, Undo/Restart/Advance. */}
        <div className={`dock ${over ? 'over' : ''}`} role="group" aria-label="Commands" data-testid="tray">
          {over && status === 'won' && (
            <section className="result win" aria-label="Result" data-testid="result" data-status="won">
              <h3>Trap sprung. Packet delivered.</h3>
              <p>Level complete in {current.turn} {current.turn === 1 ? 'turn' : 'turns'}, using {level.budget - current.charges} of {level.budget} commands.</p>
              <div className="result-actions">
                {nextIndex >= 0 ? (
                  <button className="btn primary" data-testid="next-level" onClick={() => p.onSelectLevel(nextIndex)}>Next level</button>
                ) : (
                  <button className="btn primary" data-testid="finish" onClick={p.onHome}>That is the slice</button>
                )}
                <button className="btn ghost" onClick={restart}>Replay</button>
              </div>
              {nextIndex < 0 && <p className="fine">More levels are planned. This build ends here.</p>}
            </section>
          )}
          {over && status === 'lost' && (
            <section className="result loss" aria-label="Result" data-testid="result" data-status="lost">
              <h3>{current.lossReason === 'breach' ? 'Breach' : 'Out of turns'}</h3>
              <p>{lossText}</p>
              <p className="fine">Undo the last turn or restart to try another plan.</p>
            </section>
          )}

          {!over && (
            <div className="cmd-row">
              {cmds.map((c) => {
                const ci = describeCommand(level, current, c);
                const err = validateCommand(level, current, c);
                const sub = current.charges <= 0 && playing ? 'No charges' : ci.sub;
                const on = sameCommand(selected, c);
                const id = c.kind === 'bait' ? 'cmd-bait' : c.kind === 'reroute' ? 'cmd-reroute' : 'cmd-shutter';
                return (
                  <button key={`${c.kind}`} className="cmd" aria-pressed={on} disabled={err !== null || busy}
                    data-testid={id} onClick={() => select(c)}>
                    <span className="cmd-name">{ci.name}</span>
                    <span className="cmd-sub">{sub}</span>
                    <kbd aria-hidden="true">{KEYS[c.kind]}</kbd>
                  </button>
                );
              })}
              <button className="cmd" aria-pressed={selected === null} disabled={!playing || busy} data-testid="cmd-wait" onClick={() => select(null)}>
                <span className="cmd-name">Wait</span>
                <span className="cmd-sub">Free</span>
                <kbd aria-hidden="true">W</kbd>
              </button>
            </div>
          )}

          {playing && (
            <section className="decision" aria-label="Queued action and next turn" data-testid="decision">
              {coach && <p className="coach" data-testid="coach">{coach}</p>}
              <p className="d-action" data-testid="decision-action">
                <span className="d-label">{busy ? 'Moving' : 'Queued'}</span>
                {busy ? '…' : queuedPhrase(level, current, selected)}
              </p>
              <p className="d-forecast" data-testid="decision-forecast">
                <span className="d-i" data-testid="decision-intruder">{preview ? shortIntruder(level, preview) : NBSP}</span>
                <span className="d-c" data-testid="decision-courier">{preview ? shortCourier(level, preview) : NBSP}</span>
              </p>
              <p className={`d-tag ${tag ? `tone-${tag.tone}` : ''}`} data-testid="decision-outcome" role={notice ? 'alert' : undefined}>{tag ? tag.text : NBSP}</p>
            </section>
          )}

          <div className="turn-row">
            <button className="btn ghost" data-testid="undo" onClick={undo} disabled={history.length === 0}>Undo</button>
            <button className="btn ghost" data-testid="restart" onClick={restart}>Restart</button>
            <button className="btn primary advance" data-testid="advance" onClick={advance} disabled={!playing || busy}>
              Advance
            </button>
          </div>
          <p className="keys" aria-hidden="true">Keys: B R S W pick · A advance · U undo · Shift+R restart</p>
        </div>
      </main>

      <div className="sr-only" role="status" aria-live="polite" data-testid="live">{announce}</div>
    </div>
  );
}