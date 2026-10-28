import type { KeyboardEvent } from 'react';
import type { Command, GameState, LevelDef, NodeDef, TurnResult } from '../engine';
import { validateCommand } from '../engine';
import { sameCommand } from '../ui/gameReducer';
import {
  Courier, DeadEnd, DropDock, Gate, Intruder, K, PAL, Portal, ServerBox, Tile, Tower, TrapBack, TrapFront, Vault,
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
}

const diamond = (cx: number, cy: number, hw: number) =>
  `${cx - hw},${cy} ${cx},${cy + hw * K} ${cx + hw},${cy} ${cx},${cy - hw * K}`;

function Pill({ x, y, text, tone, preview, s = 1 }: { x: number; y: number; text: string; tone: 'coral' | 'mint' | 'amber'; preview?: boolean; s?: number }) {
  const w = text.length * 7.2 + 24;
  const c = tone === 'coral' ? PAL.coral : tone === 'mint' ? PAL.mint : PAL.amber;
  return (
    <g className={`pill ${preview ? 'preview' : ''}`} transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-w / 2} y={-12} width={w} height={24} rx={12} fill={PAL.ink} stroke={c} strokeWidth={2} strokeDasharray={preview ? '4 3' : undefined} />
      <text x={0} y={4.5} textAnchor="middle" fill={c} fontSize={12.5} fontWeight={700} letterSpacing="0.04em">
        {text}
      </text>
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

export function Board({ level, state, preview, selected, interactive, onCommand, xScale = 1, animate = true }: BoardProps) {
  const pos = (n: NodeDef): Pt => ({ x: n.x * xScale, y: n.y });
  /** Text/badge scale: pieces shrink on phones, so small annotations are enlarged to stay legible. */
  const f = xScale < 1 ? 1.5 : 1;
  const nodeById = new Map(level.nodes.map((n) => [n.id, n] as const));
  const P = (id: string): Pt => pos(nodeById.get(id) as NodeDef);

  // ---- edges (all of them, with their live state) ----
  type EdgeView = { key: string; a: Pt; b: Pt; open: boolean; alt: boolean; shutter: string | null };
  const edges: EdgeView[] = [];
  for (const [a, b] of level.edges) edges.push({ key: `${a}-${b}`, a: P(a), b: P(b), open: true, alt: false, shutter: null });
  for (const sw of level.switches) {
    const cur = state.switches[sw.id] ?? sw.initial;
    sw.options.forEach(([a, b], i) => edges.push({ key: `${a}-${b}`, a: P(a), b: P(b), open: i === cur, alt: true, shutter: null }));
  }
  for (const sh of level.shutters) {
    const open = state.shutters[sh.id] ?? sh.initiallyOpen;
    edges.push({ key: `${sh.edge[0]}-${sh.edge[1]}`, a: P(sh.edge[0]), b: P(sh.edge[1]), open, alt: false, shutter: sh.id });
  }

  // ---- bounds ----
  const all: Pt[] = [...level.nodes.map(pos), ...level.scenery.map((s) => ({ x: s.x * xScale, y: s.y }))];
  const minX = Math.min(...all.map((p) => p.x)) - PAD_FULL - 14;
  const maxX = Math.max(...all.map((p) => p.x)) + PAD_FULL + 14;
  const minY = Math.min(...all.map((p) => p.y)) - (f > 1 ? 112 : 125);
  const maxY = Math.max(...all.map((p) => p.y)) + 118 + 10 * f;
  const vb = `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;

  // ---- actors ----
  const stand = (n: NodeDef): Pt => {
    const base = pos(n);
    switch (n.kind) {
      case 'relay': case 'side': case 'source': return { x: base.x, y: base.y - 14 };
      case 'vault': return { x: base.x, y: base.y + 14 };
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

  const showPreview = preview !== null && preview.ok !== undefined && state.status === 'playing';
  const pv = showPreview ? preview : null;
  const iNext = pv?.state.intruder.at ?? iAt;
  const cNext = pv?.state.courier.at ?? cAt;
  const nextShare = iNext === cNext;
  const iNextPt = actorPoint(iNext, 'i', nextShare);
  const cNextPt = actorPoint(cNext, 'c', nextShare);
  const iMoves = !!pv && iNext !== iAt;
  const cMoves = !!pv && cNext !== cAt;

  const expression: Expression = state.intruder.captured
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
    targets.push({ key: `bait-${t}`, at: { x: P(t).x, y: P(t).y - 14 }, r: 54, command: c, label: `Trap at ${nodeLabel(level, t)}` });
  }
  const dials = level.switches.map((sw) => {
    const hub = P(sw.hub);
    const cur = state.switches[sw.id] ?? sw.initial;
    const other = sw.options[cur].find((x) => x !== sw.hub) as string;
    const o = P(other);
    const dx = o.x - hub.x;
    const dy = o.y - hub.y;
    const l = Math.hypot(dx, dy) || 1;
    return { sw, at: { x: hub.x - 44, y: hub.y + 24 }, dir: { x: dx / l, y: dy / l } };
  });
  for (const d of dials) targets.push({ key: `rr-${d.sw.id}`, at: d.at, r: 52, command: { kind: 'reroute', id: d.sw.id }, label: `Junction at ${nodeLabel(level, d.sw.hub)}` });
  const gates = level.shutters.map((sh) => {
    const a = P(sh.edge[0]);
    const b = P(sh.edge[1]);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    return { sh, at: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, u: { x: dx / l, y: dy / l }, open: state.shutters[sh.id] ?? sh.initiallyOpen };
  });
  for (const g of gates) targets.push({ key: `sh-${g.sh.id}`, at: { x: g.at.x, y: g.at.y - 12 }, r: 52, command: { kind: 'shutter', id: g.sh.id }, label: `Gate ${nodeLabel(level, g.sh.edge[0])} to ${nodeLabel(level, g.sh.edge[1])}` });

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
              {level.nodes.map((n) => { const q = pos(n); return <polygon key={n.id} points={diamond(q.x, q.y, PAD_NODE)} />; })}
              {level.scenery.map((s, i) => <polygon key={`sc${i}`} points={diamond(s.x * xScale, s.y, 32)} />)}
            </g>
          </g>
        ))}
      </g>

      {/* scenery */}
      <g aria-hidden="true">
        {level.scenery.map((s, i) => (
          <g key={i} transform={`translate(${s.x * xScale} ${s.y})`}>
            <ellipse cx="0" cy="6" rx="30" ry="14" fill="rgba(0,0,0,0.3)" />
            <Tower h={s.h} />
          </g>
        ))}
      </g>

      {/* tracks */}
      <g aria-hidden="true" strokeLinecap="round" fill="none">
        {edges.map((e) => {
          const live = e.open;
          return (
            <g key={`e${e.key}`} className={`edge ${live ? 'open' : 'shut'} ${e.alt ? 'alt' : ''}`} data-edge={e.key} data-open={live}>
              <line x1={e.a.x} y1={e.a.y + 5} x2={e.b.x} y2={e.b.y + 5} stroke={PAL.trackSide} strokeWidth={live ? 20 : 12} strokeDasharray={live ? undefined : '3 12'} />
              <line x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y} stroke={live ? PAL.track : '#52483f'} strokeWidth={live ? 18 : 8} strokeDasharray={live ? undefined : '3 12'} />
              {live && <line x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y} stroke="rgba(244,237,226,0.16)" strokeWidth={3} />}
            </g>
          );
        })}
      </g>

      {/* gates */}
      {gates.map((g) => (
        <g key={g.sh.id} transform={`translate(${g.at.x} ${g.at.y})`} data-testid={`gate-${g.sh.id}`} data-open={g.open}>
          <Gate open={g.open} ux={g.u.x} uy={g.u.y} />
          <g transform={`translate(0 30) scale(${f})`}>
            <text className="tag" textAnchor="middle" fill={g.open ? PAL.mint : PAL.coral} fontSize={12} fontWeight={800} letterSpacing="0.08em">
              {g.open ? 'OPEN' : 'SEALED'}
            </text>
          </g>
        </g>
      ))}

      {/* nodes */}
      {nodesSorted.map((n) => {
        const p = pos(n);
        const isArmed = state.armed === n.id;
        const closed = n.kind === 'trap' && state.intruder.captured && state.intruder.at === n.id;
        return (
          <g key={n.id} transform={`translate(${p.x} ${p.y})`} data-node={n.id} className={`node node-${n.kind}`}>
            <Tile tint={n.kind === 'trap' ? '#5a4a34' : undefined} />
            {n.kind === 'entry' && <Portal />}
            {(n.kind === 'relay' || n.kind === 'side') && <ServerBox />}
            {n.kind === 'source' && <ServerBox led={PAL.mint} />}
            {n.kind === 'dead' && <DeadEnd />}
            {n.kind === 'vault' && <Vault breached={state.intruder.breached} />}
            {n.kind === 'drop' && <DropDock delivered={state.courier.delivered} />}
            {n.kind === 'trap' && <TrapBack armed={isArmed} closed={closed} />}
          </g>
        );
      })}

      {/* switch dials */}
      {dials.map((d) => (
        <g key={d.sw.id} transform={`translate(${d.at.x} ${d.at.y})`} data-testid={`dial-${d.sw.id}`} aria-hidden="true">
          <ellipse cx="0" cy="5" rx="15" ry="9" fill="rgba(0,0,0,0.45)" />
          <circle r="14" fill={PAL.ink} stroke={PAL.ivory} strokeWidth="3" />
          <line x1="0" y1="0" x2={d.dir.x * 10} y2={d.dir.y * 7} stroke={PAL.amber} strokeWidth="4" strokeLinecap="round" className="lever" />
          <circle cx={d.dir.x * 10} cy={d.dir.y * 7} r="3.6" fill={PAL.amber} />
          <circle r="3" fill={PAL.ivory} />
          {f === 1 && <text x="-22" y="4.5" textAnchor="end" fill={PAL.ivory} fontSize={11} fontWeight={800} letterSpacing="0.08em" opacity={0.85} style={{ paintOrder: 'stroke' }} stroke={PAL.ink} strokeWidth={3}>
            JUNCTION
          </text>}
        </g>
      ))}

      {/* labels */}
      <g aria-hidden="true" className="labels">
        {level.nodes.map((n) => {
          const p = pos(n);
          const sprung = n.kind === 'trap' && state.intruder.captured && state.intruder.at === n.id;
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
              className={`actor intruder ${state.intruder.captured ? 'is-captured' : ''}`}
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
                <Courier delivered={state.courier.delivered} />
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
          const closed = state.intruder.captured && state.intruder.at === n.id;
          return (
            <g key={n.id} transform={`translate(${p.x} ${p.y})`}>
              <TrapFront armed={state.armed === n.id} closed={closed} />
            </g>
          );
        })}
      </g>

      {/* status pills */}
      <g aria-hidden="true">
        {state.intruder.captured && <Pill x={P(state.intruder.at).x} y={P(state.intruder.at).y - 84} text="TRAPPED" tone="amber" s={f} />}
        {state.intruder.breached && <Pill x={P(level.vault).x} y={P(level.vault).y - 96} text="BREACH" tone="coral" s={f} />}
        {state.courier.delivered && <Pill x={P(level.courierGoal).x} y={P(level.courierGoal).y - 66} text="DELIVERED" tone="mint" s={f} />}
        {pv && previewCaptured && !state.intruder.captured && <Pill x={P(iNext).x} y={P(iNext).y - 84} text="TRAP CLOSES" tone="amber" preview s={f} />}
        {pv && previewBreach && <Pill x={P(level.vault).x} y={P(level.vault).y - 96} text="BREACH" tone="coral" preview s={f} />}
        {pv && previewDelivered && !state.courier.delivered && <Pill x={P(level.courierGoal).x} y={P(level.courierGoal).y - 66} text="DELIVERS" tone="mint" preview s={f} />}
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
              onClick={() => onCommand?.(t.command)}
              onKeyDown={(e) => onKey(e, t.command)}
            >
              <circle className="hit" r={t.r} fill="transparent" />
              <ellipse className="ring" rx={t.r * 0.85} ry={t.r * 0.52} cy={t.r * 0.25} fill="none" strokeWidth={4} />
              {isSel && (
                <g transform={`translate(0 ${-t.r - 34}) scale(${f})`}>
                  <rect x={-34} y={-11} width={68} height={22} rx={11} fill={PAL.ivory} />
                  <text textAnchor="middle" y={4.5} fontSize={12} fontWeight={800} fill={PAL.ink} letterSpacing="0.06em">QUEUED</text>
                </g>
              )}
            </g>
          );
        })}
    </svg>
  );
}