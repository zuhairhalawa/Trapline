// Dev-only: WCAG 2.x contrast ratios for key colour pairs used by the UI. Not a certification.
// Run: node scripts/contrast.mjs
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lin = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const lum = (rgb) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
const mix = (fg, bg, a) => fg.map((v, i) => Math.round(v * a + bg[i] * (1 - a)));
const ratio = (fg, bg) => { const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x); return (a + 0.05) / (b + 0.05); };
const C = { ink: '#101820', ink2: '#16212b', ink3: '#1e2c39', ivory: '#F4EDE2', dim: '#b9b2a6', mint: '#68D7BC', coral: '#EF7068', amber: '#EDB65A', slab: '#3a332d', page: '#1d2b38', sel: '#2d2718', coach: '#2a2519', line: '#2b3b4b' };
const H = (k) => hex(C[k]);
const rows = [
  ['Body text: ivory on page ink', H('ivory'), H('ink'), 4.5],
  ['Panel text: ivory on panel', H('ivory'), H('ink2'), 4.5],
  ['Secondary text: dim ivory on panel', H('dim'), H('ink2'), 4.5],
  ['Secondary text: dim ivory on ink (links, tagline)', H('dim'), H('ink'), 4.5],
  ['Eyebrow / section heads: amber on ink', H('amber'), H('ink'), 4.5],
  ['Eyebrow on panel: amber on panel', H('amber'), H('ink2'), 4.5],
  ['Intruder lines / loss title: coral on ink', H('coral'), H('ink'), 4.5],
  ['Courier lines / win title: mint on ink', H('mint'), H('ink'), 4.5],
  ['Primary button: ink on ivory', H('ink'), H('ivory'), 4.5],
  ['Command button name: ivory on button', H('ivory'), H('ink3'), 4.5],
  ['Command button sub: dim ivory on button', H('dim'), H('ink3'), 4.5],
  ['Selected command: ivory on selected', H('ivory'), H('sel'), 4.5],
  ['Coach box: pale amber on coach bg', hex('#fbe6bd'), H('coach'), 4.5],
  ['Board pill: amber on ink', H('amber'), H('ink'), 4.5],
  ['Board pill: coral on ink', H('coral'), H('ink'), 4.5],
  ['Board pill: mint on ink', H('mint'), H('ink'), 4.5],
  ['Node label: ivory on ink@78% over slab', H('ivory'), mix(H('ink'), H('slab'), 0.78), 4.5],
  ['Junction label: ivory on ink@88% over slab', H('ivory'), mix(H('ink'), H('slab'), 0.88), 4.5],
  ['Art tag: dim ivory @85% on page', mix(H('dim'), H('page'), 0.85), H('page'), 4.5],
  ['Focus ring: mint vs ink (non-text, 3:1)', H('mint'), H('ink'), 3],
  ['Selected ring: amber vs slab (non-text, 3:1)', H('amber'), H('slab'), 3],
  ['Control border (old): line vs ink', H('line'), H('ink'), 3],
  ['Control border (A2): line-strong vs ink', hex('#5f7384'), H('ink'), 3],
  ['Control border (A2): line-strong vs panel', hex('#5f7384'), H('ink2'), 3],
];
console.log('pair | ratio | target | result');
for (const [n, fg, bg, t] of rows) {
  const r = ratio(fg, bg);
  console.log(`${n} | ${r.toFixed(2)}:1 | ${t}:1 | ${r >= t ? 'meets' : 'BELOW'}`);
}