import type { Locator, Page, TestInfo } from '@playwright/test';
import {
  QA_DIR, advance, cmd, expect, noHorizontalOverflow, openLevel, press, seedProgress, settle, test, turn,
} from './helpers';

/** Stage A2 specs: readability fixes, queued-vs-current state, tray reachability, hero art + fallback. Author-run, not independent QA. */

const BOTH = ['follow-the-bait', 'open-the-wrong-door'];

/**
 * True when the topmost element at the centre of `l` is `l` or one of its descendants.
 * NOTE: this helper SCROLLS the element into view first, so it only proves reachability after scrolling. First-view visibility
 * (nothing scrolled) is asserted separately in a2-1.spec.ts.
 */
async function isTopmostAtCentre(_page: Page, l: Locator): Promise<boolean> {
  await l.scrollIntoViewIfNeeded();
  const b = await l.boundingBox();
  if (!b) return false;
  return l.evaluate((el, p) => el.contains(document.elementFromPoint(p.x, p.y)), { x: b.x + b.width / 2, y: b.y + b.height / 2 });
}

const trayRect = (page: Page) => page.getByTestId('tray').evaluate((e) => {
  const r = e.getBoundingClientRect();
  return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
});

/** Scroll every scroll container (page, phone scroll region and wide-screen details panel) to its end. */
async function scrollToEnd(page: Page) {
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
    const sc = document.querySelector('.scroller');
    if (sc) sc.scrollTop = sc.scrollHeight;
    const p = document.querySelector('.panel');
    if (p) p.scrollTop = p.scrollHeight;
  });
  await page.waitForTimeout(80);
}

/**
 * Lowest bottom edge of any scrolling content (details panel children, plus the board on phones where the board scrolls
 * with the details), and the tray top: content must end above the tray. The tray is its own grid row (A2.1), not a child of .panel.
 */
async function contentVsTray(page: Page) {
  return page.evaluate(() => {
    const panel = document.querySelector('.panel') as HTMLElement;
    const scroller = document.querySelector('.scroller') as HTMLElement;
    const tray = document.querySelector('[data-testid=tray]') as HTMLElement;
    const t = tray.getBoundingClientRect();
    const items: Element[] = Array.from(panel.children);
    if (getComputedStyle(scroller).display !== 'contents') items.push(document.querySelector('.board-wrap') as Element);
    let bottom = -Infinity;
    for (const c of items) {
      const r = c.getBoundingClientRect();
      if (r.height > 0) bottom = Math.max(bottom, r.bottom);
    }
    return { contentBottom: bottom, trayTop: t.top, trayBottom: t.bottom, vh: window.innerHeight };
  });
}

const shot = async (page: Page, name: string, info: TestInfo) => {
  // captures are taken scrolled to the top, the way a player first sees the screen
  await page.evaluate(() => { window.scrollTo(0, 0); document.querySelector('.panel')?.scrollTo(0, 0); document.querySelector('.scroller')?.scrollTo(0, 0); });
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${QA_DIR}/${name}-${info.project.name}.png` });
};

// ---------------------------------------------------------------- A. junction

test('junction: visible Junction label, readable size, no label collisions, targets hit-test to themselves', async ({ page }) => {
  await seedProgress(page, BOTH);
  for (const n of [2, 3]) {
    await openLevel(page, n);
    const label = page.getByTestId('junction-label-junction');
    await expect(label).toBeVisible();
    await expect(label).toContainText('JUNCTION');
    const textBox = await label.locator('text').boundingBox();
    expect(textBox?.height ?? 0, `L${n} label glyph box height`).toBeGreaterThanOrEqual(9);

    // the label must not sit on top of any node label
    const clash = await page.evaluate(() => {
      const rect = (e: Element) => e.getBoundingClientRect();
      const j = rect(document.querySelector('[data-testid^=junction-label-]') as Element);
      return Array.from(document.querySelectorAll('.labels > g')).filter((g) => {
        const r = rect(g);
        return r.left < j.right && r.right > j.left && r.top < j.bottom && r.bottom > j.top;
      }).length;
    });
    expect(clash, `L${n} junction label overlaps node labels`).toBe(0);

    // every actionable target: >= 44x44, topmost at its own centre, circles never overlap each other
    const targets = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid^=target-]')).map((t) => {
      const h = t.querySelector('.hit') as Element;
      const r = h.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const top = document.elementFromPoint(cx, cy)?.closest('[data-testid^=target-]')?.getAttribute('data-testid');
      return { id: t.getAttribute('data-testid'), w: r.width, h: r.height, cx, cy, top };
    }));
    expect(targets.length).toBeGreaterThanOrEqual(2);
    for (const t of targets) {
      expect(t.w, `${t.id} width`).toBeGreaterThanOrEqual(44);
      expect(t.h, `${t.id} height`).toBeGreaterThanOrEqual(44);
      expect(t.top, `${t.id} is topmost at its centre`).toBe(t.id);
    }
    for (let i = 0; i < targets.length; i++) {
      for (let j = i + 1; j < targets.length; j++) {
        const a = targets[i]!;
        const b = targets[j]!;
        const d = Math.hypot(a.cx - b.cx, a.cy - b.cy);
        expect(d, `${a.id} vs ${b.id} circles overlap`).toBeGreaterThanOrEqual(a.w / 2 + b.w / 2 - 1);
      }
    }
    // pressing the junction target queues Reroute and nothing else
    await press(page, page.getByTestId('target-rr-junction'));
    await expect(cmd(page, 'reroute')).toHaveAttribute('aria-pressed', 'true');
    await press(page, cmd(page, 'wait'));
  }
});

// ---------------------------------------------------------------- E. queued vs current

const queuedMarks = (page: Page) => page.locator('[data-testid^=queued-]');

test('queued vs current: Seal shows a ghost gate and WILL SEAL while the committed gate stays OPEN', async ({ page }) => {
  await seedProgress(page, BOTH);
  await openLevel(page, 3);
  await expect(queuedMarks(page)).toHaveCount(0);
  await press(page, cmd(page, 'shutter'));
  await expect(page.getByTestId('gate-gate')).toHaveAttribute('data-open', 'true'); // committed
  await expect(page.getByTestId('gate-now-gate')).toHaveText('NOW OPEN');
  await expect(page.getByTestId('queued-gate-gate')).toHaveText('WILL SEAL');
  await expect(page.getByTestId('gate-ghost-gate')).toHaveAttribute('data-will-open', 'false');
  await expect(page.locator('[data-edge="J-V"]')).toHaveAttribute('data-role', 'closing');
  await expect(page.locator('[data-edge="J-V"]')).toHaveAttribute('data-open', 'true');
  await expect(turn(page)).toHaveText('0 / 4');
  await expect(page.getByTestId('charges')).toHaveText('4');
  // Wait clears every queued mark
  await press(page, cmd(page, 'wait'));
  await expect(queuedMarks(page)).toHaveCount(0);
  await expect(page.getByTestId('gate-ghost-gate')).toHaveCount(0);
  await expect(page.getByTestId('gate-now-gate')).toHaveText('OPEN');
  await expect(page.locator('[data-edge="J-V"]')).toHaveAttribute('data-role', 'none');
});

test('queued vs current: Reroute marks the live branch CLOSES and the alternate OPENS without changing committed edges', async ({ page }) => {
  await seedProgress(page, BOTH);
  await openLevel(page, 3);
  await expect(page.locator('[data-edge="J-X"]')).toHaveAttribute('data-role', 'current');
  await press(page, cmd(page, 'reroute'));
  await expect(page.getByTestId('queued-route-closing')).toHaveText('CLOSES');
  await expect(page.getByTestId('queued-route-opening')).toHaveText('OPENS');
  await expect(page.locator('[data-edge="J-X"]')).toHaveAttribute('data-role', 'closing');
  await expect(page.locator('[data-edge="J-K"]')).toHaveAttribute('data-role', 'opening');
  await expect(page.locator('[data-edge="J-X"]')).toHaveAttribute('data-open', 'true'); // committed, unchanged
  await expect(page.locator('[data-edge="J-K"]')).toHaveAttribute('data-open', 'false');
  await expect(page.getByTestId('dial-junction')).toHaveAttribute('data-queued', 'true');
  await expect(page.getByTestId('dial-junction')).toHaveAttribute('data-now', 'Dead end');
  // Restart clears
  await press(page, page.getByTestId('restart'));
  await expect(queuedMarks(page)).toHaveCount(0);
  await expect(page.locator('[data-edge="J-X"]')).toHaveAttribute('data-role', 'current');
  // Advance a Seal, queue the Open, then Undo: stale marks must go
  await press(page, cmd(page, 'shutter'));
  await advance(page);
  await expect(queuedMarks(page)).toHaveCount(0);
  await expect(page.getByTestId('gate-gate')).toHaveAttribute('data-open', 'false');
  await press(page, cmd(page, 'shutter'));
  await expect(page.getByTestId('queued-gate-gate')).toHaveText('WILL OPEN');
  await expect(page.getByTestId('gate-ghost-gate')).toHaveAttribute('data-will-open', 'true');
  await expect(page.getByTestId('gate-now-gate')).toHaveText('NOW SEALED');
  await press(page, page.getByTestId('undo'));
  await expect(queuedMarks(page)).toHaveCount(0);
  await expect(page.getByTestId('gate-gate')).toHaveAttribute('data-open', 'true');
});

test('queued vs current: Bait shows WILL ARM, then the trap is armed after Advance', async ({ page }) => {
  await openLevel(page, 1);
  const trap = page.locator('.node-trap .trap');
  await expect(trap).toHaveClass(/idle/);
  await press(page, cmd(page, 'bait'));
  await expect(page.getByTestId('queued-bait-H')).toHaveText('WILL ARM');
  await expect(trap).toHaveClass(/idle/); // committed state is still idle
  await press(page, cmd(page, 'wait'));
  await expect(queuedMarks(page)).toHaveCount(0);
  await press(page, cmd(page, 'bait'));
  await advance(page);
  await expect(queuedMarks(page)).toHaveCount(0);
  await expect(trap).toHaveClass(/armed/);
});

// ---------------------------------------------------------------- B. trap states

test('trap: idle, armed and sprung are different drawings and the captured scout stays visible', async ({ page }, info) => {
  await openLevel(page, 1);
  const trap = page.locator('.node-trap .trap');
  await expect(trap.locator('.lid-open')).toHaveCount(1);
  await expect(trap.locator('.led')).toHaveCount(0);
  const idleLid = await trap.locator('.lid-open polygon').first().getAttribute('points');
  await press(page, cmd(page, 'bait'));
  await advance(page);
  await expect(trap.locator('.led')).toHaveCount(1);
  await expect(trap.locator('.morsel')).toHaveCount(1);
  const armedLid = await trap.locator('.lid-open polygon').first().getAttribute('points');
  expect(armedLid, 'armed lid is raised differently from idle').not.toBe(idleLid);
  await press(page, cmd(page, 'wait'));
  await advance(page);
  await expect(page.getByTestId('result')).toHaveAttribute('data-status', 'won');
  await expect(trap).toHaveClass(/closed/);
  await expect(trap.locator('.lid-back')).toHaveCount(1);
  await expect(trap.locator('.lid-open')).toHaveCount(0);
  await expect(page.locator('.trap-front .lid-front')).toHaveCount(1);
  // the scout's head is not covered by trap art
  await page.waitForTimeout(700);
  const head = page.getByTestId('intruder').locator('[data-part="scout-head"]');
  const b = await head.boundingBox();
  expect(b).not.toBeNull();
  const covered = await page.evaluate((p) => {
    const e = document.elementFromPoint(p.x, p.y);
    return !(e && e.closest('[data-testid=intruder]'));
  }, { x: (b?.x ?? 0) + (b?.width ?? 0) / 2, y: (b?.y ?? 0) + (b?.height ?? 0) * 0.25 });
  expect(covered, 'captured scout head is topmost').toBe(false);
  await shot(page, 'capture-l1', info);
});

// ---------------------------------------------------------------- G. reduced motion for the new cues

test('reduced motion: route marks, lever and gate drop do not animate', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seedProgress(page, BOTH);
  await openLevel(page, 3);
  await press(page, cmd(page, 'reroute'));
  const names = await page.evaluate(() => Array.from(document.querySelectorAll('.route-mark, .queued-arrow, .ghost-arrow .march')).map((e) => getComputedStyle(e).animationName));
  expect(names.length).toBeGreaterThan(0);
  for (const n of names) expect(n).toBe('none');
  const t = await page.evaluate(() => getComputedStyle(document.querySelector('.lever-stalk') as Element).transitionDuration);
  expect(t).toBe('0s');
});

// ---------------------------------------------------------------- F. entry screen + hero art

test('title: art loads from the /Trapline/ base path, Play is first and visible, demo board is real', async ({ page }, info) => {
  await page.goto('./');
  const img = page.locator('[data-testid=title-art] img');
  await expect(img).toBeVisible();
  await expect.poll(() => img.evaluate((e) => (e as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const src = await img.evaluate((e) => (e as HTMLImageElement).currentSrc);
  expect(src).toContain('/Trapline/art/');
  expect(src.endsWith(info.project.name === 'mobile' ? 'title-hero-mobile.jpg' : 'title-hero.jpg')).toBe(true);
  for (const f of ['title-hero.jpg', 'title-hero-mobile.jpg']) {
    const r = await page.request.get(`art/${f}`);
    expect(r.status()).toBe(200);
    expect(r.headers()['content-type']).toContain('image/jpeg');
  }
  const play = page.getByRole('button', { name: 'Play' });
  await expect(play).toBeVisible();
  expect(await isTopmostAtCentre(page, play)).toBe(true);
  const vh = page.viewportSize()?.height ?? 0;
  const pb = await play.boundingBox();
  expect((pb?.y ?? 9999) + (pb?.height ?? 0), 'Play is above the fold').toBeLessThanOrEqual(vh);
  await expect(page.getByTestId('title-demo').getByTestId('board')).toBeVisible();
  await expect(page.getByTestId('title-demo')).toContainText('Real game board');
  await expect(page.getByRole('button', { name: /^Sound:/ })).toBeVisible();
  await expect(page.getByText('Unreleased playable slice')).toBeVisible();
  await noHorizontalOverflow(page);
});

test('hero image failure: expected failed requests only; title and the game stay fully playable', async ({ page, guard }) => {
  await page.route('**/art/title-hero*.jpg', (r) => r.abort());
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'TRAPLINE' })).toBeVisible();
  await expect(page.getByTestId('title-art')).toHaveCount(0); // vector fallback: art block removed
  await expect(page.getByTestId('title-demo').getByTestId('board')).toBeVisible();
  await noHorizontalOverflow(page);
  // the failure is expected here and checked separately from the normal-run "no errors" guard
  expect(guard.failed.length).toBeGreaterThan(0);
  await openLevel(page, 1);
  await press(page, cmd(page, 'bait'));
  await advance(page);
  await press(page, cmd(page, 'wait'));
  await advance(page);
  await expect(page.getByTestId('result')).toHaveAttribute('data-status', 'won');
  // Only the deliberately aborted hero requests may have failed; anything else is still a failure.
  expect(guard.failed.every((f) => f.includes('/art/title-hero')), `unexpected failures: ${guard.failed.join(' | ')}`).toBe(true);
  expect(guard.errors.every((e) => /Failed to load resource: net::ERR_FAILED/.test(e)), `unexpected errors: ${guard.errors.join(' | ')}`).toBe(true);
  guard.failed.length = 0;
  guard.errors.length = 0;
});

// ---------------------------------------------------------------- D. tray overlap matrix (run once, under the desktop project)

const SIZES = [
  { w: 1440, h: 900 },
  { w: 390, h: 844 },
  { w: 360, h: 640 },
  { w: 844, h: 390 },
];

for (const { w, h } of SIZES) {
  test.describe(`viewport ${w}x${h}`, () => {
    test.use({ viewport: { width: w, height: h }, isMobile: w < 900, hasTouch: w < 900, deviceScaleFactor: w < 900 ? 2 : 1 });

    test('tray never covers content or controls: normal, win and loss states', async ({ page }, info) => {
      test.skip(info.project.name !== 'desktop', 'this matrix sets its own viewports per describe block; running it under both projects would duplicate it');
      await seedProgress(page, BOTH);
      await openLevel(page, 3);
      await noHorizontalOverflow(page);

      // normal: queued preview, scrolled to the end
      await press(page, cmd(page, 'reroute'));
      await page.waitForTimeout(250);
      await shot(page, `layout-${w}x${h}-l3-queued`, info);
      await scrollToEnd(page);
      let m = await contentVsTray(page);
      expect(m.contentBottom, 'preview/explanation text ends above the tray').toBeLessThanOrEqual(m.trayTop + 1);
      expect(m.trayBottom, 'tray inside the viewport').toBeLessThanOrEqual(m.vh + 1);
      for (const id of ['cmd-bait', 'cmd-reroute', 'cmd-shutter', 'cmd-wait', 'undo', 'restart', 'advance']) {
        expect(await isTopmostAtCentre(page, page.getByTestId(id)), `${id} reachable`).toBe(true);
      }
      // the explanation and next-turn blocks are readable at the end of the scroll
      for (const sel of ['[data-testid=intel]', '.explain']) {
        const r = await page.locator(sel).boundingBox();
        const tr = await trayRect(page);
        expect((r?.y ?? 0) + (r?.height ?? 0), `${sel} above tray`).toBeLessThanOrEqual(tr.top + 1);
      }

      // loss: breach on level 1 by waiting twice
      await openLevel(page, 3);
      await press(page, page.getByTestId('level-chip-1'));
      await press(page, cmd(page, 'wait'));
      await advance(page);
      await press(page, cmd(page, 'wait'));
      await advance(page);
      await expect(page.getByTestId('result')).toHaveAttribute('data-status', 'lost');
      await shot(page, `layout-${w}x${h}-l1-loss`, info);
      await scrollToEnd(page);
      m = await contentVsTray(page);
      expect(m.contentBottom, 'loss text ends above the tray').toBeLessThanOrEqual(m.trayTop + 1);
      for (const id of ['undo', 'restart']) expect(await isTopmostAtCentre(page, page.getByTestId(id)), `${id} reachable (loss)`).toBe(true);
      await press(page, page.getByTestId('undo'));
      await expect(page.getByTestId('result')).toHaveCount(0);

      // win: reference solution on level 1; Next level must be reachable and above the tray
      await press(page, page.getByTestId('restart'));
      await press(page, cmd(page, 'bait'));
      await advance(page);
      await press(page, cmd(page, 'wait'));
      await advance(page);
      await expect(page.getByTestId('result')).toHaveAttribute('data-status', 'won');
      await page.waitForTimeout(600);
      await shot(page, `layout-${w}x${h}-l1-win`, info);
      const next = page.getByTestId('next-level');
      expect(await isTopmostAtCentre(page, next), 'Next level reachable').toBe(true);
      await scrollToEnd(page);
      m = await contentVsTray(page);
      expect(m.contentBottom, 'win text ends above the tray').toBeLessThanOrEqual(m.trayTop + 1);
      expect(await isTopmostAtCentre(page, next), 'Next level still reachable after scrolling').toBe(true);
      await settle(page);
    });
  });
}