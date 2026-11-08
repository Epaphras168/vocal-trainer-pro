// Colour contrast check on the real, rendered pages (WCAG AA: 4.5:1 for normal
// text, 3:1 for large text), in light and dark, for every accent colour.
//
//   npm run build:mock && node e2e/contrast.mjs
import { readFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { serveDist } from '../scripts/dist-server.mjs';

const mock = await serveDist({ dir: 'dist-mock' });
const lessonIds = ['core', 'expansion'].flatMap((f) => [...readFileSync(new URL(`../src/content/${f}.ts`, import.meta.url), 'utf8').matchAll(/lesson\('([a-z0-9-]+)'/g)].map((m) => m[1]));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});

/** Runs in the page: every visible text node's colour against what is actually behind it. */
function audit() {
  const parse = (c) => {
    const m = /rgba?\(([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:[,/ ]+([\d.]+))?\)/.exec(c);
    return m ? [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])] : null;
  };
  const over = (top, under) => {
    const a = top[3];
    return [0, 1, 2].map((i) => top[i] * a + under[i] * (1 - a)).concat(1);
  };
  const lum = ([r, g, b]) => {
    const f = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const backdrop = (el) => {
    const stack = [];
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage !== 'none' && !/^linear-gradient|radial-gradient/.test(cs.backgroundImage)) return null; // a picture: can't judge
      const bg = parse(cs.backgroundColor);
      if (bg && bg[3] > 0) {
        stack.push(bg);
        if (bg[3] === 1) break;
      }
    }
    let base = parse(getComputedStyle(document.documentElement).backgroundColor) ?? [255, 255, 255, 1];
    if (base[3] < 1) base = [255, 255, 255, 1];
    for (const layer of stack.reverse()) base = over(layer, base);
    return base;
  };
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent.trim();
    if (!text) continue;
    const el = node.parentElement;
    if (!el || el.closest('svg, canvas, [aria-hidden="true"]')) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;
    let opacity = 1;
    for (let n = el; n; n = n.parentElement) opacity *= Number(getComputedStyle(n).opacity);
    if (opacity < 0.99 || el.closest('[disabled]')) continue; // mid-animation or disabled controls are exempt
    const fg = parse(cs.color);
    const bg = backdrop(el);
    if (!fg || !bg) {
      window.__skipped = (window.__skipped ?? 0) + 1;
      continue;
    }
    window.__checked = (window.__checked ?? 0) + 1;
    const solid = over(fg, bg);
    const size = parseFloat(cs.fontSize);
    const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
    const r = ratio(solid, bg);
    if (r < (large ? 3 : 4.5)) out.push({ text: text.slice(0, 40), ratio: Math.round(r * 100) / 100, need: large ? 3 : 4.5, cls: el.className?.toString().slice(0, 40) ?? '' });
  }
  return out;
}

const pages = ['/home', '/path', '/practice', '/profile', '/friends', '/shop', '/privacy', '/lesson/pitch-1', '/lesson/sustain-4'];
let bad = 0;
for (const theme of ['light', 'dark']) {
  for (const accent of ['ember', 'lagoon', 'orchid', 'citrus']) {
    const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 }, permissions: ['microphone'] });
    await ctx.addInitScript(
      ({ ids, theme, accent }) => {
        const lessons = Object.fromEntries(ids.map((id) => [id, { completedAt: 1, best: 80, plays: 1 }]));
        localStorage.setItem('belto-progress', JSON.stringify({ state: { name: 'Tester', onboarded: true, range: { low: 48, high: 72 }, lessons, sound: false, theme, accent, ownedAccents: ['ember', 'lagoon', 'orchid', 'citrus'], gems: 100, xp: 400 }, version: 2 }));
      },
      { ids: lessonIds, theme, accent },
    );
    const page = await ctx.newPage();
    for (const path of pages) {
      await page.goto(mock.url + path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(700);
      await page.evaluate(() => { window.__checked = 0; window.__skipped = 0; });
      const found = await page.evaluate(audit);
      if (process.env.VERBOSE) console.log(theme, accent, path, 'checked', await page.evaluate(() => window.__checked), 'skipped', await page.evaluate(() => window.__skipped));
      const unique = [...new Map(found.map((f) => [f.text + f.ratio, f])).values()];
      for (const f of unique) console.log(`${theme}/${accent} ${path}: "${f.text}" ${f.ratio} < ${f.need} (${f.cls})`);
      bad += unique.length;
    }
    await ctx.close();
  }
}
await browser.close();
await mock.close();
console.log(bad ? `\n${bad} contrast problems` : '\nno contrast problems');
process.exit(bad ? 1 : 0);
