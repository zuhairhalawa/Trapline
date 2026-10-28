import { LEVELS } from '../levels/levels';

export const STORAGE_KEY = 'trapline.progress.v1';

export interface LevelRecord {
  readonly turns: number;
  readonly charges: number;
}
export interface Progress {
  readonly version: 1;
  readonly completed: Readonly<Record<string, LevelRecord>>;
  readonly settings: { readonly muted: boolean };
}
export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function defaultProgress(): Progress {
  return { version: 1, completed: {}, settings: { muted: false } };
}

const isInt = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

/** Parses and validates a stored string as data. Anything unexpected falls back to defaults. */
export function parseProgress(raw: string | null): Progress {
  if (raw === null || raw.length > 20_000) return defaultProgress();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return defaultProgress();
  }
  if (typeof data !== 'object' || data === null || (data as { version?: unknown }).version !== 1) return defaultProgress();
  const d = data as { completed?: unknown; settings?: unknown };
  const completed: Record<string, LevelRecord> = {};
  if (typeof d.completed === 'object' && d.completed !== null && !Array.isArray(d.completed)) {
    for (const lv of LEVELS) {
      const rec = Object.prototype.hasOwnProperty.call(d.completed, lv.id)
        ? (d.completed as Record<string, unknown>)[lv.id]
        : undefined;
      if (typeof rec !== 'object' || rec === null) continue;
      const { turns, charges } = rec as { turns?: unknown; charges?: unknown };
      if (isInt(turns, 1, lv.turnLimit) && isInt(charges, 0, lv.budget)) completed[lv.id] = { turns, charges };
    }
  }
  const muted =
    typeof d.settings === 'object' && d.settings !== null && (d.settings as { muted?: unknown }).muted === true;
  return { version: 1, completed, settings: { muted } };
}

export function getStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function loadProgress(storage: StorageLike | null = getStorage()): Progress {
  try {
    return parseProgress(storage ? storage.getItem(STORAGE_KEY) : null);
  } catch {
    return defaultProgress();
  }
}

/** Returns false (and never throws) when storage is unavailable or full. */
export function saveProgress(p: Progress, storage: StorageLike | null = getStorage()): boolean {
  try {
    if (!storage) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
}

/** Call only after the engine reports an actual win. Keeps the better record. */
export function withWin(p: Progress, levelId: string, turns: number, charges: number): Progress {
  const prev = p.completed[levelId];
  const better = !prev || turns < prev.turns || (turns === prev.turns && charges < prev.charges);
  return better ? { ...p, completed: { ...p.completed, [levelId]: { turns, charges } } } : p;
}

export function withMuted(p: Progress, muted: boolean): Progress {
  return { ...p, settings: { muted } };
}

/** Level 1 is always open; each later level opens after the previous is completed. */
export function isUnlocked(p: Progress, index: number): boolean {
  if (index <= 0) return true;
  const prev = LEVELS[index - 1];
  return !!prev && !!p.completed[prev.id];
}

export function firstIncompleteIndex(p: Progress): number {
  const i = LEVELS.findIndex((l) => !p.completed[l.id]);
  return i === -1 ? 0 : i;
}