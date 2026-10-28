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
} as const;

/** Iso ratio for ~30 degree projection. */
export const K = 0.577;

export function IsoBox(props: { hw: number; h: number; top: string; left: string; right: string; children?: ReactNode }) {
  const { hw, h, top, left, right, children } = props;
  const hh = hw * K;
  return (
    <g>
      <polygon points={`${-hw},0 0,${hh} 0,${hh - h} ${-hw},${-h}`} fill={left} />
      <polygon points={`0,${hh} ${hw},0 ${hw},${-h} 0,${hh - h}`} fill={right} />
      <polygon points={`${-hw},${-h} 0,${hh - h} ${hw},${-h} 0,${-hh - h}`} fill={top} />
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
      <IsoBox hw={hw} h={12} top={tint ?? PAL.tile} left={PAL.tileL} right={PAL.tileR} />
      <polygon points={`${-hw + 6},0 0,${hh - 3.5} ${hw - 6},0 0,${-hh + 3.5}`} transform="translate(0 -12)" fill="none" stroke="rgba(244,237,226,0.10)" strokeWidth="1.5" />
      <ellipse cx="0" cy="-12" rx="0" ry="0" />
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

export function Tower({ h }: { h: number }) {
  const hw = 22;
  return (
    <IsoBox hw={hw} h={h} top={PAL.ivory} left={PAL.ivoryL} right={PAL.ivoryR}>
      <g transform={leftFace(hw)} stroke="#a89e8e" strokeWidth="1.8" strokeLinecap="round">
        {Array.from({ length: Math.floor(h / 12) - 1 }, (_, i) => (
          <line key={i} x1={-hw + 5} y1={-10 - i * 12} x2={-6} y2={-10 - i * 12} />
        ))}
      </g>
      <g transform={rightFace(hw)}>
        {Array.from({ length: Math.floor(h / 12) - 1 }, (_, i) => (
          <circle key={i} cx={8} cy={-10 - i * 12} r={1.8} fill={i % 2 ? PAL.amber : PAL.mint} opacity="0.8" />
        ))}
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
          <path d="M11.5 -24 v-6.5 a4.5 4.5 0 0 1 9 0 v6.5" fill="none" stroke={PAL.ink} strokeWidth="3.2" strokeLinecap="round" />
          <rect x="8" y="-25" width="16" height="14" rx="2.5" fill={PAL.ink} />
          <circle cx="16" cy="-19.5" r="2.3" fill={PAL.ivory} />
          <rect x="15" y="-19" width="2" height="5" rx="1" fill={PAL.ivory} />
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

export function TrapBack({ armed, closed }: { armed: boolean; closed: boolean }) {
  const col = armed || closed ? PAL.amber : '#8d7448';
  const bars = Array.from({ length: 5 }, (_, i) => ((i + 0.5) * Math.PI) / 5);
  const bar = (th: number, back: boolean) => {
    const s = back ? -1 : 1;
    const sn = Math.abs(Math.sin(th)) * s;
    return <line key={`${back}${th}`} x1={30 * Math.cos(th)} y1={17 * sn} x2={22 * Math.cos(th)} y2={-40 + 12.7 * sn} />;
  };
  return (
    <g className={`trap ${armed ? 'armed' : 'idle'} ${closed ? 'closed' : ''}`}>
      <ellipse className="trap-ring" cx="0" cy="0" rx="38" ry="22" fill="rgba(237,182,90,0.10)" stroke={col} strokeWidth="3" strokeDasharray={armed || closed ? undefined : '6 6'} />
      <g stroke={col} strokeWidth="3.2" strokeLinecap="round" opacity="0.9">
        {bars.map((t) => bar(t, true))}
        <ellipse cx="0" cy="-40" rx="22" ry="12.7" fill="none" strokeWidth="2.6" />
      </g>
      {armed && !closed && (
        <g className="morsel">
          <path d="M0 -11 L7 -5 L0 1 L-7 -5Z" fill={PAL.amber} stroke="#fff3d6" strokeWidth="1.2" />
        </g>
      )}
    </g>
  );
}

export function TrapFront({ armed, closed }: { armed: boolean; closed: boolean }) {
  const col = armed || closed ? PAL.amber : '#8d7448';
  const bars = Array.from({ length: 5 }, (_, i) => ((i + 0.5) * Math.PI) / 5);
  return (
    <g className={`trap-front ${closed ? 'closed' : ''} ${armed ? 'armed' : ''}`}>
      <g stroke={col} strokeWidth={closed ? 2.4 : 3.4} strokeLinecap="round" opacity={closed ? 0.8 : 1}>
        {bars.map((th) => (
          <line key={th} x1={30 * Math.cos(th)} y1={17 * Math.sin(th)} x2={22 * Math.cos(th)} y2={-40 + 12.7 * Math.sin(th)} />
        ))}
      </g>
      <path d="M-22 -40 A22 12.7 0 0 0 22 -40" fill="none" stroke={col} strokeWidth="3" />
      <ellipse className="lid" cx="0" cy="-40" rx="22" ry="12.7" fill={PAL.amber} stroke="#fff3d6" strokeWidth="1.5" />
    </g>
  );
}

export type Expression = 'vault' | 'bait' | 'blocked' | 'captured';

export function Intruder({ expression, ghost = false }: { expression: Expression; ghost?: boolean }) {
  const lured = expression === 'bait';
  const visor =
    expression === 'blocked' || expression === 'captured'
      ? '-10,-25 10,-25 9,-22 -9,-22'
      : lured
        ? '-11,-24 11,-28 9,-22 -9,-20'
        : '-11,-28 11,-25 9,-20 -9,-22';
  const glint = lured ? PAL.amber : PAL.ivory;
  return (
    <g className={`piece intruder-piece ${ghost ? 'ghost' : ''} ${expression}`}>
      {!ghost && <ellipse cx="0" cy="0" rx="15" ry="6" fill="rgba(0,0,0,0.38)" />}
      <polygon points="-15,-30 -23,-41 -8,-36" fill="#D95D56" />
      <polygon points="15,-30 23,-41 8,-36" fill="#C4504A" />
      <polygon points="0,-46 -15,-30 -12,-10 0,-3" fill="#F58A82" />
      <polygon points="0,-46 15,-30 12,-10 0,-3" fill={PAL.coral} />
      <polygon points="-11,-9 0,0 11,-9 0,-3" fill="#B84842" />
      <polygon points={visor} fill={PAL.ink} />
      {expression === 'captured' ? (
        <path d="M-5 -26 l4 3 m0 -3 l-4 3" stroke={PAL.ivory} strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
      ) : (
        <path d={lured ? 'M2 -25 L8 -26' : 'M2 -24.5 L8 -23.8'} stroke={glint} strokeWidth="2" strokeLinecap="round" />
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
        {delivered ? (
          <path d="M-6 0 L-2 4 L6 -5" fill="none" stroke={PAL.ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <g>
            <rect x="-5" y="-5" width="10" height="10" rx="2.5" transform="rotate(45)" fill={PAL.ivory} />
            <path d="M-3.5 -1 L0 1.8 L3.5 -1" fill="none" stroke={PAL.ink} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}
      </g>
    </g>
  );
}

export function Gate({ open, ux, uy }: { open: boolean; ux: number; uy: number }) {
  // (ux,uy): unit screen vector along the edge. The gate spans across it.
  const px = -uy;
  const py = ux * 0.6;
  const len = 27;
  const a = { x: px * len, y: py * len };
  const post = (s: number) => (
    <g key={s} transform={`translate(${s * a.x} ${s * a.y})`}>
      <rect x="-5" y="-34" width="10" height="34" rx="2" fill={PAL.ivoryL} />
      <rect x="-5" y="-34" width="5" height="34" rx="2" fill={PAL.ivory} />
      <circle cx="0" cy="-30" r="2" fill={open ? PAL.mint : PAL.coral} />
    </g>
  );
  const slat = (h: number, key: number) => (
    <line key={key} x1={-a.x} y1={-a.y - h} x2={a.x} y2={a.y - h} />
  );
  return (
    <g className={open ? 'gate open' : 'gate closed'}>
      {post(-1)}
      <g className="slats" stroke={PAL.steel} strokeWidth="5.5" strokeLinecap="round">
        {open ? <g opacity="0.55">{slat(38, 0)}</g> : [slat(5, 0), slat(13, 1), slat(21, 2), slat(29, 3)]}
      </g>
      {post(1)}
    </g>
  );
}