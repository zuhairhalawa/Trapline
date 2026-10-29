import type { Locator, Page, TestInfo } from '@playwright/test';
import {
  QA_DIR, advance, at, cmd, expect, noHorizontalOverflow, openLevel, press, seedProgress, test, turn,
} from './helpers';

/** Stage A2.1 specs: state-dependent Level 1 coaching, first-view decision clarity, scout, capture sequencing. Author-run, not independent QA. */

const coach = (page: import('@playwright/test').Page) => page.getByTestId('coach');

test('L1 coach follows the real state and the queued action (Wait first, then Bait wins; Wait twice loses)', async ({ page }) => {
  await openLevel(page, 1);
  await expect(coach(page)).toContainText('Select Bait');

  // Opening with Wait is legal and is not blocked.
  await press(page, cmd(page, 'wait'));
  await advance(page);
  await expect(turn(page)).toHaveText('1 / 2');
  await expect(page.getByTestId('charges')).toHaveText('1');
  expect(await at(page)).toEqual({ i: 'J', c: 'J' });
  await expect(page.getByTestId('intruder')).toHaveAttribute('data-captured', 'false');

  // Intruder at J, trap unarmed, one command left: the coach must send the player to Bait, not Wait.
  await expect(coach(page)).toContainText('Bait');
  await expect(coach(page)).not.toContainText('Nothing more to arm');
  await expect(coach(page)).not.toContainText(/Wait, then Advance/);
  // Waiting here previews the breach, and the coach says so.
  await expect(page.getByTestId('outcome')).toContainText('You lose');
  await expect(coach(page)).toContainText('Wait would lose');

  // Queue the winning Bait: guidance is about Advance and never tells the player to cancel it with Wait.
  await press(page, cmd(page, 'bait'));
  await expect(page.getByTestId('outcome')).toContainText('You win');
  await expect(coach(page)).toContainText('Advance');
  await expect(coach(page)).not.toContainText(/\bWait\b/);
  await expect(coach(page)).not.toContainText('Nothing more to arm');

  // Cancel by choosing Wait: guidance returns to Bait. Queue it again and win.
  await press(page, cmd(page, 'wait'));
  await expect(coach(page)).toContainText('Select Bait');
  await press(page, cmd(page, 'bait'));
  await advance(page);
  await expect(page.getByTestId('result')).toHaveAttribute('data-status', 'won');
  expect(await at(page)).toEqual({ i: 'H', c: 'D' });

  // Undo restores the contextual guidance of the state it returns to (turn 1, unarmed).
  await press(page, page.getByTestId('undo'));
  await expect(page.getByTestId('result')).toHaveCount(0);
  await expect(coach(page)).toContainText('Bait');
  await expect(coach(page)).not.toContainText('Nothing more to arm');

  // Wait then Advance in that state loses by breach; Undo and Restart restore guidance again.
  await press(page, cmd(page, 'wait'));
  await advance(page);
  await expect(page.getByTestId('result')).toHaveAttribute('data-status', 'lost');
  await press(page, page.getByTestId('undo'));
  await expect(coach(page)).toContainText('Select Bait');
  await expect(coach(page)).not.toContainText('Nothing more to arm');
  await press(page, page.getByTestId('restart'));
  await expect(turn(page)).toHaveText('0 / 2');
  await expect(coach(page)).toContainText('Select Bait to arm the trap');
});

test('L1 coach on the preferred route: Bait first, then the armed trap needs only Advance', async ({ page }) => {
  await openLevel(page, 1);
  await press(page, cmd(page, 'bait'));
  await expect(coach(page)).toContainText('Advance');
  await expect(coach(page)).not.toContainText('Select Bait');
  await advance(page);
  await expect(turn(page)).toHaveText('1 / 2');
  await expect(coach(page)).toContainText('armed');
  await expect(coach(page)).toContainText('Wait');
  await expect(coach(page)).toContainText('Advance');
  await advance(page);
  await expect(page.getByTestId('result')).toHaveAttribute('data-status', 'won');
});

// ---------------------------------------------------------------- first-view decision clarity (NO auto-scroll anywhere in this section)
//
// The A2 matrix scrolled before measuring (isTopmostAtCentre calls scrollIntoViewIfNeeded, scrollToEnd runs first), so it could not
// notice text hidden behind the tray on first view. Everything below reads geometry and elementFromPoint only: nothing here scrolls,
// and each state also asserts that no scroll position moved while it was being checked. Reachability AFTER scrolling stays in a2.spec.ts.

const DONE = ['follow-the-bait', 'open-the-wrong-door'];
const SIZES = [
  { w: 1440, h: 900 },
  { w: 390, h: 844 },
  { w: 360, h: 640 },
  { w: 844, h: 390 },
];

/** Real visible input: touch tap on the touch-emulated sizes, mouse click on desktop. */
async function tap(page: Page, l: Locator) {
  if ((page.viewportSize()?.width ?? 1000) < 900) await l.tap();
  else await l.click();
}

const scrollState = (page: Page) => page.evaluate(() => ({
  win: window.scrollY,
  scroller: (document.querySelector('.scroller') as HTMLElement | null)?.scrollTop ?? 0,
  panel: (document.querySelector('.panel') as HTMLElement | null)?.scrollTop ?? 0,
}));

/** Fully inside the viewport and topmost at its centre and four inner points, measured exactly where it sits (no scrolling). */
async function expectVisibleNoScroll(l: Locator, label: string) {
  const r = await l.evaluate((el) => {
    const b = el.getBoundingClientRect();
    const pts = [[0.5, 0.5], [0.12, 0.25], [0.88, 0.25], [0.12, 0.75], [0.88, 0.75]].map(([fx, fy]) => ({ x: b.left + b.width * (fx as number), y: b.top + b.height * (fy as number) }));
    const hit = pts.map((p) => { const e = document.elementFromPoint(p.x, p.y); return !!e && el.contains(e); });
    return {
      w: b.width, h: b.height, hit,
      inView: b.left >= -0.5 && b.top >= -0.5 && b.right <= window.innerWidth + 0.5 && b.bottom <= window.innerHeight + 0.5,
    };
  });
  expect(r.w > 0 && r.h > 0, `${label}: has a box`).toBe(true);
  expect(r.inView, `${label}: fully inside the viewport WITHOUT scrolling`).toBe(true);
  expect(r.hit, `${label}: nothing overlays it (centre + inner corners)`).toEqual([true, true, true, true, true]);
}

const box = (l: Locator) => l.evaluate((el) => { const b = el.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });

/** Every actionable board target: >= 44x44 CSS px, topmost at its own centre and four inner points, no two circles overlap. */
async function expectTargets(page: Page, label: string) {
  const ts = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid^=target-]')).map((t) => {
    const r = (t.querySelector('.hit') as Element).getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const id = t.getAttribute('data-testid') as string;
    const probe = [[0, 0], [0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]].map(([dx, dy]) => {
      const e = document.elementFromPoint(cx + (dx as number) * r.width * 0.5, cy + (dy as number) * r.height * 0.5);
      return e?.closest('[data-testid^=target-]')?.getAttribute('data-testid') === id;
    });
    return { id, w: r.width, h: r.height, cx, cy, probe };
  }));
  expect(ts.length, `${label}: has board targets`).toBeGreaterThanOrEqual(1);
  for (const t of ts) {
    expect(t.w, `${label}: ${t.id} width`).toBeGreaterThanOrEqual(44);
    expect(t.h, `${label}: ${t.id} height`).toBeGreaterThanOrEqual(44);
    expect(t.probe, `${label}: ${t.id} is hit-testable at centre and inner points (not under the dock or another target)`).toEqual([true, true, true, true, true]);
  }
  for (let i = 0; i < ts.length; i++) {
    for (let j = i + 1; j < ts.length; j++) {
      const a = ts[i]!;
      const b = ts[j]!;
      expect(Math.hypot(a.cx - b.cx, a.cy - b.cy), `${label}: ${a.id} vs ${b.id} overlap`).toBeGreaterThanOrEqual(a.w / 2 + b.w / 2 - 1);
    }
  }
}

interface FirstView {
  playing: boolean;
  /** Level 1/2 win shows Next level; Level 3 win shows the finish button. */
  win?: 'next' | 'finish';
  commands: ('bait' | 'reroute' | 'shutter')[];
  targets: boolean;
  coach?: boolean;
}

/** Everything the player must be able to see and use on first view of a state, with nothing scrolled. */
async function expectFirstView(page: Page, label: string, v: FirstView, advanceBox?: { x: number; y: number; w: number; h: number }) {
  const before = await scrollState(page);
  await noHorizontalOverflow(page);
  const dock = page.getByTestId('tray');
  await expectVisibleNoScroll(dock, `${label}: dock`);
  const geo = await page.evaluate(() => {
    const d = (document.querySelector('[data-testid=tray]') as HTMLElement).getBoundingClientRect();
    const sc = document.querySelector('.scroller') as HTMLElement;
    const region = (getComputedStyle(sc).display === 'contents' ? document.querySelector('.panel') : sc) as HTMLElement;
    const r = region.getBoundingClientRect();
    return { dockTop: d.top, dockBottom: d.bottom, regionBottom: r.bottom, vh: window.innerHeight };
  });
  expect(geo.regionBottom, `${label}: scrolling content area ends at or above the dock (the dock is its own grid row)`).toBeLessThanOrEqual(geo.dockTop + 0.5);
  expect(geo.dockBottom, `${label}: dock inside the viewport`).toBeLessThanOrEqual(geo.vh + 0.5);

  for (const id of ['undo', 'restart', 'advance']) await expectVisibleNoScroll(page.getByTestId(id), `${label}: ${id}`);
  if (v.playing) {
    for (const k of [...v.commands, 'wait'] as const) await expectVisibleNoScroll(cmd(page, k), `${label}: command ${k}`);
    await expectVisibleNoScroll(page.getByTestId('decision'), `${label}: decision summary`);
    for (const id of ['decision-action', 'decision-forecast', 'decision-intruder', 'decision-courier', 'decision-outcome']) {
      await expectVisibleNoScroll(page.getByTestId(id), `${label}: ${id}`);
    }
    if (v.coach) await expectVisibleNoScroll(page.getByTestId('coach'), `${label}: coach`);
    // summary rows are not clipped sideways (they may wrap, never truncate)
    const clipped = await page.getByTestId('decision').evaluate((el) => Array.from(el.querySelectorAll('p, span')).filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.getAttribute('data-testid') ?? e.className));
    expect(clipped, `${label}: summary text clipped`).toEqual([]);
    if (advanceBox) {
      const b = await box(page.getByTestId('advance'));
      expect(Math.abs(b.y - advanceBox.y), `${label}: Advance does not jump when the summary text changes (y)`).toBeLessThanOrEqual(1.5);
      expect(Math.abs(b.h - advanceBox.h), `${label}: Advance height stable`).toBeLessThanOrEqual(1.5);
    }
    if (v.targets) await expectTargets(page, label);
  } else {
    await expectVisibleNoScroll(page.getByTestId('result'), `${label}: result card`);
    if (v.win === 'next') await expectVisibleNoScroll(page.getByTestId('next-level'), `${label}: Next level`);
    if (v.win === 'finish') await expectVisibleNoScroll(page.getByTestId('finish'), `${label}: finish button`);
  }
  expect(await scrollState(page), `${label}: checking must not scroll anything`).toEqual(before);
  expect(before, `${label}: first view means nothing is scrolled`).toEqual({ win: 0, scroller: 0, panel: 0 });
}

const pic = async (page: Page, name: string, info: TestInfo) => {
  await page.waitForTimeout(160);
  // plain viewport screenshot: nothing scrolled, nothing clipped
  await page.screenshot({ path: `${QA_DIR}/${name}-${info.project.name}.png` });
};

for (const { w, h } of SIZES) {
  test.describe(`first view ${w}x${h}`, () => {
    test.use({ viewport: { width: w, height: h }, isMobile: w < 900, hasTouch: w < 900, deviceScaleFactor: w < 900 ? 2 : 1 });
    const only = (info: TestInfo) => test.skip(info.project.name !== 'desktop', 'this matrix sets its own viewport per describe block (like the A2 tray matrix); running it under both projects would duplicate it');

    const adv = (page: Page) => tap(page, page.getByTestId('advance'));
    const go = async (page: Page) => { await adv(page); await expect(page.locator('[data-testid=result], [data-testid=intel] h3:text-is("Next turn")').first()).toBeVisible(); };
    const q = (page: Page, k: 'bait' | 'reroute' | 'shutter' | 'wait') => tap(page, cmd(page, k));
    const startLevel = async (page: Page, n: number) => {
      await seedProgress(page, DONE);
      await page.goto('./');
      await tap(page, page.getByRole('button', { name: /^(Play|Continue)/ }));
      await tap(page, page.getByTestId(`level-chip-${n}`));
      await expect(page.getByTestId('game')).toHaveAttribute('data-level', ['', 'follow-the-bait', 'open-the-wrong-door', 'keep-the-service-running'][n] as string);
    };

    test('Level 1: entry, Wait then Bait queued, armed mid-turn, victory, failure', async ({ page }, info) => {
      only(info);
      await startLevel(page, 1);
      const cmds: FirstView['commands'] = ['bait'];
      await expectFirstView(page, 'L1 entry', { playing: true, commands: cmds, targets: true, coach: true });
      const adv0 = await box(page.getByTestId('advance'));
      await expect(page.getByTestId('decision-action')).toContainText('Wait (no command)');
      await expect(page.getByTestId('coach')).toContainText('Select Bait');

      await q(page, 'bait');
      await expectFirstView(page, 'L1 bait queued at entry', { playing: true, commands: cmds, targets: true, coach: true }, adv0);
      await expect(page.getByTestId('decision-action')).toContainText('Bait: Trap');
      await expect(page.getByTestId('decision-intruder')).toContainText('Intruder to Relay');
      await q(page, 'wait'); // cancel; the preferred route is not forced, Wait first is a legal opening
      await go(page);
      await expectFirstView(page, 'L1 after Wait (unarmed, one command left)', { playing: true, commands: cmds, targets: true, coach: true }, adv0);
      await expect(page.getByTestId('coach')).toContainText('Bait');
      await expect(page.getByTestId('decision-outcome')).toHaveText('Breach: you lose'); // Wait now loses: the warning is on first view
      await expectVisibleNoScroll(page.getByTestId('decision-outcome'), 'L1 loss forecast');
      await q(page, 'bait');
      await expectFirstView(page, 'L1 Wait then Bait queued', { playing: true, commands: cmds, targets: true, coach: true }, adv0);
      await expect(page.getByTestId('decision-outcome')).toHaveText('Trap closes: you win');
      await expect(page.getByTestId('coach')).not.toContainText(/\bWait\b/);
      await pic(page, `fv-${w}x${h}-l1-wait-then-bait-queued`, info);
      await go(page);
      await expect(page.getByTestId('result')).toHaveAttribute('data-status', 'won');
      await page.waitForTimeout(1200);
      await expectFirstView(page, 'L1 victory', { playing: false, win: 'next', commands: cmds, targets: false });
      await pic(page, `fv-${w}x${h}-l1-win`, info);

      // preferred route mid-turn (armed), then failure by waiting twice
      await tap(page, page.getByTestId('restart'));
      await q(page, 'bait');
      await go(page);
      await expectFirstView(page, 'L1 armed mid-turn', { playing: true, commands: cmds, targets: true, coach: true }, adv0);
      await expect(page.getByTestId('coach')).toContainText('armed');
      await tap(page, page.getByTestId('restart'));
      await go(page);
      await go(page);
      await expect(page.getByTestId('result')).toHaveAttribute('data-status', 'lost');
      await page.waitForTimeout(1300);
      await expectFirstView(page, 'L1 failure', { playing: false, commands: cmds, targets: false });
      await pic(page, `fv-${w}x${h}-l1-loss`, info);
      await tap(page, page.getByTestId('undo'));
      await expect(page.getByTestId('result')).toHaveCount(0);
      await expectFirstView(page, 'L1 after Undo from failure', { playing: true, commands: cmds, targets: true, coach: true }, adv0);
    });

    test('Level 2: entry, Reroute queued, mid-turn, victory, failure (junction target included)', async ({ page }, info) => {
      only(info);
      await startLevel(page, 2);
      const cmds: FirstView['commands'] = ['bait', 'reroute'];
      await expectFirstView(page, 'L2 entry', { playing: true, commands: cmds, targets: true });
      const adv0 = await box(page.getByTestId('advance'));
      await expect(page.getByTestId('target-rr-junction')).toBeVisible();

      await q(page, 'reroute');
      await expectFirstView(page, 'L2 reroute queued', { playing: true, commands: cmds, targets: true }, adv0);
      await expect(page.getByTestId('decision-action')).toContainText('Reroute: open');
      await pic(page, `fv-${w}x${h}-l2-reroute-queued`, info);
      await go(page);
      await expectFirstView(page, 'L2 mid-turn after Reroute', { playing: true, commands: cmds, targets: true }, adv0);
      await q(page, 'bait');
      await expectFirstView(page, 'L2 bait queued after Reroute', { playing: true, commands: cmds, targets: true }, adv0);
      await go(page);
      await go(page);
      await expect(page.getByTestId('result')).toHaveAttribute('data-status', 'won');
      await page.waitForTimeout(1300);
      await expectFirstView(page, 'L2 victory', { playing: false, win: 'next', commands: cmds, targets: false });

      await tap(page, page.getByTestId('restart'));
      await go(page);
      await go(page);
      await expect(page.getByTestId('result')).toHaveAttribute('data-status', 'lost');
      await page.waitForTimeout(1300);
      await expectFirstView(page, 'L2 failure', { playing: false, commands: cmds, targets: false });
      await tap(page, page.getByTestId('undo'));
      await expectFirstView(page, 'L2 after Undo from failure', { playing: true, commands: cmds, targets: true }, adv0);
    });

    test('Level 3: entry, loss forecast queued, Seal queued, mid-turn, victory, failure', async ({ page }, info) => {
      only(info);
      await startLevel(page, 3);
      const cmds: FirstView['commands'] = ['bait', 'reroute', 'shutter'];
      await expectFirstView(page, 'L3 entry', { playing: true, commands: cmds, targets: true });
      const adv0 = await box(page.getByTestId('advance'));

      // Reroute first is a predicted breach: the warning must be on first view, beside Advance, not under the controls.
      await q(page, 'reroute');
      await expectFirstView(page, 'L3 loss forecast (Reroute first)', { playing: true, commands: cmds, targets: true }, adv0);
      await expect(page.getByTestId('decision-outcome')).toHaveText('Breach: you lose');
      await expect(page.getByTestId('decision-action')).toContainText('Reroute: open Side relay'); // full target, not the shortened button subtitle
      const outcomeBox = await box(page.getByTestId('decision-outcome'));
      const advBox = await box(page.getByTestId('advance'));
      expect(outcomeBox.y + outcomeBox.h, 'loss forecast sits above Advance').toBeLessThanOrEqual(advBox.y);
      await pic(page, `fv-${w}x${h}-l3-loss-forecast`, info);

      await q(page, 'shutter');
      await expectFirstView(page, 'L3 Seal queued', { playing: true, commands: cmds, targets: true }, adv0);
      await expect(page.getByTestId('decision-action')).toContainText('Seal gate: Relay - Vault');
      await go(page);
      await expectFirstView(page, 'L3 mid-turn after Seal', { playing: true, commands: cmds, targets: true }, adv0);
      for (const k of ['reroute', 'bait', 'shutter'] as const) {
        await q(page, k);
        await go(page);
      }
      await expect(page.getByTestId('result')).toHaveAttribute('data-status', 'won');
      await page.waitForTimeout(1300);
      await expectFirstView(page, 'L3 victory', { playing: false, win: 'finish', commands: cmds, targets: false });

      await tap(page, page.getByTestId('restart'));
      await go(page); // Wait on turn 1 breaches
      await expect(page.getByTestId('result')).toHaveAttribute('data-status', 'lost');
      await page.waitForTimeout(1300);
      await expectFirstView(page, 'L3 failure', { playing: false, commands: cmds, targets: false });
      await tap(page, page.getByTestId('undo'));
      await expectFirstView(page, 'L3 after Undo from failure', { playing: true, commands: cmds, targets: true }, adv0);
    });
  });
}

// ---------------------------------------------------------------- scout: semantic head marker, real vs forecast actor

test('scout: one semantic head marker, readable size, forecast copy is unmistakably not the real actor', async ({ page }) => {
  await openLevel(page, 1);
  const real = page.getByTestId('intruder');
  await expect(real.locator('[data-part="scout-head"]')).toHaveCount(1);
  const head = await real.locator('[data-part="scout-head"]').boundingBox();
  expect(head?.width ?? 0, 'scout head readable width (CSS px)').toBeGreaterThanOrEqual(18);
  // real actor: ground shadow, full opacity, no dashed forecast outline
  expect(await real.locator('.piece').evaluate((e) => getComputedStyle(e).opacity)).toBe('1');
  await expect(real.locator('ellipse')).toHaveCount(1);
  await expect(real.locator('polygon[stroke-dasharray]')).toHaveCount(0);
  await press(page, cmd(page, 'bait'));
  const ghost = page.getByTestId('ghost-intruder');
  await expect(ghost).toHaveCount(1);
  expect(await ghost.locator('.piece').evaluate((e) => getComputedStyle(e).opacity), 'forecast copy is translucent').toBe('0.42');
  await expect(ghost.locator('ellipse')).toHaveCount(0); // no ground shadow
  await expect(ghost.locator('polygon[stroke-dasharray]')).toHaveCount(1); // dashed forecast outline
  // the mint courier is a different silhouette: no head marker, no robot block
  await expect(page.getByTestId('courier').locator('[data-part="scout-head"]')).toHaveCount(0);
  await expect(real.locator('.intruder-piece')).toHaveClass(/vault|bait/);
});

test('scout: the captured scout keeps its visor (X) and head on top of the trap at every size', async ({ page }) => {
  await openLevel(page, 1);
  await press(page, cmd(page, 'bait'));
  await advance(page);
  await advance(page);
  await expect(page.getByTestId('result')).toHaveAttribute('data-status', 'won');
  await expect(page.getByTestId('intruder').locator('.intruder-piece')).toHaveClass(/captured/);
  await page.waitForTimeout(700);
  const head = page.getByTestId('intruder').locator('[data-part="scout-head"]');
  const b = await head.boundingBox();
  expect(b).not.toBeNull();
  // top face, visor row and shoulder disc are all topmost (not under the lid): sample five points on the head
  const hits = await page.evaluate((r) => [[0.5, 0.12], [0.3, 0.4], [0.7, 0.4], [0.3, 0.55], [0.7, 0.55]].map(([fx, fy]) => {
    const e = document.elementFromPoint(r.x + r.w * (fx as number), r.y + r.h * (fy as number));
    return !!e && !!e.closest('[data-testid=intruder]');
  }), { x: b?.x ?? 0, y: b?.y ?? 0, w: b?.width ?? 0, h: b?.height ?? 0 });
  expect(hits, 'captured scout head points are topmost').toEqual([true, true, true, true, true]);
});

// ---------------------------------------------------------------- capture sequence in motion (presentation timing only)
//
// Measured with a requestAnimationFrame logger in the real production page: when the scout actually arrives versus when the
// trap closes / TRAPPED / DELIVERED appear. The committed result (data-captured, turn, result card state) is NOT delayed.

interface Frame { t: number; dx: number; sprung: boolean; pill: boolean; delivered: boolean; result: boolean; captured: string | null; turnText: string }

async function winningAdvanceLog(page: Page): Promise<Frame[]> {
  await openLevel(page, 1);
  await press(page, cmd(page, 'bait'));
  await advance(page); // armed, both at J; the next Advance captures + delivers
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const w = window as unknown as { __log: unknown[] };
    w.__log = [];
    const btn = document.querySelector('[data-testid=advance]') as HTMLElement;
    const hNode = document.querySelector('[data-node=H]') as Element;
    btn.addEventListener('click', () => {
      const t0 = performance.now();
      const tick = () => {
        const i = (document.querySelector('[data-testid=intruder]') as Element).getBoundingClientRect();
        const hb = hNode.getBoundingClientRect();
        w.__log.push({
          t: performance.now() - t0,
          dx: i.left + i.width / 2 - (hb.left + hb.width / 2),
          sprung: !!document.querySelector('.trap-front .lid-front'),
          pill: Array.from(document.querySelectorAll('.pill text')).some((e) => e.textContent === 'TRAPPED'),
          delivered: !!document.querySelector('.dock.delivered'),
          result: !!document.querySelector('[data-testid=result]'),
          captured: (document.querySelector('[data-testid=intruder]') as Element).getAttribute('data-captured'),
          turnText: (document.querySelector('[data-testid=turn]') as Element).textContent ?? '',
        });
        if (performance.now() - t0 < 2000) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { once: true, capture: true });
  });
  await press(page, page.getByTestId('advance'));
  await page.waitForTimeout(2300);
  return page.evaluate(() => (window as unknown as { __log: Frame[] }).__log);
}

test('capture sequence: the trap closes when the scout ARRIVES, not before; the committed result is immediate', async ({ page }) => {
  const log = await winningAdvanceLog(page);
  expect(log.length).toBeGreaterThan(40);
  const first = (f: (e: Frame) => boolean) => log.find(f)?.t ?? Infinity;
  const arrived = first((e) => Math.abs(e.dx) < 3 && e.t > 100);
  const sprung = first((e) => e.sprung);
  const pill = first((e) => e.pill);
  const delivered = first((e) => e.delivered);
  const result = first((e) => e.result);
  // sanity: the scout really travelled (this is a motion test, not a static one)
  expect(Math.abs(log[0]!.dx), 'scout starts away from the trap').toBeGreaterThan(100);
  expect(arrived, 'scout arrival is observed after a real travel time').toBeGreaterThan(400);
  expect(arrived, 'and within the movement budget').toBeLessThan(900);
  // the rules are committed immediately: the data readouts do not wait for any animation
  expect(log[0]!.captured, 'committed capture visible to the app at the first frame').toBe('true');
  expect(log[0]!.turnText).toBe('2 / 2');
  // presentation: nothing closes before arrival (small frame tolerance), and closing starts promptly after it
  expect(sprung, 'trap closes no earlier than arrival').toBeGreaterThanOrEqual(arrived - 60);
  expect(pill, 'TRAPPED pill no earlier than arrival').toBeGreaterThanOrEqual(arrived - 60);
  expect(delivered, 'DELIVERED glow no earlier than the courier arrives (same 0.62 s travel)').toBeGreaterThanOrEqual(500);
  expect(sprung, 'trap closes promptly once the scout is there').toBeLessThanOrEqual(arrived + 250);
  expect(result, 'result card waits for the slam to finish').toBeGreaterThanOrEqual(sprung + 350);
  expect(result, 'but does not hang around').toBeLessThanOrEqual(1700);
});

test('capture sequence, reduced motion: the correct stable end state shows immediately, no timers involved', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openLevel(page, 1);
  await press(page, cmd(page, 'bait'));
  await press(page, page.getByTestId('advance'));
  await expect(turn(page)).toHaveText('1 / 2');
  await press(page, page.getByTestId('advance'));
  // no wait for the 0.76/1.15 s lock or the 0.62 s travel: closed trap, TRAPPED, delivered and the result card are all there right away
  await expect(page.getByTestId('result')).toHaveAttribute('data-status', 'won', { timeout: 300 });
  await expect(page.locator('.trap-front .lid-front')).toHaveCount(1, { timeout: 300 });
  await expect(page.locator('.pill text:text-is("TRAPPED")')).toHaveCount(1, { timeout: 300 });
  await expect(page.locator('.dock.delivered')).toHaveCount(1, { timeout: 300 });
  expect(await page.getByTestId('intruder').evaluate((e) => getComputedStyle(e).transitionDuration)).toBe('0s');
});

test('capture sequence: Undo, Restart and level change during travel cancel the pending visual closure', async ({ page }) => {
  await seedProgress(page, DONE);
  await openLevel(page, 1);
  // with progress seeded, Play continues into Level 3: select Level 1 explicitly
  await press(page, page.getByTestId('level-chip-1'));
  await expect(page.getByTestId('game')).toHaveAttribute('data-level', 'follow-the-bait');
  await press(page, cmd(page, 'bait'));
  await advance(page);

  const noStale = async (why: string) => {
    await page.waitForTimeout(1500);
    await expect(page.locator('.trap-front .lid-front'), `${why}: no stale closed lid`).toHaveCount(0);
    await expect(page.locator('.pill text:text-is("TRAPPED")'), `${why}: no stale TRAPPED`).toHaveCount(0);
    await expect(page.locator('.dock.delivered'), `${why}: no stale delivered glow`).toHaveCount(0);
    await expect(page.getByTestId('result'), `${why}: no stale result`).toHaveCount(0);
  };

  // Undo while the scout is still travelling
  await press(page, page.getByTestId('advance'));
  await page.waitForTimeout(150);
  await press(page, page.getByTestId('undo'));
  await noStale('after Undo');
  await expect(turn(page)).toHaveText('1 / 2');
  expect(await at(page)).toEqual({ i: 'J', c: 'J' });
  await expect(page.getByTestId('intruder')).toHaveAttribute('data-captured', 'false');

  // Advance again after the Undo: the sequence still plays correctly and the game is won
  await advance(page);
  await expect(page.getByTestId('result')).toHaveAttribute('data-status', 'won');
  await expect(page.locator('.trap-front .lid-front')).toHaveCount(1);

  // Restart while travelling
  await press(page, page.getByTestId('undo'));
  await expect(page.getByTestId('result')).toHaveCount(0);
  await press(page, page.getByTestId('advance'));
  await page.waitForTimeout(150);
  await press(page, page.getByTestId('restart'));
  await noStale('after Restart');
  await expect(turn(page)).toHaveText('0 / 2');

  // Level change while travelling
  await press(page, cmd(page, 'bait'));
  await advance(page);
  await press(page, page.getByTestId('advance'));
  await page.waitForTimeout(150);
  await press(page, page.getByTestId('level-chip-2'));
  await expect(page.getByTestId('game')).toHaveAttribute('data-level', 'open-the-wrong-door');
  await page.waitForTimeout(1500);
  await expect(page.locator('.trap-front .lid-front')).toHaveCount(0);
  await expect(page.getByTestId('result')).toHaveCount(0);
  await expect(turn(page)).toHaveText('0 / 3');
});
