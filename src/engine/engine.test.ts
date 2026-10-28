import { describe, expect, it } from 'vitest';
import {
  chargesUsed,
  createInitialState,
  previewTurn,
  resolveTurn,
  validateCommand,
  type Command,
  type GameState,
  type LevelDef,
} from './index';
import { LEVELS } from '../levels/levels';

const [L1, L2, L3] = LEVELS as [LevelDef, LevelDef, LevelDef];
const bait = (target = 'H'): Command => ({ kind: 'bait', target });
const reroute: Command = { kind: 'reroute', id: 'junction' };
const gate: Command = { kind: 'shutter', id: 'gate' };

/** Plays commands, returning every committed state after each turn. */
function play(level: LevelDef, cmds: (Command | null)[]): GameState[] {
  let s = createInitialState(level);
  const out: GameState[] = [];
  for (const c of cmds) {
    const r = resolveTurn(level, s, c);
    expect(r.ok, r.error ?? '').toBe(true);
    s = r.state;
    out.push(s);
  }
  return out;
}
const at = (s: GameState) => ({ i: s.intruder.at, c: s.courier.at });

/** Small custom level builder for rule edge cases. */
function mk(p: Partial<LevelDef> & Pick<LevelDef, 'nodes' | 'edges' | 'intruderStart' | 'courierStart' | 'courierGoal' | 'vault'>): LevelDef {
  return {
    id: 'custom', number: 99, title: 't', briefing: '', tip: '', switches: [], shutters: [], honeypots: ['H'],
    allowed: ['bait', 'reroute', 'shutter'], budget: 3, turnLimit: 6, scenery: [], ...p,
  };
}
const n = (id: string) => ({ id, label: id, kind: 'relay' as const, x: 0, y: 0 });

describe('level reference solutions (hand-specified positions)', () => {
  it('Level 1: Bait H then Wait traps the intruder and delivers', () => {
    const [t1, t2] = play(L1, [bait(), null]);
    expect(t1).toMatchObject({ turn: 1, charges: 0, armed: 'H', status: 'playing' });
    expect(at(t1!)).toEqual({ i: 'J', c: 'J' });
    expect(t1!.intruder.captured).toBe(false);
    expect(at(t2!)).toEqual({ i: 'H', c: 'D' });
    expect(t2).toMatchObject({ turn: 2, status: 'won' });
    expect(t2!.intruder.captured).toBe(true);
    expect(t2!.courier.delivered).toBe(true);
  });

  it('Level 1: waiting twice breaches the vault on turn 2', () => {
    const [t1, t2] = play(L1, [null, null]);
    expect(at(t1!)).toEqual({ i: 'J', c: 'J' });
    expect(t1!.status).toBe('playing');
    expect(t2).toMatchObject({ turn: 2, status: 'lost', lossReason: 'breach' });
    expect(t2!.intruder).toMatchObject({ at: 'V', breached: true });
  });

  it('Level 2: Reroute then Bait then Wait', () => {
    const [t1, t2, t3] = play(L2, [reroute, bait(), null]);
    expect(t1!.switches['junction']).toBe(1);
    expect(at(t1!)).toEqual({ i: 'J', c: 'J' });
    expect(at(t2!)).toEqual({ i: 'K', c: 'D' });
    expect(t2!.courier.delivered).toBe(true);
    expect(t2!.status).toBe('playing');
    expect(at(t3!)).toEqual({ i: 'H', c: 'D' });
    expect(t3).toMatchObject({ turn: 3, status: 'won', charges: 0 });
  });

  it('Level 2: Bait then Reroute then Wait is also valid', () => {
    const [t1, t2, t3] = play(L2, [bait(), reroute, null]);
    expect(t1!.armed).toBe('H');
    expect(at(t1!)).toEqual({ i: 'J', c: 'J' }); // trap unreachable through the dead end: heads for the vault
    expect(at(t2!)).toEqual({ i: 'K', c: 'D' });
    expect(t3!.status).toBe('won');
  });

  it('Level 2: no intervention is a breach on turn 2', () => {
    const [, t2] = play(L2, [null, null]);
    expect(t2).toMatchObject({ status: 'lost', lossReason: 'breach' });
  });

  it('Level 3: Seal, Reroute, Bait, Open wins on the final allowed turn', () => {
    const [t1, t2, t3, t4] = play(L3, [gate, reroute, bait(), gate]);
    expect(t1!.shutters['gate']).toBe(false);
    expect(at(t1!)).toEqual({ i: 'J', c: 'J' });
    expect(at(t2!)).toEqual({ i: 'J', c: 'J' });
    expect(at(t3!)).toEqual({ i: 'K', c: 'J' });
    expect(t3!.status).toBe('playing');
    expect(at(t4!)).toEqual({ i: 'H', c: 'V' });
    expect(t4).toMatchObject({ turn: 4, status: 'won', charges: 0 });
    expect(t4!.turn).toBe(L3.turnLimit);
  });

  it('Level 3: Reroute and Bait can be interchanged after the Seal', () => {
    const [, t2, t3, t4] = play(L3, [gate, bait(), reroute, gate]);
    expect(t2!.armed).toBe('H');
    expect(at(t2!)).toEqual({ i: 'J', c: 'J' });
    expect(at(t3!)).toEqual({ i: 'K', c: 'J' });
    expect(t4!.status).toBe('won');
  });

  it('Level 3: not sealing at all breaches on turn 1', () => {
    const [t1] = play(L3, [null]);
    expect(t1).toMatchObject({ status: 'lost', lossReason: 'breach' });
    expect(t1!.intruder.at).toBe('V');
  });

  it('Level 3: leaving the shutter closed never wins (capture alone is not victory)', () => {
    const [t1, , , t4] = play(L3, [gate, reroute, bait(), null]);
    expect(t1!.status).toBe('playing');
    expect(t4!.intruder.captured).toBe(true);
    expect(t4!.courier).toMatchObject({ at: 'J', delivered: false });
    expect(t4).toMatchObject({ status: 'lost', lossReason: 'timeout' });
  });

  it('Level 3: sealing and waiting forever (closing everything) cannot win', () => {
    const states = play(L3, [gate, null, null, null]);
    expect(states.every((s) => s.status !== 'won')).toBe(true);
    expect(states[3]).toMatchObject({ status: 'lost', lossReason: 'timeout' });
    expect(states[3]!.intruder).toMatchObject({ at: 'J', captured: false, breached: false });
  });
});

describe('intruder rules', () => {
  const rangeLevel = (start: string) =>
    mk({
      nodes: ['S', 'A', 'B', 'H', 'W', 'V', 'C'].map(n),
      edges: [['S', 'A'], ['A', 'B'], ['B', 'H'], ['S', 'W'], ['W', 'V'], ['A', 'W']],
      intruderStart: start, courierStart: 'C', courierGoal: 'C', vault: 'V',
    });

  it('a trap 3 edges away does not distract the intruder from the vault', () => {
    const lv = rangeLevel('S'); // S-A-B-H = 3 edges
    const s = resolveTurn(lv, createInitialState(lv), bait()).state;
    expect(s.armed).toBe('H');
    expect(s.intruder.at).toBe('W'); // toward the vault, not toward A
  });

  it('a trap exactly 2 edges away lures the intruder', () => {
    const lv = rangeLevel('A'); // A-B-H = 2 edges
    const r = resolveTurn(lv, createInitialState(lv), bait());
    expect(r.intruder.reason).toBe('bait');
    expect(r.state.intruder.at).toBe('B');
  });

  it('range is measured on open edges only (shutter blocks the lure)', () => {
    const lv = mk({
      nodes: ['S', 'B', 'H', 'W', 'V', 'C'].map(n),
      edges: [['B', 'H'], ['S', 'W'], ['W', 'V']],
      shutters: [{ id: 'gate', edge: ['S', 'B'], initiallyOpen: false }],
      intruderStart: 'S', courierStart: 'C', courierGoal: 'C', vault: 'V',
    });
    const r = resolveTurn(lv, createInitialState(lv), bait());
    expect(r.intruder).toMatchObject({ reason: 'vault', to: 'W' });
  });

  it('waits when there is no route to the vault (not an immediate loss)', () => {
    const r = resolveTurn(L3, createInitialState(L3), gate);
    expect(r.intruder).toMatchObject({ reason: 'no-route', from: 'J', to: 'J' });
    expect(r.state.status).toBe('playing');
  });

  it('breaks equal shortest paths by smallest node ID regardless of edge order', () => {
    const base = { nodes: ['S', 'A', 'B', 'T', 'H', 'C'].map(n), intruderStart: 'S', courierStart: 'C', courierGoal: 'C', vault: 'T' };
    const e1 = mk({ ...base, edges: [['S', 'B'], ['S', 'A'], ['B', 'T'], ['A', 'T']] });
    const e2 = mk({ ...base, edges: [['A', 'T'], ['B', 'T'], ['S', 'A'], ['S', 'B']] });
    for (const lv of [e1, e2]) {
      expect(resolveTurn(lv, createInitialState(lv), null).state.intruder.at).toBe('A');
    }
  });

  it('courier uses the same stable tie-break', () => {
    const lv = mk({
      nodes: ['S', 'A', 'B', 'T', 'H', 'V'].map(n),
      edges: [['S', 'B'], ['S', 'A'], ['B', 'T'], ['A', 'T']],
      intruderStart: 'V', courierStart: 'S', courierGoal: 'T', vault: 'V',
    });
    expect(resolveTurn(lv, createInitialState(lv), null).state.courier.at).toBe('A');
  });

  it('armed trap captures the intruder but never the courier', () => {
    const lv = mk({
      nodes: ['S', 'H', 'V', 'C', 'D'].map(n),
      edges: [['S', 'V'], ['C', 'H'], ['H', 'D']],
      intruderStart: 'S', courierStart: 'C', courierGoal: 'D', vault: 'V', turnLimit: 5,
    });
    const s1 = resolveTurn(lv, createInitialState(lv), bait()).state;
    expect(s1.courier.at).toBe('H');
    expect(s1.intruder.captured).toBe(false);
    expect(s1.courier.delivered).toBe(false);
  });
});

describe('courier and shared nodes', () => {
  it('actors may share a node and pass each other', () => {
    const lv = mk({
      nodes: ['A', 'B', 'H', 'V'].map(n),
      edges: [['A', 'B'], ['B', 'V']],
      intruderStart: 'A', courierStart: 'B', courierGoal: 'A', vault: 'V', turnLimit: 5,
    });
    // intruder A->B, courier B->A: they swap simultaneously without interaction
    const s = resolveTurn(lv, createInitialState(lv), null).state;
    expect(at(s)).toEqual({ i: 'B', c: 'A' });
    expect(s.courier.delivered).toBe(true);
  });

  it('a delivered courier stays complete and in place', () => {
    const [, t2, t3] = play(L2, [reroute, bait(), null]);
    expect(t2!.courier.delivered).toBe(true);
    expect(t3!.courier).toEqual({ at: 'D', delivered: true });
  });

  it('intruder vault entry loses even when the courier delivers on the same turn', () => {
    const lv = mk({
      nodes: ['J', 'V', 'H'].map(n),
      edges: [['J', 'V']],
      intruderStart: 'J', courierStart: 'J', courierGoal: 'V', vault: 'V',
    });
    const r = resolveTurn(lv, createInitialState(lv), null);
    expect(r.state.courier.delivered).toBe(true);
    expect(r.state.intruder.breached).toBe(true);
    expect(r.state).toMatchObject({ status: 'lost', lossReason: 'breach' });
  });

  it('victory outranks the turn limit when both occur on the final turn', () => {
    const t = play(L1, [bait(), null]);
    expect(t[1]!.turn).toBe(L1.turnLimit);
    expect(t[1]!.status).toBe('won');
  });
});

describe('commands, charges and validation', () => {
  it('invalid commands consume nothing and leave the state untouched', () => {
    const s0 = createInitialState(L1);
    const r = resolveTurn(L1, s0, reroute); // not available in level 1
    expect(r.ok).toBe(false);
    expect(r.state).toBe(s0);
    expect(r.state.charges).toBe(1);
    expect(r.state.turn).toBe(0);
  });

  it('re-arming the already armed trap is invalid and free', () => {
    const [t1] = play(L2, [bait()]);
    const r = resolveTurn(L2, t1!, bait());
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/already armed/);
    expect(r.state.charges).toBe(1);
  });

  it('bait cannot be placed underneath the intruder', () => {
    const lv = mk({
      nodes: ['H', 'V', 'C'].map(n), edges: [['H', 'V']],
      intruderStart: 'H', courierStart: 'C', courierGoal: 'C', vault: 'V',
    });
    expect(validateCommand(lv, createInitialState(lv), bait())).toMatch(/underneath/);
  });

  it('moving bait deactivates the old trap; only one armed at a time', () => {
    const lv = mk({
      nodes: ['S', 'H', 'G', 'V', 'C'].map(n), edges: [['S', 'V'], ['S', 'H'], ['S', 'G']],
      honeypots: ['H', 'G'], intruderStart: 'S', courierStart: 'C', courierGoal: 'C', vault: 'V',
    });
    let s = resolveTurn(lv, createInitialState(lv), bait('H')).state;
    expect(s.armed).toBe('H');
    s = resolveTurn(lv, createInitialState(lv), bait('G')).state;
    expect(s.armed).toBe('G');
    const first = resolveTurn(lv, createInitialState(lv), bait('H')).state;
    // first.intruder was captured at H already; a fresh state is needed to re-arm
    expect(resolveTurn(lv, first, bait('G')).error).toMatch(/trapped|over/);
  });

  it('with zero charges, Wait still works but commands are rejected', () => {
    const [, t2] = play(L2, [reroute, bait()]);
    expect(t2!.charges).toBe(0);
    expect(resolveTurn(L2, t2!, reroute)).toMatchObject({ ok: false, error: 'No command charges left.' });
    const w = resolveTurn(L2, t2!, null);
    expect(w.ok).toBe(true);
    expect(w.state.turn).toBe(3);
  });

  it('Wait costs no charge but does spend a turn', () => {
    const s = resolveTurn(L3, createInitialState(L3), null).state; // breach, but accounting still holds
    expect(s.charges).toBe(4);
    expect(s.turn).toBe(1);
  });

  it('actions after the level ends are rejected', () => {
    const [, t2] = play(L1, [null, null]);
    expect(resolveTurn(L1, t2!, null).ok).toBe(false);
  });

  it('chargesUsed reports spent commands', () => {
    const [, t2] = play(L2, [reroute, bait()]);
    expect(chargesUsed(L2, t2!)).toBe(2);
  });
});

describe('preview, immutability', () => {
  it('preview and commit agree and never mutate the input', () => {
    for (const lv of LEVELS) {
      let s = createInitialState(lv);
      const cmds: (Command | null)[] = [null, reroute, bait(), gate];
      for (const c of cmds) {
        const before = JSON.stringify(s);
        const p = previewTurn(lv, s, c);
        expect(JSON.stringify(s)).toBe(before);
        const committed = resolveTurn(lv, s, c);
        expect(committed).toEqual(p);
        if (!committed.ok || committed.state.status !== 'playing') break;
        s = committed.state;
      }
    }
  });

  it('states are deeply frozen and a turn does not alter the previous state', () => {
    const s0 = createInitialState(L3);
    expect(Object.isFrozen(s0) && Object.isFrozen(s0.intruder) && Object.isFrozen(s0.shutters)).toBe(true);
    const snapshot = JSON.stringify(s0);
    const s1 = resolveTurn(L3, s0, gate).state;
    expect(JSON.stringify(s0)).toBe(snapshot);
    expect(s1.shutters).not.toBe(s0.shutters);
    expect(s0.shutters['gate']).toBe(true);
    expect(() => { (s1.intruder as { at: string }).at = 'Z'; }).toThrow();
  });

  it('is deterministic', () => {
    const a = play(L3, [gate, reroute, bait(), gate]);
    const b = play(L3, [gate, reroute, bait(), gate]);
    expect(a).toEqual(b);
  });
});

describe('level data and bounded solvability search', () => {
  it('references only declared nodes and has consistent switch hubs', () => {
    for (const lv of LEVELS) {
      const ids = new Set(lv.nodes.map((x) => x.id));
      expect(ids.size).toBe(lv.nodes.length);
      const edges = [...lv.edges, ...lv.shutters.map((s) => s.edge), ...lv.switches.flatMap((s) => [...s.options])];
      for (const [a, b] of edges) { expect(ids.has(a)).toBe(true); expect(ids.has(b)).toBe(true); }
      for (const sw of lv.switches) for (const [a, b] of sw.options) expect([a, b]).toContain(sw.hub);
      for (const id of [lv.intruderStart, lv.courierStart, lv.courierGoal, lv.vault, ...lv.honeypots]) expect(ids.has(id)).toBe(true);
    }
  });

  function search(lv: LevelDef) {
    const cmds: (Command | null)[] = [null, ...lv.honeypots.map((t) => bait(t)),
      ...lv.switches.map((s) => ({ kind: 'reroute', id: s.id }) as Command),
      ...lv.shutters.map((s) => ({ kind: 'shutter', id: s.id }) as Command)];
    let wins = 0;
    let waitOnlyWins = 0;
    const walk = (s: GameState, depth: number, onlyWait: boolean) => {
      for (const c of cmds) {
        const r = resolveTurn(lv, s, c);
        if (!r.ok) continue;
        const w = onlyWait && c === null;
        if (r.state.status === 'won') { wins++; if (w) waitOnlyWins++; }
        else if (r.state.status === 'playing') walk(r.state, depth + 1, w);
      }
    };
    walk(createInitialState(lv), 0, true);
    return { wins, waitOnlyWins };
  }

  it('every level is solvable within its limits and never by waiting alone', () => {
    for (const lv of LEVELS) {
      const { wins, waitOnlyWins } = search(lv);
      expect(wins, lv.id).toBeGreaterThan(0);
      expect(waitOnlyWins, lv.id).toBe(0);
    }
  });

  it('Level 3 solutions all begin with a Seal on turn 1', () => {
    const first = resolveTurn(L3, createInitialState(L3), gate);
    expect(first.state.status).toBe('playing');
    for (const c of [null, bait(), reroute]) expect(resolveTurn(L3, createInitialState(L3), c).state.status).toBe('lost');
  });
});