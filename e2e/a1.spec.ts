import {
  QA_DIR, KEY, at, advance, cmd, expect, noHorizontalOverflow, openLevel, press, seedProgress, settle, test, turn, isMobile,
} from './helpers';

const shot = async (page: import('@playwright/test').Page, name: string, testInfo: import('@playwright/test').TestInfo) => {
  await page.screenshot({ path: `${QA_DIR}/${name}-${testInfo.project.name}.png` });
};

test('title view loads with no errors, no external requests, no overflow', async ({ page }, testInfo) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'TRAPLINE' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  await page.waitForTimeout(300);
  await noHorizontalOverflow(page);
  await shot(page, 'title', testInfo);
});

test('Level 1 through visible controls: preview, advance, victory, progress survives reload', async ({ page }, testInfo) => {
  await openLevel(page, 1);
  await expect(page.getByTestId('coach')).toContainText('Select Bait');
  await expect(turn(page)).toHaveText('0 / 2');
  await expect(page.getByTestId('charges')).toHaveText('1');

  // Queueing is a free preview.
  await press(page, cmd(page, 'bait'));
  await expect(cmd(page, 'bait')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('ghost-intruder')).toHaveAttribute('data-to', 'J');
  await expect(page.getByTestId('ghost-courier')).toHaveAttribute('data-to', 'J');
  await expect(page.getByTestId('intruder-line')).toContainText('takes the bait');
  await expect(turn(page)).toHaveText('0 / 2');
  await expect(page.getByTestId('charges')).toHaveText('1');
  await noHorizontalOverflow(page);
  await shot(page, 'preview-l1', testInfo);

  await advance(page);
  await expect(turn(page)).toHaveText('1 / 2');
  await expect(page.getByTestId('charges')).toHaveText('0');
  expect(await at(page)).toEqual({ i: 'J', c: 'J' });
  await expect(cmd(page, 'bait')).toBeDisabled(); // armed + no charges
  await expect(page.getByTestId('coach')).toContainText('Wait');

  await advance(page); // no command selected = Wait
  await expect(page.getByTestId('result')).toHaveAttribute('data-status', 'won');
  expect(await at(page)).toEqual({ i: 'H', c: 'D' });
  await expect(page.getByTestId('intruder')).toHaveAttribute('data-captured', 'true');
  await expect(page.getByTestId('courier')).toHaveAttribute('data-delivered', 'true');
  await expect(page.getByTestId('obj-trap')).toHaveClass(/done/);
  await expect(page.getByTestId('obj-deliver')).toHaveClass(/done/);
  await page.waitForTimeout(900);
  await shot(page, 'victory-l1', testInfo);

  const stored = await page.evaluate((k) => window.localStorage.getItem(k), KEY);
  expect(JSON.parse(stored as string).completed['follow-the-bait']).toEqual({ turns: 2, charges: 1 });

  await page.reload();
  await expect(page.getByRole('button', { name: 'Continue: Level 2' })).toBeVisible();
  await press(page, page.getByRole('button', { name: 'Continue: Level 2' }));
  await expect(page.getByTestId('game')).toHaveAttribute('data-level', 'open-the-wrong-door');
  await expect(page.getByTestId('level-chip-1')).toHaveAttribute('data-done', 'true');
});

test('all three levels in sequence, then locked/unlocked state', async ({ page }) => {
  await openLevel(page, 1);
  await expect(page.getByTestId('level-chip-2')).toBeDisabled();
  await press(page, cmd(page, 'bait'));
  await advance(page);
  await advance(page);
  await press(page, page.getByTestId('next-level'));

  // Level 2: Reroute, Bait, Wait with the hand-specified positions
  await expect(page.getByTestId('game')).toHaveAttribute('data-level', 'open-the-wrong-door');
  await expect(page.getByTestId('level-chip-3')).toBeDisabled();
  await press(page, cmd(page, 'reroute'));
  await expect(page.getByTestId('ghost-intruder')).toHaveAttribute('data-to', 'J');
  await advance(page);
  expect(await at(page)).toEqual({ i: 'J', c: 'J' });
  await press(page, cmd(page, 'bait'));
  await advance(page);
  expect(await at(page)).toEqual({ i: 'K', c: 'D' });
  await expect(page.getByTestId('courier')).toHaveAttribute('data-delivered', 'true');
  await advance(page);
  await expect(page.getByTestId('result')).toHaveAttribute('data-status', 'won');
  expect(await at(page)).toEqual({ i: 'H', c: 'D' });
  await press(page, page.getByTestId('next-level'));

  // Level 3
  await expect(page.getByTestId('game')).toHaveAttribute('data-level', 'keep-the-service-running');
  await press(page, cmd(page, 'shutter'));
  await advance(page);
  await expect(page.getByTestId('gate-gate')).toHaveAttribute('data-open', 'false');
  expect(await at(page)).toEqual({ i: 'J', c: 'J' });
  await press(page, cmd(page, 'reroute'));
  await advance(page);
  expect(await at(page)).toEqual({ i: 'J', c: 'J' });
  await press(page, cmd(page, 'bait'));
  await advance(page);
  expect(await at(page)).toEqual({ i: 'K', c: 'J' });
  await expect(cmd(page, 'shutter')).toContainText('Open');
  await press(page, cmd(page, 'shutter'));
  await expect(page.getByTestId('outcome')).toContainText('You win');
  await advance(page);
  await expect(page.getByTestId('result')).toHaveAttribute('data-status', 'won');
  expect(await at(page)).toEqual({ i: 'H', c: 'V' });
  await expect(turn(page)).toHaveText('4 / 4');
  await expect(page.getByTestId('finish')).toBeVisible();
});

test('Level 2 alternate order (Bait first) and Level 3 alternate order both win', async ({ page }) => {
  await seedProgress(page, ['follow-the-bait', 'open-the-wrong-door']);
  await openLevel(page, 2);
  await press(page, cmd(page, 'bait'));
  await advance(page);
  expect(await at(page)).toEqual({ i: 'J', c: 'J' }); // trap armed but out of reach: intruder still heads for the vault
  await expect(page.getByTestId('intruder-line')).toContainText('heading for the vault');
  await press(page, cmd(page, 'reroute'));
  await advance(page);
  expect(await at(page)).toEqual({ i: 'K', c: 'D' });
  await advance(page);
  await expect(page.getByTestId('result')).toHaveAttribute('data-status', 'won');

  await openLevel(page, 3);
  for (const k of ['shutter', 'bait', 'reroute', 'shutter'] as const) {
    await press(page, cmd(page, k));
    await advance(page);
  }
  await expect(page.getByTestId('result')).toHaveAttribute('data-status', 'won');
});

test('losses: waiting breaches; undo and restart recover; sealed gate alone cannot win', async ({ page }, testInfo) => {
  await openLevel(page, 1);
  await advance(page);
  await advance(page);
  await expect(page.getByTestId('result')).toHaveAttribute('data-status', 'lost');
  await expect(page.getByTestId('result')).toContainText('Breach');
  await expect(page.getByTestId('advance')).toBeDisabled();
  await page.waitForTimeout(1500);
  await shot(page, 'breach-l1', testInfo);
  await press(page, page.getByTestId('undo'));
  await expect(page.getByTestId('result')).toHaveCount(0);
  await expect(turn(page)).toHaveText('1 / 2');
  expect(await at(page)).toEqual({ i: 'J', c: 'J' });
  await press(page, page.getByTestId('restart'));
  await expect(turn(page)).toHaveText('0 / 2');
  expect(await at(page)).toEqual({ i: 'S', c: 'C' });

  const stored = await page.evaluate((k) => window.localStorage.getItem(k), KEY);
  expect(stored === null || Object.keys(JSON.parse(stored).completed).length === 0).toBe(true); // no win, no record

  // Level 3: seal, bait/reroute, never reopen -> timeout loss (capture alone is not victory)
  await page.goto('./');
  await seedProgress(page, ['follow-the-bait', 'open-the-wrong-door']);
  await openLevel(page, 3);
  for (const k of ['shutter', 'reroute', 'bait'] as const) {
    await press(page, cmd(page, k));
    await advance(page);
  }
  await advance(page); // Wait with the gate still sealed
  await expect(page.getByTestId('result')).toHaveAttribute('data-status', 'lost');
  await expect(page.getByTestId('result')).toContainText('trapped, but the packet was not delivered');
  await page.waitForTimeout(1200);
  await shot(page, 'timeout-l3', testInfo);
});

test('queued commands are free previews; undo restores the whole prior state; restart resets', async ({ page }) => {
  await seedProgress(page, ['follow-the-bait', 'open-the-wrong-door']);
  await openLevel(page, 3);
  await press(page, cmd(page, 'shutter'));
  await press(page, cmd(page, 'reroute'));
  await expect(page.getByTestId('selected-name')).toHaveText('Reroute queued');
  await press(page, cmd(page, 'wait'));
  await expect(page.getByTestId('selected-name')).toHaveText('Wait');
  await expect(turn(page)).toHaveText('0 / 4');
  await expect(page.getByTestId('charges')).toHaveText('4');

  await press(page, cmd(page, 'shutter'));
  await advance(page);
  await press(page, cmd(page, 'reroute'));
  await advance(page);
  await expect(page.getByTestId('gate-gate')).toHaveAttribute('data-open', 'false');
  await expect(page.getByTestId('charges')).toHaveText('2');
  await press(page, page.getByTestId('undo'));
  await expect(turn(page)).toHaveText('1 / 4');
  await expect(page.getByTestId('charges')).toHaveText('3');
  await press(page, page.getByTestId('undo'));
  await expect(turn(page)).toHaveText('0 / 4');
  await expect(page.getByTestId('charges')).toHaveText('4');
  await expect(page.getByTestId('gate-gate')).toHaveAttribute('data-open', 'true');
  await expect(page.getByTestId('undo')).toBeDisabled();
  await press(page, cmd(page, 'shutter'));
  await advance(page);
  await press(page, page.getByTestId('restart'));
  await expect(turn(page)).toHaveText('0 / 4');
  await expect(page.getByTestId('gate-gate')).toHaveAttribute('data-open', 'true');
});

test('corrupt storage does not block play', async ({ page }) => {
  await page.addInitScript((k) => { window.localStorage.setItem(k, '{"version":1,"completed":{"follow-the-bait":{"turns":"x"}},"settings":'); }, KEY);
  await openLevel(page, 1);
  await press(page, cmd(page, 'bait'));
  await advance(page);
  await advance(page);
  await expect(page.getByTestId('result')).toHaveAttribute('data-status', 'won');
});

test('wrong-shaped storage values are ignored', async ({ page }) => {
  await page.addInitScript((k) => { window.localStorage.setItem(k, JSON.stringify({ version: 1, completed: { 'open-the-wrong-door': { turns: 1, charges: 0 }, x: 1 }, settings: { muted: 7 } })); }, KEY);
  await page.goto('./');
  // Level 2 record is valid in shape, but Level 1 is not complete: Play continues at Level 1.
  await expect(page.getByRole('button', { name: 'Continue: Level 1' })).toBeVisible();
});

test('unavailable localStorage does not crash the game', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('denied', 'SecurityError'); } });
  });
  await openLevel(page, 1);
  await press(page, cmd(page, 'bait'));
  await advance(page);
  await advance(page);
  await expect(page.getByTestId('result')).toHaveAttribute('data-status', 'won');
  await press(page, page.getByTestId('sound'));
  await expect(page.getByTestId('sound')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('sound')).toHaveAttribute('aria-label', 'Sound: off');
});

test('keyboard operation: shortcuts, focusable board targets, visible focus, live status', async ({ page }) => {
  test.skip(isMobile(page), 'keyboard path is exercised on desktop');
  await openLevel(page, 1);
  const target = page.getByTestId('target-bait-H');
  await expect(target).toHaveAttribute('role', 'button');
  await expect(target).toHaveAttribute('aria-label', /Bait: Trap at Trap/);
  await page.keyboard.press('Tab');
  await target.focus();
  await page.keyboard.press('Enter');
  await expect(cmd(page, 'bait')).toHaveAttribute('aria-pressed', 'true');
  await expect(target).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('live')).toContainText('Queued Bait');
  await page.keyboard.press(' ');
  await expect(cmd(page, 'bait')).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('b');
  await expect(cmd(page, 'bait')).toHaveAttribute('aria-pressed', 'true');

  await page.getByTestId('advance').focus();
  const outline = await page.evaluate(() => {
    const cs = getComputedStyle(document.activeElement as Element);
    return { w: parseFloat(cs.outlineWidth), s: cs.outlineStyle };
  });
  expect(outline.s).not.toBe('none');
  expect(outline.w).toBeGreaterThanOrEqual(2);
  const ring = await target.focus().then(() => page.evaluate(() => {
    const el = document.querySelector('[data-testid=target-bait-H] .ring') as SVGElement;
    return getComputedStyle(el).strokeWidth;
  }));
  expect(parseFloat(ring)).toBeGreaterThan(0);

  await page.keyboard.press('a');
  await settle(page);
  await expect(turn(page)).toHaveText('1 / 2');
  await expect(page.getByTestId('live')).toContainText('Intruder moved to Relay');
  await page.keyboard.press('u');
  await expect(turn(page)).toHaveText('0 / 2');
  await page.keyboard.press('R');
  await expect(turn(page)).toHaveText('0 / 2');
});

test('rapid Advance is protected during animation; undo cancels the lock', async ({ page }) => {
  await openLevel(page, 1);
  await press(page, cmd(page, 'bait'));
  const adv = page.getByTestId('advance');
  await adv.dispatchEvent('click');
  await adv.dispatchEvent('click');
  await page.keyboard.press('a');
  await page.keyboard.press('a');
  await expect(turn(page)).toHaveText('1 / 2');
  await expect(adv).toBeDisabled();
  await expect(page.getByTestId('intel')).toContainText('Moving');
  // Undo mid-animation cancels the lock immediately
  await page.getByTestId('undo').dispatchEvent('click');
  await expect(turn(page)).toHaveText('0 / 2');
  await expect(adv).toBeEnabled();
  await expect(page.getByTestId('intel')).not.toContainText('Moving');
  // and the stale animation timer cannot release a later lock early
  await press(page, cmd(page, 'bait'));
  await adv.dispatchEvent('click');
  await expect(adv).toBeDisabled();
  await settle(page);
  await expect(adv).toBeEnabled();
});

test('reduced motion: no transitions and no animation lock', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openLevel(page, 1);
  const dur = await page.getByTestId('intruder').evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(dur.split(',').every((d) => parseFloat(d) === 0)).toBe(true);
  await press(page, cmd(page, 'bait'));
  await page.getByTestId('advance').click();
  await expect(turn(page)).toHaveText('1 / 2');
  await expect(page.getByTestId('advance')).toBeEnabled();
  await expect(page.getByTestId('intel')).not.toContainText('Moving');
});

test('layout: no horizontal overflow on any level, touch targets >= 44px, board readable', async ({ page }, testInfo) => {
  await seedProgress(page, ['follow-the-bait', 'open-the-wrong-door']);
  for (const n of [1, 2, 3]) {
    await openLevel(page, n);
    await noHorizontalOverflow(page);
    const boxes = await page.evaluate(() => {
      const sel = '.cmd, .btn, .chip, .link, .brand, [data-testid^=target-] .hit';
      return [...document.querySelectorAll(sel)].map((e) => {
        const r = e.getBoundingClientRect();
        return { n: (e.textContent ?? e.getAttribute('data-testid') ?? '').trim().slice(0, 24), w: r.width, h: r.height };
      });
    });
    for (const b of boxes) {
      expect(b.w, `${b.n} width`).toBeGreaterThanOrEqual(44);
      expect(b.h, `${b.n} height`).toBeGreaterThanOrEqual(44);
    }
    const board = await page.getByTestId('board').boundingBox();
    expect(board?.width ?? 0).toBeGreaterThan(isMobile(page) ? 340 : 700);
  }
  await openLevel(page, 3);
  await press(page, cmd(page, 'shutter'));
  await expect(page.getByTestId('ghost-intruder')).toHaveCount(0); // both wait: badges instead of arrows
  await page.waitForTimeout(300);
  await shot(page, 'preview-l3', testInfo);
  await openLevel(page, 2);
  await press(page, cmd(page, 'reroute'));
  await page.waitForTimeout(300);
  await shot(page, 'preview-l2', testInfo);
});

test('touch: board targets and tray controls work by tap (emulated touch only)', async ({ page }) => {
  test.skip(!isMobile(page), 'mobile project only');
  await seedProgress(page, ['follow-the-bait', 'open-the-wrong-door']);
  await openLevel(page, 3);
  await page.getByTestId('target-sh-gate').tap();
  await expect(cmd(page, 'shutter')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('advance').tap();
  await settle(page);
  await expect(page.getByTestId('gate-gate')).toHaveAttribute('data-open', 'false');
});