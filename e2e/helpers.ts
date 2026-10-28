import { test as base, expect, type Locator, type Page } from '@playwright/test';

export interface Guard {
  errors: string[];
  external: string[];
  failed: string[];
}

function attach(page: Page, base: string): Guard {
  const g: Guard = { errors: [], external: [], failed: [] };
  const origin = new URL(base).origin;
  page.on('console', (m) => { if (m.type() === 'error') g.errors.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => g.errors.push(`pageerror: ${e.message}`));
  page.on('request', (r) => {
    const u = r.url();
    if (u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('about:')) return;
    if (new URL(u).origin !== origin) g.external.push(u);
  });
  page.on('requestfailed', (r) => g.failed.push(`${r.url()} ${r.failure()?.errorText ?? ''}`));
  page.on('response', (r) => { if (r.status() >= 400) g.failed.push(`${r.status()} ${r.url()}`); });
  return g;
}

/** Every test automatically fails on console/page errors, failed or external requests. */
export const test = base.extend<{ guard: Guard }>({
  guard: [
    async ({ page, baseURL }, use) => {
      const g = attach(page, baseURL ?? 'http://127.0.0.1:4173/Trapline/');
      await use(g);
      expect(g.errors, 'console/page errors').toEqual([]);
      expect(g.external, 'external runtime requests').toEqual([]);
      expect(g.failed, 'failed requests / broken assets').toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };

export const QA_DIR = 'docs/qa/a1';
export const KEY = 'trapline.progress.v1';

export const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1000) <= 640;

/** Click on desktop, real touch tap on the emulated touch project. */
export async function press(page: Page, l: Locator) {
  if (isMobile(page)) await l.tap();
  else await l.click();
}

export async function seedProgress(page: Page, completed: string[]) {
  const rec: Record<string, { turns: number; charges: number }> = {};
  const limits: Record<string, [number, number]> = {
    'follow-the-bait': [2, 1], 'open-the-wrong-door': [3, 2], 'keep-the-service-running': [4, 4],
  };
  for (const id of completed) rec[id] = { turns: (limits[id] as [number, number])[0], charges: (limits[id] as [number, number])[1] };
  const value = JSON.stringify({ version: 1, completed: rec, settings: { muted: true } });
  await page.addInitScript(([k, v]) => { try { window.localStorage.setItem(k as string, v as string); } catch { /* ignore */ } }, [KEY, value]);
}

export const turn = (page: Page) => page.getByTestId('turn');
export const cmd = (page: Page, name: 'bait' | 'reroute' | 'shutter' | 'wait') => page.getByTestId(`cmd-${name}`);

/** Waits until the movement animation lock is released or the level ended. */
export async function settle(page: Page) {
  await expect(page.locator('[data-testid=result], [data-testid=intel] h3:text-is("Next turn")').first()).toBeVisible();
}

export async function advance(page: Page) {
  await press(page, page.getByTestId('advance'));
  await settle(page);
}

export async function openLevel(page: Page, n: number) {
  await page.goto('./');
  await press(page, page.getByRole('button', { name: /^(Play|Continue)/ }));
  if (n > 1) await press(page, page.getByTestId(`level-chip-${n}`));
  await expect(page.getByTestId('game')).toBeVisible();
}

export async function noHorizontalOverflow(page: Page) {
  const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  expect(o.sw, `scrollWidth ${o.sw} vs clientWidth ${o.cw}`).toBeLessThanOrEqual(o.cw);
}

export const at = async (page: Page) => ({
  i: await page.getByTestId('intruder').getAttribute('data-at'),
  c: await page.getByTestId('courier').getAttribute('data-at'),
});