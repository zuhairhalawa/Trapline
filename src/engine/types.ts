export type NodeId = string;
export type Edge = readonly [NodeId, NodeId];
export type CommandKind = 'bait' | 'reroute' | 'shutter';
export type NodeKind = 'entry' | 'relay' | 'vault' | 'trap' | 'source' | 'drop' | 'dead' | 'side';

export interface NodeDef {
  readonly id: NodeId;
  readonly label: string;
  readonly kind: NodeKind;
  /** Presentation-only board coordinates (the engine never reads them). */
  readonly x: number;
  readonly y: number;
}

export interface SwitchDef {
  readonly id: string;
  readonly hub: NodeId;
  /** Exactly two alternative edges; exactly one is exposed at a time. */
  readonly options: readonly [Edge, Edge];
  readonly initial: 0 | 1;
}

export interface ShutterDef {
  readonly id: string;
  readonly edge: Edge;
  readonly initiallyOpen: boolean;
}

export interface Scenery {
  readonly x: number;
  readonly y: number;
  readonly h: number;
}

export interface LevelDef {
  readonly id: string;
  readonly number: number;
  readonly title: string;
  readonly briefing: string;
  readonly tip: string;
  readonly nodes: readonly NodeDef[];
  /** Fixed, undirected edges. */
  readonly edges: readonly Edge[];
  readonly switches: readonly SwitchDef[];
  readonly shutters: readonly ShutterDef[];
  readonly honeypots: readonly NodeId[];
  readonly intruderStart: NodeId;
  readonly courierStart: NodeId;
  readonly courierGoal: NodeId;
  readonly vault: NodeId;
  readonly allowed: readonly CommandKind[];
  readonly budget: number;
  readonly turnLimit: number;
  readonly scenery: readonly Scenery[];
}

export type Command =
  | { readonly kind: 'bait'; readonly target: NodeId }
  | { readonly kind: 'reroute'; readonly id: string }
  | { readonly kind: 'shutter'; readonly id: string };

export type GameStatus = 'playing' | 'won' | 'lost';
export type LossReason = 'breach' | 'timeout';

export interface IntruderState {
  readonly at: NodeId;
  readonly captured: boolean;
  readonly breached: boolean;
}
export interface CourierState {
  readonly at: NodeId;
  readonly delivered: boolean;
}

export interface GameState {
  readonly levelId: string;
  readonly turn: number;
  readonly charges: number;
  readonly armed: NodeId | null;
  readonly switches: Readonly<Record<string, 0 | 1>>;
  readonly shutters: Readonly<Record<string, boolean>>; // true = open
  readonly intruder: IntruderState;
  readonly courier: CourierState;
  readonly status: GameStatus;
  readonly lossReason: LossReason | null;
}

export type IntruderReason = 'bait' | 'vault' | 'no-route' | 'captured' | 'breached';
export type CourierReason = 'deliver' | 'blocked' | 'delivered';

export interface Intent<R extends string> {
  readonly from: NodeId;
  /** Equal to from when the actor waits. */
  readonly to: NodeId;
  readonly reason: R;
}

export type TurnEvent =
  | { readonly type: 'command'; readonly command: Command }
  | { readonly type: 'intruder-moved'; readonly from: NodeId; readonly to: NodeId }
  | { readonly type: 'courier-moved'; readonly from: NodeId; readonly to: NodeId }
  | { readonly type: 'captured'; readonly at: NodeId }
  | { readonly type: 'delivered'; readonly at: NodeId }
  | { readonly type: 'breach' }
  | { readonly type: 'victory' }
  | { readonly type: 'timeout' };

export interface TurnResult {
  readonly ok: boolean;
  readonly error: string | null;
  readonly command: Command | null;
  /** Next committed state (identical to the input when ok is false). */
  readonly state: GameState;
  readonly intruder: Intent<IntruderReason>;
  readonly courier: Intent<CourierReason>;
  readonly events: readonly TurnEvent[];
}