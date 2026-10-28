import type { Edge, GameState, LevelDef, NodeId } from './types';

export type Adjacency = ReadonlyMap<NodeId, readonly NodeId[]>;

/** All currently open edges: fixed + exposed switch edge + open shutters. */
export function openEdges(level: LevelDef, state: GameState): Edge[] {
  const out: Edge[] = [...level.edges];
  for (const sw of level.switches) out.push(sw.options[state.switches[sw.id] ?? sw.initial]);
  for (const sh of level.shutters) if (state.shutters[sh.id] ?? sh.initiallyOpen) out.push(sh.edge);
  return out;
}

export function compareIds(a: NodeId, b: NodeId): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Adjacency with neighbours sorted by stable node ID (deterministic tie-breaks). */
export function buildAdjacency(level: LevelDef, state: GameState): Adjacency {
  const m = new Map<NodeId, NodeId[]>();
  for (const n of level.nodes) m.set(n.id, []);
  for (const [a, b] of openEdges(level, state)) {
    m.get(a)?.push(b);
    m.get(b)?.push(a);
  }
  for (const list of m.values()) list.sort(compareIds);
  return m;
}

/** Edge counts from source to every reachable node. */
export function distancesFrom(adj: Adjacency, source: NodeId): Map<NodeId, number> {
  const dist = new Map<NodeId, number>([[source, 0]]);
  const queue: NodeId[] = [source];
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i] as NodeId;
    const d = dist.get(cur) as number;
    for (const nb of adj.get(cur) ?? []) {
      if (!dist.has(nb)) {
        dist.set(nb, d + 1);
        queue.push(nb);
      }
    }
  }
  return dist;
}

/** One step along a shortest path from `from` to `to`; smallest node ID wins ties. Null if none. */
export function stepToward(adj: Adjacency, from: NodeId, to: NodeId): NodeId | null {
  if (from === to) return null;
  const dist = distancesFrom(adj, to);
  const d = dist.get(from);
  if (d === undefined) return null;
  for (const nb of adj.get(from) ?? []) {
    if (dist.get(nb) === d - 1) return nb; // neighbours are ID-sorted
  }
  return null;
}