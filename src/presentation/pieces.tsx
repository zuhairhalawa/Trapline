import type { ReactNode } from 'react';

export const PAL = {
  ink: '#101820',
  slab: '#3a332d',
  slabSide: '#221d19',
  tile: '#4d443c',
  tileL: '#352e28',
  tileR: '#2a2420',
  track: '#6c6054',
  trackSide: '#2b2520',
  ivory: '#F4EDE2',
  ivoryL: '#D8CEBE',
  ivoryR: '#BDB2A1',
  mint: '#68D7BC',
  coral: '#EF7068',
  amber: '#EDB65A',
  steel: '#8FA3AD',
  steelL: '#B4C3CA',
  steelD: '#5D6E77',
  slate: '#46545C',
} as const;

/** Iso ratio for ~30 degree projection. */
export const K = 0.577;

/**
 * Isometric block. The soft bevel (light front-top edges, dark front corner) is the "matte ceramic" cue
 * taken from the generated design reference (art/reference/trapline-design-sheet.jpg).
 */
export function IsoBox(props: { hw: number; h: number; top: string; left: string; right: string; bevel?: boolean; children?: ReactNode }) {
  const { hw, h, top, left, right, bevel = true, children } = props;
  const hh = hw * K;
  return (
    <g>
      <polygon points={`${-hw},0 0,${hh} 0,${hh - h} ${-hw},${-h}`} fill={left} />
      <polygon points={`0,${hh} ${hw},0 ${hw},${-h} 0,${hh - h}`} fill={right} />
      <polygon points={`${-hw},${-h} 0,${hh - h} ${hw},${-h} 0,${-hh - h}`} fill={top} />
      {bevel && (
        <>
          <polyline points={`${-hw},${-h} 0,${hh - h} ${hw},${-h}`} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.3" strokeLinejoin="round" />
          <line x1="0" y1={hh} x2="0" y2={hh - h} stroke="rgba(0,0,0,0.16)" strokeWidth="1.2" />
        </>
      )}
      {children}
    </g>
  );
}

/** Local frame lying on a box's left (visible) face. x in [-hw,0], y in [-h,0]. */
export const leftFace = (hw: number) => `matrix(1 ${K} 0 1 0 ${hw * K})`;
/** Local frame lying on a box's right (visible) face. x in [0,hw], y in [-h,0]. */
export const rightFace = (hw: number) => `matrix(1 ${-K} 0 1 0 ${hw * K})`;

export function Tile({ tint }: { tint?: string }) {
  const hw = 48;
  const hh = hw * K;
  return (
    <g transform="translate(0 12)">
      <IsoBox hw={hw} h={12} top={tint ?? PAL.tile} left={PAL.tileL} right={PAL.tileR} bevel={false} />
      <polygon points={`${-hw + 6},0 0,${hh - 3.5} ${hw - 6},0 0,${-hh + 3.5}`} transform="translate(0 -12)" fill="none" stroke="rgba(244,237,226,0.10)" strokeWidth="1.5" />
    </g>
  );
}

export function ServerBox({ hw = 26, h = 14, led = PAL.mint }: { hw?: number; h?: number; led?: string }) {
  return (
    <IsoBox hw={hw} h={h} top={PAL.ivory} left={PAL.ivoryL} right={PAL.ivoryR}>
      <g transform={leftFace(hw)} stroke="#a89e8e" strokeWidth="1.6" strokeLinecap="round">
        <line x1={-hw + 6} y1={-h + 4} x2={-7} y2={-h + 4} />
        <line x1={-hw + 6} y1={-h + 8} x2={-7} y2={-h + 8} />
      </g>
      <g transform={rightFace(hw)}>
        <circle cx={7} cy={-h + 5} r={1.9} fill={led} />
        <circle cx={13} cy={-h + 5} r={1.9} fill={PAL.amber} opacity="0.85" />
      </g>
    </IsoBox>
  );
}

export function Vault({ breached }: { breached: boolean }) {
  const hw = 32;
  const h = 38;
  return (
    <g className={breached ? 'vault breached' : 'vault'} transform="translate(0 -6)">
      <IsoBox hw={hw} h={h} top={PAL.ivory} left={PAL.ivoryL} right={PAL.ivoryR}>
        <ellipse cx="0" cy={-h} rx="15" ry="8.6" fill="none" stroke="#b5aa98" strokeWidth="2.5" />
        <g transform={leftFace(hw)} fill="#a89e8e">
          <circle cx={-hw + 7} cy={-h + 8} r="2" />
          <circle cx={-hw + 7} cy={-8} r="2" />
          <circle cx={-7} cy={-h + 8} r="2" />
          <circle cx={-7} cy={-8} r="2" />
        </g>
        <g transform={rightFace(hw)}>
          <rect x="4" y="-33" width="24" height="26" rx="4" fill={PAL.ink} />
          <path d="M11.5 -21 v-5.5 a4.5 4.5 0 0 1 9 0 v5.5" fill="none" stroke={PAL.ivory} strokeWidth="2.6" strokeLinecap="round" />
          <rect x="9" y="-21" width="14" height="11" rx="2.5" fill={PAL.ivory} />
          <circle cx="16" cy="-16.5" r="2" fill={PAL.ink} />
          <rect x="15.2" y="-16" width="1.6" height="4" rx="0.8" fill={PAL.ink} />
        </g>
      </IsoBox>
    </g>
  );
}

export function Portal() {
  return (
    <g transform="translate(0 -6)" fill="none" stroke={PAL.ivory} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M-20 -2 V-26 Q0 -42 20 -26 V-2" opacity="0.95" />
      <path d="M-20 -2 V-26 Q0 -42 20 -26 V-2" stroke={PAL.ink} strokeWidth="1.6" opacity="0.35" />
    </g>
  );
}

export function DeadEnd() {
  return (
    <g transform="translate(0 -4)">
      <IsoBox hw={24} h={14} top={PAL.ivory} left={PAL.ivoryL} right={PAL.ivoryR}>
        <g transform={leftFace(24)} stroke={PAL.ink} strokeWidth="3" opacity="0.55">
          <line x1="-20" y1="-2" x2="-12" y2="-12" />
          <line x1="-12" y1="-2" x2="-4" y2="-12" />
        </g>
      </IsoBox>
    </g>
  );
}

export function DropDock({ delivered }: { delivered: boolean }) {
  return (
    <g className={delivered ? 'dock delivered' : 'dock'}>
      <ellipse cx="0" cy="0" rx="34" ry="19.6" fill="#2a2420" stroke={PAL.mint} strokeWidth="4" />
      <ellipse cx="0" cy="0" rx="22" ry="12.7" fill="none" stroke={PAL.mint} strokeWidth="1.6" strokeDasharray="3 5" opacity="0.7" />
      <line x1="30" y1="-4" x2="30" y2="-40" stroke={PAL.ivory} strokeWidth="3" strokeLinecap="round" />
      <path d="M30 -40 L50 -33 L30 -26Z" fill={PAL.mint} />
    </g>
  );
}

/* ---------------- honeypot ----------------
 * One object, three clearly different states (from the design reference: low amber box on a steel base
 * plate, side hinge, gear mechanism, latch):
 *   idle   - dull amber, lid ajar (30 deg), dashed ring, no light.
 *   armed  - bright amber, lid raised (66 deg), red LED, bait morsel, solid pulsing ring.
 *   sprung - lid shut around the scout (it stays visible through the clamp collar).
 * TrapBack is drawn under the actor, TrapFront over it, so a scout standing on the node sits inside the box.
 */
const TB = { hw: 27, h: 17, D: 34 };
const trapColors = (lit: boolean) =>
  lit
    ? { top: '#EDB65A', left: '#C99440', right: '#A57731', rim: '#F7D58F' }
    : { top: '#B59A63', left: '#927A4A', right: '#78633A', rim: '#CDB787' };

/** Lid corners when raised by `deg` about the back-right hinge edge. */
function lidCorners(deg: number) {
  const { hw, h, D } = TB;
  const hh = hw * K;
  const r = (deg * Math.PI) / 180;
  const cs = Math.cos(r);
  const sn = Math.sin(r);
  const dx = -hw * cs;
  const dy = hh * cs - D * sn;
  const H1 = { x: 0, y: -hh - h };
  const H2 = { x: hw, y: -h };
  return { H1, H2, L1: { x: H1.x + dx, y: H1.y + dy }, L2: { x: H2.x + dx, y: H2.y + dy } };
}

export function TrapBack({ armed, closed }: { armed: boolean; closed: boolean }) {
  const { hw, h } = TB;
  const hh = hw * K;
  const lit = armed || closed;
  const c = trapColors(lit);
  const iw = hw - 7;
  const ih = iw * K;
  const g = lidCorners(armed ? 66 : 30);
  return (
    <g className={`trap ${armed ? 'armed' : 'idle'} ${closed ? 'closed' : ''}`}>
      <ellipse
        className="trap-ring" cx="0" cy="2" rx="40" ry="23" fill="rgba(237,182,90,0.10)"
        stroke={lit ? PAL.amber : '#8d7448'} strokeWidth="3" strokeDasharray={lit ? undefined : '6 6'}
      />
      <IsoBox hw={36} h={4} top="#9FB1BA" left="#74868F" right="#5D6E77" />
      <g transform="translate(0 -4)">
        <polygon points={`${-hw},${-h} 0,${hh - h} ${hw},${-h} 0,${-hh - h}`} fill={c.top} />
        {!closed && (
          <g className="trap-inside">
            <polygon points={`${-iw},${-h} 0,${ih - h} ${iw},${-h} 0,${-ih - h}`} fill="#2a2420" />
            <g transform={`translate(5 ${-h})`}>
              <circle r="6.2" fill={PAL.steelD} stroke={PAL.steelL} strokeWidth="1.4" strokeDasharray="2.2 1.6" />
              <circle r="2.2" fill={PAL.slate} />
            </g>
            <rect x="-12" y={-h - 2} width="8" height="3.4" rx="1.2" fill={PAL.steelD} />
            {armed && <circle className="led" cx="-8" cy={-h - 1} r="2.3" fill={PAL.coral} />}
          </g>
        )}
        {/* hinge barrel along the back-right edge */}
        <line x1={g.H1.x} y1={g.H1.y} x2={g.H2.x} y2={g.H2.y} stroke={PAL.steel} strokeWidth="5" strokeLinecap="round" />
        <line x1={g.H1.x} y1={g.H1.y} x2={g.H2.x} y2={g.H2.y} stroke="rgba(255,255,255,0.45)" strokeWidth="1.4" strokeLinecap="round" />
        {closed ? (
          <g className="lid-back">
            <polygon points={`${-hw},${-h - 3} 0,${-hh - h - 3} ${hw},${-h - 3}`} fill={c.top} stroke={c.rim} strokeWidth="1.2" strokeLinejoin="round" />
            <path d={`M-13 ${-h - 3} A13 6 0 0 1 13 ${-h - 3}`} fill="none" stroke={PAL.steelD} strokeWidth="3.5" />
          </g>
        ) : (
          <g className="lid-open">
            <polygon
              points={`${g.H1.x},${g.H1.y} ${g.H2.x},${g.H2.y} ${g.L2.x},${g.L2.y} ${g.L1.x},${g.L1.y}`}
              fill={armed ? PAL.slate : '#5a5148'} stroke={c.top} strokeWidth="3.2" strokeLinejoin="round"
            />
            <circle cx={(g.L1.x + g.L2.x) / 2 + 2} cy={(g.L1.y + g.L2.y) / 2 + 3} r="1.8" fill={PAL.steelL} />
            <circle cx={(g.H1.x + g.H2.x) / 2 - 2} cy={(g.H1.y + g.H2.y) / 2 + 9} r="1.8" fill={PAL.steelL} />
          </g>
        )}
        {armed && !closed && (
          <g className="morsel">
            <path d={`M0 ${-h - 12} L7 ${-h - 6} L0 ${-h} L-7 ${-h - 6}Z`} fill={PAL.amber} stroke="#fff3d6" strokeWidth="1.2" />
          </g>
        )}
      </g>
    </g>
  );
}

export function TrapFront({ armed, closed }: { armed: boolean; closed: boolean }) {
  const { hw, h } = TB;
  const hh = hw * K;
  const lit = armed || closed;
  const c = trapColors(lit);
  return (
    <g className={`trap-front ${closed ? 'closed' : ''} ${armed ? 'armed' : ''}`}>
      <g transform="translate(0 -4)">
        <polygon points={`${-hw},0 0,${hh} 0,${hh - h} ${-hw},${-h}`} fill={c.left} />
        <polygon points={`0,${hh} ${hw},0 ${hw},${-h} 0,${hh - h}`} fill={c.right} />
        <polyline points={`${-hw},${-h} 0,${hh - h} ${hw},${-h}`} fill="none" stroke={c.rim} strokeWidth="1.5" strokeLinejoin="round" />
        <line x1="0" y1={hh} x2="0" y2={hh - h} stroke="rgba(0,0,0,0.2)" strokeWidth="1.2" />
        <g transform={leftFace(hw)} fill={PAL.steelL}>
          <circle cx={-hw + 5} cy={-h + 4} r="1.5" />
          <circle cx={-6} cy={-h + 4} r="1.5" />
        </g>
        <g transform={rightFace(hw)}>
          <rect x="6" y={-h + 2.5} width="14" height="9" rx="2" fill={PAL.steel} stroke={PAL.steelD} strokeWidth="1" />
          <circle cx="13" cy={-h + 7} r="2" fill={PAL.slate} />
          <circle cx="23" cy={-h + 4} r="1.5" fill={PAL.steelL} />
          {armed && <circle className="led" cx="22" cy={-4} r="2.6" fill={PAL.coral} stroke="#ffd3cf" strokeWidth="0.8" />}
        </g>
        {closed && (
          <g className="lid-front">
            <polygon points={`${-hw},${-h} 0,${hh - h} 0,${hh - h - 3} ${-hw},${-h - 3}`} fill="#DFA94F" />
            <polygon points={`0,${hh - h} ${hw},${-h} ${hw},${-h - 3} 0,${hh - h - 3}`} fill="#B98536" />
            <polygon points={`${-hw},${-h - 3} 0,${hh - h - 3} ${hw},${-h - 3}`} fill={c.top} stroke={c.rim} strokeWidth="1.2" strokeLinejoin="round" />
            <path d={`M-13 ${-h - 3} A13 6 0 0 0 13 ${-h - 3}`} fill="none" stroke={PAL.steelL} strokeWidth="3.5" />
          </g>
        )}
      </g>
    </g>
  );
}

export type Expression = 'vault' | 'bait' | 'blocked' | 'captured';

/**
 * Scout: the playable version of the coral robot in the title art (art/reference/trapline-design-sheet.jpg):
 * a cube head-torso with a wide dark visor on its left face, steel shoulder discs, short jointed legs and flat steel
 * feet, in the same coral / steel materials and bevels as the other pieces. Origin is between the feet.
 * Upright block + legs = a clearly different silhouette from the mint courier (floating rounded diamond).
 * `data-part="scout-head"` marks the head block so tests can check it is visible and not covered.
 * Ghost (forecast) copies are translucent with a dashed outline and have no shadow.
 */
export function Intruder({ expression, ghost = false }: { expression: Expression; ghost?: boolean }) {
  const lured = expression === 'bait';
  const narrow = expression === 'blocked';
  const hw = 14;
  const h = 24;
  const glint = lured ? PAL.amber : PAL.ivory;
  const x0 = -hw + 2.5;
  const x1 = -2.5;
  // visor in left-face coordinates: level when heading for the vault, tilted up when lured, a thin slit when blocked/trapped
  const visor = narrow
    ? `${x0},${-h + 8.6} ${x1},${-h + 8.6} ${x1},${-h + 11.6} ${x0},${-h + 11.6}`
    : lured
      ? `${x0},${-h + 6.8} ${x1},${-h + 3.8} ${x1},${-h + 12.6} ${x0},${-h + 15}`
      : `${x0},${-h + 5} ${x1},${-h + 5.6} ${x1},${-h + 14.4} ${x0},${-h + 14}`;
  const leg = (x: number, fill: string, foot: string) => (
    <g key={x}>
      <rect x={x - 3.5} y={-16} width="7" height="12" rx="2" fill={fill} />
      <circle cx={x} cy={-10.5} r="2.3" fill={PAL.steel} stroke={PAL.steelD} strokeWidth="0.8" />
      <polygon points={`${x - 5.5},-4 ${x + 5.5},-4 ${x + 7},0 ${x - 7},0`} fill={foot} />
      <line x1={x - 5.5} y1={-4} x2={x + 5.5} y2={-4} stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
    </g>
  );
  return (
    <g className={`piece intruder-piece ${ghost ? 'ghost' : ''} ${expression}`}>
      {!ghost && <ellipse cx="0" cy="0" rx="17" ry="6.5" fill="rgba(0,0,0,0.38)" />}
      {/* far arm, behind the body */}
      <rect x={-21} y={-31} width="6" height="15" rx="2.2" fill="#B84842" />
      <polygon points="-21,-16 -15,-16 -16,-11 -20,-11" fill={PAL.steelD} />
      {leg(-8, '#D95D56', PAL.steelD)}
      {leg(8, '#C4504A', PAL.steel)}
      {/* head + torso block (the semantic head) */}
      <g data-part="scout-head" transform="translate(0 -14)">
        <IsoBox hw={hw} h={h} top="#F9A59C" left="#F58A82" right="#DD625B">
          <g transform={leftFace(hw)}>
            <polygon points={visor} fill={PAL.ink} stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" strokeLinejoin="round" />
            {expression === 'captured' ? (
              <path d={`M${-9.7} ${-h + 6.9} l5.4 6 m0 -6 l-5.4 6`} stroke={PAL.ivory} strokeWidth="1.9" strokeLinecap="round" fill="none" opacity="0.9" />
            ) : (
              <path d={lured ? `M${-7} ${-h + 8.4} L${-3.8} ${-h + 7.6}` : `M${-7.5} ${-h + 8.4} L${-3.8} ${-h + 8.6}`} stroke={glint} strokeWidth="2" strokeLinecap="round" fill="none" />
            )}
          </g>
          <g transform={rightFace(hw)}>
            <circle cx={hw - 5} cy={-h + 11} r="5.2" fill={PAL.steelD} stroke={PAL.steelL} strokeWidth="1.2" />
            <circle cx={hw - 5} cy={-h + 11} r="2" fill={PAL.slate} />
            <line x1="3.5" y1={-5} x2="9" y2={-5} stroke="rgba(0,0,0,0.25)" strokeWidth="1.4" strokeLinecap="round" />
          </g>
        </IsoBox>
      </g>
      {/* near arm, hanging beside the shoulder disc */}
      <rect x={14.5} y={-31} width="6" height="15" rx="2.2" fill="#C4504A" />
      <polygon points="14.5,-16 20.5,-16 19.5,-11 15.5,-11" fill={PAL.steel} />
      {ghost && (
        <polygon
          points={`0,${-14 - h - hw * K} ${hw},${-14 - h} ${hw},-14 0,${-14 + hw * K} ${-hw},-14 ${-hw},${-14 - h}`}
          fill="none" stroke={PAL.ivory} strokeWidth="2" strokeDasharray="3 3" strokeLinejoin="round"
        />
      )}
    </g>
  );
}

export function Courier({ delivered, ghost = false }: { delivered: boolean; ghost?: boolean }) {
  return (
    <g className={`piece courier-piece ${ghost ? 'ghost' : ''}`}>
      {!ghost && <ellipse cx="0" cy="0" rx="15" ry="6" fill="rgba(0,0,0,0.38)" />}
      <ellipse cx="0" cy="-4" rx="14" ry="6" fill="none" stroke={PAL.mint} strokeWidth="2.4" opacity="0.8" />
      <g transform="translate(0 -24)">
        <rect x="-11" y="-11" width="22" height="22" rx="6" transform="rotate(45)" fill="#4DBFA3" />
        <path d="M0 -15.5 L15.5 0 L0 0Z" fill={PAL.mint} />
        <path d="M0 -15.5 L-15.5 0 L0 0Z" fill="#8BE8D0" />
        <path d="M0 -15.5 L-15.5 0" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" />
        <circle cx="-8.5" cy="1" r="2.2" fill={PAL.steel} />
        {delivered ? (
          <path d="M-6 0 L-2 4 L6 -5" fill="none" stroke={PAL.ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <g>
            <rect x="-6.5" y="-4" width="13" height="9.5" rx="1.6" fill={PAL.ivory} stroke={PAL.ink} strokeWidth="1" />
            <path d="M-6.5 -3.4 L0 1.6 L6.5 -3.4" fill="none" stroke={PAL.ink} strokeWidth="1.2" strokeLinejoin="round" />
          </g>
        )}
      </g>
    </g>
  );
}

export function Gate({ open, ux, uy, ghost = false }: { open: boolean; ux: number; uy: number; ghost?: boolean }) {
  // (ux,uy): unit screen vector along the edge. The gate spans across it.
  const px = -uy;
  const py = ux * 0.6;
  const len = 27;
  const a = { x: px * len, y: py * len };
  const post = (s: number) => (
    <g key={s} transform={`translate(${s * a.x} ${s * a.y})`}>
      <rect x="-6" y="-35" width="12" height="35" rx="3" fill={PAL.ivoryL} />
      <rect x="-6" y="-35" width="6" height="35" rx="3" fill={PAL.ivory} />
      <rect x="-6" y="-8" width="12" height="4" fill={PAL.steel} />
      <circle cx="0" cy="-30" r="2.4" fill={open ? PAL.mint : PAL.coral} />
    </g>
  );
  const slat = (h: number, key: number) => (
    <line key={key} x1={-a.x} y1={-a.y - h} x2={a.x} y2={a.y - h} />
  );
  return (
    <g className={`gate ${open ? 'open' : 'closed'} ${ghost ? 'ghost-gate' : ''}`}>
      {post(-1)}
      <g className="slats" stroke={PAL.steel} strokeWidth="5.5" strokeLinecap="round">
        {open ? <g opacity="0.55">{slat(38, 0)}</g> : [slat(5, 0), slat(13, 1), slat(21, 2), slat(29, 3)]}
      </g>
      {post(1)}
    </g>
  );
}

export interface Vec { x: number; y: number }

/**
 * Two-way junction: steel plate with a frosted T-lever (see the reference sheet). Two arrows on the plate point
 * along the two branches. Solid amber = live branch, dashed = the other. When a Reroute is queued the ghost
 * lever swings to the alternate arrow and that arrow lights up.
 */
export function JunctionPiece({ cur, alt, queued }: { cur: Vec; alt: Vec; queued: boolean }) {
  const arrow = (d: Vec, style: 'live' | 'off' | 'next') => {
    const tip = { x: d.x * 25, y: d.y * 15 };
    const bc = { x: d.x * 12, y: d.y * 7 };
    const n = { x: -d.y * 7, y: d.x * 4 };
    const pts = `${tip.x},${tip.y} ${bc.x + n.x},${bc.y + n.y} ${bc.x - n.x},${bc.y - n.y}`;
    if (style === 'live') return <polygon points={pts} fill={PAL.amber} stroke={PAL.ink} strokeWidth="1.4" strokeLinejoin="round" />;
    if (style === 'next') return <polygon className="queued-arrow" points={pts} fill="rgba(237,182,90,0.35)" stroke={PAL.amber} strokeWidth="2" strokeDasharray="3 2" strokeLinejoin="round" />;
    return <polygon points={pts} fill="none" stroke={PAL.ivory} strokeWidth="1.6" strokeDasharray="3 2.5" strokeLinejoin="round" opacity="0.75" />;
  };
  const tilt = (d: Vec) => Math.max(-32, Math.min(32, d.x * 34));
  const stalk = (angle: number, ghost: boolean) => (
    <g className={ghost ? 'lever-ghost' : 'lever-stalk'} style={{ transform: `translate(0px, -5px) rotate(${angle}deg)` }}>
      <line x1="0" y1="0" x2="0" y2="-17" stroke={PAL.ink} strokeWidth="7" strokeLinecap="round" opacity={ghost ? 0.5 : 1} />
      <line x1="0" y1="0" x2="0" y2="-17" stroke={ghost ? PAL.amber : PAL.ivory} strokeWidth="4" strokeLinecap="round" strokeDasharray={ghost ? '3 3' : undefined} opacity={ghost ? 0.9 : 0.92} />
      <line x1="-8" y1="-17" x2="8" y2="-17" stroke={PAL.ink} strokeWidth="9" strokeLinecap="round" opacity={ghost ? 0.5 : 1} />
      <line x1="-8" y1="-17" x2="8" y2="-17" stroke={ghost ? PAL.amber : PAL.ivory} strokeWidth="6" strokeLinecap="round" strokeDasharray={ghost ? '3 3' : undefined} opacity={ghost ? 0.9 : 0.92} />
    </g>
  );
  return (
    <g className={`junction ${queued ? 'queued' : ''}`}>
      <ellipse cx="0" cy="8" rx="34" ry="17" fill="rgba(0,0,0,0.38)" />
      <IsoBox hw={30} h={6} top="#9FB1BA" left="#74868F" right="#5D6E77" />
      <g transform="translate(0 -6)">
        {arrow(cur, queued ? 'off' : 'live')}
        {arrow(alt, queued ? 'next' : 'off')}
        <circle r="4.6" fill={PAL.slate} stroke={PAL.steelL} strokeWidth="1.3" />
        {stalk(tilt(cur), false)}
        {queued && stalk(tilt(alt), true)}
      </g>
    </g>
  );
}