import type { LevelDef } from '../engine';

/**
 * Declarative level data. Node IDs are stable and drive the engine's tie-breaks.
 * x/y are presentation-only board coordinates (ground plane, already projected).
 */
export const LEVELS: readonly LevelDef[] = [
  {
    id: 'follow-the-bait',
    number: 1,
    title: 'Follow the Bait',
    briefing: 'The intruder is heading for the vault. Give it something it likes better.',
    tip: 'A trap pulls the intruder only when it is within 2 steps.',
    nodes: [
      { id: 'S', label: 'Entry', kind: 'entry', x: -230, y: -110 },
      { id: 'J', label: 'Relay', kind: 'relay', x: 0, y: 0 },
      { id: 'V', label: 'Vault', kind: 'vault', x: 0, y: -215 },
      { id: 'H', label: 'Trap', kind: 'trap', x: 230, y: -110 },
      { id: 'C', label: 'Source', kind: 'source', x: -230, y: 115 },
      { id: 'D', label: 'Drop', kind: 'drop', x: 230, y: 115 },
    ],
    edges: [['S', 'J'], ['J', 'V'], ['J', 'H'], ['C', 'J'], ['J', 'D']],
    switches: [],
    shutters: [],
    honeypots: ['H'],
    intruderStart: 'S',
    courierStart: 'C',
    courierGoal: 'D',
    vault: 'V',
    allowed: ['bait'],
    budget: 1,
    turnLimit: 2,
    scenery: [], // A2: decorative tower islands removed (they read as unused nodes)
  },
  {
    id: 'open-the-wrong-door',
    number: 2,
    title: 'Open the Wrong Door',
    briefing: 'The trap is out of reach. Open a path to it, then bait it.',
    tip: 'You may arm a trap before the intruder can reach it.',
    nodes: [
      { id: 'S', label: 'Entry', kind: 'entry', x: -320, y: -115 },
      { id: 'J', label: 'Relay', kind: 'relay', x: -80, y: 0 },
      { id: 'V', label: 'Vault', kind: 'vault', x: -80, y: -215 },
      { id: 'K', label: 'Side relay', kind: 'side', x: 150, y: 110 },
      { id: 'H', label: 'Trap', kind: 'trap', x: 370, y: 0 },
      { id: 'X', label: 'Dead end', kind: 'dead', x: 150, y: -110 },
      { id: 'C', label: 'Source', kind: 'source', x: -320, y: 115 },
      { id: 'D', label: 'Drop', kind: 'drop', x: -80, y: 215 },
    ],
    edges: [['S', 'J'], ['J', 'V'], ['K', 'H'], ['C', 'J'], ['J', 'D']],
    switches: [{ id: 'junction', hub: 'J', options: [['J', 'X'], ['J', 'K']], initial: 0 }],
    shutters: [],
    honeypots: ['H'],
    intruderStart: 'S',
    courierStart: 'C',
    courierGoal: 'D',
    vault: 'V',
    allowed: ['bait', 'reroute'],
    budget: 2,
    turnLimit: 3,
    scenery: [], // A2: decorative tower islands removed (they read as unused nodes)
  },
  {
    id: 'keep-the-service-running',
    number: 3,
    title: 'Keep the Service Running',
    briefing: 'Intruder and packet share the same relay. Stall the intruder, not the delivery.',
    tip: 'A sealed gate stops everyone. Reopen it in time for the packet.',
    nodes: [
      { id: 'J', label: 'Relay', kind: 'relay', x: -90, y: 30 },
      { id: 'V', label: 'Vault', kind: 'vault', x: -330, y: -90 },
      { id: 'K', label: 'Side relay', kind: 'side', x: 150, y: 150 },
      { id: 'H', label: 'Trap', kind: 'trap', x: 370, y: 30 },
      { id: 'X', label: 'Dead end', kind: 'dead', x: 150, y: -90 },
    ],
    edges: [['K', 'H']],
    switches: [{ id: 'junction', hub: 'J', options: [['J', 'X'], ['J', 'K']], initial: 0 }],
    shutters: [{ id: 'gate', edge: ['J', 'V'], initiallyOpen: true }],
    honeypots: ['H'],
    intruderStart: 'J',
    courierStart: 'J',
    courierGoal: 'V',
    vault: 'V',
    allowed: ['bait', 'reroute', 'shutter'],
    budget: 4,
    turnLimit: 4,
    scenery: [], // A2: decorative tower islands removed (they read as unused nodes)
  },
];

export function getLevel(id: string): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}