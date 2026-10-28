import { buildAdjacency, distancesFrom, stepToward } from './graph';
import type {
  Command,
  CourierReason,
  GameState,
  Intent,
  IntruderReason,
  LevelDef,
  TurnEvent,
  TurnResult,
} from './types';

/** Lure range: an armed honeypot within this many open edges distracts the intruder. */
export const LURE_RANGE = 2;

function freezeState(s: GameState): GameState {
  Object.freeze(s.switches);
  Object.freeze(s.shutters);
  Object.freeze(s.intruder);
  Object.freeze(s.courier);
  return Object.freeze(s);
}

export function createInitialState(level: LevelDef): GameState {
  const switches: Record<string, 0 | 1> = {};
  for (const sw of level.switches) switches[sw.id] = sw.initial;
  const shutters: Record<string, boolean> = {};
  for (const sh of level.shutters) shutters[sh.id] = sh.initiallyOpen;
  return freezeState({
    levelId: level.id,
    turn: 0,
    charges: level.budget,
    armed: null,
    switches,
    shutters,
    intruder: { at: level.intruderStart, captured: false, breached: false },
    courier: { at: level.courierStart, delivered: level.courierStart === level.courierGoal },
    status: 'playing',
    lossReason: null,
  });
}

/** Returns an error message if the command cannot be applied now, otherwise null. */
export function validateCommand(level: LevelDef, state: GameState, command: Command | null): string | null {
  if (state.status !== 'playing') return 'The level is over.';
  if (command === null) return null;
  if (!level.allowed.includes(command.kind)) return 'That command is not available in this level.';
  if (state.charges <= 0) return 'No command charges left.';
  switch (command.kind) {
    case 'bait':
      if (!level.honeypots.includes(command.target)) return 'Unknown honeypot.';
      if (state.armed === command.target) return 'That trap is already armed.';
      if (state.intruder.captured) return 'The intruder is already trapped.';
      if (state.intruder.at === command.target) return 'Cannot arm a trap underneath the intruder.';
      return null;
    case 'reroute':
      return level.switches.some((s) => s.id === command.id) ? null : 'Unknown junction.';
    case 'shutter':
      return level.shutters.some((s) => s.id === command.id) ? null : 'Unknown shutter.';
  }
}

function applyCommand(state: GameState, command: Command): GameState {
  const charges = state.charges - 1;
  switch (command.kind) {
    case 'bait':
      return { ...state, charges, armed: command.target };
    case 'reroute':
      return { ...state, charges, switches: { ...state.switches, [command.id]: state.switches[command.id] === 1 ? 0 : 1 } };
    case 'shutter':
      return { ...state, charges, shutters: { ...state.shutters, [command.id]: !state.shutters[command.id] } };
  }
}

function intruderIntent(level: LevelDef, s: GameState): Intent<IntruderReason> {
  const at = s.intruder.at;
  if (s.intruder.breached) return { from: at, to: at, reason: 'breached' };
  if (s.intruder.captured) return { from: at, to: at, reason: 'captured' };
  const adj = buildAdjacency(level, s);
  if (s.armed !== null) {
    const d = distancesFrom(adj, at).get(s.armed);
    if (d !== undefined && d >= 1 && d <= LURE_RANGE) {
      const to = stepToward(adj, at, s.armed);
      if (to !== null) return { from: at, to, reason: 'bait' };
    }
  }
  const to = stepToward(adj, at, level.vault);
  return to === null ? { from: at, to: at, reason: 'no-route' } : { from: at, to, reason: 'vault' };
}

function courierIntent(level: LevelDef, s: GameState): Intent<CourierReason> {
  const at = s.courier.at;
  if (s.courier.delivered) return { from: at, to: at, reason: 'delivered' };
  const to = stepToward(buildAdjacency(level, s), at, level.courierGoal);
  return to === null ? { from: at, to: at, reason: 'blocked' } : { from: at, to, reason: 'deliver' };
}

/**
 * The single transition function. Preview and Advance both call this; it never mutates its input.
 * Order: command -> intentions (same post-command state) -> simultaneous moves ->
 * capture / delivery / vault entry -> turn++ -> breach, victory, timeout.
 */
export function resolveTurn(level: LevelDef, state: GameState, command: Command | null): TurnResult {
  const error = validateCommand(level, state, command);
  if (error !== null) {
    return {
      ok: false,
      error,
      command,
      state,
      intruder: intruderIntent(level, state),
      courier: courierIntent(level, state),
      events: [],
    };
  }
  const events: TurnEvent[] = [];
  let s: GameState = state;
  if (command !== null) {
    s = applyCommand(state, command);
    events.push({ type: 'command', command });
  }
  const iIntent = intruderIntent(level, s);
  const cIntent = courierIntent(level, s);

  let intruder = s.intruder;
  let courier = s.courier;
  if (iIntent.to !== iIntent.from) {
    events.push({ type: 'intruder-moved', from: iIntent.from, to: iIntent.to });
    intruder = { ...intruder, at: iIntent.to };
  }
  if (cIntent.to !== cIntent.from) {
    events.push({ type: 'courier-moved', from: cIntent.from, to: cIntent.to });
    courier = { ...courier, at: cIntent.to };
  }
  if (!intruder.captured && !intruder.breached) {
    if (s.armed !== null && intruder.at === s.armed) {
      intruder = { ...intruder, captured: true };
      events.push({ type: 'captured', at: intruder.at });
    } else if (intruder.at === level.vault) {
      intruder = { ...intruder, breached: true };
    }
  }
  if (!courier.delivered && courier.at === level.courierGoal) {
    courier = { ...courier, delivered: true };
    events.push({ type: 'delivered', at: courier.at });
  }

  const turn = s.turn + 1;
  let status = s.status;
  let lossReason = s.lossReason;
  if (intruder.breached) {
    status = 'lost';
    lossReason = 'breach';
    events.push({ type: 'breach' });
  } else if (intruder.captured && courier.delivered) {
    status = 'won';
    events.push({ type: 'victory' });
  } else if (turn >= level.turnLimit) {
    status = 'lost';
    lossReason = 'timeout';
    events.push({ type: 'timeout' });
  }

  const next = freezeState({ ...s, turn, intruder, courier, status, lossReason });
  return { ok: true, error: null, command, state: next, intruder: iIntent, courier: cIntent, events };
}

/** Non-mutating preview. Same function as Advance, so the two cannot disagree. */
export const previewTurn = resolveTurn;

export function chargesUsed(level: LevelDef, state: GameState): number {
  return level.budget - state.charges;
}