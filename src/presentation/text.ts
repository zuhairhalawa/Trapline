import type { Command, GameState, LevelDef, NodeId, TurnResult } from '../engine';

export const nodeLabel = (level: LevelDef, id: NodeId): string => level.nodes.find((n) => n.id === id)?.label ?? id;

export interface CommandInfo {
  /** Short button label. */
  readonly name: string;
  /** Short second line. */
  readonly sub: string;
  /** One-sentence explanation shown beside the board. */
  readonly explain: string;
}

export function describeCommand(level: LevelDef, state: GameState, c: Command | null): CommandInfo {
  if (c === null) {
    return { name: 'Wait', sub: 'Free', explain: 'Wait: spend the turn without a command. Costs no charge.' };
  }
  switch (c.kind) {
    case 'bait': {
      const t = nodeLabel(level, c.target);
      return {
        name: 'Bait',
        sub: state.armed === c.target ? 'Armed' : t,
        explain: `Bait: arm the ${t.toLowerCase()}. The intruder is drawn to it if it is within 2 open steps. Only one trap is armed at a time.`,
      };
    }
    case 'reroute': {
      const sw = level.switches.find((s) => s.id === c.id);
      if (!sw) return { name: 'Reroute', sub: '', explain: 'Reroute the junction.' };
      const cur = state.switches[c.id] ?? sw.initial;
      const other = sw.options[cur === 0 ? 1 : 0];
      const to = other[0] === sw.hub ? other[1] : other[0];
      const from = sw.options[cur][0] === sw.hub ? sw.options[cur][1] : sw.options[cur][0];
      return {
        name: 'Reroute',
        sub: `to ${nodeLabel(level, to)}`,
        explain: `Reroute: flip the junction at ${nodeLabel(level, sw.hub)} so the path to ${nodeLabel(level, to)} opens and the path to ${nodeLabel(level, from)} closes.`,
      };
    }
    case 'shutter': {
      const sh = level.shutters.find((s) => s.id === c.id);
      if (!sh) return { name: 'Seal', sub: '', explain: 'Toggle the gate.' };
      const open = state.shutters[c.id] ?? sh.initiallyOpen;
      const a = nodeLabel(level, sh.edge[0]);
      const b = nodeLabel(level, sh.edge[1]);
      return open
        ? { name: 'Seal', sub: `${a} - ${b}`, explain: `Seal: close the gate between ${a} and ${b}. Nobody can pass until it is opened again.` }
        : { name: 'Open', sub: `${a} - ${b}`, explain: `Open: reopen the gate between ${a} and ${b}. Everyone can pass again.` };
    }
  }
}

export function intruderLine(level: LevelDef, r: TurnResult, armed: NodeId | null): string {
  const i = r.intruder;
  const to = nodeLabel(level, i.to);
  switch (i.reason) {
    case 'bait':
      return `Intruder goes to ${to}: the armed trap is within 2 steps, so it takes the bait.`;
    case 'vault':
      return armed
        ? `Intruder goes to ${to}, heading for the vault: the armed trap is too far or cut off.`
        : `Intruder goes to ${to}, heading for the vault.`;
    case 'no-route':
      return 'Intruder waits: no open route to the vault.';
    case 'captured':
      return 'Intruder is trapped.';
    case 'breached':
      return 'Intruder is inside the vault.';
  }
}

export function courierLine(level: LevelDef, r: TurnResult): string {
  const c = r.courier;
  switch (c.reason) {
    case 'deliver':
      return `Courier goes to ${nodeLabel(level, c.to)} with the packet.`;
    case 'blocked':
      return `Courier waits: no open route to ${nodeLabel(level, level.courierGoal)}.`;
    case 'delivered':
      return 'Packet delivered.';
  }
}

/** What the previewed turn would end with, in one sentence (null when nothing notable). */
export function outcomeLine(r: TurnResult): string | null {
  if (!r.ok) return r.error;
  const ev = r.events;
  if (ev.some((e) => e.type === 'breach')) return 'Preview: the intruder reaches the vault. You lose.';
  if (ev.some((e) => e.type === 'victory')) return 'Preview: the trap closes and the packet is delivered. You win.';
  if (ev.some((e) => e.type === 'timeout')) return 'Preview: out of turns. You lose.';
  const parts: string[] = [];
  if (ev.some((e) => e.type === 'captured')) parts.push('the trap closes on the intruder');
  if (ev.some((e) => e.type === 'delivered')) parts.push('the packet is delivered');
  return parts.length ? `Preview: ${parts.join('; ')}.` : null;
}

export function turnAnnouncement(level: LevelDef, r: TurnResult): string {
  const parts: string[] = [`Turn ${r.state.turn} of ${level.turnLimit}.`];
  for (const e of r.events) {
    switch (e.type) {
      case 'intruder-moved': parts.push(`Intruder moved to ${nodeLabel(level, e.to)}.`); break;
      case 'courier-moved': parts.push(`Courier moved to ${nodeLabel(level, e.to)}.`); break;
      case 'captured': parts.push('Intruder trapped.'); break;
      case 'delivered': parts.push('Packet delivered.'); break;
      case 'breach': parts.push('Breach. The intruder reached the vault. Level lost.'); break;
      case 'victory': parts.push('Level won.'); break;
      case 'timeout': parts.push('Out of turns. Level lost.'); break;
      default: break;
    }
  }
  return parts.join(' ');
}
/**
 * Level 1 coaching. It depends on the CURRENT state and on what is queued right now, never on the turn number alone.
 * It is advice only: no command is ever blocked or forced, and it is separate from the engine rules.
 * Returns null on other levels or when the level is over.
 */
export function coachLine(level: LevelDef, state: GameState, selected: Command | null, preview: TurnResult | null): string | null {
  if (level.number !== 1 || state.status !== 'playing') return null;
  // Trap armed: the only thing left is to let the turn happen. Wait is the default (nothing queued).
  if (state.armed !== null) return 'Trap armed. Keep Wait and press Advance.';
  if (selected?.kind === 'bait') {
    return state.turn === 0 ? 'Press Advance. Dashed arrows: next move.' : 'Bait queued. Press Advance.';
  }
  if (state.turn === 0) return 'Select Bait to arm the trap.';
  if (state.charges <= 0) return 'No commands left. Press Advance.';
  const breach = !!preview && preview.ok && preview.events.some((e) => e.type === 'breach');
  return breach ? 'Wait would lose. Select Bait instead.' : 'Select Bait, then press Advance.';
}

/** Short phrase for what is queued (shown in the compact decision summary). */
export function queuedPhrase(level: LevelDef, state: GameState, c: Command | null): string {
  if (c === null) return 'Wait (no command)';
  switch (c.kind) {
    case 'bait':
      return `Bait: ${nodeLabel(level, c.target)}`;
    case 'reroute': {
      const sw = level.switches.find((s) => s.id === c.id);
      if (!sw) return 'Reroute';
      const cur = state.switches[c.id] ?? sw.initial;
      const other = sw.options[cur === 0 ? 1 : 0];
      const to = other[0] === sw.hub ? other[1] : other[0];
      return `Reroute: open ${nodeLabel(level, to)}`;
    }
    case 'shutter': {
      const sh = level.shutters.find((s) => s.id === c.id);
      if (!sh) return 'Gate';
      const open = state.shutters[c.id] ?? sh.initiallyOpen;
      return `${open ? 'Seal' : 'Open'} gate: ${nodeLabel(level, sh.edge[0])} - ${nodeLabel(level, sh.edge[1])}`;
    }
  }
}

/** One short line per actor for the compact summary. */
export function shortIntruder(level: LevelDef, r: TurnResult): string {
  const i = r.intruder;
  if (i.reason === 'captured') return 'Intruder trapped';
  if (i.reason === 'breached') return 'Intruder in vault';
  if (i.reason === 'no-route' || i.from === i.to) return 'Intruder waits';
  return `Intruder to ${nodeLabel(level, i.to)}${i.reason === 'bait' ? ' (bait)' : ''}`;
}
export function shortCourier(level: LevelDef, r: TurnResult): string {
  const c = r.courier;
  if (c.reason === 'delivered') return 'Packet delivered';
  if (c.reason === 'blocked' || c.from === c.to) return 'Courier waits';
  return `Courier to ${nodeLabel(level, c.to)}`;
}

export interface OutcomeTag {
  readonly tone: 'loss' | 'win' | 'note';
  readonly text: string;
}
/** Compact outcome tag for the summary (null when nothing notable happens next turn). */
export function outcomeTag(r: TurnResult): OutcomeTag | null {
  if (!r.ok) return { tone: 'note', text: r.error ?? 'Not possible' };
  const ev = r.events;
  if (ev.some((e) => e.type === 'breach')) return { tone: 'loss', text: 'Breach: you lose' };
  if (ev.some((e) => e.type === 'victory')) return { tone: 'win', text: 'Trap closes: you win' };
  if (ev.some((e) => e.type === 'timeout')) return { tone: 'loss', text: 'Out of turns: you lose' };
  const c = ev.some((e) => e.type === 'captured');
  const d = ev.some((e) => e.type === 'delivered');
  if (c && d) return { tone: 'note', text: 'Trap closes, packet delivered' };
  if (c) return { tone: 'note', text: 'Trap closes' };
  if (d) return { tone: 'note', text: 'Packet delivered' };
  return null;
}
