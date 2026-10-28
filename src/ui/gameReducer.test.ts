import { describe, expect, it } from 'vitest';
import { newSession, reducer, type Session } from './gameReducer';
import { LEVELS } from '../levels/levels';
import type { Command, LevelDef } from '../engine';

const L1 = LEVELS[0] as LevelDef;
const L3 = LEVELS[2] as LevelDef;
const gate: Command = { kind: 'shutter', id: 'gate' };
const reroute: Command = { kind: 'reroute', id: 'junction' };
const bait: Command = { kind: 'bait', target: 'H' };

const adv = (s: Session, animate = false) => reducer(s, { type: 'advance', animate });
const pick = (s: Session, c: Command | null) => reducer(s, { type: 'select', command: c });

describe('session reducer', () => {
  it('selecting and cancelling a preview is free and does not advance time', () => {
    let s = newSession(L3);
    s = pick(s, gate);
    expect(s.selected).toEqual(gate);
    expect(s.current.turn).toBe(0);
    s = pick(s, reroute); // changing the queued command replaces it
    expect(s.selected).toEqual(reroute);
    s = pick(s, reroute); // toggle off
    expect(s.selected).toBeNull();
    expect(s.current).toEqual(newSession(L3).current);
    expect(s.history).toHaveLength(0);
    expect(s.current.charges).toBe(4);
  });

  it('undo restores the exact previous committed state (switch, shutter, bait, flags, turn, charges)', () => {
    let s = newSession(L3);
    const states = [s.current];
    for (const c of [gate, reroute, bait]) {
      s = adv(pick(s, c));
      states.push(s.current);
    }
    expect(s.current.armed).toBe('H');
    for (let i = states.length - 2; i >= 0; i--) {
      s = reducer(s, { type: 'undo' });
      expect(s.current).toBe(states[i]); // identical committed object
      expect(s.current).toEqual(states[i]);
    }
    expect(s.history).toHaveLength(0);
    expect(reducer(s, { type: 'undo' })).toBe(s); // nothing more to undo
  });

  it('undo after a loss returns to a playable state; selection is cleared', () => {
    let s = adv(adv(newSession(L1)));
    expect(s.current.status).toBe('lost');
    s = reducer(s, { type: 'undo' });
    expect(s.current.status).toBe('playing');
    expect(s.current.turn).toBe(1);
    expect(s.selected).toBeNull();
  });

  it('blocks a second Advance while animating, and a stale animation cannot unlock a new turn', () => {
    let s = adv(pick(newSession(L1), bait), true);
    expect(s.busy).toBe(true);
    const turn = s.current.turn;
    expect(adv(s, true)).toBe(s);
    expect(s.current.turn).toBe(turn);
    const seq = s.animSeq;
    s = reducer(s, { type: 'undo' });
    expect(s.busy).toBe(false);
    s = adv(pick(s, bait), true);
    expect(reducer(s, { type: 'animationDone', seq }).busy).toBe(true); // stale timer ignored
    expect(reducer(s, { type: 'animationDone', seq: s.animSeq }).busy).toBe(false);
  });

  it('restart cancels animation and queued input and resets everything', () => {
    let s = adv(pick(newSession(L1), bait), true);
    s = pick(s, null);
    s = reducer(s, { type: 'restart' });
    expect(s.busy).toBe(false);
    expect(s.history).toHaveLength(0);
    expect(s.current).toEqual(newSession(L1).current);
    expect(s.lastTurn).toBeNull();
  });

  it('rejects invalid selection with a notice and spends nothing', () => {
    let s = pick(newSession(L1), reroute);
    expect(s.selected).toBeNull();
    expect(s.notice).toBeTruthy();
    s = adv(pick(adv(pick(newSession(L1), bait)), bait)); // armed already / game continues
    expect(s.current.turn).toBeGreaterThanOrEqual(1);
  });

  it('ignores input once the level is over', () => {
    const s = adv(adv(newSession(L1)));
    expect(pick(s, bait)).toBe(s);
    expect(adv(s)).toBe(s);
  });
});