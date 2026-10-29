import { describe, expect, it } from 'vitest';
import { createInitialState, resolveTurn, type Command, type GameState, type LevelDef } from '../engine';
import { LEVELS } from '../levels/levels';
import { coachLine, outcomeTag, queuedPhrase, shortCourier, shortIntruder } from './text';

const L1 = LEVELS[0] as LevelDef;
const L2 = LEVELS[1] as LevelDef;
const bait: Command = { kind: 'bait', target: 'H' };

const coach = (s: GameState, sel: Command | null) => coachLine(L1, s, sel, resolveTurn(L1, s, sel));
const after = (s: GameState, sel: Command | null): GameState => resolveTurn(L1, s, sel).state;

describe('Level 1 coach follows the real state and the queued action', () => {
  const start = createInitialState(L1);
  const afterWait = after(start, null); // both actors at J, trap unarmed, one command left

  it('reaches the state from the bug report (both at J, H unarmed, one charge)', () => {
    expect(afterWait.intruder.at).toBe('J');
    expect(afterWait.courier.at).toBe('J');
    expect(afterWait.armed).toBeNull();
    expect(afterWait.charges).toBe(1);
    expect(afterWait.turn).toBe(1);
  });

  it('after Wait it recommends Bait (not Wait) and warns that waiting loses', () => {
    const c = coach(afterWait, null) ?? '';
    expect(c).toContain('Bait');
    expect(c).not.toContain('Nothing more to arm');
    expect(c).not.toMatch(/Wait, then Advance/);
    expect(c).toContain('Wait would lose');
  });

  it('a queued winning Bait gets Advance guidance and never tells the player to cancel it with Wait', () => {
    const c = coach(afterWait, bait) ?? '';
    expect(c).toContain('Advance');
    expect(c).not.toMatch(/\bWait\b/);
    expect(resolveTurn(L1, afterWait, bait).events.some((e) => e.type === 'victory')).toBe(true);
  });

  it('turn 0: Select Bait, then Advance guidance once queued', () => {
    expect(coach(start, null)).toContain('Select Bait');
    const queued = coach(start, bait) ?? '';
    expect(queued).toContain('Advance');
    expect(queued).not.toMatch(/\bWait\b/);
  });

  it('preferred route: once the trap is armed only Advance is left', () => {
    const armed = after(start, bait);
    expect(armed.armed).toBe('H');
    const c = coach(armed, null) ?? '';
    expect(c).toContain('armed');
    expect(c).toContain('Wait');
    expect(c).toContain('Advance');
    expect(c).not.toContain('Select Bait');
  });

  it('both documented solutions win: Bait then Wait, and Wait then Bait', () => {
    expect(after(after(start, bait), null).status).toBe('won');
    expect(after(after(start, null), bait).status).toBe('won');
    expect(after(after(start, null), null).status).toBe('lost'); // Wait twice breaches
  });

  it('is only for Level 1 and only while playing', () => {
    const s2 = createInitialState(L2);
    expect(coachLine(L2, s2, null, resolveTurn(L2, s2, null))).toBeNull();
    const won = after(after(start, bait), null);
    expect(coachLine(L1, won, null, null)).toBeNull();
  });
});

describe('compact decision summary text', () => {
  it('spells out the full queued target even when button subtitles are shortened', () => {
    const l3 = LEVELS[2] as LevelDef;
    const s = createInitialState(l3);
    expect(queuedPhrase(l3, s, { kind: 'reroute', id: 'junction' })).toBe('Reroute: open Side relay');
    expect(queuedPhrase(l3, s, { kind: 'shutter', id: 'gate' })).toBe('Seal gate: Relay - Vault');
    expect(queuedPhrase(l3, s, null)).toBe('Wait (no command)');
  });

  it('flags a predicted breach as a loss tag, never hides it', () => {
    const l3 = LEVELS[2] as LevelDef;
    const s = createInitialState(l3);
    const r = resolveTurn(l3, s, { kind: 'reroute', id: 'junction' });
    expect(outcomeTag(r)).toEqual({ tone: 'loss', text: 'Breach: you lose' });
    expect(shortIntruder(l3, r)).toBe('Intruder to Vault');
    expect(shortCourier(l3, r)).toBe('Courier to Vault');
  });

  it('shows a win tag for the winning Level 1 move', () => {
    const afterWait = after(createInitialState(L1), null);
    expect(outcomeTag(resolveTurn(L1, afterWait, bait))?.tone).toBe('win');
  });
});
