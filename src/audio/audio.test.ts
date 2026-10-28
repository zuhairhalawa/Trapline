import { afterEach, describe, expect, it } from 'vitest';
import { AudioCues } from './audio';

const g = globalThis as unknown as { window?: unknown };

describe('AudioCues', () => {
  afterEach(() => { delete g.window; });

  it('does nothing before a gesture unlocks audio', () => {
    g.window = { AudioContext: class { constructor() { throw new Error('must not be created yet'); } } };
    const a = new AudioCues();
    expect(() => a.play('select')).not.toThrow();
  });

  it('swallows AudioContext construction failure and keeps working silently', () => {
    g.window = { AudioContext: class { constructor() { throw new Error('blocked'); } } };
    const a = new AudioCues();
    expect(() => a.unlock()).not.toThrow();
    expect(() => a.play('success')).not.toThrow();
  });

  it('swallows playback errors and respects mute', () => {
    let created = 0;
    g.window = {
      AudioContext: class {
        currentTime = 0;
        destination = {};
        constructor() { created++; }
        resume() { return Promise.resolve(); }
        createOscillator() { throw new Error('boom'); }
        createGain() { throw new Error('boom'); }
      },
    };
    const a = new AudioCues();
    a.unlock();
    expect(created).toBe(1);
    expect(() => a.play('capture')).not.toThrow();
    a.muted = true;
    expect(() => a.play('failure')).not.toThrow();
  });
});