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