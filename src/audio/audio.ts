/** Quiet original Web Audio cues. Created lazily after a user gesture; every failure is swallowed. */
export type Cue = 'select' | 'move' | 'capture' | 'success' | 'failure';

type Note = { f: number; t: number; d: number; type?: OscillatorType; g?: number; slideTo?: number };

const CUES: Record<Cue, Note[]> = {
  select: [{ f: 620, t: 0, d: 0.07, type: 'triangle', g: 0.05 }],
  move: [{ f: 220, t: 0, d: 0.09, type: 'sine', g: 0.05 }, { f: 262, t: 0.1, d: 0.09, type: 'sine', g: 0.04 }],
  capture: [
    { f: 330, t: 0, d: 0.16, type: 'square', g: 0.03, slideTo: 140 },
    { f: 523, t: 0.18, d: 0.2, type: 'triangle', g: 0.05 },
  ],
  success: [
    { f: 392, t: 0, d: 0.14, type: 'triangle', g: 0.05 },
    { f: 494, t: 0.12, d: 0.14, type: 'triangle', g: 0.05 },
    { f: 587, t: 0.24, d: 0.14, type: 'triangle', g: 0.05 },
    { f: 784, t: 0.36, d: 0.34, type: 'triangle', g: 0.05 },
  ],
  failure: [
    { f: 247, t: 0, d: 0.22, type: 'sawtooth', g: 0.03, slideTo: 150 },
    { f: 165, t: 0.22, d: 0.4, type: 'sawtooth', g: 0.03, slideTo: 90 },
  ],
};

export class AudioCues {
  private ctx: AudioContext | null = null;
  private failed = false;
  muted = false;

  /** Must be called from a user gesture handler. */
  unlock(): void {
    if (this.failed || this.ctx) {
      void this.ctx?.resume().catch(() => undefined);
      return;
    }
    try {
      const Ctor: typeof AudioContext | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) throw new Error('no audio');
      this.ctx = new Ctor();
      void this.ctx.resume().catch(() => undefined);
    } catch {
      this.failed = true;
    }
  }

  play(cue: Cue): void {
    if (this.muted || !this.ctx || this.failed) return;
    try {
      const ctx = this.ctx;
      const now = ctx.currentTime;
      for (const n of CUES[cue]) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = n.type ?? 'sine';
        osc.frequency.setValueAtTime(n.f, now + n.t);
        if (n.slideTo) osc.frequency.exponentialRampToValueAtTime(n.slideTo, now + n.t + n.d);
        const peak = n.g ?? 0.04;
        gain.gain.setValueAtTime(0.0001, now + n.t);
        gain.gain.exponentialRampToValueAtTime(peak, now + n.t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + n.t);
        osc.stop(now + n.t + n.d + 0.05);
      }
    } catch {
      this.failed = true;
    }
  }
}