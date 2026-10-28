import { describe, expect, it } from 'vitest';
import {
  STORAGE_KEY, defaultProgress, firstIncompleteIndex, isUnlocked, loadProgress, parseProgress, saveProgress, withWin,
  type StorageLike,
} from './progress';

const mem = (): StorageLike & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
};

describe('progress persistence', () => {
  it('round-trips a valid record', () => {
    const s = mem();
    const p = withWin(defaultProgress(), 'follow-the-bait', 2, 1);
    expect(saveProgress(p, s)).toBe(true);
    expect(loadProgress(s)).toEqual(p);
  });
  it.each([null, '', 'not json', '[]', '{"version":2}', '{"version":1,"completed":"x"}', 'null', '42'])('falls back on corrupt input %j', (raw) => {
    expect(parseProgress(raw)).toEqual(defaultProgress());
  });
  it('drops invalid or unknown level records but keeps valid ones', () => {
    const raw = JSON.stringify({
      version: 1,
      completed: { 'follow-the-bait': { turns: 2, charges: 1 }, 'open-the-wrong-door': { turns: 99, charges: 0 }, evil: { turns: 1, charges: 0 }, __proto__: { turns: 1, charges: 0 } },
      settings: { muted: 'yes' },
    });
    const p = parseProgress(raw);
    expect(Object.keys(p.completed)).toEqual(['follow-the-bait']);
    expect(p.settings.muted).toBe(false);
  });
  it('never throws when storage throws or is missing', () => {
    const bad: StorageLike = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('full'); } };
    expect(loadProgress(bad)).toEqual(defaultProgress());
    expect(saveProgress(defaultProgress(), bad)).toBe(false);
    expect(saveProgress(defaultProgress(), null)).toBe(false);
    expect(loadProgress(null)).toEqual(defaultProgress());
  });
  it('keeps the better record and unlocks sequentially', () => {
    let p = withWin(defaultProgress(), 'follow-the-bait', 2, 1);
    expect(withWin(p, 'follow-the-bait', 2, 1)).toBe(p);
    expect(isUnlocked(p, 0)).toBe(true);
    expect(isUnlocked(p, 1)).toBe(true);
    expect(isUnlocked(p, 2)).toBe(false);
    expect(firstIncompleteIndex(p)).toBe(1);
    p = withWin(p, 'open-the-wrong-door', 3, 2);
    expect(isUnlocked(p, 2)).toBe(true);
    expect(STORAGE_KEY).toContain('v1');
  });
});