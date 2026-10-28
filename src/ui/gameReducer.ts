import {
  createInitialState, resolveTurn, validateCommand,
  type Command, type GameState, type LevelDef, type TurnResult,
} from '../engine';

export interface Session {
  readonly level: LevelDef;
  /** Previously committed states, oldest first; Undo pops from here. */
  readonly history: readonly GameState[];
  readonly current: GameState;
  readonly selected: Command | null;
  /** Result of the most recent committed Advance; null after undo/restart. */
  readonly lastTurn: TurnResult | null;
  /** True while the movement animation plays; blocks Advance only. Never affects rules. */
  readonly busy: boolean;
  /** Bumped by undo/restart/load so stale animation timers can be ignored. */
  readonly animSeq: number;
  readonly notice: string | null;
}

export type Action =
  | { type: 'select'; command: Command | null }
  | { type: 'advance'; animate: boolean }
  | { type: 'undo' }
  | { type: 'restart' }
  | { type: 'animationDone'; seq: number };

export function newSession(level: LevelDef, animSeq = 0): Session {
  return { level, history: [], current: createInitialState(level), selected: null, lastTurn: null, busy: false, animSeq, notice: null };
}

export const sameCommand = (a: Command | null, b: Command | null): boolean => {
  if (a === null || b === null) return a === b;
  if (a.kind !== b.kind) return false;
  if (a.kind === 'bait' && b.kind === 'bait') return a.target === b.target;
  if (a.kind === 'reroute' && b.kind === 'reroute') return a.id === b.id;
  if (a.kind === 'shutter' && b.kind === 'shutter') return a.id === b.id;
  return false;
};

export function reducer(s: Session, a: Action): Session {
  switch (a.type) {
    case 'select': {
      if (s.current.status !== 'playing') return s;
      if (a.command === null || sameCommand(s.selected, a.command)) return { ...s, selected: null, notice: null };
      const err = validateCommand(s.level, s.current, a.command);
      if (err !== null) return { ...s, notice: err };
      return { ...s, selected: a.command, notice: null };
    }
    case 'advance': {
      if (s.busy || s.current.status !== 'playing') return s;
      const r = resolveTurn(s.level, s.current, s.selected);
      if (!r.ok) return { ...s, selected: null, notice: r.error };
      return {
        ...s,
        history: [...s.history, s.current],
        current: r.state,
        selected: null,
        lastTurn: r,
        busy: a.animate,
        animSeq: s.animSeq + 1,
        notice: null,
      };
    }
    case 'undo': {
      const prev = s.history[s.history.length - 1];
      if (!prev) return s;
      return {
        ...s, history: s.history.slice(0, -1), current: prev, selected: null, lastTurn: null,
        busy: false, animSeq: s.animSeq + 1, notice: null,
      };
    }
    case 'restart':
      return newSession(s.level, s.animSeq + 1);
    case 'animationDone':
      return a.seq === s.animSeq && s.busy ? { ...s, busy: false } : s;
  }
}