// Serves a built folder the way Vercel will: the headers from vercel.json plus
// the SPA fallback. Used by the browser smoke tests, so a Content Security
// Policy mistake fails the tests instead of failing for testers.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('..', import.meta.url));

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
};

// vercel.json "source" patterns are path-to-regexp; the few forms we use convert simply.
const toRegex = (source) => new RegExp(`^${source.replace(/\//g, '\\/').replace(/\(\.\*\)/g, '(.*)')}$`);

async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

/** Starts the server; resolves to { url, close }. */
export async function serveDist({ dir = 'dist', port = 0 } = {}) {
  const root = resolve(repo, dir);
  const config = JSON.parse(await readFile(join(repo, 'vercel.json'), 'utf8'));
  const rules = (config.headers ?? []).map((h) => ({ re: toRegex(h.source), headers: h.headers }));
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
    let file = join(root, path);
    if (!file.startsWith(root) || !(await isFile(file))) file = join(root, 'index.html');
    for (const rule of rules) if (rule.re.test(url.pathname)) for (const h of rule.headers) res.setHeader(h.key, h.value);
    res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream');
    res.end(await readFile(file));
  });
  await new Promise((ok) => server.listen(port, ok));
  const { port: actual } = server.address();
  return { url: `http://localhost:${actual}`, close: () => new Promise((ok) => server.close(ok)) };
}
