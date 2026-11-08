// Browser smoke tests. Builds are served with the production headers from
// vercel.json (so a Content Security Policy mistake fails here, not for
// testers), and Chromium plays synthetic singing into the page as the mic.
//
//   npm run build && npm run build:mock && npm run test:e2e
//
// CHROMIUM_PATH can point at a browser you already have; otherwise Playwright's own is used.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { serveDist } from '../scripts/dist-server.mjs';
import { makeClips } from './audio.mjs';

const clips = makeClips(mkdtempSync(join(tmpdir(), 'belto-clips-')));
const prod = await serveDist({ dir: 'dist' });
const mock = await serveDist({ dir: 'dist-mock' });

const lessonIds = ['core', 'expansion']
  .flatMap((f) => [...readFileSync(new URL(`../src/content/${f}.ts`, import.meta.url), 'utf8').matchAll(/lesson\('([a-z0-9-]+)'/g)].map((m) => m[1]));

const results = [];
async function test(name, fn) {
  const started = Date.now();
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ok   ${name} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
  } catch (err) {
    results.push({ name, ok: false });
    console.log(`  FAIL ${name}\n       ${String(err.message ?? err).split('\n').join('\n       ')}`);
  }
}

/** A fresh browser that hears `clip` as its microphone. */
async function session(clip, { userAgent, base = prod, theme, extra = {}, micAllowed = true } = {}) {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: [...(micAllowed ? ['--use-fake-ui-for-media-stream'] : []), '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${clips[clip]}`, '--autoplay-policy=no-user-gesture-required'],
  });
  const context = await browser.newContext({ viewport: { width: 1100, height: 800 }, permissions: micAllowed ? ['microphone'] : [], userAgent, acceptDownloads: true });
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push(`error: ${e.message}`));
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error' || /Content Security Policy|Refused to/i.test(t)) problems.push(`console: ${t}`);
  });
  await page.addInitScript(
    ({ ids, theme, extra }) => {
      const lessons = Object.fromEntries(ids.map((id) => [id, { completedAt: 1, best: 80, plays: 1 }]));
      const state = { name: 'Tester', onboarded: true, range: { low: 48, high: 72 }, lessons, sound: false, theme: theme ?? 'dark', ...extra };
      if (!localStorage.getItem('belto-progress')) localStorage.setItem('belto-progress', JSON.stringify({ state, version: 2 }));
    },
    { ids: lessonIds, theme, extra },
  );
  return { browser, page, problems, base: base.url };
}

const body = (page) => page.locator('body').innerText();
async function waitForText(page, re, ms = 30000) {
  const end = Date.now() + ms;
  let text = '';
  while (Date.now() < end) {
    text = await body(page);
    const m = re.exec(text);
    if (m) return m;
    await page.waitForTimeout(300);
  }
  throw new Error(`Never saw ${re} within ${ms / 1000}s. Page said:\n${text.slice(0, 500)}`);
}
const letsGo = (page) => page.getByRole('button', { name: /let.s do it/i }).first().click({ timeout: 10000 });

console.log('Belto smoke tests');

await test('production headers are set', async () => {
  const res = await fetch(`${prod.url}/privacy`);
  const h = res.headers;
  assert.match(h.get('content-security-policy') ?? '', /default-src 'self'/);
  assert.match(h.get('content-security-policy') ?? '', /frame-ancestors 'none'/);
  assert.match(h.get('permissions-policy') ?? '', /microphone=\(self\)/);
  assert.equal(h.get('x-content-type-options'), 'nosniff');
  assert.match(h.get('referrer-policy') ?? '', /strict-origin/);
  assert.match(h.get('strict-transport-security') ?? '', /max-age=/);
  const assets = await fetch(`${prod.url}/theme-init.js`);
  assert.match(assets.headers.get('content-type') ?? '', /javascript/);
});

await test('pages load under the Content Security Policy with no errors', async () => {
  const { browser, page, problems, base } = await session('quiet');
  for (const path of ['/welcome', '/privacy', '/terms', '/home', '/path', '/practice', '/profile', '/friends', '/shop']) {
    await page.goto(base + path);
    await page.waitForLoadState('networkidle');
    assert.ok((await body(page)).length > 40, `${path} rendered`);
  }
  await browser.close();
  assert.deepEqual(problems, []);
});

await test('a held note is graded (steady voice on the home note)', async () => {
  const { browser, page, problems, base } = await session('steady');
  await page.goto(`${base}/lesson/pitch-1`);
  await letsGo(page);
  const [, label] = await waitForText(page, /(Perfect run|Great singing|Nice work|Every note counts)!?\s+(\d+)%/, 25000).then((m) => [m, Number(m[2])]);
  assert.ok(label >= 90, `expected a high score, got ${label}%`);
  await browser.close();
  assert.deepEqual(problems, []);
});

await test('a swell is graded on volume shape', async () => {
  const { browser, page, problems, base } = await session('swell');
  await page.goto(`${base}/lesson/sustain-4`);
  await letsGo(page);
  const m = await waitForText(page, /Volume shape\s*\d*[\s\S]*?volume shape (\d+)%|Pitch held (\d+)% . volume shape (\d+)%/i, 30000);
  const shape = Number(m[3] ?? m[1]);
  assert.ok(shape >= 85, `expected a good volume shape, got ${shape}%`);
  await browser.close();
  assert.deepEqual(problems, []);
});

await test('free ad-libbing in a key is graded', async () => {
  const { browser, page, problems, base } = await session('improv');
  await page.goto(`${base}/lesson/adlib-1`);
  await letsGo(page);
  const m = await waitForText(page, /In the key (\d+)% . variety (\d+)%/, 45000);
  assert.ok(Number(m[1]) >= 90 && Number(m[2]) >= 60, `in key ${m[1]}%, variety ${m[2]}%`);
  await browser.close();
  assert.deepEqual(problems, []);
});

await test('an in-app browser is told to open a real one', async () => {
  const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0.0.20.113 (iPhone14,5; iOS 17_4)';
  const { browser, page, base } = await session('quiet', { userAgent: ua, micAllowed: false });
  await page.goto(`${base}/lesson/pitch-1`);
  await letsGo(page);
  await waitForText(page, /Open Belto in your browser/, 8000);
  assert.match(await body(page), /Instagram/);
  await browser.close();
});

await test('a crash shows the friendly screen, not a blank page', async () => {
  const { browser, page, base } = await session('quiet', { extra: { activity: 5 } });
  await page.goto(`${base}/home`);
  await waitForText(page, /Pip dropped the mic/, 8000);
  assert.match(await body(page), /Reload Belto/);
  assert.match(await body(page), /progress is saved/i);
  await browser.close();
});

await test('friends: block, report, unblock, download data, delete account', async () => {
  const { browser, page, base } = await session('quiet', { base: mock });
  await page.goto(`${base}/friends`);
  await page.getByRole('button', { name: /continue with google/i }).click({ timeout: 10000 });
  await waitForText(page, /Friend requests/, 15000);
  await page.getByRole('button', { name: /block or report theo/i }).click();
  await page.getByLabel('Spam or advertising').check();
  await page.getByRole('button', { name: /report and block/i }).click();
  await waitForText(page, /Theo is blocked/, 8000);
  await waitForText(page, /Blocked[\s\S]*can't send you requests/, 8000);
  await page.getByRole('button', { name: /^unblock$/i }).click();
  await page.waitForFunction(() => !/can't send you requests/.test(document.body.innerText), null, { timeout: 8000 });

  await page.goto(`${base}/profile`);
  await waitForText(page, /Download my data/, 8000);
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /download/i }).first().click()]);
  assert.match(download.suggestedFilename(), /^belto-my-data-\d{4}-\d{2}-\d{2}\.json$/);
  const saved = JSON.parse(readFileSync(await download.path(), 'utf8'));
  assert.ok(saved.onThisDevice && saved.inTheCloud, 'export holds device and cloud data');
  await page.getByRole('button', { name: /^delete$/i }).click();
  await page.getByRole('button', { name: /delete forever/i }).click();
  await waitForText(page, /account and everything stored with it is deleted/i, 8000);
  assert.doesNotMatch(await body(page), /Delete my account\s+Removes/);
  await browser.close();
});

await prod.close();
await mock.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
