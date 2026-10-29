import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { Command, GameState, LevelDef, NodeDef, TurnResult } from '../engine';
import { validateCommand } from '../engine';
import { sameCommand } from '../ui/gameReducer';
import {
  Courier, DeadEnd, DropDock, Gate, Intruder, JunctionPiece, K, PAL, Portal, ServerBox, Tile, TrapBack, TrapFront, Vault,
  type Expression,
} from './pieces';
import { describeCommand, nodeLabel } from './text';

const PAD_NODE = 72;       // diamond half-width before the rounding stroke
const PAD_STROKE = 36;     // rounds the pad corners (adds 18 per side)
const PAD_FULL = PAD_NODE + PAD_STROKE / 2;
const PAD_RIBBON = 64;

interface Pt { x: number; y: number }

export interface BoardProps {
  level: LevelDef;
  state: GameState;
  /** Result of the queued command (or Wait); drives ghost arrows. Null hides previews. */
  preview: TurnResult | null;
  selected: Command | null;
  interactive: boolean;
  onCommand?: (c: Command) => void;
  /** Horizontal compression used on narrow screens so pieces stay readable. */
  xScale?: number;
  animate?: boolean;
  /**
   * Presentation only. False while the pieces are still travelling after Advance: the capture / delivery / breach
   * visuals (closed trap, TRAPPED, DELIVERED, BREACH, X visor) wait until the actors have arrived. The committed
   * `state` (and every data-* readout) is never delayed; rules never depend on this.
   */
  arrived?: boolean;
}

/** Smallest rendered tap target (CSS px, diameter). The hit radius grows in board units when the board is drawn small. */
const MIN_HIT_PX = 48;

const diamond = (cx: number, cy: number, hw: number) =>
  `${cx - hw},${cy} ${cx},${cy + hw * K} ${cx + hw},${cy} ${cx},${cy - hw * K}`;

function Pill({ x, y, text, tone, preview, s = 1, testId }: { x: number; y: number; text: string; tone: 'coral' | 'mint' | 'amber'; preview?: boolean; s?: number; testId?: string }) {
  const w = text.length * 7.2 + 24;
  const c = tone === 'coral' ? PAL.coral : tone === 'mint' ? PAL.mint : PAL.amber;
  return (
    <g className={`pill ${preview ? 'preview queued-mark' : 'pop'}`} data-testid={testId} transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="pill-inner">
        <rect x={-w / 2} y={-12} width={w} height={24} rx={12} fill={PAL.ink} stroke={c} strokeWidth={2} strokeDasharray={preview ? '4 3' : undefined} />
        <text x={0} y={4.5} textAnchor="middle" fill={c} fontSize={12.5} fontWeight={700} letterSpacing="0.04em">
          {text}
        </text>
      </g>
    </g>
  );
}

function Arrow({ from, to, color }: { from: Pt; to: Pt; color: string }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 4) return null;
  const ux = dx / len;
  const uy = dy / len;
  const trimS = Math.min(20, len * 0.25);
  const trimE = Math.min(26, len * 0.3);
  const a = { x: from.x + ux * trimS, y: from.y + uy * trimS };
  const b = { x: to.x - ux * trimE, y: to.y - uy * trimE };
  const hx = b.x + ux * 4;
  const hy = b.y + uy * 4;
  const nx = -uy;
  const ny = ux;
  const head = `${hx},${hy} ${hx - ux * 14 + nx * 8},${hy - uy * 14 + ny * 8} ${hx - ux * 14 - nx * 8},${hy - uy * 14 - ny * 8}`;
  return (
    <g className="ghost-arrow">
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={PAL.ink} strokeWidth={9} strokeLinecap="round" opacity={0.55} />
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={4} strokeLinecap="round" strokeDasharray="2 9" className="march" />
      <polygon points={head} fill={color} stroke={PAL.ink} strokeWidth={2} strokeLinejoin="round" />
    </g>
  );
}

function WaitBadge({ x, y, color, s = 1 }: { x: number; y: number; color: string; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} className="wait-badge">
      <circle r={11} fill={PAL.ink} stroke={color} strokeWidth={2} strokeDasharray="3 2" />
      <rect x={-4.5} y={-5} width={3.2} height={10} rx={1} fill={color} />
      <rect x={1.3} y={-5} width={3.2} height={10} rx={1} fill={color} />
    </g>
  );
}

export function Board({ level, state, preview, selected, interactive, onCommand, xScale = 1, animate = true, arrived = true }: BoardProps) {
  // Rendered scale of the SVG (CSS px per board unit), measured from the real element so tap targets can keep a
  // minimum CSS size however small the board is drawn (short landscape phones).
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [scale, setScale] = useState(1);
  const hitR = (r: number) => Math.max(r, MIN_HIT_PX / (2 * scale));
  // Visuals of the committed result, held back until the pieces have arrived.
  const vCaptured = state.intruder.captured && arrived;
  const vBreached = state.intruder.breached && arrived;
  const vDelivered = state.courier.delivered && arrived;

  const pos = (n: NodeDef): Pt => ({ x: n.x * xScale, y: n.y });
  /** Text/badge scale: pieces shrink on phones, so small annotations are enlarged to stay legible. */
  const f = xScale < 1 ? 1.5 : 1;
  const nodeById = new Map(level.nodes.map((n) => [n.id, n] as const));
  const P = (id: string): Pt => pos(nodeById.get(id) as NodeDef);

  // ---- what the player has queued (only while a valid preview is shown; never mutates committed state) ----
  const showPreview = preview !== null && preview.ok !== undefined && state.status === 'playing';
  const pv = showPreview ? preview : null;
  const q = pv && pv.ok ? selected : null;
  const qGate = q?.kind === 'shutter' ? q.id : null;
  const qSwitch = q?.kind === 'reroute' ? q.id : null;
  const qBait = q?.kind === 'bait' && state.armed !== q.target ? q.target : null;

  // ---- edges (all of them, with their live state) ----
  // role: current = live junction branch; closing/opening = what a queued command will do to the route.
  type Role = 'none' | 'current' | 'closing' | 'opening';
  type EdgeView = { key: string; a: Pt; b: Pt; open: boolean; alt: boolean; shutter: string | null; role: Role };
  const edges: EdgeView[] = [];
  for (const [a, b] of level.edges) edges.push({ key: `${a}-${b}`, a: P(a), b: P(b), open: true, alt: false, shutter: null, role: 'none' });
  for (const sw of level.switches) {
    const cur = state.switches[sw.id] ?? sw.initial;
    sw.options.forEach(([a, b], i) => {
      const live = i === cur;
      const role: Role = qSwitch === sw.id ? (live ? 'closing' : 'opening') : live ? 'current' : 'none';
      edges.push({ key: `${a}-${b}`, a: P(a), b: P(b), open: live, alt: true, shutter: null, role });
    });
  }
  for (const sh of level.shutters) {
    const open = state.shutters[sh.id] ?? sh.initiallyOpen;
    const role: Role = qGate === sh.id ? (open ? 'closing' : 'opening') : 'none';
    edges.push({ key: `${sh.edge[0]}-${sh.edge[1]}`, a: P(sh.edge[0]), b: P(sh.edge[1]), open, alt: false, shutter: sh.id, role });
  }

  // ---- bounds (network only: no decorative scenery) ----
  const all: Pt[] = level.nodes.map(pos);
  const minX = Math.min(...all.map((p) => p.x)) - PAD_FULL - 14;
  const maxX = Math.max(...all.map((p) => p.x)) + PAD_FULL + 14;
  const goalIsVault = level.courierGoal === level.vault;
  const topPad = (n: NodeDef) => (n.id === level.vault && goalIsVault ? 100 + 40 * f : f > 1 ? 122 : 125);
  const minY = Math.min(...level.nodes.map((n) => pos(n).y - topPad(n)));
  /** Pill above the courier goal; stacked above the BREACH pill when the goal is the vault itself. */
  const goalDy = goalIsVault ? -(100 + 28 * f) : -66;
  const maxY = Math.max(...all.map((p) => p.y)) + 118 + 10 * f;
  const vb = `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
  const vbW = maxX - minX;
  const vbH = maxY - minY;
  useLayoutEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      const sc = Math.min(r.width / vbW, r.height / vbH);
      setScale((prev) => (Math.abs(prev - sc) < 0.002 ? prev : sc));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [vbW, vbH]);

  // ---- actors ----
  const stand = (n: NodeDef): Pt => {
    const base = pos(n);
    switch (n.kind) {
      case 'relay': case 'side': case 'source': return { x: base.x, y: base.y - 14 };
      case 'vault': return { x: base.x, y: base.y + 14 };
      case 'trap': return { x: base.x, y: base.y - 14 }; // rises out of the open box; the lid front hides its feet
      default: return { x: base.x, y: base.y - 2 };
    }
  };
  const actorPoint = (node: string, who: 'i' | 'c', sharing: boolean): Pt => {
    const s = stand(nodeById.get(node) as NodeDef);
    return sharing ? { x: s.x + (who === 'i' ? -17 : 17), y: s.y + 4 } : s;
  };
  const iAt = state.intruder.at;
  const cAt = state.courier.at;
  const sharing = iAt === cAt;
  const iPt = actorPoint(iAt, 'i', sharing);
  const cPt = actorPoint(cAt, 'c', sharing);

  const iNext = pv?.state.intruder.at ?? iAt;
  const cNext = pv?.state.courier.at ?? cAt;
  const nextShare = iNext === cNext;
  const iNextPt = actorPoint(iNext, 'i', nextShare);
  const cNextPt = actorPoint(cNext, 'c', nextShare);
  const iMoves = !!pv && iNext !== iAt;
  const cMoves = !!pv && cNext !== cAt;

  const expression: Expression = vCaptured
    ? 'captured'
    : pv?.intruder.reason === 'bait'
      ? 'bait'
      : pv?.intruder.reason === 'no-route'
        ? 'blocked'
        : 'vault';

  const nodesSorted = [...level.nodes].sort((a, b) => pos(a).y - pos(b).y);
  const hop = state.turn;

  // ---- targets ----
  const targets: { key: string; at: Pt; r: number; command: Command; label: string }[] = [];
  for (const t of level.honeypots) {
    const c: Command = { kind: 'bait', target: t };
    targets.push({ key: `bait-${t}`, at: { x: P(t).x, y: P(t).y - 14 }, r: hitR(54), command: c, label: `Trap at ${nodeLabel(level, t)}` });
  }
  const unit = (from: Pt, to: Pt): Pt => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const l = Math.hypot(dx, dy) || 1;
    return { x: dx / l, y: dy / l };
  };
  /**
   * The junction plate goes in the open space around its hub: the candidate position (ring of angles and radii)
   * that stays furthest from every track, node and other tap target, so its 84px+ hit circle never overlaps a
   * neighbour. It depends only on level geometry, so the plate does not move when the junction flips.
   */
  const segDist = (p: Pt, a: Pt, b: Pt) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  };
  const JR = hitR(42);
  const others = [
    ...targets.map((t) => ({ at: t.at, r: t.r })),
    ...level.shutters.map((sh) => {
      const a = P(sh.edge[0]);
      const b = P(sh.edge[1]);
      return { at: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 12 }, r: hitR(42) };
    }),
  ];
  const placeJunction = (hub: Pt): Pt => {
    let best: Pt = { x: hub.x - 110, y: hub.y };
    let bestScore = -Infinity;
    for (let deg = 0; deg < 360; deg += 15) {
      for (const R of [105, 125, 145]) {
        const a = (deg * Math.PI) / 180;
        const c: Pt = { x: hub.x + R * Math.cos(a), y: hub.y + R * Math.sin(a) * 0.75 };
        if (c.x < minX + 45 || c.x > maxX - 45 || c.y < minY + 50 || c.y > maxY - 70) continue;
        const dEdge = Math.min(...edges.map((e) => segDist(c, e.a, e.b))) - 34;
        const dNode = Math.min(...level.nodes.map((n) => Math.hypot(c.x - pos(n).x, c.y - pos(n).y))) - 92;
        const dTarget = Math.min(...others.map((o) => Math.hypot(c.x - o.at.x, c.y - 8 - o.at.y) - (JR + o.r) - 4));
        const score = Math.min(dEdge, dNode, dTarget) + (c.x < hub.x ? 3 : 0) - R * 0.02;
        if (score > bestScore) { bestScore = score; best = c; }
      }
    }
    return best;
  };
  const junctions = level.switches.map((sw) => {
    const hub = P(sw.hub);
    const cur = state.switches[sw.id] ?? sw.initial;
    const end = (i: 0 | 1) => P(sw.options[i].find((x) => x !== sw.hub) as string);
    const curEnd = end(cur);
    const altEnd = end(cur === 0 ? 1 : 0);
    return {
      sw,
      at: placeJunction(hub),
      cur: unit(hub, curEnd),
      alt: unit(hub, altEnd),
      curTo: nodeLabel(level, sw.options[cur].find((x) => x !== sw.hub) as string),
      altTo: nodeLabel(level, sw.options[cur === 0 ? 1 : 0].find((x) => x !== sw.hub) as string),
    };
  });
  for (const d of junctions) targets.push({ key: `rr-${d.sw.id}`, at: { x: d.at.x, y: d.at.y - 8 }, r: JR, command: { kind: 'reroute', id: d.sw.id }, label: `Junction at ${nodeLabel(level, d.sw.hub)}, now to ${d.curTo}, queues switch to ${d.altTo}` });
  const gates = level.shutters.map((sh) => {
    const a = P(sh.edge[0]);
    const b = P(sh.edge[1]);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    return { sh, at: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, u: { x: dx / l, y: dy / l }, open: state.shutters[sh.id] ?? sh.initiallyOpen };
  });
  for (const g of gates) targets.push({ key: `sh-${g.sh.id}`, at: { x: g.at.x, y: g.at.y - 12 }, r: hitR(42), command: { kind: 'shutter', id: g.sh.id }, label: `Gate ${nodeLabel(level, g.sh.edge[0])} to ${nodeLabel(level, g.sh.edge[1])}` });

  const onKey = (e: KeyboardEvent, c: Command) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onCommand?.(c);
    }
  };

  const trapNodes = level.nodes.filter((n) => n.kind === 'trap');
  const ev = pv?.events ?? [];
  const previewCaptured = ev.some((e) => e.type === 'captured');
  const previewBreach = ev.some((e) => e.type === 'breach');
  const previewDelivered = ev.some((e) => e.type === 'delivered');

  return (
    <svg
      ref={svgRef}
      className={`board ${animate ? '' : 'no-anim'}`}
      viewBox={vb}
      preserveAspectRatio="xMidYMid meet"
      role="group"
      aria-label={`Board for ${level.title}`}
      data-testid="board"
    >
      <defs>
        <filter id="blur6" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>

      {/* diorama slab: union of iso pads and ribbons, extruded by offsetting darker copies */}
      <g aria-hidden="true">
        {[
          { dy: 46, fill: '#000', cls: 'slab-shadow' },
          { dy: 26, fill: PAL.slabSide, cls: '' },
          { dy: 13, fill: '#2c2622', cls: '' },
          { dy: 0, fill: PAL.slab, cls: '' },
        ].map((l) => (
          <g
            key={l.dy}
            transform={`translate(0 ${l.dy})`}
            fill={l.fill}
            stroke={l.fill}
            strokeLinejoin="round"
            filter={l.cls ? 'url(#blur6)' : undefined}
            opacity={l.cls ? 0.5 : 1}
          >
            <g strokeWidth={PAD_RIBBON}>
              {edges.map((e) => <line key={e.key} x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y} />)}
            </g>
            <g strokeWidth={PAD_STROKE}>
              {level.nodes.map((n) => { const p = pos(n); return <polygon key={n.id} points={diamond(p.x, p.y, PAD_NODE)} />; })}
            </g>
          </g>
        ))}
      </g>

      {/* tracks */}
      <g aria-hidden="true" strokeLinecap="round" fill="none">
        {edges.map((e) => {
          const live = e.open;
          return (
            <g key={`e${e.key}`} className={`edge ${live ? 'open' : 'shut'} ${e.alt ? 'alt' : ''}`} data-edge={e.key} data-open={live} data-role={e.role}>
              {e.role === 'current' && <line x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y} stroke={PAL.amber} strokeWidth={30} opacity={0.3} />}
              <line x1={e.a.x} y1={e.a.y + 5} x2={e.b.x} y2={e.b.y + 5} stroke={PAL.trackSide} strokeWidth={live ? 20 : 12} strokeDasharray={live ? undefined : '3 12'} />
              <line x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y} stroke={live ? PAL.track : '#52483f'} strokeWidth={live ? 18 : 8} strokeDasharray={live ? undefined : '3 12'} />
              {live && <line x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y} stroke="rgba(244,237,226,0.16)" strokeWidth={3} />}
              {e.role === 'closing' && <line className="route-mark" x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y} stroke={PAL.coral} strokeWidth={9} strokeDasharray="12 9" strokeLinecap="butt" />}
              {e.role === 'opening' && (
                <>
                  <line x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y} stroke={PAL.amber} strokeWidth={26} opacity={0.22} />
                  <line className="route-mark" x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y} stroke={PAL.amber} strokeWidth={9} strokeDasharray="12 9" strokeLinecap="butt" />
                </>
              )}
            </g>
          );
        })}
      </g>

      {/* gates */}
      {gates.map((g) => (
        <g key={g.sh.id} transform={`translate(${g.at.x} ${g.at.y})`} data-testid={`gate-${g.sh.id}`} data-open={g.open}>
          <Gate open={g.open} ux={g.u.x} uy={g.u.y} />
          {qGate === g.sh.id && (
            <g className="ghost-gate-wrap" opacity={0.6} data-testid={`gate-ghost-${g.sh.id}`} data-will-open={!g.open}>
              <Gate open={!g.open} ux={g.u.x} uy={g.u.y} ghost />
            </g>
          )}
        </g>
      ))}

      {/* nodes */}
      {nodesSorted.map((n) => {
        const p = pos(n);
        const isArmed = state.armed === n.id;
        const closed = n.kind === 'trap' && vCaptured && state.intruder.at === n.id;
        return (
          <g key={n.id} transform={`translate(${p.x} ${p.y})`} data-node={n.id} className={`node node-${n.kind}`}>
            <Tile tint={n.kind === 'trap' ? '#5a4a34' : undefined} />
            {n.kind === 'entry' && <Portal />}
            {(n.kind === 'relay' || n.kind === 'side') && <ServerBox />}
            {n.kind === 'source' && <ServerBox led={PAL.mint} />}
            {n.kind === 'dead' && <DeadEnd />}
            {n.kind === 'vault' && <Vault breached={vBreached} />}
            {n.kind === 'drop' && <DropDock delivered={vDelivered} />}
            {n.kind === 'trap' && <g transform="scale(1.2)"><TrapBack armed={isArmed} closed={closed} /></g>}
            {n.kind === 'trap' && qBait === n.id && <ellipse className="queued-ring" cx="0" cy="2" rx="52" ry="30" fill="none" stroke={PAL.amber} strokeWidth="3.5" strokeDasharray="8 6" />}
          </g>
        );
      })}

      {/* switch dials */}
      {junctions.map((d) => (
        <g key={d.sw.id} transform={`translate(${d.at.x} ${d.at.y})`} data-testid={`dial-${d.sw.id}`} data-now={d.curTo} data-queued={qSwitch === d.sw.id} aria-hidden="true">
          <g transform="scale(1.2)"><JunctionPiece cur={d.cur} alt={d.alt} queued={qSwitch === d.sw.id} /></g>
          {/* always-visible label, on phones too (scaled with the other board text) */}
          <g transform={`translate(0 ${30 + 8 * f}) scale(${f})`} data-testid={`junction-label-${d.sw.id}`}>
            <rect x={-42} y={-11} width={84} height={20} rx={10} fill={PAL.ink} opacity={0.88} stroke={qSwitch === d.sw.id ? PAL.amber : 'none'} strokeWidth={1.5} />
            <text textAnchor="middle" y={3.5} fill={PAL.ivory} fontSize={12} fontWeight={800} letterSpacing="0.08em">JUNCTION</text>
          </g>
        </g>
      ))}

      {/* labels */}
      <g aria-hidden="true" className="labels">
        {level.nodes.map((n) => {
          const p = pos(n);
          const sprung = n.kind === 'trap' && vCaptured && state.intruder.at === n.id;
          const text = sprung ? `${n.label} · sprung` : n.kind === 'trap' && state.armed === n.id ? `${n.label} · armed` : n.label;
          const w = text.length * 7 + 18;
          return (
            <g key={n.id} transform={`translate(${p.x} ${p.y + 62 + 8 * (f - 1)}) scale(${f})`}>
              <rect x={-w / 2} y={-11} width={w} height={20} rx={10} fill={PAL.ink} opacity={0.78} />
              <text textAnchor="middle" y={3.5} fill={PAL.ivory} fontSize={12} fontWeight={700} letterSpacing="0.05em" opacity={0.95}>
                {text}
              </text>
            </g>
          );
        })}
      </g>

      {/* gate state tags: above nodes so the vault never clips them; NOW = committed state while a change is queued */}
      <g aria-hidden="true">
        {gates.map((g) => (
          <g key={g.sh.id} transform={`translate(${g.at.x + 26} ${g.at.y + -50 - 4 * f}) scale(${f})`}>
            <text className="tag" data-testid={`gate-now-${g.sh.id}`} textAnchor="middle" fill={g.open ? PAL.mint : PAL.coral} fontSize={12} fontWeight={800} letterSpacing="0.08em" style={{ paintOrder: 'stroke' }} stroke={PAL.ink} strokeWidth={3.5}>
              {qGate === g.sh.id ? 'NOW ' : ''}{g.open ? 'OPEN' : 'SEALED'}
            </text>
          </g>
        ))}
      </g>

      {/* ghost arrows + ghost pieces */}
      {pv && (
        <g className="ghosts" aria-hidden="true">
          {iMoves && <Arrow from={{ x: iPt.x, y: iPt.y - 18 }} to={{ x: iNextPt.x, y: iNextPt.y - 18 }} color={PAL.coral} />}
          {cMoves && <Arrow from={{ x: cPt.x, y: cPt.y - 18 }} to={{ x: cNextPt.x, y: cNextPt.y - 18 }} color={PAL.mint} />}
          {iMoves && (
            <g transform={`translate(${iNextPt.x} ${iNextPt.y})`} data-testid="ghost-intruder" data-to={iNext}>
              <Intruder expression={previewCaptured ? 'captured' : 'vault'} ghost />
            </g>
          )}
          {cMoves && (
            <g transform={`translate(${cNextPt.x} ${cNextPt.y})`} data-testid="ghost-courier" data-to={cNext}>
              <Courier delivered={previewDelivered} ghost />
            </g>
          )}
        </g>
      )}

      {/* actors */}
      {[
        { who: 'i' as const, y: iPt.y },
        { who: 'c' as const, y: cPt.y },
      ]
        .sort((a, b) => a.y - b.y)
        .map(({ who }) =>
          who === 'i' ? (
            <g
              key="i"
              className={`actor intruder ${vCaptured ? 'is-captured' : ''}`}
              style={{ transform: `translate(${iPt.x}px, ${iPt.y}px)` }}
              data-testid="intruder"
              data-at={iAt}
              data-captured={state.intruder.captured}
              data-breached={state.intruder.breached}
            >
              <g key={hop} className="hop">
                <Intruder expression={expression} />
              </g>
            </g>
          ) : (
            <g
              key="c"
              className="actor courier"
              style={{ transform: `translate(${cPt.x}px, ${cPt.y}px)` }}
              data-testid="courier"
              data-at={cAt}
              data-delivered={state.courier.delivered}
            >
              <g key={hop} className="hop">
                <Courier delivered={vDelivered} />
              </g>
            </g>
          ),
        )}

      {/* wait badges (preview only) */}
      {pv && !iMoves && !state.intruder.captured && !state.intruder.breached && <WaitBadge x={iPt.x} y={iPt.y - 62} color={PAL.coral} s={f} />}
      {pv && !cMoves && !state.courier.delivered && <WaitBadge x={cPt.x} y={cPt.y - 62} color={PAL.mint} s={f} />}

      {/* cage front (over the actor) */}
      <g aria-hidden="true">
        {trapNodes.map((n) => {
          const p = pos(n);
          const closed = vCaptured && state.intruder.at === n.id;
          return (
            <g key={n.id} transform={`translate(${p.x} ${p.y})`}>
              <g transform="scale(1.2)"><TrapFront armed={state.armed === n.id} closed={closed} /></g>
            </g>
          );
        })}
      </g>

      {/* status pills */}
      <g aria-hidden="true">
        {vCaptured && <Pill x={P(state.intruder.at).x} y={P(state.intruder.at).y - 84} text="TRAPPED" tone="amber" s={f} />}
        {vBreached && <Pill x={P(level.vault).x} y={P(level.vault).y - 96} text="BREACH" tone="coral" s={f} />}
        {vDelivered && <Pill x={P(level.courierGoal).x} y={P(level.courierGoal).y + goalDy} text="DELIVERED" tone="mint" s={f} />}
        {pv && previewCaptured && !state.intruder.captured && <Pill x={P(iNext).x} y={P(iNext).y - 84} text="TRAP CLOSES" tone="amber" preview s={f} />}
        {pv && previewBreach && <Pill x={P(level.vault).x} y={P(level.vault).y - 96} text="BREACH" tone="coral" preview s={f} />}
        {pv && previewDelivered && !state.courier.delivered && <Pill x={P(level.courierGoal).x} y={P(level.courierGoal).y + goalDy} text="DELIVERS" tone="mint" preview s={f} />}
        {/* queued-command marks, anchored to the thing they change; CURRENT state stays drawn underneath */}
        {qBait && <Pill x={P(qBait).x} y={P(qBait).y + 62 + 8 * (f - 1) + 26 * f} text="WILL ARM" tone="amber" preview s={f} testId={`queued-bait-${qBait}`} />}
        {gates.filter((g) => qGate === g.sh.id).map((g) => (
          <Pill key={g.sh.id} x={g.at.x + 40} y={g.at.y - 84 - 12 * f} text={g.open ? 'WILL SEAL' : 'WILL OPEN'} tone={g.open ? 'coral' : 'mint'} preview s={f} testId={`queued-gate-${g.sh.id}`} />
        ))}
        {qSwitch && edges.filter((e) => e.alt && (e.role === 'closing' || e.role === 'opening')).map((e) => (
          <Pill
            key={e.key} x={(e.a.x + e.b.x) / 2} y={(e.a.y + e.b.y) / 2 - 8 - (e.role === 'closing' ? 40 * (f - 1) : 0)}
            text={e.role === 'closing' ? 'CLOSES' : 'OPENS'} tone={e.role === 'closing' ? 'coral' : 'amber'} preview s={f}
            testId={`queued-route-${e.role}`}
          />
        ))}
      </g>

      {/* interactive targets */}
      {interactive &&
        targets.map((t) => {
          const isSel = sameCommand(selected, t.command);
          const err = validateCommand(level, state, t.command);
          const info = describeCommand(level, state, t.command);
          const label = `${info.name}: ${t.label}${isSel ? ' (queued, press to cancel)' : ''}${err ? ` - unavailable: ${err}` : ''}`;
          return (
            <g
              key={t.key}
              className={`target ${isSel ? 'selected' : ''} ${err ? 'unavailable' : ''}`}
              transform={`translate(${t.at.x} ${t.at.y})`}
              role="button"
              tabIndex={0}
              aria-label={label}
              aria-pressed={isSel}
              data-testid={`target-${t.key}`}
              data-queued={isSel}
              onClick={() => onCommand?.(t.command)}
              onKeyDown={(e) => onKey(e, t.command)}
            >
              <circle className="hit" r={t.r} fill="transparent" />
              <ellipse className="ring" rx={t.r * 0.85} ry={t.r * 0.52} cy={t.r * 0.25} fill="none" strokeWidth={4} />
            </g>
          );
        })}
    </svg>
  );
}